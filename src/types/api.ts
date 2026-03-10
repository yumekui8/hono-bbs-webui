// ===== 共通 =====

export interface ApiError {
  error: string;
  message: string;
}

// ===== Auth =====

export interface TurnstileSession {
  sessionId: string;
  alreadyIssued?: boolean;
}

export interface IdentityUser {
  id: string;
  displayName: string;
  bio: string | null;
  email: string | null;
  isActive: boolean;
  primaryGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignInResponse {
  sessionId: string;
  userId: string;
  displayName: string;
  expiresAt: string;
}

export type SignUpResponse = IdentityUser;

// ===== Group =====

export interface Group {
  id: string;
  name: string;
  createdAt: string;
}

// ===== Board =====

export type IdFormat =
  | "daily_hash"
  | "daily_hash_or_user"
  | "api_key_hash"
  | "api_key_hash_or_user"
  | "none";

export interface Board {
  id: string;
  ownerUserId: string | null;
  ownerGroupId: string | null;
  permissions: string;
  name: string;
  description: string | null;
  maxThreads: number;
  maxThreadTitleLength: number;
  defaultMaxPosts: number;
  defaultMaxPostLength: number;
  defaultMaxPostLines: number;
  defaultMaxPosterNameLength: number;
  defaultMaxPosterSubInfoLength: number;
  defaultMaxPosterMetaInfoLength: number;
  defaultPosterName: string;
  defaultIdFormat: IdFormat;
  defaultThreadOwnerUserId: string | null;
  defaultThreadOwnerGroupId: string | null;
  defaultThreadPermissions: string;
  createdAt: string;
}

// ===== Thread =====

export interface Thread {
  id: string;
  boardId: string;
  ownerUserId: string | null;
  ownerGroupId: string | null;
  permissions: string;
  title: string;
  maxPosts: number | null;
  maxPostLength: number | null;
  maxPostLines: number | null;
  maxPosterNameLength: number | null;
  maxPosterSubInfoLength: number | null;
  maxPosterMetaInfoLength: number | null;
  posterName: string | null;
  idFormat: IdFormat | null;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadListResponse {
  board: Board;
  threads: Thread[];
}

// ===== Post =====

export interface Post {
  id: string;
  threadId: string;
  postNumber: number;
  ownerUserId?: string | null;
  ownerGroupId?: string | null;
  permissions?: string;
  userId: string | null;
  displayUserId: string;
  posterName: string;
  posterSubInfo: string | null;
  content: string;
  createdAt: string;
}

export interface ThreadDetailResponse {
  thread: Thread;
  posts: Post[];
}
