import type { Post, Thread } from "../types/api";
import type { NGSettings } from "../contexts/SettingsContext";

function toLines(s: string): string[] {
  return s.split("\n").map(l => l.trim()).filter(Boolean);
}

function matchesAnyRegex(text: string, patterns: string[]): boolean {
  for (const p of patterns) {
    try {
      if (new RegExp(p, "i").test(text)) return true;
    } catch { /* invalid regex, skip */ }
  }
  return false;
}

export function isNGPost(post: Post, ng: NGSettings): boolean {
  const ngIds = toLines(ng.id);
  if (ngIds.includes(post.displayUserId)) return true;

  const ngNames = toLines(ng.name);
  if (ngNames.includes(post.posterName)) return true;

  const ngBodyPatterns = toLines(ng.body);
  if (ngBodyPatterns.length > 0 && matchesAnyRegex(post.content, ngBodyPatterns)) return true;

  return false;
}

export function isNGThread(thread: Thread, ng: NGSettings): boolean {
  const ngTitlePatterns = toLines(ng.title);
  if (ngTitlePatterns.length > 0 && matchesAnyRegex(thread.title, ngTitlePatterns)) return true;
  return false;
}
