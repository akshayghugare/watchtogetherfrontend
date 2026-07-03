import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { roomApi } from '@/api/room.api';
import { getErrorMessage } from '@/api/axios';
import { getSocket } from '@/socket';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoPlayer } from '@/components/room/VideoPlayer';
import { UrlVideoPlayer } from '@/components/room/UrlVideoPlayer';
import { ChatPanel } from '@/components/room/ChatPanel';
import { MembersPanel } from '@/components/room/MembersPanel';
import { CallPanel } from '@/components/room/CallPanel';
import { ScreenShareView } from '@/components/room/ScreenShareView';
import { ChangeVideoModal } from '@/components/room/ChangeVideoModal';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import type { Room, ScreenShareState } from '@/types';

export function WatchRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangeVideo, setShowChangeVideo] = useState(false);

  // Room-wide screen share announcement (covers members not yet in the call).
  const [roomShare, setRoomShare] = useState<ScreenShareState | null>(null);
  // Remembers which share we auto-joined for, so a manual "leave call" is respected.
  const autoJoinedShareRef = useRef<string | null>(null);

  const rtc = useWebRTC(roomId ?? '');

  const isHost = Boolean(room && user && room.hostId === user.id);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      // join is idempotent — covers direct links and notification joins
      const res = await roomApi.join(roomId).catch(async (err) => {
        const msg = getErrorMessage(err);
        if (msg.toLowerCase().includes('password')) {
          const password = window.prompt('This room requires a password:');
          if (!password) throw err;
          return roomApi.join(roomId, password);
        }
        throw err;
      });
      setRoom(res.data.room);
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate(ROUTES.ROOMS, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [roomId, navigate]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  // Live membership / host / lifecycle updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    const refresh = () => void roomApi.getOne(roomId).then((r) => setRoom(r.data.room)).catch(() => undefined);
    const onMovieChanged = ({ movieTitle }: { movieTitle?: string }) => {
      toast(`Now watching: ${movieTitle ?? 'a new video'} 🎬`, { icon: '🔄' });
      refresh();
    };
    const onKicked = ({ roomId: kickedFrom }: { roomId: string }) => {
      if (kickedFrom === roomId) {
        toast.error('You were removed from this room.');
        navigate(ROUTES.ROOMS, { replace: true });
      }
    };
    const onEnded = ({ terminated }: { roomId?: string; terminated?: boolean } = {}) => {
      toast(terminated ? 'This room was terminated by an admin.' : 'The host ended this room.', {
        icon: '🏁',
      });
      navigate(ROUTES.ROOMS, { replace: true });
    };
    const onShareState = (s: ScreenShareState) => {
      if (s.roomId !== roomId) return;
      setRoomShare(s.sharing ? s : null);
    };

    socket.on('room:member-joined', refresh);
    socket.on('room:member-left', refresh);
    socket.on('room:host-changed', refresh);
    socket.on('room:movie-changed', onMovieChanged);
    socket.on('room:kicked', onKicked);
    socket.on('room:ended', onEnded);
    socket.on('screen:share-state', onShareState);
    return () => {
      socket.off('room:member-joined', refresh);
      socket.off('room:member-left', refresh);
      socket.off('room:host-changed', refresh);
      socket.off('room:movie-changed', onMovieChanged);
      socket.off('room:kicked', onKicked);
      socket.off('room:ended', onEnded);
      socket.off('screen:share-state', onShareState);
    };
  }, [roomId, navigate]);

  // Auto-switch everyone to the screen share: members outside the call join
  // view-only (no mic/camera), and leave again when the share ends.
  useEffect(() => {
    if (!roomShare || !roomShare.sharing) {
      if (autoJoinedShareRef.current && rtc.inCall && !rtc.screenOn) {
        autoJoinedShareRef.current = null;
        rtc.leaveCall();
      }
      return;
    }
    if (roomShare.userId === user?.id) return; // we are the presenter
    const shareKey = `${roomShare.roomId}:${roomShare.userId}`;
    if (!rtc.inCall && autoJoinedShareRef.current !== shareKey) {
      autoJoinedShareRef.current = shareKey;
      void rtc.joinCall(false, { viewOnly: true });
    }
  }, [roomShare, rtc, user?.id]);

  const leave = async () => {
    if (!roomId) return;
    try {
      await roomApi.leave(roomId);
    } finally {
      navigate(ROUTES.ROOMS, { replace: true });
    }
  };

  const endRoom = async () => {
    if (!roomId || !window.confirm('End this room for everyone?')) return;
    try {
      await roomApi.end(roomId);
      navigate(ROUTES.ROOMS, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading || !room || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-brand-400" />
      </div>
    );
  }

  // Active screen share: mine, or the first peer flagged as presenting.
  const presentingPeer = rtc.peers.find((p) => p.media.screen && p.stream);
  const activeShare = rtc.screenOn
    ? { stream: rtc.localStream, label: user.displayName ?? user.username, isLocal: true }
    : presentingPeer
      ? {
          stream: presentingPeer.stream,
          label: presentingPeer.username ?? 'Guest',
          isLocal: false,
        }
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Top bar: movie title, room name, code, actions */}
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-white">
            {room.movie?.title ?? 'No movie selected'}
          </h1>
          <p className="text-xs text-gray-500">
            {room.name} · code <span className="font-mono text-brand-300">{room.code}</span> ·{' '}
            {isHost ? 'You are the host 👑' : `Host: ${room.host?.displayName ?? room.host?.username}`}
          </p>
        </div>
        {isHost && (
          <Button
            variant="ghost"
            onClick={() => setShowChangeVideo(true)}
            className="!px-3 !py-1.5 text-xs"
          >
            🔄 Change video
          </Button>
        )}
        <Button variant="ghost" onClick={() => void leave()} className="!px-3 !py-1.5 text-xs">
          Leave room
        </Button>
        {isHost && (
          <Button
            variant="ghost"
            onClick={() => void endRoom()}
            className="!border-red-900 !px-3 !py-1.5 text-xs !text-red-400"
          >
            End room
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: screen share stage / player + call bar */}
        <div className="min-w-0 space-y-4">
          {activeShare && (
            <ScreenShareView
              stream={activeShare.stream}
              label={activeShare.label}
              isLocal={activeShare.isLocal}
              onStop={() => void rtc.toggleScreenShare()}
              onSwitch={() => void rtc.switchScreenShare()}
            />
          )}
          {!activeShare && roomShare?.sharing && roomShare.userId !== user.id && (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-sm text-gray-400">
              🖥️ {roomShare.username ?? 'Someone'} is sharing their screen — connecting…
            </div>
          )}

          {/* While a screen is shared the movie shrinks to a preview and
              restores automatically when sharing stops. */}
          <div className={activeShare || roomShare?.sharing ? 'w-full max-w-xs' : undefined}>
            {room.movie ? (
              room.movie.source === 'UPLOAD' ? (
                <VideoPlayer key={room.movie.id} roomId={room.id} movie={room.movie} isHost={isHost} />
              ) : (
                <UrlVideoPlayer key={room.movie.id} roomId={room.id} movie={room.movie} isHost={isHost} />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-gray-500">
                The host hasn't attached a movie yet.
              </div>
            )}
          </div>

          <CallPanel username={user.displayName ?? user.username} rtc={rtc} />
        </div>

        {/* Right: members + chat */}
        <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100vh-140px)]">
          <MembersPanel
            room={room}
            myUserId={user.id}
            isHost={isHost}
            onChanged={() => void loadRoom()}
          />
          {/* Below lg the column is auto-height, so the chat needs its own
              height or the message list collapses to nothing. */}
          <div className="h-[28rem] min-h-0 lg:h-auto lg:flex-1">
            <ChatPanel roomId={room.id} />
          </div>
        </div>
      </div>

      {showChangeVideo && (
        <ChangeVideoModal
          roomId={room.id}
          onClose={() => setShowChangeVideo(false)}
          onChanged={() => void loadRoom()}
        />
      )}
    </div>
  );
}
