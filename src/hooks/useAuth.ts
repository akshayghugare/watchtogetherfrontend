import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { logout as logoutAction, setCredentials, setUser } from '@/redux/slices/authSlice';
import { authApi, type LoginInput } from '@/api/auth.api';
import { disconnectSocket } from '@/socket';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, accessToken, isInitializing } = useAppSelector((s) => s.auth);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await authApi.login(input);
      dispatch(setCredentials(res.data));
      return res;
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      disconnectSocket();
      dispatch(logoutAction());
    }
  }, [dispatch]);

  const refreshProfile = useCallback(async () => {
    const res = await authApi.me();
    dispatch(setUser(res.data.user));
  }, [dispatch]);

  return {
    user,
    isAuthenticated: Boolean(user && accessToken),
    isInitializing,
    login,
    logout,
    refreshProfile,
  };
}
