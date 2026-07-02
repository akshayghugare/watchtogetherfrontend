import { useEffect, useRef, useState } from 'react';
import { useRoomSync } from '@/hooks/useRoomSync';
import type { Movie } from '@/types';

interface VideoPlayerProps {
  roomId: string;
  movie: Movie;
  isHost: boolean;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Synchronized player. The host's play/pause/seek/speed drive everyone;
 * members keep volume/fullscreen/PiP control but not the timeline.
 */
export function VideoPlayer({ roomId, movie, isHost }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sync = useRoomSync({ roomId, isHost, videoRef });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      sync.onHostPlay(video.currentTime);
    };
    const onPause = () => {
      setIsPlaying(false);
      sync.onHostPause(video.currentTime);
    };
    const onRateChange = () => setRate(video.playbackRate);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ratechange', onRateChange);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ratechange', onRateChange);
    };
  }, [sync]);

  // Keyboard shortcuts: space (host), arrows (host), f, m
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const video = videoRef.current;
      if (!video) return;

      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') setMuted((m) => !m);
      if (!isHost) return;
      if (e.key === ' ') {
        e.preventDefault();
        void togglePlay();
      }
      if (e.key === 'ArrowRight') hostSeekBy(10);
      if (e.key === 'ArrowLeft') hostSeekBy(-10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
    }
  }, [volume, muted]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    if (video.paused) await video.play().catch(() => undefined);
    else video.pause();
  };

  const hostSeekTo = (sec: number) => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    video.currentTime = sec;
    sync.onHostSeek(sec);
  };

  const hostSeekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    hostSeekTo(Math.min(Math.max(video.currentTime + delta, 0), video.duration || Infinity));
  };

  const changeRate = (r: number) => {
    const video = videoRef.current;
    if (!video || !isHost) return;
    video.playbackRate = r;
    sync.onHostRate(r);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => undefined);
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* PiP unsupported */
    }
  };

  const bumpControls = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpControls}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      <video
        ref={videoRef}
        src={movie.fileUrl}
        className="h-full w-full"
        playsInline
        crossOrigin="anonymous"
        onClick={() => void togglePlay()}
      >
        {movie.subtitleUrl?.endsWith('.vtt') && (
          <track kind="subtitles" src={movie.subtitleUrl} srcLang="en" label="Subtitles" default />
        )}
      </video>

      {!isHost && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-gray-300">
          🔄 Synced with host
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          disabled={!isHost}
          onChange={(e) => hostSeekTo(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-brand-500 disabled:cursor-default"
        />

        <div className="mt-2 flex items-center gap-3 text-white">
          {isHost && (
            <>
              <button onClick={() => hostSeekBy(-10)} title="Back 10s (←)">
                ⏪
              </button>
              <button onClick={() => void togglePlay()} className="text-2xl" title="Play/Pause (space)">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={() => hostSeekBy(10)} title="Forward 10s (→)">
                ⏩
              </button>
            </>
          )}

          <span className="text-xs tabular-nums text-gray-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {isHost && (
              <select
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                className="rounded bg-black/50 px-1 py-0.5 text-xs"
                title="Playback speed"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            )}

            <button onClick={() => setMuted((m) => !m)} title="Mute (m)">
              {muted || volume === 0 ? '🔇' : '🔊'}
            </button>
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
              title="Volume"
            />

            <button onClick={() => void togglePiP()} title="Picture in picture">
              🗔
            </button>
            <button onClick={toggleFullscreen} title="Fullscreen (f)">
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
