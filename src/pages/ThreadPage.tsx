import { Link, useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { boardsApi } from "../api/boards";
import type { Post, Thread } from "../types/api";
import { Loading } from "../components/ui/Loading";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../api/client";
import { KebabMenu } from "../components/ui/KebabMenu";
import type { KebabMenuItem } from "../components/ui/KebabMenu";
import { useSettings } from "../contexts/SettingsContext";
import { updateHistory, getHistoryEntry } from "../utils/history";
import { isNGPost } from "../utils/ngFilter";
import { useTheme, isDarkTheme } from "../contexts/ThemeContext";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { useLayout } from "../contexts/LayoutContext";
import { loadDraft, saveDraft, clearDraft } from "../utils/draftCache";

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
const FOOTER_H = 64;

const LINK_CLASSES: Record<LinkType, string> = {
  image:   "text-orange-500 dark:text-orange-400 hover:underline break-all",
  twitter: "text-sky-400 dark:text-sky-300 hover:underline break-all",
  youtube: "text-red-500 dark:text-red-400 hover:underline break-all",
  url:     "text-[#4169e1] dark:text-[#6b8fe8] hover:underline break-all",
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
  while ((m = urlRe.exec(content)) !== null)
    raw.push({ index: m.index, end: m.index + m[0].length, type: getLinkType(m[0]), value: m[0] });
  const anchorRe = new RegExp(ANCHOR_REGEX.source, "g");
  while ((m = anchorRe.exec(content)) !== null)
    raw.push({ index: m.index, end: m.index + m[0].length, type: "anchor", value: m[0] });
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
      if (!isNaN(s) && !isNaN(e)) for (let i = s; i <= Math.min(e, s + 50); i++) targets.push(i);
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
        <div className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/50 text-white px-0.5 rounded leading-tight">▶</div>
      )}
    </button>
  );
}

// ============================================================
// PostView
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
  onReply?: (postNumber: number) => void;
  replyIcon?: string;
}

const PostView = memo(function PostView({
  post, parts, anchorCount, idCount,
  onAnchorClick, onAnchorCountClick, onIdClick, onNameClick, onBodyClick, onImageClick, onReply, replyIcon,
}: PostViewProps) {
  const previewItems = useMemo(() => getPreviewItems(parts), [parts]);
  const imageUrls = useMemo(() => previewItems.filter(p => p.isImage).map(p => p.href), [previewItems]);
  const heat = anchorCount >= 3 ? heatClass(anchorCount) : "";

  return (
    <article id={onBodyClick ? `p${post.postNumber}` : undefined}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-2 px-2 py-0.5 bg-gray-50 dark:bg-white/5 text-[11px] text-gray-400 dark:text-gray-500 leading-5">
        <span className="flex items-center gap-0.5 shrink-0">
          <a
            href={onBodyClick ? `#p${post.postNumber}` : undefined}
            onClick={(e) => {
              if (anchorCount > 0) { e.preventDefault(); onAnchorCountClick(elemTop(e)); }
            }}
            className={`font-bold hover:underline tabular-nums w-5 text-right cursor-pointer ${heat || "text-gray-500 dark:text-gray-400"}`}
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
        {onReply && (
          <button
            type="button"
            onClick={() => onReply(post.postNumber)}
            className="ml-auto w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            aria-label="返信"
          >
            {replyIcon
              ? <img src={replyIcon} alt="" className="w-4 h-4" />
              : <span className="text-[10px] text-[var(--link-color)]">返信</span>
            }
          </button>
        )}
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
          if (part.type === "text") return <span key={i} className={heat}>{part.value}</span>;
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
  onReply?: (postNumber: number) => void;
  replyIcon?: string;
  postsContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function PopupOverlay({
  popups, parsedContents, allPosts, postByNumber, anchorMap, idCountMap, pushPopup, onCloseTop, onCloseAll, onReply, replyIcon, postsContainerRef,
}: PopupOverlayProps) {
  const backdropTouchStartX = useRef(0);
  const popupTouchStartX = useRef(0);
  // Refs to the popup content divs (for measuring scrollHeight)
  const contentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());

  // Measure content height after each render
  useLayoutEffect(() => {
    let changed = false;
    const next = new Map(measuredHeights);
    for (const popup of popups) {
      const el = contentRefs.current.get(popup.id);
      if (el) {
        const h = el.scrollHeight;
        if (next.get(popup.id) !== h) { next.set(popup.id, h); changed = true; }
      }
    }
    if (changed) setMeasuredHeights(next);
  });

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
    onReply: onReply ? (n: number) => { onCloseAll(); onReply(n); } : undefined,
  });

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
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
      {popups.map((popup, stackIdx) => {
        const vh = window.innerHeight;
        const spaceAbove = popup.triggerY - popup.headerBottom;
        const maxH = Math.round((vh - popup.headerBottom) * 0.9);
        const measuredH = measuredHeights.get(popup.id);
        // Compute positioning:
        // - Not yet measured: hidden for measurement pass
        // - Fits above trigger: bottom at triggerY, top at (triggerY - contentH) clamped to headerBottom
        // - Too tall: top at headerBottom, bottom extends below triggerY up to maxH, scrollable
        let posStyle: React.CSSProperties;
        if (measuredH === undefined) {
          posStyle = { top: popup.headerBottom, maxHeight: maxH, visibility: "hidden" };
        } else if (measuredH <= spaceAbove) {
          posStyle = {
            bottom: Math.max(0, vh - popup.triggerY),
            top: Math.max(popup.headerBottom, popup.triggerY - measuredH),
            overflowY: "auto",
          };
        } else {
          posStyle = { top: popup.headerBottom, maxHeight: maxH, overflowY: "auto" };
        }

        // ポップアップ水平位置: postsContainerRef が取得できればそれに合わせる、なければ中央
        const postsRect = postsContainerRef?.current?.getBoundingClientRect();
        const hStyle: React.CSSProperties = postsRect
          ? { left: postsRect.left, width: postsRect.width }
          : { left: "50%", transform: "translateX(-50%)", width: POPUP_WIDTH };

        return (
          <div
            key={popup.id}
            ref={(el) => { if (el) contentRefs.current.set(popup.id, el); else contentRefs.current.delete(popup.id); }}
            className="absolute pointer-events-auto bg-[var(--bg-page)] border-2 border-blue-400 dark:border-blue-500 shadow-2xl"
            style={{ zIndex: 51 + stackIdx, ...hStyle, ...posStyle }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => { popupTouchStartX.current = e.touches[0].clientX; e.stopPropagation(); }}
            onTouchEnd={(e) => {
              const diff = e.changedTouches[0].clientX - popupTouchStartX.current;
              if (diff > 50) onCloseAll();
              e.stopPropagation();
            }}
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {popup.posts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">投稿が見つかりません</p>
              ) : (
                popup.posts.map((post) => (
                  <PostView
                    key={post.id}
                    post={post}
                    parts={parsedContents.get(post.id) ?? [{ type: "text", value: post.content }]}
                    anchorCount={anchorMap.get(post.postNumber)?.size ?? 0}
                    idCount={idCountMap.get(post.displayUserId) ?? 1}
                    {...makeHandlers(post)}
                    replyIcon={replyIcon}
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
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer" onClick={onClose}>
      <img src={currentUrl} alt="" className="max-w-full max-h-full object-contain select-none pointer-events-none" draggable={false} />
      {total > 1 && index > 0 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }} className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center text-white text-3xl opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer">‹</button>
      )}
      {total > 1 && index < total - 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }} className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center text-white text-3xl opacity-50 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer">›</button>
      )}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent" onClick={(e) => e.stopPropagation()}>
        <span className="text-white text-sm opacity-80">{total > 1 ? `${index + 1} / ${total}` : ""}</span>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button type="button" onClick={() => setSaveMenuOpen(o => !o)} className="text-white text-sm opacity-70 hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 px-3 py-1 rounded cursor-pointer">保存 ▾</button>
            {saveMenuOpen && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg min-w-max z-10">
                <button type="button" onClick={() => { downloadImage(currentUrl); setSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">この画像を保存</button>
                {total > 1 && (
                  <button type="button" onClick={() => { state.images.forEach((url, i) => setTimeout(() => downloadImage(url), i * 200)); setSaveMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">このレスの画像全てを保存</button>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-white text-xl opacity-70 hover:opacity-100 transition-opacity cursor-pointer">✕</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Write panel (shared between mobile overlay and PC inline)
// ============================================================

interface WritePanelContentProps {
  thread: Thread | null;
  writeContent: string;
  setWriteContent: (v: string) => void;
  writePosterName: string;
  setWritePosterName: (v: string) => void;
  writePosterSubInfo: string;
  setWritePosterSubInfo: (v: string) => void;
  writeShowOptions: boolean;
  setWriteShowOptions: (v: boolean) => void;
  writeSubmitting: boolean;
  writeError: string | null;
  writeShowTurnstileHint: boolean;
  turnstileSession: string | null;
  isLoggedIn: boolean;
  onSubmit: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  /** 書き込みテキストエリアの ref（フォーカス制御用） */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const INPUT_CLASS = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-[var(--bg-surface)] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors";

function WritePanelContent({
  thread, writeContent, setWriteContent, writePosterName, setWritePosterName,
  writePosterSubInfo, setWritePosterSubInfo, writeShowOptions, setWriteShowOptions,
  writeSubmitting, writeError, writeShowTurnstileHint, turnstileSession, isLoggedIn,
  onSubmit, onClose, isMobile, textareaRef,
}: WritePanelContentProps) {
  const submitBtn = (
    <Button
      type="button"
      size="sm"
      disabled={writeSubmitting || !writeContent.trim() || !turnstileSession}
      onClick={onSubmit}
      style={{ padding: "6px 14px" }}
    >
      {writeSubmitting ? "送信中..." : "投稿"}
    </Button>
  );

  return (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-[var(--bg-surface)]">
        <span className="text-sm font-medium">返信する</span>
        <div className="flex items-center gap-2">
          {submitBtn}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!turnstileSession && (
        <div className="mx-3 mt-3 px-2 py-1.5 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300 shrink-0">
          書き込みには Turnstile トークンが必要です。
          <Link to="/settings" className="underline font-medium ml-1">設定ページ</Link>
          で設定してください。
        </div>
      )}

      <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto min-h-0">
        {/* Name row */}
        <div className="flex items-end gap-2 shrink-0">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">投稿者名（省略可）</label>
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
            onClick={() => setWriteShowOptions(!writeShowOptions)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2 shrink-0"
          >
            {writeShowOptions ? "▲ 閉じる" : "▼ オプション"}
          </button>
        </div>

        {writeShowOptions && (
          <div className="shrink-0">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メール（sage など）</label>
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

        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            本文 <span className="text-red-500">*</span>
            {!isMobile && <span className="ml-1 text-gray-300 dark:text-gray-600 font-normal">（Ctrl+Enter で送信）</span>}
          </label>
          <textarea
            ref={textareaRef}
            value={writeContent}
            onChange={(e) => setWriteContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            maxLength={5000}
            className={`${INPUT_CLASS} flex-1 resize-none min-h-[8rem]`}
            placeholder="本文を入力..."
          />
        </div>

        {writeError && (
          <div className="space-y-1 shrink-0">
            <p className="text-xs text-red-600 dark:text-red-400">{writeError}</p>
            {writeShowTurnstileHint && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <Link to="/settings" className="underline font-medium">設定ページ</Link>
                で Turnstile トークンを設定・更新してください。
              </p>
            )}
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-[var(--bg-surface)]">
          <p className="text-xs text-gray-400 dark:text-gray-500">※ 匿名投稿</p>
        </div>
      )}
    </>
  );
}

// ============================================================
// ThreadPage
// ============================================================

export function ThreadPage() {
  const { boardId, threadId } = useParams<{ boardId: string; threadId: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, logout, turnstileSession, sessionId } = useAuth();
  const { ng, defaultPosterName, defaultPosterSubInfo, historyMaxCount, gestureSensitivity } = useSettings();
  const { resolvedTheme } = useTheme();
  const { setWideMode } = useLayout();
  const dark = isDarkTheme(resolvedTheme);
  const reloadIcon = dark ? "/reload_dark.svg" : "/reload_light.svg";
  const writeIcon = dark ? "/write_dark.svg" : "/write_light.svg";
  const replyIcon = dark ? "/reply_dark.svg" : "/reply_light.svg";

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const postsContainerRef = useRef<HTMLDivElement>(null);

  const [popups, setPopups] = useState<PopupEntry[]>([]);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());

  // マウント時の閲覧履歴（スクロール・既読バー用）
  const prevHistoryEntry = useRef(
    boardId && threadId ? getHistoryEntry(boardId, threadId) : undefined
  );
  const readMarkerRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);

  // Write panel state（下書きキャッシュから初期化）
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeContent, setWriteContent] = useState(() => {
    if (!boardId || !threadId) return "";
    return loadDraft(boardId, threadId)?.content ?? "";
  });
  const [writePosterName, setWritePosterName] = useState(() => {
    if (!boardId || !threadId) return defaultPosterName;
    return loadDraft(boardId, threadId)?.posterName ?? defaultPosterName;
  });
  const [writePosterSubInfo, setWritePosterSubInfo] = useState(() => {
    if (!boardId || !threadId) return defaultPosterSubInfo;
    return loadDraft(boardId, threadId)?.posterSubInfo ?? defaultPosterSubInfo;
  });
  const [writeShowOptions, setWriteShowOptions] = useState(false);
  const [writeSubmitting, setWriteSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeShowTurnstileHint, setWriteShowTurnstileHint] = useState(false);

  const writeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    const locked = popups.length > 0 || lightbox !== null;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [popups.length, lightbox]);

  // PC Wide mode: 書き込みパネル表示時にレイアウトを2倍幅に拡張
  useEffect(() => {
    setWideMode(writeOpen);
    return () => setWideMode(false);
  }, [writeOpen, setWideMode]);

  // 下書きキャッシュ保存
  useEffect(() => {
    if (!boardId || !threadId) return;
    saveDraft({ boardId, threadId, content: writeContent, posterName: writePosterName, posterSubInfo: writePosterSubInfo });
  }, [writeContent, writePosterName, writePosterSubInfo, boardId, threadId]);

  // 書き込みパネル開閉時のテキストエリア自動フォーカス（カーソルを末尾に）
  useEffect(() => {
    if (writeOpen) {
      // スライドインアニメーション完了を待ってからフォーカス
      const timer = setTimeout(() => {
        const el = writeTextareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 220);
      return () => clearTimeout(timer);
    } else {
      writeTextareaRef.current?.blur();
    }
  }, [writeOpen]);

  // ジェスチャー感度設定
  const swipeSensitivity = {
    strong: { minDistance: 50, axisRatio: 1.5 },
    medium: { minDistance: 70, axisRatio: 2.0 },
    weak:   { minDistance: 90, axisRatio: 2.5 },
  }[gestureSensitivity];

  // ページ全体のスワイプジェスチャー（ポップアップなし・書き込みパネル閉のときのみ有効）
  const pageSwipe = useSwipeGesture({
    onSwipeLeft: useCallback(() => {
      if (popups.length === 0 && !writeOpen) setWriteOpen(true);
    }, [popups.length, writeOpen]),
    onSwipeRight: useCallback(() => {
      if (popups.length === 0 && !writeOpen && boardId) {
        navigate(`/boards/${boardId}`, { state: { useCache: true } });
      }
    }, [popups.length, writeOpen, boardId, navigate]),
    minDistance: swipeSensitivity.minDistance,
    axisRatio: swipeSensitivity.axisRatio,
    disabled: popups.length > 0 || writeOpen,
  });

  // 書き込みパネル（モバイル）右スワイプで閉じる
  const writePanelSwipe = useSwipeGesture({
    onSwipeRight: useCallback(() => setWriteOpen(false), []),
    minDistance: Math.max(40, swipeSensitivity.minDistance - 20),
    axisRatio: Math.max(1.0, swipeSensitivity.axisRatio - 0.5),
  });

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
      for (const part of parts) if (part.type === "anchor") targets.push(...parseAnchorTargets(part.value));
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

  const visiblePosts = useMemo(() => {
    const ngFiltered = posts.filter(p => !isNGPost(p, ng));
    if (activeFilters.size === 0) return ngFiltered;
    return ngFiltered.filter((post) => {
      const parts = parsedContents.get(post.id) ?? [];
      if (activeFilters.has("popular") && (anchorMap.get(post.postNumber)?.size ?? 0) >= 3) return true;
      if (activeFilters.has("image") && parts.some(p => p.type === "image")) return true;
      if (activeFilters.has("video") && parts.some(p => p.type === "youtube")) return true;
      if (activeFilters.has("url") && parts.some(p => p.type === "url" || p.type === "twitter")) return true;
      return false;
    });
  }, [posts, ng, activeFilters, parsedContents, anchorMap]);

  // ── Data loading ───────────────────────────────────────────

  const load = useCallback(async (preserveScroll = false) => {
    if (!boardId || !threadId) return;
    const savedScroll = preserveScroll ? window.scrollY : 0;
    setLoading(true);
    setError(null);
    try {
      const data = await boardsApi.getThread(boardId, threadId);
      setThread(data.thread);
      setPosts(data.posts);
      if (preserveScroll) requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "instant" }));
    } catch {
      setError("スレッドの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [boardId, threadId]);

  useEffect(() => { load(); }, [load]);

  // 初回ロード時: 前回の閲覧位置にスクロール
  useEffect(() => {
    if (posts.length === 0 || initialScrollDoneRef.current) return;
    const prev = prevHistoryEntry.current;
    if (!prev) return;
    // 未読レスがある場合のみスクロール
    const maxPost = Math.max(...posts.map(p => p.postNumber));
    if (maxPost <= prev.lastPostNumber) return;
    initialScrollDoneRef.current = true;
    setTimeout(() => {
      readMarkerRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
    }, 50);
  }, [posts]);

  // Update reading history when posts load
  useEffect(() => {
    if (posts.length > 0 && boardId && threadId) {
      const lastPostNumber = Math.max(...posts.map(p => p.postNumber));
      const creatorId = posts[0]?.displayUserId;
      updateHistory({ boardId, threadId, lastPostNumber, creatorId }, historyMaxCount);
    }
  }, [posts, boardId, threadId, historyMaxCount]);

  // ── Popup helpers ──────────────────────────────────────────

  const pushPopup = useCallback((popupPosts: Post[], title: string, triggerY: number) => {
    const headerBottom = stickyHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
    setPopups(prev => [...prev, { id: Date.now(), posts: popupPosts, title, triggerY, headerBottom }]);
  }, []);

  const closeTopPopup = useCallback(() => setPopups(prev => prev.slice(0, -1)), []);
  const clearAllPopups = useCallback(() => setPopups([]), []);

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
    const hasAnchorsFrom = (anchorTargetsMap.get(post.postNumber)?.length ?? 0) > 0;
    const hasAnchorsTo = (anchorMap.get(post.postNumber)?.size ?? 0) > 0;
    if (!hasAnchorsFrom && !hasAnchorsTo) return;
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
    if (treePosts.length <= 1) return;
    pushPopup(treePosts, `>>${post.postNumber} のアンカーツリー`, triggerY);
  }, [postByNumber, anchorTargetsMap, anchorMap, pushPopup]);

  const handleReply = useCallback((postNumber: number) => {
    const anchor = `>>${postNumber}\n`;
    setWriteContent(prev => prev ? `${prev}\n${anchor}\n` : anchor);
    setWriteOpen(true);
  }, []);

  const toggleFilter = (f: FilterType) => {
    setActiveFilters(prev => { const next = new Set(prev); next.has(f) ? next.delete(f) : next.add(f); return next; });
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
        { content: writeContent.trim(), posterName: writePosterName.trim() || undefined, posterSubInfo: writePosterSubInfo.trim() || undefined },
        turnstileSession,
        sessionId ?? undefined,
      );
      setPosts(prev => [...prev, post]);
      setWriteContent("");
      if (boardId && threadId) clearDraft(boardId, threadId);
      setWriteOpen(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setWriteError(`投稿エラー: ${err.message}`);
        if (err.code.toUpperCase().includes("TURNSTILE") || err.status === 401) setWriteShowTurnstileHint(true);
      } else {
        setWriteError("投稿に失敗しました");
      }
    } finally {
      setWriteSubmitting(false);
    }
  };

  // ── Kebab menu ─────────────────────────────────────────────

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

  const writePanelProps = {
    thread, writeContent, setWriteContent, writePosterName, setWritePosterName,
    writePosterSubInfo, setWritePosterSubInfo, writeShowOptions, setWriteShowOptions,
    writeSubmitting, writeError, writeShowTurnstileHint, turnstileSession, isLoggedIn,
    onSubmit: submitPost,
    textareaRef: writeTextareaRef,
  };

  return (
    <div
      ref={pageRef}
      {...pageSwipe.handlers}
      style={{ minHeight: "90vh" }}
    >
      {/* Sticky thread title subheader */}
      <div
        ref={stickyHeaderRef}
        className="sticky top-0 z-40 -mt-8 sm:-mx-4 flex items-stretch bg-[var(--bg-surface)] border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <div className="flex-1 px-3 sm:px-4 py-3 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm leading-snug">{thread?.title ?? "..."}</p>
            {thread && <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{thread.postCount} レス</span>}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="flex items-stretch">
          <KebabMenu items={menuItems} />
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && (
        <div className={writeOpen ? "sm:flex sm:gap-0" : ""}>
          {/* Post list */}
          <div
            ref={postsContainerRef}
            className={writeOpen ? "sm:w-1/2 sm:shrink-0" : "w-full"}
          >
            {/* Filter bar */}
            <div className="mt-3 mb-3 px-1 flex flex-wrap items-center gap-1.5">
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
                  <button type="button" onClick={() => setActiveFilters(new Set())} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">クリア</button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{visiblePosts.length} / {posts.length} 件</span>
                </>
              )}
            </div>

            <div
              className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"
              style={{ paddingBottom: FOOTER_H }}
            >
              {visiblePosts.map((post, idx) => {
                const prev = prevHistoryEntry.current;
                const isLastRead = prev && post.postNumber === prev.lastPostNumber;
                const nextPost = visiblePosts[idx + 1];
                const showReadMarker = isLastRead && nextPost && nextPost.postNumber > prev!.lastPostNumber;
                return (
                  <div key={post.id}>
                    <PostView
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
                      onReply={handleReply}
                      replyIcon={replyIcon}
                    />
                    {showReadMarker && (
                      <div
                        ref={readMarkerRef}
                        className="flex items-center gap-2 px-3 py-1 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 select-none"
                      >
                        <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                        <span>ここまで読んだ</span>
                        <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* PC inline write panel */}
          {writeOpen && (
            <div
              className="hidden sm:flex sm:flex-col sm:w-1/2 sm:shrink-0 sm:border-l sm:border-gray-200 dark:sm:border-gray-700 bg-[var(--bg-surface)]"
              style={{ position: "sticky", top: 0, height: `calc(100vh - ${FOOTER_H}px)` }}
            >
              <WritePanelContent {...writePanelProps} onClose={() => setWriteOpen(false)} isMobile={false} />
            </div>
          )}
        </div>
      )}

      {/* Fixed footer */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)] border-t border-gray-200 dark:border-gray-700"
        style={{ height: FOOTER_H }}
      >
        <div
          className="max-w-[82rem] mx-auto px-4 h-full flex items-center justify-end gap-2 cursor-pointer"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setWriteOpen(o => !o); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            aria-label="書き込み"
          >
            <img src={writeIcon} alt="" className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); load(true); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            aria-label="更新"
          >
            <img src={reloadIcon} alt="" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile write panel (fixed overlay, right-swipe to close) */}
      <div
        className={`fixed inset-0 z-50 flex flex-col sm:hidden bg-[var(--bg-surface)] transition-transform duration-200 ease-in-out ${writeOpen ? "translate-x-0" : "translate-x-full"}`}
        {...writePanelSwipe.handlers}
      >
        <WritePanelContent {...writePanelProps} isMobile={true} />
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
          onReply={handleReply}
          replyIcon={replyIcon}
          postsContainerRef={postsContainerRef}
        />
      )}

      {/* Image lightbox */}
      {lightbox && <ImageLightbox state={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
