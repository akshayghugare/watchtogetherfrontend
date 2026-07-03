import { useEffect, useRef } from 'react';
import type { WebRTCState, RemotePeer } from '@/hooks/useWebRTC';

function VideoTile({
  stream,
  label,
  muted = false,
  isScreen = false,
  micOff = false,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  isScreen?: boolean;
  micOff?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');

  return (
    <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-surface-overlay">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${hasVideo ? '' : 'hidden'}`}
      />
      {!hasVideo && (
        <div className="flex h-full items-center justify-center text-2xl">🎙️</div>
      )}
      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
        {isScreen && '🖥️'} {micOff && '🔇'} {label}
      </span>
    </div>
  );
}

/**
 * In-room voice/video call bar: join with mic or camera, talk while the movie
 * plays, share your screen — everyone in the call sees it live. The WebRTC
 * state is owned by the room page so the screen-share stage can use it too.
 */
export function CallPanel({ username, rtc }: { username: string; rtc: WebRTCState }) {
  if (!rtc.inCall) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised p-3">
        <span className="text-sm text-gray-400">Talk while watching:</span>
        <button
          onClick={() => void rtc.joinCall(false)}
          className="btn-ghost !px-3 !py-1.5 text-xs"
        >
          🎙️ Join voice
        </button>
        <button
          onClick={() => void rtc.joinCall(true)}
          className="btn-ghost !px-3 !py-1.5 text-xs"
        >
          📹 Join with camera
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-surface-border bg-surface-raised p-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <VideoTile
          stream={rtc.localStream}
          label={`${username} (you)`}
          muted
          isScreen={rtc.screenOn}
          micOff={!rtc.audioOn}
        />
        {rtc.peers.map((peer: RemotePeer) => (
          <VideoTile
            key={peer.socketId}
            stream={peer.stream}
            label={peer.username ?? 'Guest'}
            isScreen={peer.media.screen}
            micOff={!peer.media.audio}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={rtc.toggleAudio}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            rtc.audioOn ? 'bg-surface-overlay text-gray-200' : 'bg-red-600/80 text-white'
          }`}
        >
          {rtc.audioOn ? '🎙️ Mute' : '🔇 Unmute'}
        </button>
        <button
          onClick={() => void rtc.toggleVideo()}
          disabled={rtc.screenOn}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            rtc.videoOn ? 'bg-surface-overlay text-gray-200' : 'bg-surface-overlay text-gray-400'
          }`}
        >
          {rtc.videoOn ? '📹 Camera off' : '📷 Camera on'}
        </button>
        <button
          onClick={() => void rtc.toggleScreenShare()}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            rtc.screenOn ? 'bg-brand-600 text-white' : 'bg-surface-overlay text-gray-200'
          }`}
        >
          🖥️ {rtc.screenOn ? 'Stop sharing' : 'Share screen'}
        </button>
        <button
          onClick={rtc.leaveCall}
          className="ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
        >
          📵 Leave call
        </button>
      </div>
    </div>
  );
}
