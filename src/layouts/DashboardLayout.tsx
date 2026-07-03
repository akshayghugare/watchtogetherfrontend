import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { friendApi } from '@/api/friend.api';
import { getSocket } from '@/socket';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { ROUTES } from '@/constants';
import type { PublicUser } from '@/types';

const baseNavItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: '🏠' },
  { to: ROUTES.ROOMS, label: 'Movie Rooms', icon: '🎬' },
  { to: ROUTES.FRIENDS, label: 'Friends', icon: '👥' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [onlineFriends, setOnlineFriends] = useState<PublicUser[]>([]);

  const navItems =
    user?.role === 'ADMIN'
      ? [...baseNavItems, { to: ROUTES.ADMIN, label: 'Admin', icon: '🛡️' }]
      : baseNavItems;

  useEffect(() => {
    let cancelled = false;
    const loadFriends = () =>
      friendApi
        .list()
        .then((res) => {
          if (!cancelled) setOnlineFriends(res.data.friends.filter((f) => f.isOnline));
        })
        .catch(() => undefined);

    void loadFriends();
    const socket = getSocket();
    const refresh = () => void loadFriends();
    socket?.on('presence:online', refresh);
    socket?.on('presence:offline', refresh);
    return () => {
      cancelled = true;
      socket?.off('presence:online', refresh);
      socket?.off('presence:offline', refresh);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-border bg-surface-raised md:flex">
        <div className="flex items-center gap-2 px-6 py-5 text-lg font-bold">
          <span>🎬</span>
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            CollabPlatform
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300'
                    : 'text-gray-400 hover:bg-surface-overlay hover:text-gray-200'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {onlineFriends.length > 0 && (
            <div className="pt-6">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Online — {onlineFriends.length}
              </p>
              {onlineFriends.map((f) => (
                <div key={f.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <Avatar user={f} size="sm" showStatus />
                  <span className="truncate text-sm text-gray-300">
                    {f.displayName ?? f.username}
                  </span>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-surface-border p-4">
          <div className="flex items-center gap-3">
            <Avatar user={user ?? undefined} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-200">
                {user?.displayName ?? user?.username}
              </p>
              <p className="truncate text-xs text-gray-500">@{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-surface-overlay hover:text-gray-300"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-surface-border bg-surface-raised px-4 py-3 md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <span>🎬</span>
            <span className="font-bold text-white">CollabPlatform</span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 md:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="rounded-lg p-2 text-lg"
                  title={item.label}
                >
                  {item.icon}
                </NavLink>
              ))}
            </nav>
            <NotificationsDropdown />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
