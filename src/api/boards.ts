import { apiClient } from "./client";
import type { Board, ThreadDetailResponse, ThreadListResponse } from "../types/api";

export const boardsApi = {
  listBoards: () =>
    apiClient.get<Board[]>("/boards"),

  listThreads: (boardId: string) =>
    apiClient.get<ThreadListResponse>(`/boards/${boardId}`),

  getThread: (boardId: string, threadId: string) =>
    apiClient.get<ThreadDetailResponse>(`/boards/${boardId}/${threadId}`),

  createThread: (
    boardId: string,
    data: { title: string; content: string; posterName?: string; posterSubInfo?: string },
    turnstileSession: string,
    sessionId?: string,
  ) =>
    apiClient.post<{ thread: import("../types/api").Thread; firstPost: import("../types/api").Post }>(
      `/boards/${boardId}`,
      data,
      { turnstileSession, sessionId },
    ),

  createPost: (
    boardId: string,
    threadId: string,
    data: { content: string; posterName?: string; posterSubInfo?: string },
    turnstileSession: string,
    sessionId?: string,
  ) =>
    apiClient.post<import("../types/api").Post>(
      `/boards/${boardId}/${threadId}`,
      data,
      { turnstileSession, sessionId },
    ),
};
