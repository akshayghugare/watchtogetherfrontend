import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { roomApi } from '@/api/room.api';
import { getErrorMessage } from '@/api/axios';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { watchPath } from '@/constants';
import type { Room } from '@/types';

function RoomCard({ room, onJoin }: { room: Room; onJoin: (room: Room) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised transition hover:border-brand-600/50">
      <div className="relative aspect-video bg-surface-overlay">
        {room.movie?.thumbnailUrl ? (
          <img
            src={room.movie.thumbnailUrl}
            alt={room.movie.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🎬</div>
        )}
        {room.isPlaying && (
          <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            ● LIVE
          </span>
        )}
        {room.privacy === 'PRIVATE' && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
            🔒 Private
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-white">{room.name}</h3>
        <p className="truncate text-sm text-gray-400">{room.movie?.title ?? 'No movie yet'}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar user={room.host} size="sm" />
            <span className="text-xs text-gray-500">{room.host?.displayName ?? room.host?.username}</span>
          </div>
          <Button onClick={() => onJoin(room)} className="!px-3 !py-1.5 text-xs">
            ▶ Join
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RoomsPage() {
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const reload = useCallback(async () => {
    try {
      const [pub, mine] = await Promise.all([roomApi.listPublic(), roomApi.listMine()]);
      setPublicRooms(pub.data.rooms);
      setMyRooms(mine.data.rooms);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const joinRoom = async (room: Room) => {
    try {
      let password: string | undefined;
      // Private rooms are invite-gated — no password needed if you can see them.
      if (room.hasPassword && room.privacy !== 'PRIVATE') {
        password = window.prompt('This room requires a password:') ?? undefined;
        if (password === undefined) return;
      }
      const res = await roomApi.join(room.id, password);
      navigate(watchPath(res.data.room.id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await roomApi.join(joinCode.trim());
      navigate(watchPath(res.data.room.id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-brand-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Movie Rooms</h1>
        <div className="flex gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void joinByCode();
            }}
            className="flex gap-2"
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Room code…"
              className="input-field !w-36"
            />
            <Button type="submit" variant="ghost">
              Join
            </Button>
          </form>
          <Button onClick={() => setShowCreate(true)}>+ Create room</Button>
        </div>
      </div>

      {myRooms.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
            My rooms
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myRooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={(r) => navigate(watchPath(r.id))} />
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Rooms for you
      </h2>
      {publicRooms.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          No rooms available right now — create the first one! 🍿
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicRooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={joinRoom} />
          ))}
        </div>
      )}

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
