/** Design reminder — 藍圖工作桌：備份中心要清楚區隔可下載副本、可還原資料與會寫入磁碟的 Markdown 匯出，所有覆寫動作必須可預覽並要求確認。 */
import { useEffect, useRef, useState } from "react";
import { ArchiveRestore, Check, Download, FileUp, HardDriveDownload, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createLocalBackup, downloadBackup, restoreLocalBackup, summarizeBackup, validateLocalBackup, type BackupSummary, type JavaBaseBackup } from "@/lib/local-backup";
import { getLegacyCustomKnowledgeRecords, type KnowledgeRecord } from "@/lib/knowledge-db";

const summaryLine = (summary: BackupSummary) => `尚未遷移的舊 custom ${summary.customKnowledge} 筆 · 修改歷史 ${summary.noteRevisions} 筆 · 設定／草稿 ${summary.localStorageEntries} 項`;

export function BackupCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [customKnowledge, setCustomKnowledge] = useState<KnowledgeRecord[]>([]);
  const [backup, setBackup] = useState<JavaBaseBackup | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true); setNotice("");
    try { setCustomKnowledge(await getLegacyCustomKnowledgeRecords()); }
    catch (error) { setNotice(error instanceof Error ? error.message : "無法讀取本機自訂知識。 "); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (open) void refresh(); }, [open]);

  async function exportAll() {
    setLoading(true); setNotice("");
    try { const current = await createLocalBackup(); downloadBackup(current); setNotice(`已下載完整本機備份：${summaryLine(summarizeBackup(current))}。請將 JSON 存在非瀏覽器快取的位置。`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "匯出備份未完成。 "); }
    finally { setLoading(false); }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setLoading(true); setNotice("");
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error("備份檔不可超過 12 MB。 ");
      const parsed = validateLocalBackup(JSON.parse(await file.text()));
      setBackup(parsed); setNotice(`已驗證備份：${new Date(parsed.exportedAt).toLocaleString("zh-TW")} · ${summaryLine(summarizeBackup(parsed))}。請確認後再還原。`);
    } catch (error) { setBackup(null); setNotice(error instanceof Error ? error.message : "匯入備份格式無效。 "); }
    finally { setLoading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function restoreImportedBackup() {
    if (!backup) return;
    setRestoreOpen(false); setLoading(true); setNotice("");
    try {
      const safetyBackup = await createLocalBackup();
      downloadBackup(safetyBackup);
      const result = await restoreLocalBackup(backup, safetyBackup);
      setNotice(`已還原備份，並先下載目前資料的安全快照。已還原 ${result.customKnowledge} 筆自訂知識與 ${result.noteRevisions} 筆修改歷史；頁面即將重新載入索引。`);
      window.setTimeout(() => window.location.reload(), 950);
    } catch (error) { setNotice(error instanceof Error ? error.message : "還原未完成；目前資料未被清除。 "); }
    finally { setLoading(false); }
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-5xl overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
        <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/85 px-6 pb-5 pt-6 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-800" /><p className="section-label text-teal-800">LOCAL BACKUP CENTER</p></div><DialogTitle className="mt-1 font-serif text-2xl font-bold tracking-tight">設定／備份中心</DialogTitle><DialogDescription className="mt-1 max-w-2xl leading-6 text-slate-600">這裡保護瀏覽器本機資料：自訂知識、收藏、閱讀進度、最近使用、草稿與修改歷史。原始 Markdown 已是檔案來源，請用 Git 另行版控。</DialogDescription></div><button type="button" onClick={() => void refresh()} disabled={loading} className="completion-stamp"><RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />重新檢查</button></div></DialogHeader>
        <div className="space-y-5 px-6 py-5 sm:px-8">
          {notice && <div role="status" className="flex gap-2 rounded-md border border-teal-800/20 bg-teal-700/[0.07] p-3 text-sm leading-6 text-teal-950"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" /><span>{notice}</span></div>}
          <section className="grid gap-4 md:grid-cols-2"><div className="backup-index-card p-4"><div className="flex items-start gap-3"><HardDriveDownload className="mt-0.5 h-5 w-5 text-teal-800" /><div><p className="section-label">FULL LOCAL BACKUP</p><h3 className="mt-1 font-serif text-lg font-bold">匯出全部本機知識</h3><p className="mt-1 text-sm leading-6 text-slate-600">下載版本化 JSON，包含尚未遷移的舊 IndexedDB custom、版本快照，以及這個瀏覽器保存的偏好、收藏、進度、最近使用與草稿。Markdown Workspace 原稿不在 JSON 內，請使用 Git 或檔案備份。</p></div></div><button type="button" onClick={() => void exportAll()} disabled={loading} className="primary-stamp mt-4"><Download className="h-4 w-4" />下載 JSON 備份</button></div><div className="backup-index-card p-4"><div className="flex items-start gap-3"><FileUp className="mt-0.5 h-5 w-5 text-slate-700" /><div><p className="section-label">VALIDATED RESTORE</p><h3 className="mt-1 font-serif text-lg font-bold">匯入／還原備份</h3><p className="mt-1 text-sm leading-6 text-slate-600">先驗證檔案格式與資料數量，再顯示還原確認。還原前會自動下載目前瀏覽器資料的安全快照。</p></div></div><input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} /><button type="button" onClick={() => fileInput.current?.click()} disabled={loading} className="completion-stamp mt-4"><FileUp className="h-4 w-4" />選擇備份檔</button></div></section>
          {backup && <section className="rounded-md border border-amber-700/25 bg-amber-50 p-4 text-amber-950"><div className="flex gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-serif text-lg font-bold">已載入、尚未還原的備份</p><p className="mt-1 text-sm leading-6">匯出時間：{new Date(backup.exportedAt).toLocaleString("zh-TW")}<br />{summaryLine(summarizeBackup(backup))}</p><button type="button" onClick={() => setRestoreOpen(true)} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-sm border border-amber-800 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-700 hover:text-white"><ArchiveRestore className="h-4 w-4" />確認還原這份備份</button></div></div></section>}
          <section className="backup-index-card p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="section-label">MARKDOWN WORKSPACE</p><h3 className="mt-1 font-serif text-lg font-bold">Markdown 是 custom 的真正來源</h3><p className="mt-1 text-sm leading-6 text-slate-600">目前仍有 {customKnowledge.length} 筆舊 custom 留在 IndexedDB。正常情況下它們會在本機頁面載入時自動遷移；新的自訂知識會直接寫入 `client/src/content/knowledge/`，Knowledge Index 從 Markdown 重建。</p></div><span className="inline-flex items-center rounded-md border border-teal-800/20 bg-teal-700/[0.07] px-3 py-2 text-xs font-bold text-teal-800">{customKnowledge.length ? `${customKnowledge.length} 筆待遷移` : "Markdown Workspace 已是來源"}</span></div></section>
          <section className="rounded-md border border-slate-950/10 bg-slate-950/[0.035] p-4"><p className="section-label">SAFETY BOUNDARY</p><p className="mt-1 text-sm leading-6 text-slate-700">備份 JSON 是「瀏覽器本機資料」的可攜副本；它不會複製整個 `client/src/content`。實體 Markdown、圖片與 Git 歷史請分別用 Windows 檔案備份與 Git／GitHub 保護。清除網站資料前，請先下載 JSON 備份或把自訂知識轉為 Markdown。</p></section>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}><AlertDialogContent className="border-slate-950/20 bg-[#fffdf7] text-slate-950"><AlertDialogHeader><AlertDialogTitle>確認還原瀏覽器本機資料？</AlertDialogTitle><AlertDialogDescription>這會取代目前瀏覽器中尚未遷移的舊 custom、修改歷史、收藏、進度、最近使用與草稿。系統會先下載目前資料的安全 JSON 快照，但不會修改任何實體 Markdown；還原舊 custom 後，本機頁面會再嘗試將它們寫入 Markdown Workspace。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => void restoreImportedBackup()} className="bg-teal-700 text-white hover:bg-teal-800">確認還原</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
