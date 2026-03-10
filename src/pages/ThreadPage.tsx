import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { boardsApi } from "../api/boards";
import type { Post, Thread } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";

// ============================================================
// Types
// ============================================================

type LinkType = "image" | "twitter" | "youtube" | "url";
type ContentPartType = "text" | "anchor" | LinkType;

interface ContentPart {
  type: ContentPartType;
  value: string;
}

interface PreviewItem {
  href: string;
  thumbSrc: string;
  isImage: boolean;
}

interface PopupEntry {
  id: number;
  posts: Post[];
  title: string;
  triggerY: number;
  headerBottom: number;
  closing?: boolean;
}

interface LightboxState {
  images: string[];
  index: number;
}

type FilterType = "popular" | "image" | "video" | "url";

// ============================================================
// Regex & constants
// ============================================================

const URL_REGEX = /https?:\/\/\S+/gi;
const IMAGE_EXT_REGEX = /\.(?:jpe?g|png|gif|webp|bmp|svg)(?:[?#]|$)/i;
const TWITTER_REGEX = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i;
const YOUTUBE_REGEX = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i;
const ANCHOR_REGEX = />>?\d[\d,\-]*/g;

const POPUP_WIDTH = "min(46rem, 100vw)";
const FOOTER_H = 56; // px – must match h-14

const LINK_CLASSES: Record<LinkType, string> = {
  image:   "text-orange-500 dark:text-orange-400 hover:underline break-all",
  twitter: "text-sky-400 dark:text-sky-300 hover:underline break-all",
  youtube: "text-red-500 dark:text-red-400 hover:underline break-all",
  url:     "text-gray-400 dark:text-gray-500 hover:underline break-all",
};

// ============================================================
// Utility functions
// ============================================================

function getLinkType(url: string): LinkType {
  if (IMAGE_EXT_REGEX.test(url)) return "image";
  if (TWITTER_REGEX.test(url)) return "twitter";
  if (YOUTUBE_REGEX.test(url)) return "youtube";
  return "url";
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "www.youtube.com" || u.pathname !== "/watch") return null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

function parseContent(content: string): ContentPart[] {
  type RawMatch = { index: number; end: number; type: ContentPartType; value: string };
  const raw: RawMatch[] = [];

  let m: RegExpExecArray | null;
  const urlRe = new RegExp(URL_REGEX.source, "gi");
  while ((m = urlRe.exec(content)) !== null) {
    raw.push({ index: m.index, end: m.index + m[0].length, type: getLinkType(m[0]), value: m[0] });
  }

  const anchorRe = new RegExp(ANCHOR_REGEX.source, "g");
  while ((m = anchorRe.exec(content)) !== null) {
    raw.push({ index: m.index, end: m.index + m[0].length, type: "anchor", value: m[0] });
  }

  raw.sort((a, b) => a.index - b.index);

  const parts: ContentPart[] = [];
  let lastIndex = 0;
  for (const match of raw) {
    if (match.index < lastIndex) continue;
    if (match.index > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    parts.push({ type: match.type, value: match.value });
    lastIndex = match.end;
  }
  if (lastIndex < content.length) parts.push({ type: "text", value: content.slice(lastIndex) });
  return parts;
}

function parseAnchorTargets(anchor: string): number[] {
  const body = anchor.replace(/^>+/, "");
  const targets: number[] = [];
  for (const seg of body.split(",")) {
    if (seg.includes("-")) {
      const [s, e] = seg.split("-").map(Number);
      if (!isNaN(s) && !isNaN(e)) {
        for (let i = s; i <= Math.min(e, s + 50); i++) targets.push(i);
      }
    } else {
      const n = Number(seg);
      if (!isNaN(n)) targets.push(n);
    }
  }
  return targets;
}

function getPreviewItems(parts: ContentPart[]): PreviewItem[] {
  const items: PreviewItem[] = [];
  for (const p of parts) {
    if (p.type === "image") {
      items.push({ href: p.value, thumbSrc: p.value, isImage: true });
    } else if (p.type === "youtube") {
      const vid = getYouTubeVideoId(p.value);
      if (vid) items.push({ href: p.value, thumbSrc: `https://img.youtube.com/vi/${vid}/default.jpg`, isImage: false });
    }
  }
  return items;
}

function heatClass(count: number): string {
  if (count >= 7) return "text-red-600 dark:text-red-400 font-medium";
  if (count >= 5) return "text-orange-500 dark:text-orange-400 font-medium";
  if (count >= 3) return "text-amber-500 dark:text-amber-400";
  return "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function elemTop(e: React.MouseEvent): number {
  return (e.currentTarget as HTMLElement).getBoundingClientRect().top;
}

async function downloadImage(url: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = url.split("/").pop()?.split("?")[0] ?? "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ============================================================
// ImageThumbnail
// ============================================================

function ImageThumbnail({ item, onClick }: { item: PreviewItem; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-20 h-20 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-800 relative cursor-pointer"
    >
      {failed ? (
        <span className="text-[10px] text-gray-400 dark:text-gray-600 text-center px-1 leading-tight">
          画像を取得できません
        </span>
      ) : (
        <img
          src={item.thumbSrc}
          alt=""
          className="max-w-full max-h-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {!item.isImage && !failed && (
        <div className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/50 text-white px-0.5 rounded leading-tight">
          ▶
        </div>
      )}
    </button>
  );
}

// ============================================================
// PostView – unified post rendering (main list + popups)
// ============================================================

interface PostViewProps {
  post: Post;
  parts: ContentPart[];
  anchorCount: number;
  idCount: number;
  onAnchorClick: (targets: number[], triggerY: number) => void;
  onAnchorCountClick: (triggerY: number) => void;
  onIdClick: (triggerY: number) => void;
  onNameClick: (triggerY: number) => void;
  onBodyClick?: (triggerY: number) => void;
  onImageClick?: (images: string[], index: number) => void;
}

const PostView = memo(function PostView({
  post, parts, anchorCount, idCount,
  onAnchorClick, onAnchorCountClick, onIdClick, onNameClick, onBodyClick, onImageClick,
}: PostViewProps) {
  const previewItems = useMemo(() => getPreviewItems(parts), [parts]);
  const imageUrls = useMemo(() => previewItems.filter(p => p.isImage).map(p => p.href), [previewItems]);
  const heat = anchorCount >= 3 ? heatClass(anchorCount) : "";

  return (
    <article id={onBodyClick ? `p${post.postNumber}` : undefined}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-2 px-2 py-0.5 bg-gray-50 dark:bg-gray-900/60 text-[11px] text-gray-400 dark:text-gray-500 leading-5">
        <span className="flex items-center gap-0.5 shrink-0">
          <a
            href={onBodyClick ? `#p${post.postNumber}` : undefined}
            className={`font-bold hover:underline tabular-nums w-5 text-right ${heat || "text-gray-500 dark:text-gray-400"}`}
          >
            {post.postNumber}
          </a>
          {anchorCount > 0 && (
            <button
              type="button"
              onClick={(e) => onAnchorCountClick(elemTop(e))}
              className={`text-[10px] tabular-nums hover:underline cursor-pointer ${heatClass(anchorCount)}`}
            >
              ({anchorCount})
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => onNameClick(elemTop(e))}
          className="text-gray-800 dark:text-gray-200 font-medium hover:underline cursor-pointer"
        >
          {post.posterName}
        </button>
        {post.posterSubInfo && (
          <span className="text-blue-600 dark:text-blue-400">{post.posterSubInfo}</span>
        )}
        <span>{formatDate(post.createdAt)}</span>
        <button
          type="button"
          onClick={(e) => onIdClick(elemTop(e))}
          className={`font-mono hover:underline cursor-pointer ${idCount >= 3 ? heatClass(idCount) : "text-gray-300 dark:text-gray-600"}`}
        >
          ID:{post.displayUserId}
          {idCount > 1 && <span className="ml-0.5">({idCount})</span>}
        </button>
      </div>

      {/* Body */}
      <div
        className={`px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed select-text ${onBodyClick ? "cursor-pointer" : ""}`}
        onClick={(e) => {
          if (!onBodyClick) return;
          const sel = window.getSelection();
          if (sel && sel.toString().length > 0) return;
          onBodyClick(elemTop(e));
        }}
      >
        {parts.map((part, i) => {
          if (part.type === "text") {
            return <span key={i} className={heat}>{part.value}</span>;
          }
          if (part.type === "anchor") {
            const targets = parseAnchorTargets(part.value);
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); onAnchorClick(targets, elemTop(e)); }}
                className="text-green-600 dark:text-green-400 hover:underline hover:bg-green-50 dark:hover:bg-green-900/20 rounded-sm cursor-pointer"
              >
                {part.value}
              </button>
            );
          }
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={LINK_CLASSES[part.type as LinkType]}
            >
              {part.value}
            </a>
          );
        })}
      </div>

      {/* Thumbnails */}
      {previewItems.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {previewItems.map((item, i) => (
            <ImageThumbnail
              key={i}
              item={item}
              onClick={() => {
                if (item.isImage && onImageClick) {
                  const idx = imageUrls.indexOf(item.href);
                  onImageClick(imageUrls, idx >= 0 ? idx : 0);
                } else {
                  window.open(item.href, "_blank", "noopener,noreferrer");
                }
              }}
            />
          ))}
        </div>
      )}
    </article>
  );
});

// ============================================================
// Popup system
// ============================================================

interface PopupOverlayProps {
  popups: PopupEntry[];
  parsedContents: Map<string, ContentPart[]>;
  allPosts: Post[];
  postByNumber: Map<number, Post>;
  anchorMap: Map<number, Set<number>>;
  idCountMap: Map<string, number>;
  pushPopup: (posts: Post[], title: string, triggerY: number) => void;
  onCloseTop: () => void;
  onCloseAll: () => void;
}

function PopupOverlay({
  popups, parsedContents, allPosts, postByNumber, anchorMap, idCountMap, pushPopup, onCloseTop, onCloseAll,
}: PopupOverlayProps) {
  const backdropTouchStartX = useRef(0);
  const popupTouchStartX = useRef(0);

  if (popups.length === 0) return null;

  const makeHandlers = (post: Post) => ({
    onAnchorClick: (targets: number[], triggerY: number) => {
      const found = targets.flatMap(n => { const p = postByNumber.get(n); return p ? [p] : []; });
      pushPopup(found, targets.map(n => ">>" + n).join(" "), triggerY);
    },
    onAnchorCountClick: (triggerY: number) => {
      const fromNums = anchorMap.get(post.postNumber);
      if (!fromNums?.size) return;
      const anchoring = Array.from(fromNums).sort((a, b) => a - b)
        .flatMap(n => { const p = postByNumber.get(n); return p ? [p] : []; });
      pushPopup(anchoring, `>>${post.postNumber} へのレス (${fromNums.size}件)`, triggerY);
    },
    onIdClick: (triggerY: number) => {
      const idPosts = allPosts.filter(p => p.displayUserId === post.displayUserId);
      pushPopup(idPosts, `ID:${post.displayUserId} (${idPosts.length}件)`, triggerY);
    },
    onNameClick: (triggerY: number) => {
      const namePosts = allPosts.filter(p => p.posterName === post.posterName);
      pushPopup(namePosts, `${post.posterName} (${namePosts.length}件)`, triggerY);
    },
  });

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onCloseTop}
        onWheel={onCloseAll}
        onTouchStart={(e) => { backdropTouchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diffX = Math.abs(e.changedTouches[0].clientX - backdropTouchStartX.current);
          if (diffX > 50) onCloseAll();
        }}
      />

      {/* Popup stack */}
      {popups.map((popup, stackIdx) => {
        const vh = window.innerHeight;
        const bottomOffset = Math.max(0, vh - popup.triggerY);
        const maxH = Math.max(80, Math.min(vh * 0.9, popup.triggerY - popup.headerBottom));

        return (
          <div
            key={popup.id}
            className={`absolute pointer-events-auto ${popup.closing ? "popup-fade-out" : "popup-fade-in"}`}
            style={{
              zIndex: 51 + stackIdx,
              left: "50%",
              transform: "translateX(-50%)",
              width: POPUP_WIDTH,
              bottom: bottomOffset,
              maxHeight: maxH,
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => { popupTouchStartX.current = e.touches[0].clientX; e.stopPropagation(); }}
            onTouchEnd={(e) => {
              const diff = e.changedTouches[0].clientX - popupTouchStartX.current;
              if (diff > 50) onCloseAll();
              e.stopPropagation();
            }}
          >
            <div
              className="overflow-y-auto bg-[var(--bg-page)] border-2 border-blue-400 dark:border-blue-500 shadow-2xl divide-y divide-gray-100 dark:divide-gray-800"
              style={{ maxHeight: "inherit" }}
            >
              {popup.posts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  投稿が見つかりません
                </p>
              ) : (
                popup.posts.map((post) => (
                  <PostView
                    key={post.id}
                    post={post}
                    parts={parsedContents.get(post.id) ?? [{ type: "text", value: post.content }]}
                    anchorCount={anchorMap.get(post.postNumber)?.size ?? 0}
                    idCount={idCountMap.get(post.displayUserId) ?? 1}
                    {...makeHandlers(post)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Image lightbox
// ============================================================

function ImageLightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [index, setIndex] = useState(state.index);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  useEffect(() => { setIndex(state.index); }, [state.index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft") setIndex(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex(i => Math.min(state.images.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.images.length, onClose]);

  const total = state.images.length;
  const currentUrl = state.images[index];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      <img
        src={currentUrl}
        alt=""
        className="max-w-full max-h-full object-contain select-none pointer-events-none"
        draggable={false}
      />

      {total > 1 && index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }}
          className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center text-white text-3xl opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
        >
          ‹
        </button>
      )}

      {total > 1 && index < total - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }}
          className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center text-white text-3xl opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
        >
          ›
        </button>
      )}

      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white text-sm opacity-80">
          {total > 1 ? `${index + 1} / ${total}` : ""}
        </span>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSaveMenuOpen(o => !o)}
              className="text-white text-sm opacity-70 hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 px-3 py-1 rounded cursor-pointer"
            >
              保存 ▾
            </button>
            {saveMenuOpen && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg min-w-max z-10">
                <button
                  type="button"
                  onClick={() => { downloadImage(currentUrl); setSaveMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  この画像を保存
                </button>
                {total > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      state.images.forEach((url, i) => {
                        setTimeout(() => downloadImage(url), i * 200);
                      });
                      setSaveMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    このレスの画像全てを保存
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-xl opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ThreadPage
// ============================================================

const INPUT_CLASS = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

export function ThreadPage() {
  const { boardId, threadId } = useParams<{ boardId: string; threadId: string }>();
  const { isLoggedIn, logout, turnstileSession, sessionId } = useAuth();

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  const [popups, setPopups] = useState<PopupEntry[]>([]);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());

  // Write panel state
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeContent, setWriteContent] = useState("");
  const [writePosterName, setWritePosterName] = useState("");
  const [writePosterSubInfo, setWritePosterSubInfo] = useState("");
  const [writeShowOptions, setWriteShowOptions] = useState(false);
  const [writeSubmitting, setWriteSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeShowTurnstileHint, setWriteShowTurnstileHint] = useState(false);
  const writePanelTouchStartX = useRef(0);

  // Body scroll lock when popup or lightbox is open
  useEffect(() => {
    const locked = popups.length > 0 || lightbox !== null;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [popups.length, lightbox]);

  // ── Memoized derived data ──────────────────────────────────

  const parsedContents = useMemo(() => {
    const map = new Map<string, ContentPart[]>();
    for (const post of posts) map.set(post.id, parseContent(post.content));
    return map;
  }, [posts]);

  const postByNumber = useMemo(() => {
    const map = new Map<number, Post>();
    for (const post of posts) map.set(post.postNumber, post);
    return map;
  }, [posts]);

  const anchorTargetsMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const post of posts) {
      const parts = parsedContents.get(post.id) ?? [];
      const targets: number[] = [];
      for (const part of parts) {
        if (part.type === "anchor") targets.push(...parseAnchorTargets(part.value));
      }
      if (targets.length > 0) map.set(post.postNumber, targets);
    }
    return map;
  }, [posts, parsedContents]);

  const anchorMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const [fromNum, targets] of anchorTargetsMap) {
      for (const t of targets) {
        if (!map.has(t)) map.set(t, new Set());
        map.get(t)!.add(fromNum);
      }
    }
    return map;
  }, [anchorTargetsMap]);

  const idCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) map.set(post.displayUserId, (map.get(post.displayUserId) ?? 0) + 1);
    return map;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeFilters.size === 0) return posts;
    return posts.filter((post) => {
      const parts = parsedContents.get(post.id) ?? [];
      if (activeFilters.has("popular") && (anchorMap.get(post.postNumber)?.size ?? 0) >= 3) return true;
      if (activeFilters.has("image") && parts.some(p => p.type === "image")) return true;
      if (activeFilters.has("video") && parts.some(p => p.type === "youtube")) return true;
      if (activeFilters.has("url") && parts.some(p => p.type === "url" || p.type === "twitter")) return true;
      return false;
    });
  }, [posts, activeFilters, parsedContents, anchorMap]);

  // ── Data loading ───────────────────────────────────────────

  const load = useCallback(async () => {
    if (!boardId || !threadId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await boardsApi.getThread(boardId, threadId);
      setThread(data.thread);
      setPosts(data.posts);
    } catch {
      setError("スレッドの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [boardId, threadId]);

  useEffect(() => { load(); }, [load]);

  // ── Popup helpers ──────────────────────────────────────────

  const ANIM_DURATION = 150;

  const pushPopup = useCallback((popupPosts: Post[], title: string, triggerY: number) => {
    const headerBottom = stickyHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
    setPopups(prev => [...prev, { id: Date.now(), posts: popupPosts, title, triggerY, headerBottom }]);
  }, []);

  const closeTopPopup = useCallback(() => {
    setPopups(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const marked = [...prev.slice(0, -1), { ...last, closing: true }];
      setTimeout(() => setPopups(p => p.filter(x => x.id !== last.id)), ANIM_DURATION);
      return marked;
    });
  }, []);

  const clearAllPopups = useCallback(() => {
    setPopups(prev => {
      if (prev.length === 0) return prev;
      const marked = prev.map(p => ({ ...p, closing: true }));
      setTimeout(() => setPopups([]), ANIM_DURATION);
      return marked;
    });
  }, []);

  // ── Popup handlers ─────────────────────────────────────────

  const handleAnchorClick = useCallback((targets: number[], triggerY: number) => {
    const found = targets.flatMap(n => { const p = postByNumber.get(n); return p ? [p] : []; });
    pushPopup(found, targets.map(n => ">>" + n).join(" "), triggerY);
  }, [postByNumber, pushPopup]);

  const handleAnchorCountClick = useCallback((postNumber: number, triggerY: number) => {
    const fromNums = anchorMap.get(postNumber);
    if (!fromNums || fromNums.size === 0) return;
    const anchoring = Array.from(fromNums).sort((a, b) => a - b)
      .flatMap(n => { const p = postByNumber.get(n); return p ? [p] : []; });
    pushPopup(anchoring, `>>${postNumber} へのレス (${fromNums.size}件)`, triggerY);
  }, [anchorMap, postByNumber, pushPopup]);

  const handleIdClick = useCallback((displayUserId: string, triggerY: number) => {
    const idPosts = posts.filter(p => p.displayUserId === displayUserId);
    pushPopup(idPosts, `ID:${displayUserId} (${idPosts.length}件)`, triggerY);
  }, [posts, pushPopup]);

  const handleNameClick = useCallback((posterName: string, triggerY: number) => {
    const namePosts = posts.filter(p => p.posterName === posterName);
    pushPopup(namePosts, `${posterName} (${namePosts.length}件)`, triggerY);
  }, [posts, pushPopup]);

  const handleBodyClick = useCallback((post: Post, triggerY: number) => {
    const visited = new Set<number>();
    const queue = [post.postNumber];
    const treePosts: Post[] = [];
    while (queue.length > 0) {
      const num = queue.shift()!;
      if (visited.has(num)) continue;
      visited.add(num);
      const p = postByNumber.get(num);
      if (p) treePosts.push(p);
      for (const t of (anchorTargetsMap.get(num) ?? [])) if (!visited.has(t)) queue.push(t);
      for (const f of (anchorMap.get(num) ?? [])) if (!visited.has(f)) queue.push(f);
    }
    treePosts.sort((a, b) => a.postNumber - b.postNumber);
    pushPopup(treePosts, `>>${post.postNumber} のアンカーツリー`, triggerY);
  }, [postByNumber, anchorTargetsMap, anchorMap, pushPopup]);

  const toggleFilter = (f: FilterType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  // ── Write panel submit ─────────────────────────────────────

  const submitPost = async () => {
    if (!writeContent.trim() || !boardId || !threadId) return;

    if (!turnstileSession) {
      setWriteError("Turnstile トークンが設定されていません");
      setWriteShowTurnstileHint(true);
      return;
    }

    setWriteSubmitting(true);
    setWriteError(null);
    setWriteShowTurnstileHint(false);

    try {
      const post = await boardsApi.createPost(
        boardId, threadId,
        {
          content: writeContent.trim(),
          posterName: writePosterName.trim() || undefined,
          posterSubInfo: writePosterSubInfo.trim() || undefined,
        },
        turnstileSession,
        sessionId ?? undefined,
      );
      setPosts(prev => [...prev, post]);
      setWriteContent("");
      setWriteOpen(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setWriteError(`投稿エラー: ${err.message}`);
        if (err.code.toUpperCase().includes("TURNSTILE") || err.status === 401) {
          setWriteShowTurnstileHint(true);
        }
      } else {
        setWriteError("投稿に失敗しました");
      }
    } finally {
      setWriteSubmitting(false);
    }
  };

  // ── Kebab menu items ───────────────────────────────────────

  const menuItems: KebabMenuItem[] = [
    { type: "theme" },
    { type: "divider" },
    { type: "link", label: "設定", to: "/settings" },
    ...(boardId ? [{ type: "link" as const, label: "板に戻る", to: `/boards/${boardId}` }] : []),
    { type: "link", label: "板一覧", to: "/boards" },
    ...(isLoggedIn
      ? [{ type: "action" as const, label: "ログアウト", onClick: logout }]
      : [{ type: "link" as const, label: "ログイン", to: "/login" }]),
  ];

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: "popular", label: "人気レス" },
    { key: "image",   label: "画像" },
    { key: "video",   label: "動画" },
    { key: "url",     label: "URL" },
  ];

  return (
    <div>
      {/* Sticky thread title subheader */}
      <div
        ref={stickyHeaderRef}
        className="sticky top-0 z-40 -mt-8 sm:-mx-4 sm:px-4 py-2 bg-[var(--bg-page)] border-b border-gray-200 dark:border-gray-800 mb-4 cursor-pointer"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <KebabMenu items={menuItems} />
        </div>
        <nav className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mb-0.5 -mt-6 pointer-events-none">
          <Link
            to="/"
            className="hover:text-gray-600 dark:hover:text-gray-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            トップ
          </Link>
          <span>/</span>
          <Link
            to="/boards"
            className="hover:text-gray-600 dark:hover:text-gray-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            板一覧
          </Link>
          <span>/</span>
          <Link
            to={`/boards/${boardId}`}
            className="hover:text-gray-600 dark:hover:text-gray-300 truncate max-w-[6rem] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {boardId}
          </Link>
        </nav>
        <div className="flex items-baseline justify-center gap-2">
          <p className="text-base font-bold truncate">{thread?.title ?? "..."}</p>
          {thread && (
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {thread.postCount} レス
            </span>
          )}
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* Filter bar */}
          <div className="mb-3 px-1 flex flex-wrap items-center gap-1.5">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                className={`px-2.5 py-1 text-xs border transition-colors ${
                  activeFilters.has(key)
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                }`}
              >
                {label}{activeFilters.has(key) ? " ✓" : ""}
              </button>
            ))}
            {activeFilters.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilters(new Set())}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  クリア
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredPosts.length} / {posts.length} 件
                </span>
              </>
            )}
          </div>

          {/* Post list */}
          <div
            className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"
            style={{ paddingBottom: FOOTER_H }}
          >
            {filteredPosts.map((post) => (
              <PostView
                key={post.id}
                post={post}
                parts={parsedContents.get(post.id) ?? []}
                anchorCount={anchorMap.get(post.postNumber)?.size ?? 0}
                idCount={idCountMap.get(post.displayUserId) ?? 1}
                onAnchorClick={handleAnchorClick}
                onAnchorCountClick={(triggerY) => handleAnchorCountClick(post.postNumber, triggerY)}
                onIdClick={(triggerY) => handleIdClick(post.displayUserId, triggerY)}
                onNameClick={(triggerY) => handleNameClick(post.posterName, triggerY)}
                onBodyClick={(triggerY) => handleBodyClick(post, triggerY)}
                onImageClick={(images, index) => setLightbox({ images, index })}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </>
      )}

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-end gap-2 px-4 bg-[var(--bg-page)] border-t border-gray-200 dark:border-gray-800 cursor-pointer"
        style={{ height: FOOTER_H }}
        onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setWriteOpen(o => !o); }}
          className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-lg"
          aria-label="書き込み"
        >
          ✏
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); load(); }}
          className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-lg"
          aria-label="更新"
        >
          ↻
        </button>
      </div>

      {/* Write panel */}
      <div
        className={`fixed inset-0 sm:left-auto sm:w-96 sm:bottom-14 z-50 flex flex-col bg-[var(--bg-page)] border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-200 ease-in-out ${writeOpen ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={(e) => { writePanelTouchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - writePanelTouchStartX.current;
          if (diff > 60) setWriteOpen(false);
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-sm font-medium">返信する</span>
          <button
            type="button"
            onClick={() => setWriteOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Turnstile warning */}
        {!turnstileSession && (
          <div className="mx-3 mt-3 px-2 py-1.5 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300 shrink-0">
            書き込みには Turnstile トークンが必要です。
            <Link to="/settings" className="underline font-medium ml-1" onClick={() => setWriteOpen(false)}>
              設定ページ
            </Link>
            で設定してください。
          </div>
        )}

        {/* Form body */}
        <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto min-h-0">
          {/* Name row */}
          <div className="flex items-end gap-2 shrink-0">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                投稿者名（省略可）
              </label>
              <input
                type="text"
                value={writePosterName}
                onChange={(e) => setWritePosterName(e.target.value)}
                maxLength={50}
                placeholder={thread?.posterName ?? "名無し"}
                className={INPUT_CLASS}
              />
            </div>
            <button
              type="button"
              onClick={() => setWriteShowOptions(o => !o)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2 shrink-0"
            >
              {writeShowOptions ? "▲ 閉じる" : "▼ オプション"}
            </button>
          </div>

          {/* Options */}
          {writeShowOptions && (
            <div className="shrink-0">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                メール（sage など）
              </label>
              <input
                type="text"
                value={writePosterSubInfo}
                onChange={(e) => setWritePosterSubInfo(e.target.value)}
                maxLength={100}
                placeholder="sage"
                className={INPUT_CLASS}
              />
            </div>
          )}

          {/* Content textarea */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={writeContent}
              onChange={(e) => setWriteContent(e.target.value)}
              maxLength={5000}
              className={`${INPUT_CLASS} flex-1 resize-none min-h-[8rem]`}
              placeholder="本文を入力..."
            />
          </div>

          {/* Error */}
          {writeError && (
            <div className="space-y-1 shrink-0">
              <p className="text-xs text-red-600 dark:text-red-400">{writeError}</p>
              {writeShowTurnstileHint && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <Link to="/settings" className="underline font-medium" onClick={() => setWriteOpen(false)}>
                    設定ページ
                  </Link>
                  で Turnstile トークンを設定・更新してください。
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit footer */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            {!isLoggedIn && (
              <p className="text-xs text-gray-400 dark:text-gray-500">※ 匿名投稿</p>
            )}
            <div className="ml-auto">
              <Button
                type="button"
                size="sm"
                disabled={writeSubmitting || !writeContent.trim() || !turnstileSession}
                onClick={submitPost}
              >
                {writeSubmitting ? "送信中..." : "投稿する"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Popup overlay */}
      {popups.length > 0 && (
        <PopupOverlay
          popups={popups}
          parsedContents={parsedContents}
          allPosts={posts}
          postByNumber={postByNumber}
          anchorMap={anchorMap}
          idCountMap={idCountMap}
          pushPopup={pushPopup}
          onCloseTop={closeTopPopup}
          onCloseAll={clearAllPopups}
        />
      )}

      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox state={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
