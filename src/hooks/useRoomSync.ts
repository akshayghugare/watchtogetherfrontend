import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/socket';
import type { PlaybackState } from '@/types';

interface UseRoomSyncOptions {
  roomId: string;
  isHost: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

/**
 * Keeps a <video> element in lockstep with the room's authoritative state.
 *
 * Host: user actions (play/pause/seek/rate) are emitted to the server, which
 * persists them and broadcasts to every member. A 5s heartbeat re-anchors the
 * position so drift never accumulates.
 *
 * Members: apply host events with latency compensation (serverTime delta) and
 * self-correct on the heartbeat when drifting more than 2 seconds.
 */
export function useRoomSync({ roomId, isHost, videoRef }: UseRoomSyncOptions) {
  // True while WE are applying remote state — suppresses re-emitting it.
  const applyingRemote = useRef(false);

  const applyState = useCallback(
    (state: PlaybackState, opts: { seekAlways?: boolean } = {}) => {
      const video = videoRef.current;
      if (!video) return;

      const latencySec = Math.max(0, (Date.now() - state.serverTime) / 1000);
      const target = state.isPlaying
        ? state.positionSec + latencySec * state.playbackRate
        : state.positionSec;

      applyingRemote.current = true;
      if (opts.seekAlways || Math.abs(video.currentTime - target) > 2) {
        video.currentTime = target;
      }
      video.playbackRate = state.playbackRate;
      if (state.isPlaying && video.paused) {
        void video.play().catch(() => undefined); // autoplay policies
      } else if (!state.isPlaying && !video.paused) {
        video.pause();
      }
      // Release after the events we just triggered have fired.
      setTimeout(() => {
        applyingRemote.current = false;
      }, 150);
    },
    [videoRef],
  );

  // Join the socket room; ack carries the current state for late joiners.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const join = () => {
      socket.emit(
        'room:join',
        { roomId },
        (res: { ok: boolean; playback?: PlaybackState }) => {
          if (res.ok && res.playback) applyState(res.playback, { seekAlways: true });
        },
      );
    };
    join();
    socket.on('connect', join); // resync after reconnects

    const onPlay = (s: PlaybackState) => applyState(s, { seekAlways: true });
    const onPause = (s: PlaybackState) => applyState(s, { seekAlways: true });
    const onSeek = (s: PlaybackState) => applyState(s, { seekAlways: true });
    const onRate = (s: PlaybackState) => applyState(s);
    const onSync = (s: PlaybackState) => {
      if (!isHost) applyState(s); // gentle drift correction only
    };

    socket.on('playback:play', onPlay);
    socket.on('playback:pause', onPause);
    socket.on('playback:seek', onSeek);
    socket.on('playback:rate', onRate);
    socket.on('playback:sync', onSync);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', join);
      socket.off('playback:play', onPlay);
      socket.off('playback:pause', onPause);
      socket.off('playback:seek', onSeek);
      socket.off('playback:rate', onRate);
      socket.off('playback:sync', onSync);
    };
  }, [roomId, isHost, applyState]);

  // Host heartbeat + everyone's personal resume-progress save.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const tick = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      if (isHost && !video.paused) {
        socket.emit('playback:tick', { roomId, positionSec: video.currentTime });
      }
      if (video.currentTime > 0) {
        socket.emit('progress:save', { roomId, positionSec: video.currentTime });
      }
    }, 5000);

    return () => clearInterval(tick);
  }, [roomId, isHost, videoRef]);

  // ── Host emitters (wired to video element events by the player) ──
  const emitIfHost = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (!isHost || applyingRemote.current) return;
      getSocket()?.emit(event, { roomId, ...payload });
    },
    [isHost, roomId],
  );

  return {
    onHostPlay: (positionSec: number) => emitIfHost('playback:play', { positionSec }),
    onHostPause: (positionSec: number) => emitIfHost('playback:pause', { positionSec }),
    onHostSeek: (positionSec: number) => emitIfHost('playback:seek', { positionSec }),
    onHostRate: (rate: number) => emitIfHost('playback:rate', { rate }),
    isApplyingRemote: () => applyingRemote.current,
  };
}
