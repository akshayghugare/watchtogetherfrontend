import { api } from './axios';
import type { ApiEnvelope, AuthData, User } from '@/types';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<ApiEnvelope<null>>('/auth/register', input).then((r) => r.data),

  login: (input: LoginInput) =>
    api.post<ApiEnvelope<AuthData>>('/auth/login', input).then((r) => r.data),

  logout: () => api.post<ApiEnvelope<null>>('/auth/logout').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.get<ApiEnvelope<null>>(`/auth/verify-email/${token}`).then((r) => r.data),

  resendVerification: (email: string) =>
    api.post<ApiEnvelope<null>>('/auth/resend-verification', { email }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<ApiEnvelope<null>>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api.post<ApiEnvelope<null>>(`/auth/reset-password/${token}`, { password }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .post<ApiEnvelope<null>>('/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),

  me: () => api.get<ApiEnvelope<{ user: User }>>('/users/me').then((r) => r.data),

  updateProfile: (input: Partial<Pick<User, 'displayName' | 'bio' | 'username'>>) =>
    api.patch<ApiEnvelope<{ user: User }>>('/users/me', input).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api
      .post<ApiEnvelope<{ user: User }>>('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
