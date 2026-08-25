/**
 * Design reminder — 藍圖工作桌：Wiki 連結是筆記座標間可追溯、可回看的實線，而不是外部跳轉。
 */
import { notes, type Note } from "./notes";

const WIKI_LINK_BASE_URL = "https://wiki.local/";
const wikiLinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function normalizeWikiTarget(value: string) {
  return decodeURIComponent(value).trim().toLocaleLowerCase();
}

export function wikiLinkHref(target: string) {
  return `${WIKI_LINK_BASE_URL}${encodeURIComponent(target.trim())}`;
}

export function wikiTargetFromHref(href?: string) {
  if (!href?.startsWith(WIKI_LINK_BASE_URL)) return null;
  return decodeURIComponent(href.slice(WIKI_LINK_BASE_URL.length));
}

export function resolveWikiNote(target: string, sourceNotes: Note[] = notes) {
  const normalizedTarget = normalizeWikiTarget(target);
  return sourceNotes.find((note) => [note.title, note.slug, note.path, ...note.aliases]
    .some((candidate) => normalizeWikiTarget(candidate) === normalizedTarget));
}

function replaceWikiLinksInPlainText(value: string) {
  return value.replace(wikiLinkPattern, (_match, rawTarget: string, rawLabel?: string) => {
    const target = rawTarget.trim();
    const label = (rawLabel ?? rawTarget).trim();
    return `[${label}](${wikiLinkHref(target)})`;
  });
}

/**
 * 保留 fenced / inline code，不把範例中的 [[...]] 誤轉成真正連結。
 */
export function renderWikiSyntax(markdown: string) {
  return markdown.split(/(```[\s\S]*?```)/g).map((fencedPart, fenceIndex) => {
    if (fenceIndex % 2 === 1) return fencedPart;
    return fencedPart.split(/(`[^`\n]+`)/g).map((inlinePart, inlineIndex) => (
      inlineIndex % 2 === 1 ? inlinePart : replaceWikiLinksInPlainText(inlinePart)
    )).join("");
  }).join("");
}
