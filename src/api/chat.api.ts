import { api } from './axios';
import type { ApiEnvelope, ChatMessage } from '@/types';

export const chatApi = {
  history: (roomId: string, opts: { before?: string; search?: string; pinned?: boolean } = {}) =>
    api
      .get<ApiEnvelope<{ messages: ChatMessage[] }>>(`/chat/${roomId}/messages`, {
        params: {
          before: opts.before,
          search: opts.search,
          pinned: opts.pinned ? 'true' : undefined,
        },
      })
      .then((r) => r.data),

  uploadFile: (roomId: string, file: File, opts: { content?: string; replyToId?: string } = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (opts.content) form.append('content', opts.content);
    if (opts.replyToId) form.append('replyToId', opts.replyToId);
    return api
      .post<ApiEnvelope<{ message: ChatMessage }>>(`/chat/${roomId}/messages/file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
