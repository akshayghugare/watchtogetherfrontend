import type { PublicUser } from '@/types';

interface AvatarProps {
  user?: Pick<PublicUser, 'username' | 'displayName' | 'avatarUrl' | 'isOnline'> | null;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

export function Avatar({ user, size = 'md', showStatus = false }: AvatarProps) {
  const initial = (user?.displayName ?? user?.username ?? '?')[0]?.toUpperCase();
  return (
    <div className="relative inline-block shrink-0">
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizes[size]} flex items-center justify-center rounded-full bg-brand-700 font-bold text-white`}
        >
          {initial}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface-raised ${
            user?.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      )}
    </div>
  );
}
