import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** true while the app checks for an existing session on first load */
  isInitializing: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isInitializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isInitializing = false;
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    initializationDone(state) {
      state.isInitializing = false;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isInitializing = false;
    },
  },
});

export const { setCredentials, setAccessToken, setUser, initializationDone, logout } =
  authSlice.actions;
export default authSlice.reducer;
