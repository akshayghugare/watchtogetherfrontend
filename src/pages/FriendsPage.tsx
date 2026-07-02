import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { friendApi } from '@/api/friend.api';
import { getErrorMessage } from '@/api/axios';
import { getSocket } from '@/socket';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { FriendRequest, PublicUser, SearchedUser } from '@/types';

type Tab = 'friends' | 'requests' | 'search';

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendApi.list(),
        friendApi.requests(),
      ]);
      setFriends(friendsRes.data.friends);
      setIncoming(requestsRes.data.incoming);
      setOutgoing(requestsRes.data.outgoing);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const socket = getSocket();
    const refresh = () => void reload();
    socket?.on('presence:online', refresh);
    socket?.on('presence:offline', refresh);
    socket?.on('notification', refresh); // friend request / accepted updates
    return () => {
      socket?.off('presence:online', refresh);
      socket?.off('presence:offline', refresh);
      socket?.off('notification', refresh);
    };
  }, [reload]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await friendApi.search(query.trim());
      setResults(res.data.users);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
      await reload();
      if (query.trim()) await runSearch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: `Friends (${friends.length})` },
    { key: 'requests', label: 'Requests', badge: incoming.length },
    { key: 'search', label: 'Find people' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-brand-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Friends</h1>

      <div className="mt-6 flex gap-2 border-b border-surface-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? 'border-b-2 border-brand-500 text-brand-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
            {Boolean(t.badge) && (
              <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {tab === 'friends' &&
          (friends.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No friends yet — find people in the search tab.
            </p>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
                <Avatar user={f} showStatus />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100">{f.displayName ?? f.username}</p>
                  <p className="text-xs text-gray-500">
                    {f.isOnline
                      ? 'Online'
                      : f.lastSeenAt
                        ? `Last seen ${new Date(f.lastSeenAt).toLocaleString()}`
                        : 'Offline'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => act(() => friendApi.remove(f.id), 'Friend removed')}
                >
                  Remove
                </Button>
              </div>
            ))
          ))}

        {tab === 'requests' && (
          <>
            <h2 className="text-sm font-semibold text-gray-400">Incoming</h2>
            {incoming.length === 0 && <p className="text-sm text-gray-600">No incoming requests.</p>}
            {incoming.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
                <Avatar user={r.sender} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100">
                    {r.sender?.displayName ?? r.sender?.username}
                  </p>
                  <p className="text-xs text-gray-500">@{r.sender?.username}</p>
                </div>
                <Button onClick={() => act(() => friendApi.accept(r.id), 'Request accepted')}>
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => act(() => friendApi.reject(r.id), 'Request rejected')}
                >
                  Reject
                </Button>
              </div>
            ))}

            <h2 className="pt-4 text-sm font-semibold text-gray-400">Sent</h2>
            {outgoing.length === 0 && <p className="text-sm text-gray-600">No sent requests.</p>}
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
                <Avatar user={r.receiver} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100">
                    {r.receiver?.displayName ?? r.receiver?.username}
                  </p>
                  <p className="text-xs text-gray-500">Pending…</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => act(() => friendApi.cancel(r.id), 'Request cancelled')}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </>
        )}

        {tab === 'search' && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
              className="flex gap-2"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or name…"
                className="input-field"
              />
              <Button type="submit" isLoading={searching}>
                Search
              </Button>
            </form>

            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
                <Avatar user={u} showStatus />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100">{u.displayName ?? u.username}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
                {u.relation === 'NONE' && (
                  <Button onClick={() => act(() => friendApi.sendRequest(u.id), 'Request sent')}>
                    Add friend
                  </Button>
                )}
                {u.relation === 'FRIENDS' && (
                  <span className="text-sm text-green-400">✓ Friends</span>
                )}
                {u.relation === 'REQUEST_SENT' && (
                  <span className="text-sm text-gray-500">Request pending</span>
                )}
                {u.relation === 'REQUEST_RECEIVED' && u.requestId && (
                  <Button
                    onClick={() => act(() => friendApi.accept(u.requestId!), 'Request accepted')}
                  >
                    Accept
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
