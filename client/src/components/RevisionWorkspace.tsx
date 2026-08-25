/** Design reminder — 藍圖工作桌：版本歷史是可查驗的工程時間線；還原必須明確、可回溯且不覆寫較新的磁碟內容。 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Clipboard, Eye, FileDiff, History, RotateCcw, ShieldCheck } from "lucide-react";
import type { Note } from "@/lib/notes";
import { getNoteRevisions, recordNoteRevision, summarizeRevisionDiff, type NoteRevision } from "@/lib/note-history";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DiskState = { content: string; hash: string; modifiedAt: string };

function sourceLabel(source: NoteRevision["source"]) {
  if (source === "baseline") return "BASELINE";
  if (source === "physical-save") return "AUTO SAVE";
  if (source === "restore") return "RESTORE";
  return "CHANGE";
}

function formatRevisionTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `今天 ${date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function lineDiff(before: string, after: string) {
  const left = before.split(/\r?\n/);
  const right = after.split(/\r?\n/);
  const output: { kind: "same" | "add" | "remove"; text: string }[] = [];
  const count = Math.max(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    const previous = left[index];
    const next = right[index];
    if (previous === next) output.push({ kind: "same", text: previous ?? "" });
    else {
      if (previous !== undefined) output.push({ kind: "remove", text: previous });
      if (next !== undefined) output.push({ kind: "add", text: next });
    }
  }
  return output;
}

export function RevisionWorkspace({ note, open, onOpenChange }: { note: Note; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [revisions, setRevisions] = useState<NoteRevision[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [disk, setDisk] = useState<DiskState | null>(null);
  const [message, setMessage] = useState("");
  const [restoreCandidate, setRestoreCandidate] = useState<NoteRevision | null>(null);
  const [restoring, setRestoring] = useState(false);
  const relativePath = note.path.replace(/^content\//, "");

  const loadWorkspace = async () => {
    const [historyResult, diskResult] = await Promise.all([
      getNoteRevisions(note.slug),
      fetch("/api/local/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: relativePath }) }).then(async (response) => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || "無法讀取實體 Markdown"); return result as DiskState; }),
    ]);
    setRevisions(historyResult);
    setSelectedId(historyResult[0]?.id ?? "");
    setCompareId(historyResult[1]?.id ?? "");
    setDisk(diskResult); setMessage("");
  };

  useEffect(() => { if (open) void loadWorkspace().catch((error) => { setRevisions([]); setDisk(null); setMessage(error instanceof Error ? error.message : "無法讀取版本歷史。"); }); }, [open, note.slug]);

  const selected = useMemo(() => revisions.find((revision) => revision.id === selectedId) ?? revisions[0], [revisions, selectedId]);
  const compared = useMemo(() => revisions.find((revision) => revision.id === compareId) ?? null, [revisions, compareId]);
  const summary = selected && disk ? summarizeRevisionDiff(disk.content, selected.content) : null;
  const diffLines = useMemo(() => selected && compared ? lineDiff(compared.content, selected.content) : [], [compared, selected]);

  async function copyRevision() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.content); setMessage(`v${selected.revisionNumber} 已複製，可先在編輯器中人工合併。`); }
    catch { setMessage("無法自動複製；請手動選取版本預覽內容。"); }
  }

  async function restoreRevision() {
    if (!restoreCandidate || !disk) return;
    setRestoring(true); setMessage("正在確認磁碟版本並還原…");
    try {
      const response = await fetch("/api/local/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: relativePath, content: restoreCandidate.content, expectedHash: disk.hash, confirm: true }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "還原失敗");
      await recordNoteRevision(note, restoreCandidate.content, "restore");
      setMessage(`v${restoreCandidate.revisionNumber} 已安全還原；已建立實體檔備份，正在更新知識索引…`);
      window.setTimeout(() => location.reload(), 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "還原失敗"); }
    finally { setRestoring(false); setRestoreCandidate(null); }
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-6xl gap-0 overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
        <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8"><div className="flex items-center gap-2 text-teal-800"><History className="h-4 w-4" /><p className="section-label text-teal-800">PHYSICAL MARKDOWN REVISION TIMELINE</p></div><DialogTitle className="font-serif text-2xl font-bold tracking-tight">{note.title} 的修改歷史</DialogTitle><DialogDescription className="leading-6 text-slate-600">每次實體自動保存會建立本機版本。還原前會比對目前磁碟雜湊並建立新的檔案備份；長期跨裝置版本仍請使用 Git。</DialogDescription></DialogHeader>
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[245px_minmax(0,1fr)] sm:px-8">
          <aside className="revision-timeline space-y-2"><div className="mb-3 flex items-center justify-between"><p className="section-label">VERSION LEDGER</p><span className="font-mono text-[10px] text-slate-500">{revisions.length} SNAPSHOTS</span></div>{revisions.length ? revisions.map((revision) => <button key={revision.id} type="button" onClick={() => { setSelectedId(revision.id); const index = revisions.findIndex((item) => item.id === revision.id); setCompareId(revisions[index + 1]?.id ?? ""); }} className={`revision-ledger-row w-full text-left ${selected?.id === revision.id ? "revision-ledger-row-active" : ""}`}><span className="font-mono text-[10px] font-bold">v{revision.revisionNumber.toString().padStart(2, "0")} · {sourceLabel(revision.source)}</span><span className="mt-1 block text-sm font-semibold">{formatRevisionTime(revision.savedAt)}</span></button>) : <p className="rounded-sm border border-slate-950/10 bg-white/60 p-3 text-sm text-slate-600">尚未有可用快照。請先用實體 Markdown 編輯器保存一次。</p>}</aside>
          <section className="min-w-0">{selected ? <><div className="revision-summary-grid"><div><p className="section-label">SELECTED VERSION</p><p className="mt-1 font-serif text-xl font-bold">v{selected.revisionNumber} · {sourceLabel(selected.source)}</p><p className="mt-1 text-xs text-slate-600">{formatRevisionTime(selected.savedAt)} · {selected.content.split(/\r?\n/).length} 行</p></div><div className="rounded-sm border border-teal-800/15 bg-teal-700/[0.05] p-3"><p className="section-label text-teal-800">CURRENT DISK DELTA</p><p className="mt-1 text-sm font-semibold">{summary?.changed ? `新增 ${summary.addedLines} 行 · 移除 ${summary.removedLines} 行` : "與目前磁碟版本相同"}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setCompareId(revisions[revisions.findIndex((item) => item.id === selected.id) + 1]?.id ?? "")} disabled={!revisions[revisions.findIndex((item) => item.id === selected.id) + 1]} className="completion-stamp"><ArrowLeftRight className="h-4 w-4" />與前一版比較</button><button type="button" onClick={() => void copyRevision()} className="completion-stamp"><Clipboard className="h-4 w-4" />複製版本內容</button><button type="button" onClick={() => setRestoreCandidate(selected)} disabled={!disk} className="completion-stamp completion-stamp-done"><RotateCcw className="h-4 w-4" />還原 v{selected.revisionNumber}</button></div>{compared ? <div className="mt-4"><div className="mb-2 flex items-center gap-2"><FileDiff className="h-4 w-4 text-slate-700" /><p className="section-label">COMPARE v{compared.revisionNumber} → v{selected.revisionNumber}</p></div><pre className="revision-diff max-h-[34vh] overflow-auto"><code>{diffLines.map((line, index) => <span key={`${index}-${line.text}`} className={line.kind === "add" ? "revision-diff-add" : line.kind === "remove" ? "revision-diff-remove" : "revision-diff-same"}>{line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}{line.text}{"\n"}</span>)}</code></pre></div> : <div className="mt-4"><p className="section-label">VERSION CONTENT</p><pre className="revision-diff max-h-[34vh] overflow-auto"><code>{selected.content}</code></pre></div>}</> : <div className="rounded-sm border border-slate-950/10 bg-white/65 p-5 text-slate-600">尚未讀取到本機版本資料。</div>}</section>
        </div>
        <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8"><span className="mr-auto flex items-center gap-2 text-xs text-slate-600">{message ? <><ShieldCheck className="h-4 w-4 text-teal-800" />{message}</> : "版本快照保存在此瀏覽器；實體檔還原會額外建立 local-backups 備份。"}</span><DialogClose className="rounded-sm border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold">關閉歷史</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(restoreCandidate)} onOpenChange={(next) => { if (!next && !restoring) setRestoreCandidate(null); }}><AlertDialogContent className="border-slate-950/20 bg-[#fffdf7] text-slate-950"><AlertDialogHeader><AlertDialogTitle>還原實體 Markdown 至 v{restoreCandidate?.revisionNumber}</AlertDialogTitle><AlertDialogDescription>這會把選定快照寫回 `{relativePath}`。系統會先比對目前磁碟雜湊，若檔案已在外部變更則拒絕還原；成功前也會建立一份新備份。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={restoring}>取消</AlertDialogCancel><AlertDialogAction onClick={() => void restoreRevision()} disabled={restoring} className="bg-teal-700 text-white hover:bg-teal-800">{restoring ? "正在還原…" : "確認安全還原"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
