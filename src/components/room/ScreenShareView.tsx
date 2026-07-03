import { useEffect, useRef, useState } from 'react';

interface ScreenShareViewProps {
  stream: MediaStream | null;
  label: string;
  isLocal: boolean;
  onStop?: () => void;
  onSwitch?: () => void;
}

/**
 * Dedicated screen-share stage: the shared screen takes over the main
 * content area (Discord/Meet style) and supports fullscreen. Audio stays
 * muted here — voices keep playing through the call tiles.
 */
export function ScreenShareView({ stream, label, isLocal, onStop, onSwitch }: ScreenShareViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden rounded-xl border border-surface-border bg-black ${
        isFullscreen ? 'h-full' : 'aspect-video'
      }`}
    >
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />

      <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2 opacity-100 transition group-hover:opacity-100 md:opacity-0">
        <span className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          🖥️ {label} is sharing {isLocal && '(you)'}
        </span>
        <div className="flex gap-1.5">
          {isLocal && onSwitch && (
            <button
              onClick={onSwitch}
              className="rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/80"
            >
              🔁 Switch screen
            </button>
          )}
          {isLocal && onStop && (
            <button
              onClick={onStop}
              className="rounded-lg bg-red-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500"
            >
              ⏹ Stop sharing
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/80"
          >
            {isFullscreen ? '🗗 Exit fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>
    </div>
  );
}
