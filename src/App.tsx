import { useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { AppRoutes } from '@/routes/AppRoutes';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { initializationDone, setCredentials } from '@/redux/slices/authSlice';
import { authApi } from '@/api/auth.api';
import { connectSocket, disconnectSocket } from '@/socket';
import { API_URL } from '@/constants';

export default function App() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const bootstrapped = useRef(false);

  // Silent session restore: the refresh cookie survives page reloads,
  // so exchange it for a fresh access token and load the profile.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );
        const token = data.data.accessToken;
        const me = await authApi
          .me()
          .catch(() => null);

        if (me) {
          dispatch(setCredentials({ user: me.data.user, accessToken: token }));
        } else {
          dispatch(initializationDone());
        }
      } catch {
        dispatch(initializationDone());
      }
    })();
  }, [dispatch]);

  // Keep the realtime socket in lockstep with the auth state.
  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken);
      return () => disconnectSocket();
    }
    return undefined;
  }, [accessToken]);

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#20242e', color: '#e5e7eb', border: '1px solid #2a2f3a' },
        }}
      />
    </>
  );
}
