import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  adminApi,
  type AdminRoom,
  type AdminRoomDetails,
  type AdminStats,
  type AdminUser,
  type AdminUserDetails,
  type ScreenShareInfo,
} from '@/api/admin.api';
import { getErrorMessage } from '@/api/axios';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { watchPath } from '@/constants';

type Tab = 'overview' | 'users' | 'rooms' | 'screenshares';

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <p className={`text-2xl font-bold ${accent ? 'text-brand-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi
      .stats()
      .then((res) => setStats(res.data))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, []);

  if (!stats) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" className="text-brand-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatCard label="Total users" value={stats.users} />
      <StatCard label="Online users" value={stats.onlineUsers} accent />
      <StatCard label="Offline users" value={stats.offlineUsers} />
      <StatCard label="Friendships" value={stats.friendships} />
      <StatCard label="Pending friend requests" value={stats.pendingFriendRequests} />
      <StatCard label="Total rooms" value={stats.rooms} />
      <StatCard label="Active rooms" value={stats.activeRooms} accent />
      <StatCard label="Private rooms (active)" value={stats.privateRooms} />
      <StatCard label="Public rooms (active)" value={stats.publicRooms} />
      <StatCard label="Movies" value={stats.movies} />
      <StatCard label="Chat messages" value={stats.messages} />
      <StatCard label="Active calls" value={stats.activeCalls} accent />
      <StatCard label="Active screen shares" value={stats.activeScreenShares} accent />
    </div>
  );
}

// ── Users ────────────────────────────────────────────────

function UserDetails({ userId }: { userId: string }) {
  const [details, setDetails] = useState<AdminUserDetails | null>(null);

  useEffect(() => {
    adminApi
      .getUser(userId)
      .then((res) => setDetails(res.data))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [userId]);

  if (!details) return <Spinner size="sm" className="m-3 text-brand-400" />;

  return (
    <div className="space-y-3 border-t border-surface-border bg-surface-overlay/30 p-4 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 sm:grid-cols-4">
        <p>Email: <span className="text-gray-200">{details.user.email}</span></p>
        <p>Hosted rooms: <span className="text-gray-200">{details.hostedRooms}</span></p>
        <p>Joined: <span className="text-gray-200">{new Date(details.user.createdAt).toLocaleDateString()}</span></p>
        <p>
          Last seen:{' '}
          <span className="text-gray-200">
            {details.user.isOnline
              ? 'online now'
              : details.user.lastSeenAt
                ? new Date(details.user.lastSeenAt).toLocaleString()
                : '—'}
          </span>
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Friends ({details.friends.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {details.friends.length === 0 && <span className="text-xs text-gray-600">None</span>}
          {details.friends.map((f) => (
            <span
              key={f.id}
              className="flex items-center gap-1 rounded-lg bg-surface-overlay px-2 py-1 text-xs text-gray-300"
            >
              {f.isOnline && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
              {f.displayName ?? f.username}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <p className="text-xs text-gray-500">
          Incoming requests:{' '}
          <span className="text-gray-300">
            {details.friendRequests.incoming.map((r) => r.sender?.username).join(', ') || 'none'}
          </span>
        </p>
        <p className="text-xs text-gray-500">
          Outgoing requests:{' '}
          <span className="text-gray-300">
            {details.friendRequests.outgoing.map((r) => r.receiver?.username).join(', ') || 'none'}
          </span>
        </p>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers(1, q || undefined);
      setUsers(res.data.users);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBan = async (u: AdminUser) => {
    if (!window.confirm(`${u.isBanned ? 'Unban' : 'Ban'} ${u.username}?`)) return;
    try {
      await adminApi.setBanned(u.id, !u.isBanned);
      toast.success(u.isBanned ? 'User unbanned' : 'User banned');
      void load(search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(search);
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or email…"
          className="input-field !w-64"
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" className="text-brand-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
          {users.map((u) => (
            <div key={u.id} className="border-b border-surface-border last:border-b-0">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-200">
                    {u.displayName ?? u.username}
                    <span className="ml-1.5 text-xs text-gray-500">@{u.username}</span>
                    {u.role === 'ADMIN' && (
                      <span className="ml-1.5 rounded bg-brand-600/30 px-1.5 py-0.5 text-xs text-brand-300">
                        ADMIN
                      </span>
                    )}
                    {u.isBanned && (
                      <span className="ml-1.5 rounded bg-red-600/30 px-1.5 py-0.5 text-xs text-red-400">
                        BANNED
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">{u.email}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    u.isOnline ? 'bg-green-600/20 text-green-400' : 'bg-surface-overlay text-gray-500'
                  }`}
                >
                  {u.isOnline ? '● Online' : 'Offline'}
                </span>
                <button
                  onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                  className="rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:bg-surface-overlay hover:text-gray-200"
                >
                  {expanded === u.id ? 'Hide' : 'Profile'}
                </button>
                <button
                  onClick={() => void toggleBan(u)}
                  className={`rounded-lg px-2.5 py-1 text-xs ${
                    u.isBanned
                      ? 'text-green-400 hover:bg-surface-overlay'
                      : 'text-red-400 hover:bg-surface-overlay'
                  }`}
                >
                  {u.isBanned ? 'Unban' : 'Ban'}
                </button>
              </div>
              {expanded === u.id && <UserDetails userId={u.id} />}
            </div>
          ))}
          {users.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rooms ────────────────────────────────────────────────

function RoomDetails({ roomId, onChanged }: { roomId: string; onChanged: () => void }) {
  const [details, setDetails] = useState<AdminRoomDetails | null>(null);

  const load = useCallback(() => {
    adminApi
      .getRoom(roomId)
      .then((res) => setDetails(res.data))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const kick = async (userId: string, username: string) => {
    if (!window.confirm(`Force-disconnect ${username} from this room?`)) return;
    try {
      await adminApi.kickUser(roomId, userId);
      toast.success('User disconnected');
      load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const stopShare = async () => {
    try {
      await adminApi.stopScreenShare(roomId);
      toast.success('Screen share stopped');
      load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!details) return <Spinner size="sm" className="m-3 text-brand-400" />;

  const members = details.room.members ?? [];
  const invites = details.room.invites ?? [];

  return (
    <div className="space-y-3 border-t border-surface-border bg-surface-overlay/30 p-4 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 sm:grid-cols-4">
        <p>Status: <span className={details.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}>{details.status}</span></p>
        <p>Playing: <span className="text-gray-200">{details.room.movie?.title ?? 'nothing'}</span></p>
        <p>
          Playback:{' '}
          <span className="text-gray-200">
            {formatTime(details.playback.positionSec)} {details.playback.isPlaying ? '▶' : '⏸'}
          </span>
        </p>
        <p>Chat messages: <span className="text-gray-200">{details.chatMessageCount}</span></p>
        <p>Created: <span className="text-gray-200">{new Date(details.room.createdAt).toLocaleString()}</span></p>
        <p>Updated: <span className="text-gray-200">{details.room.updatedAt ? new Date(details.room.updatedAt).toLocaleString() : '—'}</span></p>
        <p>Connected now: <span className="text-gray-200">{details.connectedUsers.length}</span></p>
        <p>In call: <span className="text-gray-200">{details.callParticipants.length}</span></p>
      </div>

      {details.screenShare && (
        <div className="flex items-center justify-between rounded-lg border border-brand-600/40 bg-brand-600/10 px-3 py-2">
          <span className="text-xs text-brand-300">
            🖥️ {details.screenShare.username ?? 'Someone'} is sharing their screen
          </span>
          <button
            onClick={() => void stopShare()}
            className="rounded-lg bg-red-600/80 px-2.5 py-1 text-xs text-white hover:bg-red-500"
          >
            Force stop
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Members ({members.length})
        </p>
        <div className="mt-1.5 space-y-1">
          {members.map((m) => {
            const call = details.callParticipants.find((c) => c.user.id === m.userId);
            const connected = details.connectedUsers.some((c) => c.id === m.userId);
            return (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
                <span className="text-gray-300">{m.user?.displayName ?? m.user?.username}</span>
                {m.role === 'HOST' && <span title="Host">👑</span>}
                {call && (
                  <span className="text-gray-500">
                    {call.audio && '🎙️'} {call.video && '📹'} {call.screen && '🖥️'}
                  </span>
                )}
                <button
                  onClick={() => void kick(m.userId, m.user?.username ?? 'user')}
                  className="ml-auto rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-surface-overlay"
                >
                  Disconnect
                </button>
              </div>
            );
          })}
          {members.length === 0 && <p className="text-xs text-gray-600">No active members.</p>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Invited friends ({invites.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {invites.length === 0 && <span className="text-xs text-gray-600">None</span>}
          {invites.map((i) => (
            <span key={i.id} className="rounded-lg bg-surface-overlay px-2 py-1 text-xs text-gray-300">
              {i.user?.displayName ?? i.user?.username}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomsTab() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'private' | 'public'>('active');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters =
        filter === 'active'
          ? { active: true }
          : filter === 'private'
            ? { privacy: 'PRIVATE' as const }
            : filter === 'public'
              ? { privacy: 'PUBLIC' as const }
              : {};
      const res = await adminApi.listRooms(1, filters);
      setRooms(res.data.rooms);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const terminate = async (room: AdminRoom) => {
    if (!window.confirm(`Terminate "${room.name}"? Everyone will be disconnected.`)) return;
    try {
      await adminApi.terminateRoom(room.id);
      toast.success('Room terminated');
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (room: AdminRoom) => {
    if (!window.confirm(`Permanently delete "${room.name}" and its chat history?`)) return;
    try {
      await adminApi.deleteRoom(room.id);
      toast.success('Room deleted');
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['active', 'all', 'private', 'public'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'border border-surface-border text-gray-400 hover:text-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" className="text-brand-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
          {rooms.map((room) => (
            <div key={room.id} className="border-b border-surface-border last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-200">
                    {room.name}
                    <span className="ml-1.5 font-mono text-xs text-brand-300">{room.code}</span>
                    <span
                      className={`ml-1.5 rounded px-1.5 py-0.5 text-xs ${
                        room.privacy === 'PRIVATE'
                          ? 'bg-yellow-600/20 text-yellow-400'
                          : 'bg-surface-overlay text-gray-400'
                      }`}
                    >
                      {room.privacy === 'PRIVATE' ? '🔒 Private' : 'Public'}
                    </span>
                    {!room.isActive && (
                      <span className="ml-1.5 rounded bg-red-600/20 px-1.5 py-0.5 text-xs text-red-400">
                        Ended
                      </span>
                    )}
                    {room.screenShare && (
                      <span className="ml-1.5 rounded bg-brand-600/20 px-1.5 py-0.5 text-xs text-brand-300">
                        🖥️ Sharing
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    Host: {room.host?.displayName ?? room.host?.username} ·{' '}
                    {room.movie ? `${room.movie.title} @ ${formatTime(room.playback.positionSec)}` : 'no movie'}
                    {room.playback.isPlaying ? ' ▶' : ''} · {room.connectedCount} connected ·{' '}
                    {room.callCount} in call
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === room.id ? null : room.id)}
                  className="rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:bg-surface-overlay hover:text-gray-200"
                >
                  {expanded === room.id ? 'Hide' : 'Details'}
                </button>
                {room.isActive && (
                  <>
                    <button
                      onClick={() => navigate(watchPath(room.id))}
                      className="rounded-lg px-2.5 py-1 text-xs text-brand-300 hover:bg-surface-overlay"
                    >
                      ▶ Join
                    </button>
                    <button
                      onClick={() => void terminate(room)}
                      className="rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-surface-overlay"
                    >
                      Terminate
                    </button>
                  </>
                )}
                <button
                  onClick={() => void remove(room)}
                  className="rounded-lg px-2.5 py-1 text-xs text-red-500 hover:bg-surface-overlay"
                >
                  Delete
                </button>
              </div>
              {expanded === room.id && <RoomDetails roomId={room.id} onChanged={() => void load()} />}
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">No rooms found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Screen shares ────────────────────────────────────────

function ScreenSharesTab() {
  const navigate = useNavigate();
  const [shares, setShares] = useState<ScreenShareInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listScreenShares();
      setShares(res.data.screenShares);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stop = async (share: ScreenShareInfo) => {
    if (!window.confirm(`Force-stop ${share.username ?? 'this user'}'s screen share?`)) return;
    try {
      await adminApi.stopScreenShare(share.roomId);
      toast.success('Screen share stopped');
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" className="text-brand-400" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
      {shares.length === 0 && (
        <p className="p-6 text-center text-sm text-gray-500">No active screen shares.</p>
      )}
      {shares.map((s) => (
        <div
          key={s.socketId}
          className="flex flex-wrap items-center gap-3 border-b border-surface-border px-4 py-2.5 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-200">
              🖥️ {s.username ?? 'Unknown user'}{' '}
              <span className="text-xs text-gray-500">
                in {s.room?.name ?? s.roomId} · since {new Date(s.startedAt).toLocaleTimeString()}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate(watchPath(s.roomId))}
            className="rounded-lg px-2.5 py-1 text-xs text-brand-300 hover:bg-surface-overlay"
          >
            ▶ Watch
          </button>
          <button
            onClick={() => void stop(s)}
            className="rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-surface-overlay"
          >
            Force stop
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '📊 Dashboard' },
  { key: 'users', label: '👥 Users' },
  { key: 'rooms', label: '🎬 Rooms' },
  { key: 'screenshares', label: '🖥️ Screen shares' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">🛡️ Admin</h1>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-surface-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-brand-600/20 text-brand-300'
                : 'text-gray-400 hover:bg-surface-overlay hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'rooms' && <RoomsTab />}
        {tab === 'screenshares' && <ScreenSharesTab />}
      </div>
    </div>
  );
}
