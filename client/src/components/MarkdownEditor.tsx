/** Design reminder — 藍圖工作桌：編輯區必須清楚區分實體來源、寫入保護與可追溯的變更；自動保存要安靜但永遠可查驗。 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertCircle, Bold, Check, CloudUpload, Code2, ImagePlus, Italic, Link, RotateCcw, Save, Table2 } from "lucide-react";
import type { Note } from "@/lib/notes";
import { recordNoteRevision } from "@/lib/note-history";
import { createHeadingIds, WikiMarkdown } from "./WikiMarkdown";

type DiskNote = { content: string; hash: string; modifiedAt: string };
type SavePhase = "loading" | "saved" | "editing" | "saving" | "conflict" | "error" | "unavailable";

const AUTO_SAVE_DELAY = 1200;

export function MarkdownEditor({ note, onOpenNote, onDirtyChange, onSaved }: { note: Note; onOpenNote: (note: Note) => void; onDirtyChange?: (dirty: boolean) => void; onSaved?: () => void }) {
  const [draft, setDraft] = useState("");
  const [hash, setHash] = useState("");
  const [status, setStatus] = useState("正在讀取實體 Markdown…");
  const [phase, setPhase] = useState<SavePhase>("loading");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const previewScroll = useRef<HTMLDivElement>(null);
  const scrollSyncIgnore = useRef<"editor" | "preview" | null>(null);
  const draftRef = useRef("");
  const savedContentRef = useRef("");
  const hashRef = useRef("");
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const loadedRef = useRef(false);
  const relativePath = note.path.replace(/^content\//, "");
  const dirty = Boolean(hash) && draft !== savedContentRef.current;

  const setDraftValue = (value: string) => { draftRef.current = value; setDraft(value); if (phase === "error") { setPhase("editing"); setStatus("正在編輯…停止輸入後將再次嘗試自動保存。"); } };

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false; saveInFlightRef.current = false; saveQueuedRef.current = false; hashRef.current = ""; savedContentRef.current = "";
    setPhase("loading"); setStatus("正在讀取實體 Markdown…"); setHash(""); setLastSavedAt(""); onDirtyChange?.(false);
    fetch("/api/local/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: relativePath }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || "無法讀取實體檔案"); return result as DiskNote; })
      .then((result) => {
        if (cancelled) return;
        loadedRef.current = true; hashRef.current = result.hash; savedContentRef.current = result.content;
        setDraftValue(result.content); setHash(result.hash); setLastSavedAt(result.modifiedAt); setPhase("saved");
        setStatus(`已保存 · 實體檔案上次修改 ${new Date(result.modifiedAt).toLocaleString("zh-TW")}`);
      })
      .catch(() => {
        if (cancelled) return;
        setDraftValue(note.body); setPhase("unavailable"); setStatus("本機管理服務未啟動；目前只能預覽，無法安全寫入檔案。");
      });
    return () => { cancelled = true; };
  }, [note.slug, relativePath, note.body, onDirtyChange, reloadNonce]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const saveNow = useCallback(async (trigger: "auto" | "manual") => {
    if (!hashRef.current || !loadedRef.current) { setPhase("unavailable"); setStatus("找不到實體檔案版本；請以 pnpm dev 開啟本機工作台後再保存。"); return; }
    if (saveInFlightRef.current) { saveQueuedRef.current = true; return; }
    const content = draftRef.current;
    if (content === savedContentRef.current) { setPhase("saved"); return; }
    saveInFlightRef.current = true; setPhase("saving"); setStatus(trigger === "manual" ? "正在立即保存實體 Markdown…" : "正在自動保存實體 Markdown…");
    try {
      const response = await fetch("/api/local/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: relativePath, content, expectedHash: hashRef.current }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "保存失敗");
      hashRef.current = String(result.hash); savedContentRef.current = content;
      setHash(hashRef.current); setLastSavedAt(String(result.modifiedAt)); setPhase("saved");
      setStatus(`已保存 · ${new Date(String(result.modifiedAt)).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 已寫入實體 Markdown 並建立備份`);
      await recordNoteRevision(note, content, "physical-save").catch(() => undefined);
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失敗";
      const isConflict = message.includes("重新載入") || message.includes("其他操作修改");
      setPhase(isConflict ? "conflict" : "error");
      setStatus(isConflict ? "檔案在磁碟上已有較新版本；請重新載入後再保存，避免覆寫他人變更。" : message);
    } finally {
      saveInFlightRef.current = false;
      if (saveQueuedRef.current || draftRef.current !== savedContentRef.current) {
        saveQueuedRef.current = false;
        window.setTimeout(() => void saveNow("auto"), 220);
      }
    }
  }, [note, onSaved, relativePath]);

  useEffect(() => {
    if (!loadedRef.current || !hash || draft === savedContentRef.current || phase === "saving" || phase === "conflict" || phase === "error") return;
    setPhase("editing"); setStatus("正在編輯…停止輸入後將自動保存。");
    const timer = window.setTimeout(() => void saveNow("auto"), AUTO_SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [draft, hash, phase, saveNow]);

  const previewMarkdown = useMemo(() => draft.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ""), [draft]);
  const headings = useMemo(() => Array.from(previewMarkdown.matchAll(/^#{2,3}\s+(.+)$/gm), (match) => match[1]), [previewMarkdown]);
  const headingIds = useMemo(() => createHeadingIds(headings), [headings]);
  function insert(before: string, after = "") { const target = textarea.current; const start = target?.selectionStart ?? draft.length; const end = target?.selectionEnd ?? start; setDraftValue(`${draft.slice(0, start)}${before}${draft.slice(start, end)}${after}${draft.slice(end)}`); requestAnimationFrame(() => textarea.current?.focus()); }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void saveNow("manual"); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); insert("**", "**"); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") { event.preventDefault(); insert("*", "*"); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); insert("[", "](https://)"); } }
  function onDrop(event: DragEvent<HTMLTextAreaElement>) { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file?.type.startsWith("image/")) insert(`![${file.name}](./images/${file.name})`); }
  function syncScroll(source: HTMLTextAreaElement | HTMLDivElement, target: HTMLTextAreaElement | HTMLDivElement, targetName: "editor" | "preview") {
    const sourceMax = Math.max(0, source.scrollHeight - source.clientHeight);
    const targetMax = Math.max(0, target.scrollHeight - target.clientHeight);
    const ratio = sourceMax ? source.scrollTop / sourceMax : 0;
    scrollSyncIgnore.current = targetName;
    target.scrollTop = ratio * targetMax;
    window.setTimeout(() => { if (scrollSyncIgnore.current === targetName) scrollSyncIgnore.current = null; }, 0);
  }
  function onEditorScroll() {
    if (scrollSyncIgnore.current === "editor") { scrollSyncIgnore.current = null; return; }
    const target = previewScroll.current;
    if (target && textarea.current) syncScroll(textarea.current, target, "preview");
  }
  function updateActiveHeading() {
    const container = previewScroll.current;
    if (!container) return;
    const headingElements = Array.from(container.querySelectorAll<HTMLElement>(".markdown-editor-article h2, .markdown-editor-article h3"));
    if (!headingElements.length) return setActiveHeadingIndex(0);
    const threshold = container.getBoundingClientRect().top + 72;
    let nextIndex = 0;
    headingElements.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= threshold) nextIndex = index;
    });
    setActiveHeadingIndex(nextIndex);
  }
  function jumpToHeading(index: number) {
    const container = previewScroll.current;
    const heading = container?.querySelectorAll<HTMLElement>(".markdown-editor-article h2, .markdown-editor-article h3")[index];
    if (!container || !heading) return;
    const top = Math.max(0, heading.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 18);
    setActiveHeadingIndex(index);
    container.scrollTo({ top, behavior: "smooth" });
  }
  function onPreviewScroll() {
    updateActiveHeading();
    if (scrollSyncIgnore.current === "preview") { scrollSyncIgnore.current = null; return; }
    const source = textarea.current;
    const target = previewScroll.current;
    if (source && target) syncScroll(target, source, "editor");
  }
  const statusIcon = phase === "saved" ? <Check className="h-3.5 w-3.5 text-teal-700" /> : phase === "saving" ? <CloudUpload className="h-3.5 w-3.5 animate-pulse text-teal-700" /> : phase === "conflict" || phase === "error" || phase === "unavailable" ? <AlertCircle className="h-3.5 w-3.5 text-amber-700" /> : null;
  const statusTone = phase === "conflict" || phase === "error" || phase === "unavailable" ? "border-amber-700/25 bg-amber-50 text-amber-950" : phase === "saved" ? "border-teal-700/20 bg-teal-700/[0.06] text-teal-950" : "border-slate-950/10 bg-slate-950/[0.035] text-slate-700";

  return <div className="markdown-editor grid min-h-[64vh] gap-0 overflow-hidden rounded-sm border border-slate-950/15 lg:grid-cols-2"><section className="markdown-editor-source border-b border-slate-950/15 bg-slate-950 p-3 lg:border-b-0 lg:border-r"><div className="mb-2 flex flex-wrap gap-1"><button type="button" onClick={() => insert("**", "**")} aria-label="粗體"><Bold /></button><button type="button" onClick={() => insert("*", "*")} aria-label="斜體"><Italic /></button><button type="button" onClick={() => insert("[", "](https://)")} aria-label="連結"><Link /></button><button type="button" onClick={() => insert("\n| 欄位 | 內容 |\n|---|---|\n| | |\n")} aria-label="表格"><Table2 /></button><button type="button" onClick={() => insert("\n```java\n\n```\n")} aria-label="程式碼區塊"><Code2 /></button><button type="button" onClick={() => insert("\n```mermaid\ngraph TD\n  A[Start] --> B[Note]\n```\n")} aria-label="Mermaid 圖"><ImagePlus /></button><button type="button" onClick={() => void saveNow("manual")} disabled={phase === "saving" || !hash} className="ml-auto inline-flex items-center gap-1"><Save />{phase === "saving" ? "寫入中…" : "Ctrl+S 立即保存"}</button></div><textarea ref={textarea} value={draft} onChange={(event) => setDraftValue(event.target.value)} onKeyDown={onKeyDown} onDrop={onDrop} onDragOver={(event) => event.preventDefault()} onScroll={onEditorScroll} className="markdown-editor-textarea h-[56vh] w-full resize-none bg-transparent font-mono text-sm leading-6 text-slate-100 outline-none" aria-label="實體 Markdown 編輯器" /></section><section ref={previewScroll} onScroll={onPreviewScroll} className="markdown-editor-preview overflow-auto bg-[#fffdf7] p-5"><p className="section-label text-teal-800">PREVIEW · PHYSICAL MARKDOWN <span className="markdown-sync-badge">↕ SYNCED SCROLL</span></p><div role="status" aria-live="polite" className={`markdown-editor-status mt-2 flex items-start gap-1.5 rounded-sm border px-2 py-1.5 text-xs leading-5 ${statusTone}`}>{statusIcon}<span>{status}</span>{phase === "conflict" && <button type="button" onClick={() => setReloadNonce((value) => value + 1)} className="ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-amber-900 underline underline-offset-2"><RotateCcw className="h-3.5 w-3.5" />重新載入磁碟版本</button>}</div><div className="mt-3 flex gap-3"><aside className="markdown-editor-outline hidden w-36 shrink-0 text-xs text-slate-500 sm:block">{headings.map((heading, index) => <button key={`${heading}-${index}`} type="button" onClick={() => jumpToHeading(index)} aria-current={activeHeadingIndex === index ? "location" : undefined} className={`markdown-editor-outline-item mb-2 block w-full text-left ${activeHeadingIndex === index ? "markdown-editor-outline-item-active" : ""}`}><span className="markdown-editor-outline-number">{String(index + 1).padStart(2, "0")}</span><span>{heading}</span></button>)}</aside><article className="markdown-editor-article min-w-0 flex-1 prose prose-slate max-w-none"><WikiMarkdown markdown={previewMarkdown} headingIds={headingIds} onOpenNote={onOpenNote} /></article></div><p className="markdown-editor-help mt-6 rounded-sm border border-amber-700/20 bg-amber-50 p-3 text-xs text-amber-950">停止輸入約 1.2 秒後會自動保存至實體 `.md`；Ctrl+S 可立即保存。每次寫入都會比對磁碟版本並建立本機備份。拖放圖片只插入 `./images/檔名` 語法；請將實體圖片放入筆記相對應的 images 資料夾。</p></section></div>;
}
