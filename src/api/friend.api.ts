import { api } from './axios';
import type { ApiEnvelope, FriendRequest, PublicUser, SearchedUser } from '@/types';

export const friendApi = {
  list: () => api.get<ApiEnvelope<{ friends: PublicUser[] }>>('/friends').then((r) => r.data),

  search: (q: string) =>
    api
      .get<ApiEnvelope<{ users: SearchedUser[] }>>('/friends/search', { params: { q } })
      .then((r) => r.data),

  requests: () =>
    api
      .get<ApiEnvelope<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>>(
        '/friends/requests',
      )
      .then((r) => r.data),

  sendRequest: (receiverId: string) =>
    api
      .post<ApiEnvelope<{ request: FriendRequest }>>('/friends/requests', { receiverId })
      .then((r) => r.data),

  accept: (requestId: string) =>
    api
      .post<ApiEnvelope<{ friend: PublicUser }>>(`/friends/requests/${requestId}/accept`)
      .then((r) => r.data),

  reject: (requestId: string) =>
    api.post<ApiEnvelope<null>>(`/friends/requests/${requestId}/reject`).then((r) => r.data),

  cancel: (requestId: string) =>
    api.delete<ApiEnvelope<null>>(`/friends/requests/${requestId}`).then((r) => r.data),

  remove: (friendId: string) =>
    api.delete<ApiEnvelope<null>>(`/friends/${friendId}`).then((r) => r.data),
};
