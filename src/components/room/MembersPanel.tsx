import { useState } from 'react';
import toast from 'react-hot-toast';
import { roomApi } from '@/api/room.api';
import { friendApi } from '@/api/friend.api';
import { getErrorMessage } from '@/api/axios';
import { Avatar } from '@/components/ui/Avatar';
import type { Room } from '@/types';

interface MembersPanelProps {
  room: Room;
  myUserId: string;
  isHost: boolean;
  onChanged: () => void;
}

export function MembersPanel({ room, myUserId, isHost, onChanged }: MembersPanelProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<{ id: string; label: string }[]>([]);

  const members = room.members ?? [];

  const openInvite = async () => {
    try {
      const res = await friendApi.list();
      const memberIds = new Set(members.map((m) => m.userId));
      setFriends(
        res.data.friends
          .filter((f) => !memberIds.has(f.id))
          .map((f) => ({ id: f.id, label: f.displayName ?? f.username })),
      );
      setShowInvite(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const invite = async (friendId: string) => {
    try {
      await roomApi.invite(room.id, friendId);
      toast.success('Invitation sent!');
      setShowInvite(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const kick = async (userId: string) => {
    try {
      await roomApi.kick(room.id, userId);
      toast.success('Member kicked');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const makeHost = async (userId: string) => {
    try {
      await roomApi.transferHost(room.id, userId);
      toast.success('Host transferred');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-white">👥 Members ({members.length})</h3>
        <button onClick={openInvite} className="text-xs text-brand-400 hover:text-brand-300">
          + Invite
        </button>
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto p-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-overlay/50">
            <Avatar user={m.user} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-200">
                {m.user?.displayName ?? m.user?.username}
                {m.userId === myUserId && <span className="text-gray-500"> (you)</span>}
              </p>
            </div>
            {m.role === 'HOST' ? (
              <span className="text-xs text-yellow-500" title="Host">
                👑
              </span>
            ) : (
              isHost && (
                <div className="flex gap-1">
                  <button
                    onClick={() => void makeHost(m.userId)}
                    title="Make host"
                    className="rounded p-1 text-xs text-gray-500 hover:bg-surface-overlay hover:text-yellow-400"
                  >
                    👑
                  </button>
                  <button
                    onClick={() => void kick(m.userId)}
                    title="Kick"
                    className="rounded p-1 text-xs text-gray-500 hover:bg-surface-overlay hover:text-red-400"
                  >
                    🚫
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {showInvite && (
        <div className="border-t border-surface-border p-3">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-semibold text-gray-400">Invite a friend</p>
            <button onClick={() => setShowInvite(false)} className="text-xs text-gray-600">
              ✕
            </button>
          </div>
          {friends.length === 0 ? (
            <p className="text-xs text-gray-600">All your friends are already here 🎉</p>
          ) : (
            friends.map((f) => (
              <button
                key={f.id}
                onClick={() => void invite(f.id)}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 hover:bg-surface-overlay"
              >
                {f.label}
              </button>
            ))
          )}
          <p className="mt-2 border-t border-surface-border pt-2 text-xs text-gray-600">
            Or share the room code: <span className="font-mono text-brand-300">{room.code}</span>
          </p>
        </div>
      )}
    </div>
  );
}
