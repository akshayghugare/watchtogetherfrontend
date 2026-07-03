export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  VERIFY_EMAIL: '/verify-email/:token',
  DASHBOARD: '/dashboard',
  FRIENDS: '/friends',
  ROOMS: '/rooms',
  WATCH: '/rooms/:roomId/watch',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin',
} as const;

export function watchPath(roomId: string): string {
  return `/rooms/${roomId}/watch`;
}
