import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { roomApi } from '@/api/room.api';
import { getErrorMessage } from '@/api/axios';
import { getSocket } from '@/socket';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayer } from '@/components/room/VideoPlayer';
import { UrlVideoPlayer } from '@/components/room/UrlVideoPlayer';
import { ChatPanel } from '@/components/room/ChatPanel';
import { MembersPanel } from '@/components/room/MembersPanel';
import { CallPanel } from '@/components/room/CallPanel';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import type { Room } from '@/types';

export function WatchRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

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
    const onKicked = ({ roomId: kickedFrom }: { roomId: string }) => {
      if (kickedFrom === roomId) {
        toast.error('You were removed from this room.');
        navigate(ROUTES.ROOMS, { replace: true });
      }
    };
    const onEnded = () => {
      toast('The host ended this room.', { icon: '🏁' });
      navigate(ROUTES.ROOMS, { replace: true });
    };

    socket.on('room:member-joined', refresh);
    socket.on('room:member-left', refresh);
    socket.on('room:host-changed', refresh);
    socket.on('room:kicked', onKicked);
    socket.on('room:ended', onEnded);
    return () => {
      socket.off('room:member-joined', refresh);
      socket.off('room:member-left', refresh);
      socket.off('room:host-changed', refresh);
      socket.off('room:kicked', onKicked);
      socket.off('room:ended', onEnded);
    };
  }, [roomId, navigate]);

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
        {/* Left: player + call bar */}
        <div className="min-w-0 space-y-4">
          {room.movie ? (
            room.movie.source === 'UPLOAD' ? (
              <VideoPlayer roomId={room.id} movie={room.movie} isHost={isHost} />
            ) : (
              <UrlVideoPlayer roomId={room.id} movie={room.movie} isHost={isHost} />
            )
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-gray-500">
              The host hasn't attached a movie yet.
            </div>
          )}
          <CallPanel roomId={room.id} username={user.displayName ?? user.username} />
        </div>

        {/* Right: members + chat */}
        <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100vh-140px)]">
          <MembersPanel
            room={room}
            myUserId={user.id}
            isHost={isHost}
            onChanged={() => void loadRoom()}
          />
          <div className="min-h-0 flex-1">
            <ChatPanel roomId={room.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
