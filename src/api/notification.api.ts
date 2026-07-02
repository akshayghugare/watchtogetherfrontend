import { api } from './axios';
import type { ApiEnvelope, AppNotification } from '@/types';

export const notificationApi = {
  list: (page = 1) =>
    api
      .get<ApiEnvelope<{ notifications: AppNotification[]; unreadCount: number; total: number }>>(
        '/notifications',
        { params: { page } },
      )
      .then((r) => r.data),

  markRead: (id: string) =>
    api.patch<ApiEnvelope<null>>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.patch<ApiEnvelope<null>>('/notifications/read-all').then((r) => r.data),

  remove: (id: string) => api.delete<ApiEnvelope<null>>(`/notifications/${id}`).then((r) => r.data),
};
