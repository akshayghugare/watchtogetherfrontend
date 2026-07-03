import { api } from './axios';
import type { ApiEnvelope, FriendRequest, PublicUser, Room, User } from '@/types';

export interface AdminStats {
  users: number;
  onlineUsers: number;
  offlineUsers: number;
  rooms: number;
  activeRooms: number;
  privateRooms: number;
  publicRooms: number;
  movies: number;
  messages: number;
  friendships: number;
  pendingFriendRequests: number;
  activeCalls: number;
  activeScreenShares: number;
}

export interface AdminUser extends User {
  isBanned: boolean;
}

export interface ScreenShareInfo {
  roomId: string;
  userId: string;
  socketId: string;
  username: string | null;
  startedAt: string;
  room?: { id: string; name: string; code: string; privacy: string } | null;
}

export interface AdminRoom extends Room {
  playback: { positionSec: number; isPlaying: boolean; playbackRate: number };
  connectedCount: number;
  callCount: number;
  screenShare: ScreenShareInfo | null;
  updatedAt?: string;
  endedAt?: string | null;
}

export interface AdminRoomDetails {
  room: AdminRoom;
  playback: { positionSec: number; isPlaying: boolean; playbackRate: number };
  status: 'ACTIVE' | 'ENDED';
  connectedUsers: PublicUser[];
  callParticipants: { user: PublicUser; audio: boolean; video: boolean; screen: boolean }[];
  chatMessageCount: number;
  ongoingCall: { id: string; type: 'AUDIO' | 'VIDEO'; participantCount: number } | null;
  screenShare: ScreenShareInfo | null;
}

export interface AdminUserDetails {
  user: AdminUser;
  friends: PublicUser[];
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  hostedRooms: number;
}

export const adminApi = {
  stats: () => api.get<ApiEnvelope<AdminStats>>('/admin/stats').then((r) => r.data),

  listUsers: (page = 1, search?: string) =>
    api
      .get<ApiEnvelope<{ users: AdminUser[] }>>('/admin/users', { params: { page, search } })
      .then((r) => r.data),

  getUser: (userId: string) =>
    api.get<ApiEnvelope<AdminUserDetails>>(`/admin/users/${userId}`).then((r) => r.data),

  setBanned: (userId: string, banned: boolean) =>
    api
      .patch<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${userId}/ban`, { banned })
      .then((r) => r.data),

  listRooms: (page = 1, filters: { privacy?: 'PUBLIC' | 'PRIVATE'; active?: boolean } = {}) =>
    api
      .get<ApiEnvelope<{ rooms: AdminRoom[] }>>('/admin/rooms', {
        params: { page, ...filters },
      })
      .then((r) => r.data),

  getRoom: (roomId: string) =>
    api.get<ApiEnvelope<AdminRoomDetails>>(`/admin/rooms/${roomId}`).then((r) => r.data),

  terminateRoom: (roomId: string) =>
    api.post<ApiEnvelope<null>>(`/admin/rooms/${roomId}/terminate`).then((r) => r.data),

  deleteRoom: (roomId: string) =>
    api.delete<ApiEnvelope<null>>(`/admin/rooms/${roomId}`).then((r) => r.data),

  kickUser: (roomId: string, userId: string) =>
    api.post<ApiEnvelope<null>>(`/admin/rooms/${roomId}/kick`, { userId }).then((r) => r.data),

  stopScreenShare: (roomId: string) =>
    api
      .post<ApiEnvelope<null>>(`/admin/rooms/${roomId}/stop-screen-share`)
      .then((r) => r.data),

  listScreenShares: () =>
    api
      .get<ApiEnvelope<{ screenShares: ScreenShareInfo[] }>>('/admin/screen-shares')
      .then((r) => r.data),
};
