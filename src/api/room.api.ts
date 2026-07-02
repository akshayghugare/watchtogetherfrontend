import { api } from './axios';
import type { ApiEnvelope, Room } from '@/types';

export interface CreateRoomInput {
  name: string;
  movieId?: string;
  privacy?: 'PUBLIC' | 'PRIVATE';
  password?: string;
  maxMembers?: number;
}

export const roomApi = {
  listPublic: (page = 1) =>
    api.get<ApiEnvelope<{ rooms: Room[] }>>('/rooms', { params: { page } }).then((r) => r.data),

  listMine: () => api.get<ApiEnvelope<{ rooms: Room[] }>>('/rooms/mine').then((r) => r.data),

  create: (input: CreateRoomInput) =>
    api.post<ApiEnvelope<{ room: Room }>>('/rooms', input).then((r) => r.data),

  getOne: (roomId: string) =>
    api.get<ApiEnvelope<{ room: Room }>>(`/rooms/${roomId}`).then((r) => r.data),

  join: (roomIdOrCode: string, password?: string) =>
    api
      .post<ApiEnvelope<{ room: Room }>>('/rooms/join', { roomIdOrCode, password })
      .then((r) => r.data),

  leave: (roomId: string) =>
    api.post<ApiEnvelope<null>>(`/rooms/${roomId}/leave`).then((r) => r.data),

  kick: (roomId: string, userId: string) =>
    api.post<ApiEnvelope<null>>(`/rooms/${roomId}/kick`, { userId }).then((r) => r.data),

  transferHost: (roomId: string, newHostId: string) =>
    api
      .post<ApiEnvelope<null>>(`/rooms/${roomId}/transfer-host`, { newHostId })
      .then((r) => r.data),

  invite: (roomId: string, friendId: string) =>
    api.post<ApiEnvelope<null>>(`/rooms/${roomId}/invite`, { friendId }).then((r) => r.data),

  changeMovie: (roomId: string, movieId: string) =>
    api
      .patch<ApiEnvelope<{ room: Room }>>(`/rooms/${roomId}/movie`, { movieId })
      .then((r) => r.data),

  end: (roomId: string) => api.post<ApiEnvelope<null>>(`/rooms/${roomId}/end`).then((r) => r.data),

  myProgress: (roomId: string) =>
    api
      .get<ApiEnvelope<{ positionSec: number }>>(`/rooms/${roomId}/progress`)
      .then((r) => r.data),
};
