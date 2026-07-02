import { useCallback, useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { chatApi } from '@/api/chat.api';
import { getErrorMessage } from '@/api/axios';
import { getSocket } from '@/socket';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import type { ChatMessage } from '@/types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🍿'];

function MessageBubble({
  message,
  isMine,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
}: {
  message: ChatMessage;
  isMine: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  if (message.isDeleted) {
    return <p className="px-2 py-1 text-xs italic text-gray-600">Message deleted</p>;
  }

  // Group reactions by emoji
  const reactionGroups = new Map<string, number>();
  for (const r of message.reactions ?? []) {
    reactionGroups.set(r.emoji, (reactionGroups.get(r.emoji) ?? 0) + 1);
  }

  return (
    <div
      className="group relative flex gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-overlay/50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar user={message.sender} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-brand-300">
            {message.sender?.displayName ?? message.sender?.username}
          </span>
          <span className="text-xs text-gray-600">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.isPinned && <span title="Pinned">📌</span>}
          {message.isEdited && <span className="text-xs text-gray-600">(edited)</span>}
        </div>

        {message.replyTo && !message.replyTo.isDeleted && (
          <div className="mt-0.5 rounded border-l-2 border-brand-600 bg-surface-overlay/60 px-2 py-1 text-xs text-gray-400">
            <span className="font-medium text-gray-300">
              {message.replyTo.sender?.displayName ?? message.replyTo.sender?.username}:
            </span>{' '}
            {message.replyTo.content?.slice(0, 80) ?? '📎 attachment'}
          </div>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{message.content}</p>
        )}

        {message.fileUrl && message.type === 'IMAGE' && (
          <img src={message.fileUrl} alt={message.fileName ?? ''} className="mt-1 max-h-48 rounded-lg" />
        )}
        {message.fileUrl && message.type === 'GIF' && (
          <img src={message.fileUrl} alt="GIF" className="mt-1 max-h-48 rounded-lg" />
        )}
        {message.fileUrl && message.type === 'VIDEO' && (
          <video src={message.fileUrl} controls className="mt-1 max-h-48 rounded-lg" />
        )}
        {message.fileUrl && message.type === 'VOICE_NOTE' && (
          <audio src={message.fileUrl} controls className="mt-1 h-9 w-full" />
        )}
        {message.fileUrl && message.type === 'FILE' && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-brand-300 hover:text-brand-200"
          >
            📎 {message.fileName ?? 'Download file'}
          </a>
        )}

        {reactionGroups.size > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...reactionGroups.entries()].map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="rounded-full bg-surface-overlay px-1.5 py-0.5 text-xs hover:bg-surface-border"
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {showActions && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border border-surface-border bg-surface-raised px-1 py-0.5 shadow-lg">
          {QUICK_REACTIONS.map((e) => (
            <button key={e} onClick={() => onReact(e)} className="rounded p-0.5 text-sm hover:bg-surface-overlay">
              {e}
            </button>
          ))}
          <button onClick={onReply} title="Reply" className="rounded p-0.5 text-sm hover:bg-surface-overlay">
            ↩️
          </button>
          <button onClick={onPin} title="Pin" className="rounded p-0.5 text-sm hover:bg-surface-overlay">
            📌
          </button>
          {message.content && (
            <button
              title="Copy"
              className="rounded p-0.5 text-sm hover:bg-surface-overlay"
              onClick={() => {
                void navigator.clipboard.writeText(message.content ?? '');
                toast.success('Copied');
              }}
            >
              📋
            </button>
          )}
          {isMine && (
            <>
              <button onClick={onEdit} title="Edit" className="rounded p-0.5 text-sm hover:bg-surface-overlay">
                ✏️
              </button>
              <button onClick={onDelete} title="Delete" className="rounded p-0.5 text-sm hover:bg-surface-overlay">
                🗑️
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showEmoji, setShowEmoji] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }, []);

  useEffect(() => {
    chatApi
      .history(roomId)
      .then((res) => {
        setMessages(res.data.messages);
        scrollToBottom();
      })
      .catch(() => undefined);
  }, [roomId, scrollToBottom]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNew = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };
    const onUpdated = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };
    const onDeleted = ({ messageId }: { messageId: string; roomId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: null } : m)),
      );
    };
    const onTyping = ({ userId, username, isTyping }: { userId: string; username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) next.set(userId, username);
        else next.delete(userId);
        return next;
      });
    };

    socket.on('chat:new', onNew);
    socket.on('chat:updated', onUpdated);
    socket.on('chat:deleted', onDeleted);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.off('chat:new', onNew);
      socket.off('chat:updated', onUpdated);
      socket.off('chat:deleted', onDeleted);
      socket.off('chat:typing', onTyping);
    };
  }, [roomId, scrollToBottom]);

  const emitTyping = (isTyping: boolean) => {
    getSocket()?.emit('chat:typing', { roomId, isTyping });
  };

  const onInputChange = (value: string) => {
    setInput(value);
    emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = () => {
    const content = input.trim();
    if (!content) return;
    const socket = getSocket();
    if (!socket) return;

    if (editing) {
      socket.emit('chat:edit', { messageId: editing.id, content }, (res: { ok: boolean; error?: string }) => {
        if (!res.ok) toast.error(res.error ?? 'Edit failed');
      });
      setEditing(null);
    } else {
      socket.emit(
        'chat:send',
        { roomId, content, replyToId: replyTo?.id },
        (res: { ok: boolean; error?: string }) => {
          if (!res.ok) toast.error(res.error ?? 'Send failed');
        },
      );
      setReplyTo(null);
    }
    setInput('');
    emitTyping(false);
  };

  const uploadFile = async (file: File) => {
    try {
      await chatApi.uploadFile(roomId, file, { replyToId: replyTo?.id });
      setReplyTo(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const react = (messageId: string, emoji: string) => {
    getSocket()?.emit('chat:react', { messageId, emoji });
  };

  const typingLabel = [...typingUsers.values()].filter(Boolean);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-surface-border bg-surface-raised">
      <div className="border-b border-surface-border px-4 py-2.5 text-sm font-semibold text-white">
        💬 Room chat
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-600">Say hi — the movie's better with commentary 🍿</p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.senderId === user?.id}
            onReply={() => {
              setReplyTo(m);
              setEditing(null);
            }}
            onEdit={() => {
              setEditing(m);
              setReplyTo(null);
              setInput(m.content ?? '');
            }}
            onDelete={() => getSocket()?.emit('chat:delete', { messageId: m.id })}
            onReact={(emoji) => react(m.id, emoji)}
            onPin={() => getSocket()?.emit('chat:pin', { messageId: m.id })}
          />
        ))}
      </div>

      <div className="h-5 px-4 text-xs text-gray-500">
        {typingLabel.length > 0 && `${typingLabel.join(', ')} ${typingLabel.length === 1 ? 'is' : 'are'} typing…`}
      </div>

      {(replyTo || editing) && (
        <div className="mx-3 mb-1 flex items-center justify-between rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-gray-400">
          <span className="truncate">
            {editing ? '✏️ Editing message' : `↩️ Replying to ${replyTo?.sender?.username}`}
          </span>
          <button
            onClick={() => {
              setReplyTo(null);
              setEditing(null);
              setInput('');
            }}
            className="ml-2 text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-1.5 border-t border-surface-border p-3">
        {showEmoji && (
          <div className="absolute bottom-16 right-3 z-10">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(e: EmojiClickData) => setInput((v) => v + e.emoji)}
              width={300}
              height={380}
            />
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg p-2 text-gray-400 hover:bg-surface-overlay hover:text-gray-200"
          title="Attach file"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="rounded-lg p-2 text-gray-400 hover:bg-surface-overlay hover:text-gray-200"
          title="Emoji"
        >
          😊
        </button>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message…"
          className="input-field max-h-24 flex-1 resize-none !py-2"
        />
        <button
          onClick={send}
          className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-500"
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
