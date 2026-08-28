import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Braces, Check, Download, FileCode2, FileJson, FileText, FileType, Image, Link2, Loader2, Paperclip, Play, Plus, Search, Square, Terminal, Trash2, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Note } from "@/lib/notes";
import {
  assetKindLabel,
  assetLanguage,
  canRunJavaAsset,
  runJavaAsset,
  deleteWorkspaceAsset,
  formatAssetSize,
  getFileRelations,
  getWorkspaceAssets,
  importWorkspaceAsset,
  noteWorkspacePath,
  readWorkspaceAsset,
  saveFileRelations,
  workspaceAssetUrl,
  type FileRelation,
  type JavaRunResult,
  type WorkspaceAsset,
  type WorkspaceAssetContent,
} from "@/lib/workspace-assets";
import { isLocalWorkspaceAvailable } from "@/lib/local-backup";

const ACCEPTED_ASSETS = ".java,.json,.yaml,.yml,.toml,.xml,.properties,.gradle,.kts,.txt,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.ico,.pdf,.zip,.jar,.gz,.7z,.rar,.bin";

type Props = {
  note: Note;
  notes: Note[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  initialAssetPath?: string;
};

type FileRelationsPanelProps = {
  note: Note;
  onOpenAssets: (assetPath?: string) => void;
  refreshKey?: number;
};

function assetIcon(asset: WorkspaceAsset) {
  if (asset.kind === "image") return <Image className="h-4 w-4" />;
  if (asset.kind === "pdf") return <FileType className="h-4 w-4" />;
  if (asset.kind === "binary") return <Archive className="h-4 w-4" />;
  if (asset.extension === "json") return <FileJson className="h-4 w-4" />;
  if (asset.kind === "config") return <Braces className="h-4 w-4" />;
  if (asset.kind === "code") return <FileCode2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function fileLabel(asset: WorkspaceAsset) {
  return `${asset.name} · ${assetKindLabel(asset.kind)} · ${formatAssetSize(asset.bytes)}`;
}

const LANGUAGE_KEYWORDS: Record<string, Set<string>> = {
  java: new Set(["public", "private", "protected", "class", "interface", "enum", "record", "static", "final", "new", "return", "void", "extends", "implements", "if", "else", "for", "while", "try", "catch", "throw", "throws", "import", "package"]),
  groovy: new Set(["plugins", "id", "version", "repositories", "dependencies", "implementation", "runtimeOnly", "tasks", "register", "java", "toolchain"]),
  kotlin: new Set(["plugins", "val", "var", "fun", "class", "object", "interface", "public", "private", "import", "package"]),
  json: new Set(["true", "false", "null"]),
};

function prepareAssetText(asset: WorkspaceAssetContent, content: string) {
  if (asset.extension === "json") {
    try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
  }
  if (asset.extension === "xml") return content.replace(/>\\s*</g, ">\\n<");
  return content;
}

function highlightedLine(line: string, language: string) {
  if (language === "text" || language === "properties") return line;
  const pattern = /(\/\/.*$|<!--.*?-->|#[^#]*$|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
  const keywords = LANGUAGE_KEYWORDS[language] ?? new Set<string>();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    if (match.index > cursor) parts.push(line.slice(cursor, match.index));
    const token = match[0];
    const className = token.startsWith("//") || token.startsWith("#") || token.startsWith("/*") || token.startsWith("<!--") ? "text-slate-400" : token.startsWith("\"") || token.startsWith("'") || token.startsWith("`") ? "text-amber-300" : /^\\d/.test(token) ? "text-cyan-300" : keywords.has(token) ? "font-bold text-teal-300" : "text-[#e8f0e7]";
    parts.push(<span key={`${match.index}-${token}`} className={className}>{token}</span>);
    cursor = match.index + token.length;
  }
  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

function SyntaxViewer({ asset, content }: { asset: WorkspaceAssetContent; content: string }) {
  const language = assetLanguage(asset);
  const formatted = prepareAssetText(asset, content);
  const lines = formatted.split(/\\r?\\n/);
  const width = String(lines.length).length;
  return <div className="overflow-auto rounded-md border border-slate-950/15 bg-[#18212b] p-4 text-[#e8f0e7] shadow-inner"><div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2 font-mono text-[10px] text-slate-300"><span>{language} · {asset.extension === "json" ? "pretty-printed · " : asset.extension === "xml" ? "formatted · " : ""}UTF-8 text viewer</span><span>{asset.bytes.toLocaleString()} bytes</span></div><pre className="font-mono text-xs leading-6"><code>{lines.map((line, index) => <span key={index} className="flex min-w-max"><span className="mr-4 select-none text-right text-slate-500" style={{ minWidth: `${width + 1}ch` }}>{index + 1}</span><span className="whitespace-pre-wrap break-words">{highlightedLine(line, language)}</span></span>)}</code></pre></div>;
}

function JavaPlayground({ asset, content }: { asset: WorkspaceAssetContent; content: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JavaRunResult | null>(null);
  const [error, setError] = useState("");

  if (!canRunJavaAsset(asset)) return null;

  async function execute(mode: "compile" | "run") {
    setRunning(true);
    setError("");
    try {
      setResult(await runJavaAsset(asset.path, content, mode));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Java Playground 執行失敗。");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  const outputBlock = (label: string, value: string, tone = "text-slate-200") => value ? <div className="mt-3"><p className="section-label text-slate-400">{label}</p><pre className={`mt-1 max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 ${tone}`}>{value}</pre></div> : null;

  return <section className="mt-4 rounded-md border border-teal-700/25 bg-teal-950/[0.04] p-4 dark:border-teal-300/20 dark:bg-teal-300/[0.05]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-teal-800 dark:text-teal-300"><Terminal className="h-4 w-4" /><p className="section-label">JAVA LEARNING PLAYGROUND</p></div><h4 className="mt-1 font-serif text-lg font-bold">在 localhost 編譯／執行</h4><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">只會把目前 `.java` Asset 的內容送到本機暫存目錄；編譯輸出不會寫回 Markdown 或 Workspace Assets。請只執行你信任的教學程式碼。</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => void execute("compile")} disabled={running} className="completion-stamp">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}編譯</button><button type="button" onClick={() => void execute("run")} disabled={running} className="primary-stamp">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}執行</button></div></div>{result && <div className="mt-4 rounded-md border border-slate-950/10 bg-slate-900 p-3 text-slate-100 dark:border-white/10"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className={result.success ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>{result.success ? "成功" : "失敗"} · {result.mode === "run" ? "compile + run" : "compile only"}</span><span className="font-mono text-slate-400">{result.className} · {result.compile.durationMs} ms</span></div>{outputBlock("COMPILER STDOUT", result.compile.stdout)}{outputBlock("COMPILER STDERR / DIAGNOSTICS", result.compile.stderr, "text-amber-200")}{result.execution && outputBlock("PROGRAM OUTPUT", result.execution.stdout)}{result.execution && outputBlock("PROGRAM STDERR", result.execution.stderr, "text-amber-200")}{result.execution?.timedOut && <p className="mt-3 text-xs text-rose-300">程式超過 {result.limits.timeoutMs} ms，已停止。</p>}<p className="mt-3 text-[11px] leading-5 text-slate-400">限制：timeout {result.limits.timeoutMs} ms · heap {result.limits.maxHeapMb} MB · output {result.limits.maxOutputBytes / 1024} KB · 暫存目錄執行後清除</p></div>}{error && <p role="alert" className="mt-3 rounded-md border border-red-700/20 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-300/20 dark:bg-red-950/30 dark:text-red-200">{error}</p>}</section>;
}

function AssetViewer({ asset, content, loading }: { asset: WorkspaceAssetContent | null; content: string; loading: boolean }) {
  if (!asset) return <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-slate-950/15 bg-white/45 p-8 text-sm text-slate-500">選擇左側檔案開始閱讀。</div>;
  if (loading) return <div className="grid min-h-64 place-items-center rounded-md border border-slate-950/15 bg-white/45 p-8 text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" />讀取本地檔案中…</div>;
  if (asset.kind === "image") return <div className="grid min-h-64 place-items-center rounded-md border border-slate-950/15 bg-slate-950/[0.04] p-4"><img src={workspaceAssetUrl(asset.path)} alt={asset.name} className="max-h-[60vh] max-w-full rounded object-contain shadow-sm" /></div>;
  if (asset.kind === "pdf") return <iframe title={asset.name} src={workspaceAssetUrl(asset.path)} className="h-[62vh] w-full rounded-md border border-slate-950/15 bg-white" />;
  if (asset.kind === "binary") return <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-slate-950/15 bg-white/45 p-8 text-center"><div><Archive className="mx-auto h-8 w-8 text-teal-800" /><p className="mt-3 font-semibold">這是二進位附件</p><p className="mt-1 text-sm text-slate-600">ZIP、JAR、壓縮檔與其他 binary 只作為附件，不會進入 Knowledge Index。</p><a href={workspaceAssetUrl(asset.path, true)} className="primary-stamp mt-4 inline-flex"><Download className="h-4 w-4" />下載 {asset.name}</a></div></div>;
  return <SyntaxViewer asset={asset} content={content} />;
}

export function FileRelationsPanel({ note, onOpenAssets, refreshKey = 0 }: FileRelationsPanelProps) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>([]);
  const [relations, setRelations] = useState<FileRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const notePath = noteWorkspacePath(note.path);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!isLocalWorkspaceAvailable()) { setLoading(false); return () => { active = false; }; }
    Promise.all([getWorkspaceAssets(), getFileRelations()]).then(([nextAssets, nextRelations]) => {
      if (!active) return;
      setAssets(nextAssets);
      setRelations(nextRelations);
    }).catch(() => {
      if (active) { setAssets([]); setRelations([]); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notePath, refreshKey]);

  const related = relations.filter((relation) => relation.notePath === notePath).map((relation) => ({ relation, asset: assets.find((candidate) => candidate.path === relation.assetPath) })).filter((item): item is { relation: FileRelation; asset: WorkspaceAsset } => Boolean(item.asset));
  if (!isLocalWorkspaceAvailable() || (!loading && related.length === 0)) return <section className="mt-7 rounded-md border border-dashed border-teal-800/20 bg-teal-700/[0.04] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-label text-teal-800">FILE RELATIONS</p><h3 className="mt-1 font-serif text-lg font-bold">本地 Workspace 附件</h3><p className="mt-1 text-sm leading-6 text-slate-600">將 Java、JSON、設定檔、圖片或 PDF 關聯到這篇 Markdown；關聯 metadata 留在本地，不會進入 Markdown Knowledge Index。</p></div><button type="button" onClick={() => onOpenAssets()} className="completion-stamp"><Paperclip className="h-4 w-4" />管理附件</button></div>{!isLocalWorkspaceAvailable() && <p className="mt-3 text-xs text-amber-900">公開網站只提供閱讀，Workspace Assets 需要在 localhost 開發伺服器使用。</p>}</section>;

  return <section className="mt-7 rounded-md border border-teal-800/20 bg-teal-700/[0.04] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-label text-teal-800">FILE RELATIONS · {related.length}</p><h3 className="mt-1 font-serif text-lg font-bold">這篇 Markdown 的本地附件</h3></div><button type="button" onClick={() => onOpenAssets()} className="completion-stamp"><Paperclip className="h-4 w-4" />管理附件</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{related.map(({ relation, asset }) => <button key={asset.path} type="button" onClick={() => onOpenAssets(asset.path)} className="group flex min-w-0 items-center gap-3 rounded-md border border-teal-800/15 bg-white/70 p-3 text-left transition hover:border-teal-700/40 hover:bg-white"><span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-teal-700/[0.1] text-teal-800">{assetIcon(asset)}</span><span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs font-bold text-slate-800">{asset.name}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{relation.label || asset.path} · {assetKindLabel(asset.kind)}</span></span><Link2 className="h-4 w-4 shrink-0 text-teal-700 opacity-60 transition group-hover:opacity-100" /></button>)}</div></section>;
}

export function WorkspaceAssets({ note, notes: _notes, open, onOpenChange, onChanged, initialAssetPath = "" }: Props) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>([]);
  const [relations, setRelations] = useState<FileRelation[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<WorkspaceAssetContent | null>(null);
  const [selectedContent, setSelectedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const notePath = noteWorkspacePath(note.path);

  async function refresh(preferredPath = selectedPath) {
    if (!isLocalWorkspaceAvailable()) { setError("Workspace Assets 只在 localhost 本機開發伺服器可用；公開網站不會接觸你的本機檔案。"); return; }
    setLoading(true); setError("");
    try {
      const [nextAssets, nextRelations] = await Promise.all([getWorkspaceAssets(), getFileRelations()]);
      setAssets(nextAssets); setRelations(nextRelations);
      const nextPath = nextAssets.some((asset) => asset.path === preferredPath) ? preferredPath : nextAssets[0]?.path ?? "";
      setSelectedPath(nextPath);
      if (nextPath) await openAsset(nextPath);
      else { setSelectedAsset(null); setSelectedContent(""); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "無法讀取本地 Workspace Assets。"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (open) { setNotice(""); setError(""); void refresh(initialAssetPath || selectedPath); } }, [open, notePath, initialAssetPath]);

  async function openAsset(path: string) {
    setSelectedPath(path); setAssetLoading(true); setError("");
    try { const asset = await readWorkspaceAsset(path); setSelectedAsset(asset); setSelectedContent(asset.content ?? ""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "無法讀取 Asset。"); setSelectedAsset(null); }
    finally { setAssetLoading(false); }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const imported: string[] = [];
      for (const file of Array.from(files)) { const asset = await importWorkspaceAsset(file); imported.push(asset.name); }
      setNotice(`已匯入 ${imported.length} 個檔案到本地 workspace/assets/：${imported.join("、")}`);
      await refresh(); onChanged?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Asset 匯入未完成。"); }
    finally { setLoading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  const visibleAssets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return assets.filter((asset) => !normalized || `${asset.path} ${asset.kind} ${asset.extension}`.toLocaleLowerCase().includes(normalized));
  }, [assets, query]);
  const relatedToNote = relations.filter((relation) => relation.notePath === notePath);
  const relatedPaths = new Set(relatedToNote.map((relation) => relation.assetPath));

  async function toggleRelation(asset: WorkspaceAsset) {
    const exists = relatedPaths.has(asset.path);
    const next = exists ? relations.filter((relation) => !(relation.notePath === notePath && relation.assetPath === asset.path)) : [...relations, { notePath, assetPath: asset.path, label: asset.name }];
    setLoading(true); setError("");
    try { setRelations(await saveFileRelations(next)); setNotice(exists ? `已解除 ${asset.name} 與目前 Markdown 的關聯。` : `已將 ${asset.name} 關聯到目前 Markdown。`); onChanged?.(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "File Relation 保存失敗。"); }
    finally { setLoading(false); }
  }

  async function removeAsset(asset: WorkspaceAsset) {
    if (!confirm(`刪除本地 Asset「${asset.name}」？檔案會先保存到 local-backups，所有相關 File Relations 也會移除。`)) return;
    setLoading(true); setError("");
    try { await deleteWorkspaceAsset(asset.path); setNotice(`已刪除 ${asset.name}，並保留本地 backup。`); await refresh(""); onChanged?.(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Asset 刪除失敗。"); }
    finally { setLoading(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100vh-2rem)] max-w-7xl gap-0 overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"><DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/85 px-6 pb-5 pt-6 dark:border-white/10 dark:bg-slate-900/90 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-teal-800 dark:text-teal-300"><Paperclip className="h-4 w-4" /><p className="section-label">LOCAL WORKSPACE ASSETS</p></div><DialogTitle className="mt-1 font-serif text-2xl font-bold tracking-tight">Workspace Assets</DialogTitle><DialogDescription className="mt-1 max-w-3xl leading-6 text-slate-600 dark:text-slate-300">所有檔案留在 localhost 指定的 workspace。`.md`／`.txt` 才可作為搜尋知識；程式碼與設定檔是 Viewer、圖片與 PDF 是閱讀器，ZIP 等 binary 只作附件。</DialogDescription></div><button type="button" onClick={() => void refresh()} disabled={loading} className="completion-stamp"><Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />重新掃描</button></div><div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-teal-800/15 bg-teal-700/[0.06] px-3 py-2 text-xs dark:border-teal-300/20 dark:bg-teal-300/[0.06]"><FileText className="h-4 w-4 text-teal-800 dark:text-teal-300" /><span>目前 Markdown：</span><code className="truncate font-mono text-teal-900 dark:text-teal-200">{note.path}</code></div></DialogHeader><div className="grid min-h-[560px] gap-0 lg:grid-cols-[310px_minmax(0,1fr)]"><aside className="border-b border-slate-950/10 bg-white/35 p-4 dark:border-white/10 dark:bg-slate-900/40 lg:border-b-0 lg:border-r"><div className="flex gap-2"><button type="button" onClick={() => fileInput.current?.click()} disabled={loading || !isLocalWorkspaceAvailable()} className="primary-stamp flex-1 justify-center"><Plus className="h-4 w-4" />匯入檔案</button><input ref={fileInput} type="file" multiple accept={ACCEPTED_ASSETS} className="sr-only" onChange={(event) => void importFiles(event.target.files)} /></div><p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">預設寫入 `client/src/content/assets/`；不會上傳雲端，也不會自動加入 Markdown Knowledge Index。</p><div className="relative mt-4"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="篩選檔名或類型" className="w-full rounded-md border border-slate-950/15 bg-white px-8 py-2 text-xs outline-none focus:border-teal-600 dark:border-white/15 dark:bg-slate-950" /></div><div className="mt-3 space-y-1 lg:max-h-[450px] lg:overflow-y-auto">{loading && assets.length === 0 && <p className="px-2 py-5 text-xs text-slate-500">掃描本地檔案中…</p>}{visibleAssets.map((asset) => { const selected = asset.path === selectedPath; const related = relatedPaths.has(asset.path); return <div key={asset.path} className={`group flex items-center gap-1 rounded-md border px-1.5 py-1.5 transition ${selected ? "border-teal-700/40 bg-teal-700/[0.1]" : "border-transparent hover:border-slate-950/10 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/[0.05]"}`}><button type="button" onClick={() => void openAsset(asset.path)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className={selected ? "text-teal-800 dark:text-teal-300" : "text-slate-500"}>{assetIcon(asset)}</span><span className="min-w-0"><span className="block truncate font-mono text-[11px] font-semibold">{asset.name}</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{fileLabel(asset)}</span></span></button><button type="button" title={related ? "解除目前 Markdown 關聯" : "關聯目前 Markdown"} aria-label={related ? `解除 ${asset.name} 關聯` : `關聯 ${asset.name}`} onClick={() => void toggleRelation(asset)} disabled={loading} className={`rounded p-1 transition ${related ? "bg-teal-700 text-white" : "text-slate-400 hover:bg-teal-700/[0.1] hover:text-teal-800"}`}><Link2 className="h-3.5 w-3.5" /></button><button type="button" title="刪除本地 Asset" aria-label={`刪除 ${asset.name}`} onClick={() => void removeAsset(asset)} disabled={loading} className="rounded p-1 text-slate-400 transition hover:bg-red-700/[0.1] hover:text-red-800"><Trash2 className="h-3.5 w-3.5" /></button></div>; })}{!loading && visibleAssets.length === 0 && <p className="px-2 py-5 text-xs text-slate-500">目前沒有符合的 Workspace Asset。可按「匯入檔案」加入 Java、JSON、圖片或 PDF。</p>}</div></aside><section className="min-w-0 p-4 sm:p-6"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="section-label text-teal-800 dark:text-teal-300">{selectedAsset ? assetKindLabel(selectedAsset.kind) : "ASSET VIEWER"}</p><h3 className="mt-1 truncate font-serif text-xl font-bold">{selectedAsset?.name ?? "尚未選取檔案"}</h3>{selectedAsset && <p className="mt-1 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{selectedAsset.path} · {formatAssetSize(selectedAsset.bytes)} · {selectedAsset.mimeType}</p>}</div>{selectedAsset && <div className="flex items-center gap-2"><button type="button" onClick={() => void toggleRelation(selectedAsset)} disabled={loading} className={relatedPaths.has(selectedAsset.path) ? "primary-stamp" : "completion-stamp"}>{relatedPaths.has(selectedAsset.path) ? <><Check className="h-4 w-4" />已關聯目前筆記</> : <><Link2 className="h-4 w-4" />關聯目前筆記</>}</button><a href={workspaceAssetUrl(selectedAsset.path, true)} className="completion-stamp" title="下載附件"><Download className="h-4 w-4" />下載</a></div>}</div><AssetViewer asset={selectedAsset} content={selectedContent} loading={assetLoading} />{selectedAsset?.extension === "java" && <JavaPlayground asset={selectedAsset} content={selectedContent} />}{selectedAsset && <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">目前 Markdown 的 File Relations：{relatedToNote.length} · 這個檔案可被關聯到多篇 Markdown；relation metadata 儲存在本地 `.javabase/relations.json`，不進 Knowledge Index。</p>}{notice && <p role="status" className="mt-3 rounded-md border border-teal-700/20 bg-teal-700/[0.07] px-3 py-2 text-xs leading-5 text-teal-900 dark:text-teal-200">{notice}</p>}{error && <p role="alert" className="mt-3 rounded-md border border-red-700/20 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800 dark:border-red-300/20 dark:bg-red-950/30 dark:text-red-200">{error}</p>}</section></div><DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 dark:border-white/10 dark:bg-slate-900/90 sm:px-8"><span className="mr-auto font-mono text-[10px] text-slate-500 dark:text-slate-400">{assets.length} ASSETS · {relations.length} RELATIONS · LOCAL ONLY</span><DialogClose className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white dark:border-white/15 dark:bg-slate-950">關閉</DialogClose></DialogFooter></DialogContent></Dialog>;
}
