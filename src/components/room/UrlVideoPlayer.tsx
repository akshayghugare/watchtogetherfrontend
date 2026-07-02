import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { getSocket } from '@/socket';
import type { Movie, PlaybackState } from '@/types';

interface UrlVideoPlayerProps {
  roomId: string;
  movie: Movie;
  isHost: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Synchronized ReactPlayer for YouTube / network stream URLs.
 * Same protocol as the HTML5 player: host actions broadcast via socket,
 * members follow with latency compensation; a transparent overlay stops
 * members from driving the embedded (e.g. YouTube) controls directly.
 *
 * Browsers refuse programmatic playback before the user's first gesture on
 * the page, so anyone who lands in an already-playing room gets a one-time
 * "tap to watch" gate instead of a silent black screen.
 */
export function UrlVideoPlayer({ roomId, movie, isHost }: UrlVideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const applyingRemote = useRef(false);
  const ready = useRef(false);
  const interacted = useRef(false); // a real user gesture happened on this page
  const lastState = useRef<PlaybackState | null>(null);
  const pendingState = useRef<PlaybackState | null>(null); // arrived before the player was ready

  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);

  const applyState = (state: PlaybackState, seekAlways = false) => {
    lastState.current = state;

    // seekTo/play before the player is ready gets dropped — defer to onReady.
    if (!ready.current) {
      pendingState.current = state;
      if (state.isPlaying && !interacted.current) setNeedsTap(true);
      return;
    }

    // Autoplay would be blocked without a gesture — ask for a tap instead
    // of silently showing a black screen.
    if (state.isPlaying && !interacted.current) {
      setNeedsTap(true);
      return;
    }
    setNeedsTap(false);

    applyingRemote.current = true;
    const latencySec = Math.max(0, (Date.now() - state.serverTime) / 1000);
    const target = state.isPlaying
      ? state.positionSec + latencySec * state.playbackRate
      : state.positionSec;

    const current = playerRef.current?.getCurrentTime() ?? 0;
    if (seekAlways || Math.abs(current - target) > 2) {
      playerRef.current?.seekTo(target, 'seconds');
    }
    setRate(state.playbackRate);
    setPlaying(state.isPlaying);
    setTimeout(() => {
      applyingRemote.current = false;
    }, 300);
  };

  const onPlayerReady = () => {
    if (ready.current) return;
    ready.current = true;
    const pending = pendingState.current;
    pendingState.current = null;
    if (pending) applyState(pending, true);
  };

  /** One-time gate click: counts as the gesture browsers require, then resync. */
  const startWatching = () => {
    interacted.current = true;
    setNeedsTap(false);
    const socket = getSocket();
    if (socket) {
      socket.emit('playback:state', { roomId }, (res: { ok: boolean; playback?: PlaybackState }) => {
        if (res.ok && res.playback) applyState(res.playback, true);
        else if (lastState.current) applyState(lastState.current, true);
      });
    } else if (lastState.current) {
      applyState(lastState.current, true);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const join = () => {
      socket.emit('room:join', { roomId }, (res: { ok: boolean; playback?: PlaybackState }) => {
        if (res.ok && res.playback) applyState(res.playback, true);
      });
    };
    join();
    socket.on('connect', join);

    const hard = (s: PlaybackState) => applyState(s, true);
    const soft = (s: PlaybackState) => {
      if (!isHost) applyState(s);
    };
    socket.on('playback:play', hard);
    socket.on('playback:pause', hard);
    socket.on('playback:seek', hard);
    socket.on('playback:rate', soft);
    socket.on('playback:sync', soft);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', join);
      socket.off('playback:play', hard);
      socket.off('playback:pause', hard);
      socket.off('playback:seek', hard);
      socket.off('playback:rate', soft);
      socket.off('playback:sync', soft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isHost]);

  // Host heartbeat + resume progress
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const tick = setInterval(() => {
      const pos = playerRef.current?.getCurrentTime();
      if (pos === undefined || pos === null) return;
      if (isHost && playing) socket.emit('playback:tick', { roomId, positionSec: pos });
      if (pos > 0) socket.emit('progress:save', { roomId, positionSec: pos });
    }, 5000);
    return () => clearInterval(tick);
  }, [roomId, isHost, playing]);

  const emitIfHost = (event: string, payload: Record<string, unknown>) => {
    if (!isHost || applyingRemote.current) return;
    getSocket()?.emit(event, { roomId, ...payload });
  };

  const hostToggle = () => {
    if (!isHost) return;
    interacted.current = true;
    const pos = playerRef.current?.getCurrentTime() ?? 0;
    const next = !playing;
    setPlaying(next);
    emitIfHost(next ? 'playback:play' : 'playback:pause', { positionSec: pos });
  };

  const hostSeek = (sec: number) => {
    if (!isHost) return;
    playerRef.current?.seekTo(sec, 'seconds');
    emitIfHost('playback:seek', { positionSec: sec });
  };

  const hostRate = (r: number) => {
    if (!isHost) return;
    setRate(r);
    emitIfHost('playback:rate', { rate: r });
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => undefined);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={() => {
        interacted.current = true;
      }}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      <ReactPlayer
        ref={playerRef}
        url={movie.fileUrl}
        width="100%"
        height="100%"
        playing={playing}
        playbackRate={rate}
        volume={volume}
        muted={muted}
        controls={false}
        playsinline
        config={{ youtube: { playerVars: { playsinline: 1, rel: 0 } } }}
        onReady={onPlayerReady}
        onDuration={setDuration}
        onProgress={(p) => setProgress(p.playedSeconds)}
        onPlay={() => {
          if (!applyingRemote.current && isHost && !playing) {
            setPlaying(true);
            emitIfHost('playback:play', { positionSec: playerRef.current?.getCurrentTime() ?? 0 });
          }
        }}
        onPause={() => {
          if (!applyingRemote.current && isHost && playing) {
            setPlaying(false);
            emitIfHost('playback:pause', { positionSec: playerRef.current?.getCurrentTime() ?? 0 });
          }
        }}
      />

      {/* Members can't drive the embedded player (YouTube etc.) directly. */}
      {!isHost && <div className="absolute inset-0" />}

      {!isHost && !needsTap && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-gray-300">
          🔄 Synced with host
        </div>
      )}

      {needsTap && (
        <button
          onClick={startWatching}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg">
            ▶
          </span>
          <span className="text-sm font-medium text-gray-200">Tap to start watching with everyone</span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={progress}
          disabled={!isHost}
          onChange={(e) => hostSeek(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500 disabled:cursor-default"
        />
        <div className="mt-2 flex items-center gap-3 text-white">
          {isHost && (
            <button onClick={hostToggle} className="text-2xl" title="Play/Pause">
              {playing ? '⏸' : '▶'}
            </button>
          )}
          <span className="text-xs tabular-nums text-gray-300">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {isHost && (
              <select
                value={rate}
                onChange={(e) => hostRate(Number(e.target.value))}
                className="rounded bg-black/50 px-1 py-0.5 text-xs"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => setMuted((m) => !m)}>{muted ? '🔇' : '🔊'}</button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              className="h-1 w-20 cursor-pointer accent-brand-500"
            />
            <button onClick={toggleFullscreen} title="Fullscreen">
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
