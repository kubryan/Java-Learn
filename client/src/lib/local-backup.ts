/** Design reminder — 藍圖工作桌：備份必須是可驗證、可攜與可回復的安全副本；實體 Markdown 匯出只可走 localhost 檔案服務。 */
import { getLegacyCustomKnowledgeRecords, removeCustomKnowledgeRecords, replaceCustomKnowledgeRecords, type CustomKnowledgeInput, type KnowledgeRecord } from "./knowledge-db";
import { getAllNoteRevisions, replaceAllNoteRevisions, type NoteRevision } from "./note-history";

export const BACKUP_FORMAT = "javabase-local-backup";
export const BACKUP_VERSION = 1;

const STORAGE_KEYS = ["java-learning-completed", "java-learning-favorites", "java-learning-recent-reads", "theme"];

export function isLocalWorkspaceAvailable() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export type JavaBaseBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  localStorage: Record<string, string>;
  customKnowledge: KnowledgeRecord[];
  noteRevisions: NoteRevision[];
};

export type BackupSummary = { customKnowledge: number; noteRevisions: number; localStorageEntries: number; draftEntries: number; exportedAt: string };
export type MarkdownExportResult = { written: string[]; conflicts: string[]; failures: string[]; writtenIds: string[] };

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
  const [customKnowledge, noteRevisions] = await Promise.all([getLegacyCustomKnowledgeRecords(), getAllNoteRevisions()]);
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

function markdownSummary(value: string) {
  return value.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`|\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 168) || "本地 Markdown Workspace 筆記。";
}

function markdownFromInput(input: CustomKnowledgeInput, slug: string) {
  const title = input.title.trim();
  const titleEn = input.titleEn?.trim() ?? "";
  const content = input.content.trim();
  const tags = Array.from(new Set(["本機自建知識", "custom knowledge", input.category.trim(), ...input.tags.map((tag) => tag.trim())].filter(Boolean)));
  const terms = Array.from(new Set([title, titleEn, ...input.terms.map((term) => term.trim())].filter(Boolean)));
  const frontmatter = ["---", `title: ${title.replace(/\r?\n/g, " ")}`, titleEn ? `titleEn: ${titleEn.replace(/\r?\n/g, " ")}` : "", `slug: ${slug}`, "category: 自訂", `topic: ${input.category.trim() || "開始使用"}`, "tags:", ...tags.map((tag) => `  - ${tag.replace(/\r?\n/g, " ")}`), "terms:", ...terms.map((term) => `  - ${term.replace(/\r?\n/g, " ")}`), `summary: ${markdownSummary(content)}`, "level: 自訂", "order: 90", "source: Markdown Workspace", `createdAt: ${new Date().toISOString()}`, "---"].filter(Boolean);
  return `${frontmatter.join("\n")}\n\n# ${title}\n\n${content}\n`;
}

export async function createMarkdownKnowledgeFile(input: CustomKnowledgeInput) {
  if (!isLocalWorkspaceAvailable()) throw new Error("本機 Markdown Workspace 只在 localhost 開發伺服器可用；公開網站不能寫入你的電腦硬碟。");
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new Error("請填寫知識標題與內容。");
  const suffix = Date.now().toString(36);
  const slug = `custom-${suffix}-${safeFileSegment(title).toLocaleLowerCase()}`;
  const filename = `${safeFileSegment(title)}--${suffix}.md`;
  await ensureFolder("knowledge");
  await localRequest("import", { directory: "knowledge", filename, content: markdownFromInput(input, slug) });
  return { path: `content/knowledge/${filename}`, slug, title };
}

export async function exportCustomKnowledgeToMarkdown(records: KnowledgeRecord[]): Promise<MarkdownExportResult> {
  const result: MarkdownExportResult = { written: [], conflicts: [], failures: [], writtenIds: [] };
  const folders = Array.from(new Set(records.map(exportDirectory)));
  try { await ensureFolder("knowledge"); await Promise.all(folders.map(ensureFolder)); } catch (error) { throw new Error(error instanceof Error ? error.message : "無法建立 Markdown 匯出資料夾。 "); }
  for (const record of records) {
    const directory = exportDirectory(record);
    const filename = `${safeFileSegment(record.title)}--${safeFileSegment(record.id.replace(/^custom:/, ""))}.md`;
    try { await localRequest("import", { directory, filename, content: markdownFromRecord(record) }); result.written.push(`${directory}/${filename}`); result.writtenIds.push(record.id); }
    catch (error) { const message = error instanceof Error ? error.message : "未知匯出失敗"; if (message.includes("同名檔案")) result.conflicts.push(`${directory}/${filename}`); else result.failures.push(`${directory}/${filename}：${message}`); }
  }
  return result;
}

export async function migrateLegacyCustomKnowledgeToMarkdown() {
  if (!isLocalWorkspaceAvailable()) return { migrated: 0, remaining: 0, failures: [] as string[] };
  const legacy = await getLegacyCustomKnowledgeRecords();
  if (!legacy.length) return { migrated: 0, remaining: 0, failures: [] as string[] };
  const result = await exportCustomKnowledgeToMarkdown(legacy);
  if (result.writtenIds.length) await removeCustomKnowledgeRecords(result.writtenIds);
  return { migrated: result.writtenIds.length, remaining: legacy.length - result.writtenIds.length, failures: result.failures };
}

export type MarkdownWorkspaceScan = {
  files: { path: string; modifiedAt: string; bytes: number }[];
  scannedAt: string;
};

async function localRead(path: string) {
  const response = await fetch("/api/local/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
  const result = await response.json().catch(() => ({ ok: false, error: "本機檔案服務未回傳可讀資料。" }));
  if (!response.ok || !result.ok) throw new Error(result.error || "無法讀取 Markdown 檔案。");
  return result as { ok: true; content: string; hash: string; modifiedAt: string };
}

async function localGet<T>(endpoint: string) {
  const response = await fetch(`/api/local/${endpoint}`, { cache: "no-store" });
  const result = await response.json().catch(() => ({ ok: false, error: "本機檔案服務未回傳可讀資料。" }));
  if (!response.ok || !result.ok) throw new Error(result.error || "本機檔案操作未完成。");
  return result as T & { ok: true };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function importMarkdownFile(file: File, directory = "knowledge") {
  if (!isLocalWorkspaceAvailable()) throw new Error("Markdown 匯入只在 localhost 本機開發伺服器可用。");
  if (!file.name.toLowerCase().endsWith(".md")) throw new Error("只允許匯入 .md Markdown 檔案。");
  if (file.size > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。");
  await ensureFolder(directory);
  await localRequest("import", { directory, filename: file.name, content: await file.text() });
  return `${directory}/${file.name}`;
}

export async function exportMarkdownFile(notePath: string, title = "markdown-note") {
  if (!isLocalWorkspaceAvailable()) throw new Error("Markdown 匯出只在 localhost 本機開發伺服器可用。");
  const relativePath = notePath.replace(/^content\//, "");
  const result = await localRead(relativePath);
  downloadBlob(new Blob([result.content], { type: "text/markdown;charset=utf-8" }), `${safeFileSegment(title)}.md`);
  return result.content;
}

export async function exportMarkdownWorkspace() {
  if (!isLocalWorkspaceAvailable()) throw new Error("整個知識庫匯出只在 localhost 本機開發伺服器可用。");
  const response = await fetch("/api/local/export", { cache: "no-store" });
  if (!response.ok) throw new Error("無法匯出 Markdown 知識庫。");
  downloadBlob(await response.blob(), `JavaBase-knowledge-base-${new Date().toISOString().slice(0, 10)}.zip`);
}

export async function rescanMarkdownWorkspace() {
  if (!isLocalWorkspaceAvailable()) throw new Error("重新掃描只在 localhost 本機開發伺服器可用。");
  return localGet<MarkdownWorkspaceScan>("rescan");
}
