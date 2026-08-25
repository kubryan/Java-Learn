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
};

export type KnowledgeStats = {
  total: number;
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
  const signature = createHash(records.map((record) => `${record.id}|${record.content}|${record.terms.join(",")}`).join("\n"));
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

function scoreRecord(record: KnowledgeRecord, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { score: 1, matchedIn: ["全部索引"] };

  const fields = [
    { label: "標題", value: record.title, weight: 100 },
    { label: "英文術語", value: record.titleEn, weight: 90 },
    { label: "標籤", value: record.tags.join(" "), weight: 70 },
    { label: "雙語術語", value: record.terms.join(" "), weight: 80 },
    { label: "內容", value: record.content, weight: 35 },
  ];

  const matchedIn = fields.filter((field) => normalize(field.value).includes(normalizedQuery));
  return {
    score: matchedIn.reduce((total, field) => total + field.weight, 0),
    matchedIn: matchedIn.map((field) => field.label),
  };
}

export async function searchKnowledge(query: string, category = "全部"): Promise<KnowledgeSearchResult[]> {
  const records = await readAllRecords();
  return records
    .filter((record) => category === "全部" || record.category === category)
    .map((record) => ({ record, ...scoreRecord(record, query) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title, "zh-Hant"));
}

export function createKnowledgeSnippet(record: KnowledgeRecord, query: string) {
  const source = record.preview || markdownPreview(record.content);
  const normalizedSource = normalize(source);
  const normalizedQuery = normalize(query);
  const position = normalizedQuery ? normalizedSource.indexOf(normalizedQuery) : -1;
  if (position < 0) return source;
  const start = Math.max(0, position - 42);
  const end = Math.min(source.length, position + normalizedQuery.length + 98);
  return `${start > 0 ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""}`;
}
