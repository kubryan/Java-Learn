/**
 * Design reminder — 藍圖工作桌：版本紀錄是可查驗的本地時間線；實體 Markdown 是來源，IndexedDB 保留其載入後的閱讀快照。
 */
import type { Note } from "./notes";

export type NoteRevision = {
  id: string;
  noteId: string;
  noteSlug: string;
  noteTitle: string;
  content: string;
  contentHash: string;
  savedAt: string;
  source: "baseline" | "markdown-change";
  revisionNumber: number;
};

export type RevisionDiffSummary = {
  changed: boolean;
  addedLines: number;
  removedLines: number;
  currentLines: number;
  revisionLines: number;
};

const HISTORY_DB_NAME = "code-learning-note-history";
const HISTORY_DB_VERSION = 1;
const REVISIONS_STORE = "revisions";
const MAX_REVISIONS_PER_NOTE = 16;
let historyDatabasePromise: Promise<IDBDatabase> | null = null;

function createHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function openHistoryDatabase() {
  if (historyDatabasePromise) return historyDatabasePromise;
  historyDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REVISIONS_STORE)) {
        const store = database.createObjectStore(REVISIONS_STORE, { keyPath: "id" });
        store.createIndex("noteId", "noteId", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return historyDatabasePromise;
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

async function readAllRevisions() {
  const database = await openHistoryDatabase();
  const transaction = database.transaction(REVISIONS_STORE, "readonly");
  return requestValue(transaction.objectStore(REVISIONS_STORE).getAll()) as Promise<NoteRevision[]>;
}

function revisionsForNote(revisions: NoteRevision[], slug: string) {
  return revisions
    .filter((revision) => revision.noteSlug === slug)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export async function syncNoteHistory(notes: Note[]) {
  const existingRevisions = await readAllRevisions();
  const revisionsToSave: NoteRevision[] = [];
  const revisionIdsToDelete: string[] = [];
  const now = new Date().toISOString();

  notes.forEach((note) => {
    const noteId = `note:${note.slug}`;
    const contentHash = createHash(note.body);
    const noteRevisions = revisionsForNote(existingRevisions, note.slug);
    const alreadySaved = noteRevisions[0]?.contentHash === contentHash;
    if (!alreadySaved) {
      revisionsToSave.push({
        id: `${noteId}:${contentHash}:${Date.now().toString(36)}`,
        noteId,
        noteSlug: note.slug,
        noteTitle: note.title,
        content: note.body,
        contentHash,
        savedAt: now,
        source: noteRevisions.length ? "markdown-change" : "baseline",
        revisionNumber: noteRevisions.length + 1,
      });
    }
    const retained = noteRevisions.concat(revisionsToSave.filter((revision) => revision.noteSlug === note.slug))
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    retained.slice(MAX_REVISIONS_PER_NOTE).forEach((revision) => revisionIdsToDelete.push(revision.id));
  });

  if (!revisionsToSave.length && !revisionIdsToDelete.length) return;
  const database = await openHistoryDatabase();
  const transaction = database.transaction(REVISIONS_STORE, "readwrite");
  const store = transaction.objectStore(REVISIONS_STORE);
  revisionsToSave.forEach((revision) => store.put(revision));
  revisionIdsToDelete.forEach((revisionId) => store.delete(revisionId));
  await transactionDone(transaction);
}

export async function getNoteRevisions(slug: string) {
  return revisionsForNote(await readAllRevisions(), slug);
}

export async function getAllNoteRevisions() {
  return readAllRevisions();
}

export async function replaceAllNoteRevisions(revisions: NoteRevision[]) {
  const safeRevisions = revisions.filter((revision) => Boolean(revision.id) && Boolean(revision.noteSlug) && typeof revision.content === "string" && Boolean(revision.savedAt));
  const database = await openHistoryDatabase();
  const transaction = database.transaction(REVISIONS_STORE, "readwrite");
  const store = transaction.objectStore(REVISIONS_STORE);
  store.clear();
  safeRevisions.forEach((revision) => store.put(revision));
  await transactionDone(transaction);
  return safeRevisions.length;
}

export async function getRecentMarkdownChanges(limit = 6) {
  return (await readAllRevisions())
    .filter((revision) => revision.source === "markdown-change")
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, limit);
}

export function summarizeRevisionDiff(currentContent: string, revisionContent: string): RevisionDiffSummary {
  const currentLines = currentContent.split(/\r?\n/);
  const revisionLines = revisionContent.split(/\r?\n/);
  const currentSet = new Set(currentLines);
  const revisionSet = new Set(revisionLines);
  return {
    changed: currentContent !== revisionContent,
    addedLines: currentLines.filter((line) => !revisionSet.has(line)).length,
    removedLines: revisionLines.filter((line) => !currentSet.has(line)).length,
    currentLines: currentLines.length,
    revisionLines: revisionLines.length,
  };
}
