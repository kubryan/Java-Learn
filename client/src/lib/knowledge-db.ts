/**
 * Design reminder — 藍圖工作桌：知識索引是本機可檢索的工作資料，不取代可直接編輯的 Markdown 原稿。
 */
import { bilingualGuides, guideForCategory } from "./bilingual";
import type { Note } from "./notes";

export type KnowledgeKind = "note" | "term" | "custom";

export type KnowledgeRecord = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  titleEn: string;
  category: string;
  tags: string[];
  terms: string[];
  content: string;
  preview: string;
  path: string;
  origin: "markdown" | "glossary" | "local";
  createdAt?: string;
};

export type CustomKnowledgeInput = {
  title: string;
  titleEn?: string;
  category: string;
  tags: string[];
  terms: string[];
  content: string;
};

export type KnowledgeSearchResult = {
  record: KnowledgeRecord;
  score: number;
  matchedIn: string[];
  matchedTokens: string[];
};

export type KnowledgeStats = {
  total: number;
  notes: number;
  terms: number;
  custom: number;
};

export type KnowledgeTag = {
  name: string;
  normalized: string;
  count: number;
  notes: number;
  terms: number;
  custom: number;
};

const DB_NAME = "code-learning-knowledge";
const DB_VERSION = 1;
const RECORDS_STORE = "records";
const META_STORE = "meta";
let databasePromise: Promise<IDBDatabase> | null = null;

function createHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalize(value: string) {
  return value.toLocaleLowerCase().trim();
}

export function normalizeTag(value: string) {
  return normalize(value).replace(/\s+/g, " ");
}

export function searchTokens(value: string) {
  return Array.from(new Set(normalize(value).match(/[a-z0-9]+(?:[._-][a-z0-9]+)*|[\u3400-\u9fff]+/g) ?? []));
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyTokenScore(value: string, token: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue || !token) return 0;
  if (normalizedValue.includes(token)) return 1;

  const threshold = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
  if (!threshold) return 0;
  return searchTokens(normalizedValue).reduce((best, candidate) => {
    if (candidate.startsWith(token) || token.startsWith(candidate)) return Math.max(best, 0.78);
    return levenshteinDistance(candidate, token) <= threshold ? Math.max(best, 0.58) : best;
  }, 0);
}

export type HighlightPart = { text: string; isMatch: boolean };

export function highlightKnowledgeText(value: string, query: string): HighlightPart[] {
  const tokens = searchTokens(query).filter((token) => token.length > 1).sort((left, right) => right.length - left.length);
  if (!value || !tokens.length) return [{ text: value, isMatch: false }];
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escaped.join("|")})`, "gi");
  return value.split(matcher).filter(Boolean).map((text) => ({
    text,
    isMatch: tokens.some((token) => normalize(text) === token),
  }));
}

function markdownPreview(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`|\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 168);
}

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDS_STORE)) {
        const store = database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("kind", "kind", { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  return databasePromise;
}

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function buildKnowledgeRecords(notes: Note[]): KnowledgeRecord[] {
  const noteRecords = notes.map<KnowledgeRecord>((note) => {
    const guide = guideForCategory(note.category);
    const terms = guide.terms.flatMap((term) => [term.zh, term.en]);
    return {
      id: `note:${note.slug}`,
      kind: "note",
      title: note.title,
      titleEn: note.category,
      category: note.category,
      tags: note.tags,
      terms,
      content: note.body,
      preview: note.summary,
      path: note.path,
      origin: "markdown",
    };
  });

  const termRecords = Object.entries(bilingualGuides).flatMap(([category, guide]) =>
    guide.terms.map<KnowledgeRecord>((term, index) => ({
      id: `term:${category}:${index}`,
      kind: "term",
      title: term.zh,
      titleEn: term.en,
      category,
      tags: ["雙語術語", "bilingual glossary", category],
      terms: [term.zh, term.en],
      content: `${term.zh}（${term.en}）。${guide.explanation}`,
      preview: `${term.zh} — ${term.en}`,
      path: "client/src/lib/bilingual.ts",
      origin: "glossary",
    })),
  );

  return [...noteRecords, ...termRecords];
}

async function readAllRecords() {
  const database = await openDatabase();
  const transaction = database.transaction(RECORDS_STORE, "readonly");
  return requestValue(transaction.objectStore(RECORDS_STORE).getAll()) as Promise<KnowledgeRecord[]>;
}

function buildKnowledgeStats(records: KnowledgeRecord[]): KnowledgeStats {
  return {
    total: records.length,
    notes: records.filter((record) => record.kind === "note").length,
    terms: records.filter((record) => record.kind === "term").length,
    custom: records.filter((record) => record.kind === "custom").length,
  };
}

export async function syncKnowledgeIndex(notes: Note[]): Promise<KnowledgeStats> {
  const records = buildKnowledgeRecords(notes);
  const signature = createHash(records.map((record) => `${record.id}|${record.title}|${record.titleEn}|${record.category}|${record.tags.join(",")}|${record.content}|${record.terms.join(",")}`).join("\n"));
  const database = await openDatabase();
  const customRecords = (await readAllRecords()).filter((record) => record.kind === "custom");
  const readTransaction = database.transaction(META_STORE, "readonly");
  const sourceMeta = await requestValue<{ key: string; value: string } | undefined>(readTransaction.objectStore(META_STORE).get("source-signature"));

  if (sourceMeta?.value !== signature) {
    const writeTransaction = database.transaction([RECORDS_STORE, META_STORE], "readwrite");
    const recordStore = writeTransaction.objectStore(RECORDS_STORE);
    recordStore.clear();
    records.forEach((record) => recordStore.put(record));
    customRecords.forEach((record) => recordStore.put(record));
    writeTransaction.objectStore(META_STORE).put({ key: "source-signature", value: signature });
    await transactionDone(writeTransaction);
  }

  return buildKnowledgeStats([...records, ...customRecords]);
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return buildKnowledgeStats(await readAllRecords());
}

export async function getKnowledgeTags(): Promise<KnowledgeTag[]> {
  const tags = new Map<string, KnowledgeTag>();
  (await readAllRecords()).forEach((record) => {
    record.tags.forEach((rawTag) => {
      const normalized = normalizeTag(rawTag);
      if (!normalized) return;
      const current = tags.get(normalized) ?? { name: rawTag.trim(), normalized, count: 0, notes: 0, terms: 0, custom: 0 };
      current.count += 1;
      if (record.kind === "note") current.notes += 1;
      if (record.kind === "term") current.terms += 1;
      if (record.kind === "custom") current.custom += 1;
      tags.set(normalized, current);
    });
  });
  return Array.from(tags.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-Hant"));
}

export async function addCustomKnowledge(input: CustomKnowledgeInput): Promise<KnowledgeRecord> {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) {
    throw new Error("請填寫知識標題與內容。");
  }

  const titleEn = input.titleEn?.trim() ?? "";
  const uniqueTerms = Array.from(new Set([title, titleEn, ...input.terms.map((term) => term.trim())].filter(Boolean)));
  const uniqueTags = Array.from(new Set(["本地自建知識", "custom knowledge", ...input.tags.map((tag) => tag.trim())].filter(Boolean)));
  const createdAt = new Date().toISOString();
  const record: KnowledgeRecord = {
    id: `custom:${Date.now().toString(36)}-${createHash(`${title}|${content}|${createdAt}`)}`,
    kind: "custom",
    title,
    titleEn,
    category: input.category,
    tags: uniqueTags,
    terms: uniqueTerms,
    content,
    preview: markdownPreview(content),
    path: "local://custom-knowledge",
    origin: "local",
    createdAt,
  };

  const database = await openDatabase();
  const transaction = database.transaction(RECORDS_STORE, "readwrite");
  transaction.objectStore(RECORDS_STORE).put(record);
  await transactionDone(transaction);
  return record;
}

export async function getCustomKnowledgeRecords() {
  return (await readAllRecords()).filter((record) => record.kind === "custom" && record.origin === "local");
}

export async function replaceCustomKnowledgeRecords(records: KnowledgeRecord[]) {
  const validRecords = records.filter((record) => record.kind === "custom" && record.origin === "local" && Boolean(record.id) && Boolean(record.title) && Boolean(record.content));
  const database = await openDatabase();
  const transaction = database.transaction(RECORDS_STORE, "readwrite");
  const store = transaction.objectStore(RECORDS_STORE);
  const existing = await requestValue(store.getAll()) as KnowledgeRecord[];
  existing.filter((record) => record.kind === "custom").forEach((record) => store.delete(record.id));
  validRecords.forEach((record) => store.put(record));
  await transactionDone(transaction);
  return validRecords.length;
}

function scoreRecord(record: KnowledgeRecord, query: string) {
  const normalizedQuery = normalize(query);
  const tokens = searchTokens(query);
  if (!normalizedQuery || !tokens.length) return { score: 1, matchedIn: ["全部索引"], matchedTokens: [] };

  const fields = [
    { label: "標題", value: record.title, weight: 150 },
    { label: "檔名", value: record.path.split("/").pop() ?? record.path, weight: 130 },
    { label: "英文術語", value: record.titleEn, weight: 120 },
    { label: "標籤", value: record.tags.join(" "), weight: 105 },
    { label: "雙語術語", value: record.terms.join(" "), weight: 105 },
    { label: "分類", value: record.category, weight: 80 },
    { label: "Markdown 內容", value: record.content, weight: 52 },
  ];

  const tokenMatches = tokens.map((token) => ({
    token,
    fields: fields.filter((field) => fuzzyTokenScore(field.value, token) > 0),
  }));
  if (tokenMatches.some((match) => match.fields.length === 0)) return { score: 0, matchedIn: [], matchedTokens: [] };

  const matchedIn = fields.filter((field) => tokenMatches.some((match) => match.fields.includes(field)));
  const score = matchedIn.reduce((total, field) => {
    const fieldTokens = tokenMatches.filter((match) => match.fields.includes(field));
    const tokenScore = fieldTokens.reduce((sum, match) => sum + fuzzyTokenScore(field.value, match.token), 0);
    const phraseBonus = normalize(field.value).includes(normalizedQuery) ? field.weight * 1.4 : 0;
    return total + field.weight * tokenScore + phraseBonus;
  }, 0);

  return { score, matchedIn: matchedIn.map((field) => field.label), matchedTokens: tokenMatches.map((match) => match.token) };
}

export async function searchKnowledge(query: string, category = "全部", selectedTag = ""): Promise<KnowledgeSearchResult[]> {
  const records = await readAllRecords();
  const normalizedTag = normalizeTag(selectedTag);
  return records
    .filter((record) => category === "全部" || record.category === category)
    .filter((record) => !normalizedTag || record.tags.some((tag) => normalizeTag(tag) === normalizedTag))
    .map((record) => ({ record, ...scoreRecord(record, query) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title, "zh-Hant"));
}

export function createKnowledgeSnippet(record: KnowledgeRecord, query: string) {
  const source = markdownPreview(record.content) || record.preview;
  const normalizedSource = normalize(source);
  const queryTokens = searchTokens(query);
  const positions = queryTokens.map((token) => normalizedSource.indexOf(token)).filter((position) => position >= 0);
  const position = positions.length ? Math.min(...positions) : -1;
  if (position < 0) return source;
  const start = Math.max(0, position - 42);
  const end = Math.min(source.length, position + Math.max(...queryTokens.map((token) => token.length), 0) + 98);
  return `${start > 0 ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""}`;
}
