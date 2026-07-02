import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { watchPath } from '@/constants';

export function NotificationsDropdown() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-400 transition hover:bg-surface-overlay hover:text-gray-200"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Nothing here yet 💤</p>
            ) : (
              notifications.map((n) => {
                const roomId = n.data?.roomId;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      void markRead(n.id);
                      if (roomId) {
                        setOpen(false);
                        navigate(watchPath(String(roomId)));
                      }
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-overlay ${
                      n.isRead ? 'opacity-60' : ''
                    }`}
                  >
                    <Avatar user={n.actor ?? undefined} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>}
                      <p className="mt-0.5 text-xs text-gray-600">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
