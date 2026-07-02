import { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '@/socket';
import { notificationApi } from '@/api/notification.api';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  addNotification,
  markAllNotificationsRead,
  markNotificationRead,
  setNotifications,
} from '@/redux/slices/notificationsSlice';
import { watchPath } from '@/constants';
import type { AppNotification } from '@/types';

function NotificationToast({
  notification,
  onJoin,
  onDismiss,
}: {
  notification: AppNotification;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex w-80 items-start gap-3">
      {notification.imageUrl ? (
        <img src={notification.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-xl">
          🎬
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-100">{notification.title}</p>
        {notification.body && <p className="mt-0.5 text-xs text-gray-400">{notification.body}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={onJoin}
            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-500"
          >
            ▶ Join now
          </button>
          <button
            onClick={onDismiss}
            className="rounded-md border border-surface-border px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Global realtime notifications: loads the inbox, listens on the socket and
 * shows "X started watching Y — Join now" popups that jump straight into the room.
 */
export function useNotifications() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, unreadCount } = useAppSelector((s) => s.notifications);

  const load = useCallback(async () => {
    const res = await notificationApi.list();
    dispatch(
      setNotifications({
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount,
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotification = (notification: AppNotification) => {
      dispatch(addNotification(notification));

      const roomId = notification.data?.roomId;
      const joinable =
        roomId &&
        ['MOVIE_STARTED', 'MOVIE_INVITATION', 'ROOM_INVITE'].includes(notification.type);

      if (joinable) {
        toast(
          (t) => (
            <NotificationToast
              notification={notification}
              onJoin={() => {
                toast.dismiss(t.id);
                navigate(watchPath(String(roomId)));
              }}
              onDismiss={() => toast.dismiss(t.id)}
            />
          ),
          { duration: 10000 },
        );
      } else {
        toast(notification.title, { icon: '🔔' });
      }
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [dispatch, navigate]);

  const markRead = useCallback(
    async (id: string) => {
      dispatch(markNotificationRead(id));
      await notificationApi.markRead(id).catch(() => undefined);
    },
    [dispatch],
  );

  const markAllRead = useCallback(async () => {
    dispatch(markAllNotificationsRead());
    await notificationApi.markAllRead().catch(() => undefined);
  }, [dispatch]);

  return { notifications: items, unreadCount, markRead, markAllRead, reload: load };
}
