/**
 * Design reminder — 藍圖工作桌：內容資料應保持可定位、可回顧與可直接由 Markdown 編輯。
 */
import { bilingualSearchTerms } from "./bilingual";

export type Note = {
  title: string;
  titleEn?: string;
  topic?: string;
  terms?: string[];
  slug: string;
  aliases: string[];
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
  "自訂",
] as const;

const noteModules = import.meta.glob("../content/**/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function categoryTags(category: string) {
  if (["Java 基礎", "物件導向", "桌面工具", "後端 API"].includes(category)) return ["Java"];
  if (category === "Python 基礎") return ["Python"];
  if (category === "Fabric") return ["Minecraft", "Fabric"];
  if (category === "NeoForge") return ["Minecraft", "NeoForge"];
  if (category === "Minecraft 共通") return ["Minecraft"];
  if (category === "自訂") return ["本地 Markdown", "custom knowledge"];
  return [];
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: raw.trim() };

  let listKey = "";
  const metadata = match[1].split(/\r?\n/).reduce<Record<string, string>>((result, line) => {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && listKey) {
      result[listKey] = [result[listKey], listItem[1].trim().replace(/^['"]|['"]$/g, "")].filter(Boolean).join(",");
      return result;
    }

    const separator = line.indexOf(":");
    if (separator === -1) return result;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    listKey = value ? "" : key;
    result[key] = value;
    return result;
  }, {});

  return { metadata, body: raw.slice(match[0].length).trim() };
}

export const notes: Note[] = Object.entries(noteModules)
  .map(([filePath, raw]) => {
    const { metadata, body } = parseFrontmatter(raw);
    const fallbackSlug = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "untitled";
    const category = metadata.category ?? "開始使用";
    const frontmatterTags = (metadata.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const aliases = (metadata.aliases ?? "").split(",").map((alias) => alias.trim()).filter(Boolean);
    return {
      title: metadata.title ?? fallbackSlug,
      titleEn: metadata.titleEn ?? "",
      topic: metadata.topic ?? "",
      terms: (metadata.terms ?? "").split(",").map((term) => term.trim()).filter(Boolean),
      slug: metadata.slug ?? fallbackSlug,
      aliases,
      category,
      order: Number(metadata.order ?? 999),
      level: metadata.level ?? "入門",
      tags: Array.from(new Set([...frontmatterTags, ...categoryTags(category)])),
      summary: metadata.summary ?? "尚未加入摘要。",
      body,
      path: filePath.replace("../content/", "content/"),
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "zh-Hant"));

export function searchNotes(query: string, category: string, selectedTag = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedTag = selectedTag.trim().toLocaleLowerCase();
  return notes.filter((note) => {
    const matchesCategory = category === "全部" || note.category === category;
    const matchesTag = !normalizedTag || note.tags.some((tag) => tag.toLocaleLowerCase() === normalizedTag);
    const haystack = [
      note.title,
      note.titleEn ?? "",
      note.topic ?? "",
      note.terms?.join(" ") ?? "",
      note.aliases.join(" "),
      note.summary,
      note.tags.join(" "),
      note.body,
      (bilingualSearchTerms[note.category] ?? []).join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return matchesCategory && matchesTag && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
}
