import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppNotification } from '@/types';

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(
      state,
      action: PayloadAction<{ notifications: AppNotification[]; unreadCount: number }>,
    ) {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    },
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.items = [action.payload, ...state.items].slice(0, 100);
      state.unreadCount += 1;
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead(state) {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    removeNotificationById(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.isRead) state.unreadCount = Math.max(0, state.unreadCount - 1);
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotificationById,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
