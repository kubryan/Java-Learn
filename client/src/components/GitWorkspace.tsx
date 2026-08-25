/** Design reminder — 藍圖工作桌：Git 操作必須將「目前位置、可提交範圍、不可逆動作」分層呈現，讓版本控制可查驗而非自動化。 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, FileDiff, GitBranch, GitCommitHorizontal, Loader2, RefreshCw, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type GitChange = { path: string; status: string };
type GitStatus = { repository: boolean; branch: string; remote: string; userName: string; userEmail: string; changes: GitChange[] };
type GitReply<T> = { ok: boolean; error?: string } & T;

const statusLabel: Record<string, string> = { " M": "已修改", "M ": "已暫存", "MM": "已修改＋暫存", "??": "新增", "A ": "已暫存新增", "D ": "已暫存刪除", " D": "已刪除" };

async function gitRequest<T>(endpoint: string, payload?: unknown): Promise<GitReply<T>> {
  const response = await fetch(`/api/git/${endpoint}`, payload === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({ ok: false, error: "Git 工作台未回傳可讀資料。" }));
  if (!response.ok || !result.ok) throw new Error(result.error || "Git 操作未完成。");
  return result as GitReply<T>;
}

export function GitWorkspace({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activePath, setActivePath] = useState("");
  const [diff, setDiff] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  const selectedCount = selected.length;
  const activeChange = status?.changes.find((change) => change.path === activePath);
  const canCommit = Boolean(status?.repository && selectedCount && message.trim().length >= 5 && message.trim().length <= 120);
  const setupCommands = useMemo(() => ["git init", "git branch -M main", "git remote add origin https://github.com/kubryan/Java-Learn.git", "git config user.name \"你的名稱\"", "git config user.email \"你的信箱\""].join("\n"), []);

  async function refresh() {
    setLoading(true); setNotice("");
    try {
      const result = await gitRequest<GitStatus>("status");
      setStatus(result); setSelected((current) => current.filter((path) => result.changes.some((change) => change.path === path)));
      if (!result.changes.some((change) => change.path === activePath)) { setActivePath(""); setDiff(""); }
    } catch (error) { setStatus(null); setNotice(error instanceof Error ? error.message : "無法讀取 Git 狀態。"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (open) void refresh(); }, [open]);

  async function showDiff(path: string) {
    setActivePath(path); setDiff("正在讀取差異…");
    try {
      const result = await gitRequest<{ unstaged: string; staged: string }>("diff", { path });
      setDiff(result.unstaged || result.staged || "此檔案是新建立、已刪除，或沒有可文字化的差異；提交時仍會依你的選取範圍處理。");
    } catch (error) { setDiff(error instanceof Error ? error.message : "無法讀取差異。"); }
  }

  function toggle(path: string) { setSelected((current) => current.includes(path) ? current.filter((item) => item !== path) : [...current, path]); }
  function selectAll() { setSelected(status?.changes.map((change) => change.path) ?? []); }

  async function stageSelected() {
    setLoading(true); setNotice("");
    try { await gitRequest<GitStatus>("stage", { paths: selected }); setNotice(`已暫存 ${selectedCount} 個選取的 Markdown 檔案；提交前仍可檢視差異。`); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "暫存未完成。"); }
    finally { setLoading(false); }
  }

  async function commitSelected() {
    setCommitOpen(false); setLoading(true); setNotice("");
    try { await gitRequest<GitStatus>("commit", { paths: selected, message: message.trim(), confirm: true }); setMessage(""); setSelected([]); setNotice("已建立本機 Git commit；推送到 GitHub 前仍需個別確認。 "); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "提交未完成。"); }
    finally { setLoading(false); }
  }

  async function pushCurrentBranch() {
    setPushOpen(false); setLoading(true); setNotice("");
    try { await gitRequest<GitStatus>("push", { confirm: true }); setNotice("已推送目前分支至 origin。 "); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "推送未完成。請檢查網路、GitHub 登入或遠端設定。 "); }
    finally { setLoading(false); }
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-6xl overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
        <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/85 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-teal-800" /><p className="section-label text-teal-800">LOCAL GIT WORKSPACE</p></div><DialogTitle className="mt-1 font-serif text-2xl font-bold tracking-tight">Markdown 版本控制工作台</DialogTitle><DialogDescription className="mt-1 max-w-2xl leading-6 text-slate-600">只顯示 `client/src/content/` 的實體 Markdown 變更。提交與推送都需要你在這個工作台中明確確認；瀏覽器草稿與 IndexedDB 不會被放進 Git。</DialogDescription></div><button type="button" onClick={() => void refresh()} disabled={loading} className="completion-stamp"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />重新檢查</button></div>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5 sm:px-8">
          {notice && <div role="status" className="flex gap-2 rounded-md border border-teal-800/20 bg-teal-700/[0.07] p-3 text-sm leading-6 text-teal-950"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" /><span>{notice}</span></div>}
          {!status && !loading && <div className="rounded-md border border-amber-700/25 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">只能在 Windows 的 `http://localhost:3000` 使用 Git 工作台。</p><p className="mt-1 leading-6">公開網站不會也不能讀取你的 Git 狀態。</p></div>}
          {status && !status.repository && <section className="rounded-md border border-amber-700/25 bg-amber-50 p-4 text-amber-950"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-serif text-lg font-bold">尚未設定 Windows Git 儲存庫</p><p className="mt-1 text-sm leading-6">為避免自動建立錯誤遠端，工作台只提供指引、不會自行初始化或連線。請在 `C:\think\JavaBase` 先確認下列設定，再重新檢查。</p></div></div><pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{setupCommands}</code></pre></section>}
          {status?.repository && <>
            <section className="grid gap-3 rounded-md border border-slate-950/15 bg-[#fffdf7] p-4 sm:grid-cols-3"><div><p className="section-label">BRANCH</p><p className="mt-1 break-all font-mono text-sm font-bold">{status.branch || "detached HEAD"}</p></div><div><p className="section-label">REMOTE</p><p className="mt-1 break-all font-mono text-xs leading-5 text-slate-700">{status.remote || "尚未設定 origin"}</p></div><div><p className="section-label">IDENTITY</p><p className="mt-1 text-sm font-semibold">{status.userName && status.userEmail ? `${status.userName} · ${status.userEmail}` : "尚未設定 commit 身分"}</p></div></section>
            <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="rounded-md border border-slate-950/15 bg-[#fffdf7]"><div className="flex items-center justify-between gap-3 border-b border-slate-950/10 px-4 py-3"><div><p className="section-label">MARKDOWN CHANGES</p><p className="mt-1 text-sm font-semibold">{status.changes.length ? `${status.changes.length} 個實體檔案變更` : "目前沒有可提交的 Markdown 變更"}</p></div>{status.changes.length > 0 && <button type="button" onClick={selectedCount === status.changes.length ? () => setSelected([]) : selectAll} className="text-xs font-bold text-teal-800 hover:text-teal-950">{selectedCount === status.changes.length ? "取消全選" : "全選"}</button>}</div><div className="max-h-[44vh] overflow-y-auto divide-y divide-slate-950/10">{status.changes.map((change) => <div key={change.path} className={`flex items-start gap-3 px-4 py-3 ${activePath === change.path ? "bg-teal-700/[0.055]" : ""}`}><input type="checkbox" checked={selected.includes(change.path)} onChange={() => toggle(change.path)} className="mt-1 h-4 w-4 accent-teal-700" aria-label={`選取 ${change.path}`} /><button type="button" onClick={() => void showDiff(change.path)} className="min-w-0 flex-1 text-left"><span className="inline-flex rounded-sm border border-slate-900/15 bg-slate-900/[0.05] px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-700">{statusLabel[change.status] ?? change.status}</span><span className="mt-1 block break-all font-mono text-xs font-semibold text-slate-800">{change.path}</span></button></div>)}{!status.changes.length && <p className="px-4 py-8 text-sm leading-6 text-slate-600">先在 JavaBase 編輯、建立或匯入 `.md`，再回到這裡查看變更。</p>}</div></div>
              <div className="rounded-md border border-slate-950/15 bg-slate-950 p-4"><div className="flex items-center gap-2 text-slate-100"><FileDiff className="h-4 w-4 text-teal-300" /><p className="section-label text-teal-100">DIFF PREVIEW {activeChange ? `· ${activeChange.path}` : ""}</p></div><pre className="mt-3 min-h-[300px] max-h-[44vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-200"><code>{diff || "從左側選擇一個 Markdown 檔案，即可查看 Git diff。"}</code></pre></div></section>
            <section className="rounded-md border border-slate-950/15 bg-[#fffdf7] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end"><div className="min-w-0 flex-1"><label htmlFor="git-commit-message" className="section-label">COMMIT MESSAGE</label><input id="git-commit-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={120} placeholder="例如：docs: update Minecraft registry notes" className="mt-1.5 w-full rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" /><p className="mt-1 text-xs text-slate-500">已選取 {selectedCount} 個檔案。提交會只處理這些 Markdown 檔；暫存區若有其他檔案，系統會停止提交。</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void stageSelected()} disabled={!selectedCount || loading} className="completion-stamp"><GitCommitHorizontal className="h-4 w-4" />暫存選取檔案</button><button type="button" onClick={() => setCommitOpen(true)} disabled={!canCommit || loading} className="primary-stamp"><Check className="h-4 w-4" />Commit</button><button type="button" onClick={() => setPushOpen(true)} disabled={loading || !status.remote} className="completion-stamp"><Upload className="h-4 w-4" />Push</button></div></div></section>
          </>}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={commitOpen} onOpenChange={setCommitOpen}><AlertDialogContent className="border-slate-950/20 bg-[#fffdf7] text-slate-950"><AlertDialogHeader><AlertDialogTitle>確認建立本機 commit？</AlertDialogTitle><AlertDialogDescription>將暫存並提交 {selectedCount} 個已選取的實體 Markdown。這一步不會推送到 GitHub，推送仍需下一個獨立確認。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>返回檢查</AlertDialogCancel><AlertDialogAction onClick={() => void commitSelected()} className="bg-teal-700 text-white hover:bg-teal-800">確認 Commit</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={pushOpen} onOpenChange={setPushOpen}><AlertDialogContent className="border-slate-950/20 bg-[#fffdf7] text-slate-950"><AlertDialogHeader><AlertDialogTitle>確認推送至 GitHub？</AlertDialogTitle><AlertDialogDescription>這會將目前分支 `{status?.branch || "main"}` 推送到設定的 origin 遠端。請先確認本機提交內容與遠端倉庫正確。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => void pushCurrentBranch()} className="bg-teal-700 text-white hover:bg-teal-800">確認 Push</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
