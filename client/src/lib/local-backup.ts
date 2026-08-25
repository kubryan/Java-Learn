/** Design reminder — 藍圖工作桌：備份必須是可驗證、可攜與可回復的安全副本；實體 Markdown 匯出只可走 localhost 檔案服務。 */
import { getCustomKnowledgeRecords, replaceCustomKnowledgeRecords, type KnowledgeRecord } from "./knowledge-db";
import { getAllNoteRevisions, replaceAllNoteRevisions, type NoteRevision } from "./note-history";

export const BACKUP_FORMAT = "javabase-local-backup";
export const BACKUP_VERSION = 1;

const STORAGE_KEYS = ["java-learning-completed", "java-learning-favorites", "java-learning-recent-reads", "theme"];

export type JavaBaseBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  localStorage: Record<string, string>;
  customKnowledge: KnowledgeRecord[];
  noteRevisions: NoteRevision[];
};

export type BackupSummary = { customKnowledge: number; noteRevisions: number; localStorageEntries: number; draftEntries: number; exportedAt: string };
export type MarkdownExportResult = { written: string[]; conflicts: string[]; failures: string[] };

function storageSnapshot() {
  const snapshot: Record<string, string> = {};
  STORAGE_KEYS.forEach((key) => { const value = window.localStorage.getItem(key); if (value !== null) snapshot[key] = value; });
  Object.keys(window.localStorage).filter((key) => key.startsWith("java-learning-draft:")).forEach((key) => { const value = window.localStorage.getItem(key); if (value !== null) snapshot[key] = value; });
  return snapshot;
}

export function summarizeBackup(backup: JavaBaseBackup): BackupSummary {
  return { customKnowledge: backup.customKnowledge.length, noteRevisions: backup.noteRevisions.length, localStorageEntries: Object.keys(backup.localStorage).length, draftEntries: Object.keys(backup.localStorage).filter((key) => key.startsWith("java-learning-draft:")).length, exportedAt: backup.exportedAt };
}

export async function createLocalBackup(): Promise<JavaBaseBackup> {
  const [customKnowledge, noteRevisions] = await Promise.all([getCustomKnowledgeRecords(), getAllNoteRevisions()]);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), localStorage: storageSnapshot(), customKnowledge, noteRevisions };
}

export function validateLocalBackup(value: unknown): JavaBaseBackup {
  if (!value || typeof value !== "object") throw new Error("備份不是有效的 JSON 物件。");
  const candidate = value as Partial<JavaBaseBackup>;
  if (candidate.format !== BACKUP_FORMAT || candidate.version !== BACKUP_VERSION) throw new Error("這不是相容的 JavaBase 本機備份格式。 ");
  if (typeof candidate.exportedAt !== "string" || !candidate.localStorage || !Array.isArray(candidate.customKnowledge) || !Array.isArray(candidate.noteRevisions)) throw new Error("備份缺少必要資料欄位。 ");
  const safeStorage = Object.fromEntries(Object.entries(candidate.localStorage).filter(([key, entry]) => (STORAGE_KEYS.includes(key) || key.startsWith("java-learning-draft:")) && typeof entry === "string"));
  const safeCustom = candidate.customKnowledge.filter((record): record is KnowledgeRecord => Boolean(record && record.kind === "custom" && record.origin === "local" && record.id && record.title && typeof record.content === "string"));
  const safeRevisions = candidate.noteRevisions.filter((revision): revision is NoteRevision => Boolean(revision && revision.id && revision.noteSlug && typeof revision.content === "string" && revision.savedAt));
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: candidate.exportedAt, localStorage: safeStorage, customKnowledge: safeCustom, noteRevisions: safeRevisions };
}

export function downloadBackup(backup: JavaBaseBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `JavaBase-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function restoreLocalBackup(backup: JavaBaseBackup, providedSafetyBackup?: JavaBaseBackup) {
  const safetyBackup = providedSafetyBackup ?? await createLocalBackup();
  const keysToClear = new Set([...STORAGE_KEYS, ...Object.keys(window.localStorage).filter((key) => key.startsWith("java-learning-draft:"))]);
  keysToClear.forEach((key) => window.localStorage.removeItem(key));
  Object.entries(backup.localStorage).forEach(([key, value]) => window.localStorage.setItem(key, value));
  const [customKnowledge, noteRevisions] = await Promise.all([replaceCustomKnowledgeRecords(backup.customKnowledge), replaceAllNoteRevisions(backup.noteRevisions)]);
  return { safetyBackup, customKnowledge, noteRevisions };
}

function safeFileSegment(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 72);
  return cleaned || "untitled";
}

function exportDirectory(record: KnowledgeRecord) {
  const source = `${record.category} ${record.tags.join(" ")}`.toLocaleLowerCase();
  if (/(minecraft|fabric|neoforge|cobblemon|paper|nms)/.test(source)) return "knowledge/Minecraft";
  if (/(java|oop|後端|桌面)/.test(source)) return "knowledge/Java";
  if (/(python)/.test(source)) return "knowledge/Python";
  if (/(ai|cursor|codex|manus)/.test(source)) return "knowledge/AI";
  return "knowledge/其他";
}

function markdownFromRecord(record: KnowledgeRecord) {
  const tags = Array.from(new Set(["本機自建知識", ...record.tags])).filter(Boolean);
  const terms = Array.from(new Set(record.terms)).filter(Boolean);
  const frontmatter = ["---", `title: ${record.title.replace(/\r?\n/g, " ")}`, "category: 自訂", "tags:", ...tags.map((tag) => `  - ${tag.replace(/\r?\n/g, " ")}`), `summary: ${record.preview.replace(/\r?\n/g, " ")}`, `source: IndexedDB custom knowledge`, `exportedAt: ${new Date().toISOString()}`, `originalId: ${record.id}`, "---"];
  const englishTitle = record.titleEn ? `\n## English title\n\n${record.titleEn}` : "";
  const termSection = terms.length ? `\n## Terms\n\n${terms.map((term) => `- ${term}`).join("\n")}` : "";
  return `${frontmatter.join("\n")}\n\n# ${record.title}\n${englishTitle}${termSection}\n\n## 內容\n\n${record.content.trim()}\n`;
}

async function localRequest(endpoint: string, payload: unknown) {
  const response = await fetch(`/api/local/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({ ok: false, error: "本機檔案服務未回傳可讀資料。" }));
  if (!response.ok || !result.ok) throw new Error(result.error || "本機檔案操作未完成。 ");
}

async function ensureFolder(directory: string) {
  try { await localRequest("create", { path: directory, kind: "folder" }); } catch (error) { if (!(error instanceof Error) || !error.message.includes("已存在")) throw error; }
}

export async function exportCustomKnowledgeToMarkdown(records: KnowledgeRecord[]): Promise<MarkdownExportResult> {
  const result: MarkdownExportResult = { written: [], conflicts: [], failures: [] };
  const folders = Array.from(new Set(records.map(exportDirectory)));
  try { await ensureFolder("knowledge"); await Promise.all(folders.map(ensureFolder)); } catch (error) { throw new Error(error instanceof Error ? error.message : "無法建立 Markdown 匯出資料夾。 "); }
  for (const record of records) {
    const directory = exportDirectory(record);
    const filename = `${safeFileSegment(record.title)}--${safeFileSegment(record.id.replace(/^custom:/, ""))}.md`;
    try { await localRequest("import", { directory, filename, content: markdownFromRecord(record) }); result.written.push(`${directory}/${filename}`); }
    catch (error) { const message = error instanceof Error ? error.message : "未知匯出失敗"; if (message.includes("同名檔案")) result.conflicts.push(`${directory}/${filename}`); else result.failures.push(`${directory}/${filename}：${message}`); }
  }
  return result;
}
