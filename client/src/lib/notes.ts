/**
 * Design reminder — 藍圖工作桌：內容資料應保持可定位、可回顧與可直接由 Markdown 編輯。
 */
import { bilingualSearchTerms } from "./bilingual";

export type Note = {
  title: string;
  slug: string;
  category: string;
  order: number;
  level: string;
  tags: string[];
  summary: string;
  body: string;
  path: string;
};

export const categories = [
  "開始使用",
  "Java 基礎",
  "Python 基礎",
  "物件導向",
  "桌面工具",
  "後端 API",
  "Minecraft 共通",
  "Fabric",
  "NeoForge",
] as const;

const noteModules = import.meta.glob("../content/**/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: raw.trim() };

  const metadata = match[1].split(/\r?\n/).reduce<Record<string, string>>((result, line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return result;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
    return result;
  }, {});

  return { metadata, body: raw.slice(match[0].length).trim() };
}

export const notes: Note[] = Object.entries(noteModules)
  .map(([filePath, raw]) => {
    const { metadata, body } = parseFrontmatter(raw);
    const fallbackSlug = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "untitled";
    return {
      title: metadata.title ?? fallbackSlug,
      slug: metadata.slug ?? fallbackSlug,
      category: metadata.category ?? "開始使用",
      order: Number(metadata.order ?? 999),
      level: metadata.level ?? "入門",
      tags: (metadata.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      summary: metadata.summary ?? "尚未加入摘要。",
      body,
      path: filePath.replace("../content/", "content/"),
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "zh-Hant"));

export function searchNotes(query: string, category: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return notes.filter((note) => {
    const matchesCategory = category === "全部" || note.category === category;
    const haystack = [
      note.title,
      note.summary,
      note.tags.join(" "),
      note.body,
      (bilingualSearchTerms[note.category] ?? []).join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
}
