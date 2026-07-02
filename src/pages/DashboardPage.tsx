import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roomApi } from '@/api/room.api';
import { friendApi } from '@/api/friend.api';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { ROUTES, watchPath } from '@/constants';
import type { PublicUser, Room } from '@/types';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);

  useEffect(() => {
    roomApi
      .listMine()
      .then((r) => setMyRooms(r.data.rooms.slice(0, 6)))
      .catch(() => undefined);
    friendApi
      .list()
      .then((r) => setFriends(r.data.friends))
      .catch(() => undefined);
  }, []);

  const online = friends.filter((f) => f.isOnline);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">
        Welcome back, {user?.displayName ?? user?.username} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-400">
        {online.length > 0
          ? `${online.length} of your friends ${online.length === 1 ? 'is' : 'are'} online — start a movie and they'll get a Join popup.`
          : 'Add friends, start a movie, and they get a live "Join now" notification.'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to={ROUTES.ROOMS}
          className="card !p-6 transition hover:border-brand-600/60"
        >
          <div className="text-3xl">🎬</div>
          <h3 className="mt-2 font-semibold text-white">Start watching</h3>
          <p className="mt-1 text-sm text-gray-400">Create a room from an upload or a YouTube link.</p>
        </Link>
        <Link to={ROUTES.FRIENDS} className="card !p-6 transition hover:border-brand-600/60">
          <div className="text-3xl">👥</div>
          <h3 className="mt-2 font-semibold text-white">Friends</h3>
          <p className="mt-1 text-sm text-gray-400">
            {friends.length} friends · {online.length} online
          </p>
        </Link>
        <Link to={ROUTES.ROOMS} className="card !p-6 transition hover:border-brand-600/60">
          <div className="text-3xl">🍿</div>
          <h3 className="mt-2 font-semibold text-white">Browse rooms</h3>
          <p className="mt-1 text-sm text-gray-400">Jump into a public watch party.</p>
        </Link>
      </div>

      {myRooms.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Continue watching
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => navigate(watchPath(room.id))}
                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-3 text-left transition hover:border-brand-600/50"
              >
                <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-overlay">
                  {room.movie?.thumbnailUrl ? (
                    <img src={room.movie.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    '🎬'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-200">{room.name}</p>
                  <p className="truncate text-xs text-gray-500">{room.movie?.title ?? '—'}</p>
                </div>
                <div className="ml-auto">
                  <Avatar user={room.host} size="sm" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
