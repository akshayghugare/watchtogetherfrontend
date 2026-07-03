export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export type PublicUser = Pick<
  User,
  'id' | 'username' | 'displayName' | 'avatarUrl' | 'isOnline'
> & { bio?: string | null; lastSeenAt?: string | null };

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: { field: string; message: string }[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthData {
  user: User;
  accessToken: string;
}

// ── Friends ──────────────────────────────────────────────
export type SearchRelation = 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED';

export interface SearchedUser extends PublicUser {
  relation: SearchRelation;
  requestId: string | null;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  sender?: PublicUser;
  receiver?: PublicUser;
}

// ── Movies & Rooms ───────────────────────────────────────
export interface Movie {
  id: string;
  title: string;
  description: string | null;
  source: 'UPLOAD' | 'URL';
  fileUrl: string;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  mimeType: string | null;
  uploaderId: string;
  createdAt: string;
  uploader?: PublicUser;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'HOST' | 'MODERATOR' | 'MEMBER';
  user?: PublicUser;
}

export interface RoomInvite {
  id: string;
  roomId: string;
  userId: string;
  invitedById: string | null;
  user?: PublicUser;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  hasPassword: boolean;
  hostId: string;
  movieId: string | null;
  isActive: boolean;
  maxMembers: number;
  playbackPositionSec: number;
  isPlaying: boolean;
  playbackRate: number;
  createdAt: string;
  host?: PublicUser;
  movie?: Movie | null;
  members?: RoomMember[];
  invites?: RoomInvite[];
}

export interface PlaybackState {
  positionSec: number;
  isPlaying: boolean;
  playbackRate: number;
  serverTime: number;
}

// ── Chat ─────────────────────────────────────────────────
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE_NOTE' | 'GIF' | 'SYSTEM';

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: PublicUser;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  sender?: PublicUser;
  replyTo?: ChatMessage | null;
  reactions?: MessageReaction[];
}

// ── Notifications ────────────────────────────────────────
export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'MOVIE_STARTED'
  | 'MOVIE_INVITATION'
  | 'INCOMING_CALL'
  | 'NEW_MESSAGE'
  | 'ROOM_INVITE'
  | 'MEMBER_JOINED'
  | 'HOST_TRANSFERRED'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  data: { roomId?: string; roomCode?: string; requestId?: string; [k: string]: unknown } | null;
  isRead: boolean;
  createdAt: string;
  actor?: PublicUser | null;
}

// ── Calls ────────────────────────────────────────────────
export interface CallPeer {
  socketId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface PeerMediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

/** Room-wide screen share announcement (`screen:share-state`). */
export interface ScreenShareState {
  roomId: string;
  sharing: boolean;
  userId: string | null;
  username: string | null;
}
