/**
 * Design reminder — 藍圖工作桌：三帶式工作畫布，讓導覽、閱讀與下一步始終同時可見。
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Command as CommandIcon,
  Database,
  Download,
  FileText,
  Gamepad2,
  GitBranch,
  History,
  Languages,
  Network,
  Plus,
  Search,
  Server,
  Settings,
  Sparkles,
  Star,
  Tags,
} from "lucide-react";
import { categories, notes, searchNotes, type Note } from "@/lib/notes";
import { KnowledgeTree } from "@/components/KnowledgeTree";
import { CommandPalette } from "@/components/CommandPalette";
import { BackupCenter } from "@/components/BackupCenter";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { GitWorkspace } from "@/components/GitWorkspace";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { RevisionWorkspace } from "@/components/RevisionWorkspace";
import { WikiMarkdown } from "@/components/WikiMarkdown";
import { guideForCategory } from "@/lib/bilingual";
import { useTheme } from "@/contexts/ThemeContext";
import { getRecentMarkdownChanges, syncNoteHistory, type NoteRevision } from "@/lib/note-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLocalBackup, downloadBackup } from "@/lib/local-backup";
import { toast } from "sonner";
import {
  addCustomKnowledge,
  createKnowledgeSnippet,
  getKnowledgeTags,
  getKnowledgeStats,
  highlightKnowledgeText,
  searchKnowledge,
  syncKnowledgeIndex,
  type KnowledgeRecord,
  type KnowledgeSearchResult,
  type KnowledgeStats,
  type KnowledgeTag,
} from "@/lib/knowledge-db";

const assets = {
  hero: "/manus-storage/java-learning-hero_ef201d8d.png",
  mark: "/manus-storage/java-learning-mark_cab4aea9.png",
  foundation: "/manus-storage/route-java-foundation_7b86bd17.png",
  backend: "/manus-storage/route-backend-desktop_8a95f80b.png",
  minecraft: "/manus-storage/route-minecraft-loaders_fad81fd7.png",
};

const REMOTE_ASSET_ORIGIN = "https://javabase-v3pxpg8n.manus.space";

function handleStorageImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.storageFallback === "true") return;
  const url = new URL(image.currentSrc || image.src, window.location.href);
  if (!url.pathname.startsWith("/manus-storage/")) return;
  image.dataset.storageFallback = "true";
  image.src = `${REMOTE_ASSET_ORIGIN}${url.pathname}`;
}

const tracks = [
  {
    id: "foundation",
    kicker: "01 · 共同基礎",
    title: "先讓 Java 成為你的工具",
    description: "從變數、流程控制到物件與檔案操作，建立三條實作路線共用的底座。",
    category: "Java 基礎",
    image: assets.foundation,
    icon: Code2,
  },
  {
    id: "productivity",
    kicker: "02 · 可見的成果",
    title: "桌面工具與後端 API",
    description: "用 Swing 做小工具，再用 Spring Boot 理解資料如何從請求走到回應。",
    category: "後端 API",
    image: assets.backend,
    icon: Server,
  },
  {
    id: "minecraft",
    kicker: "03 · 遊戲擴充",
    title: "共通概念後，再分流雙平台",
    description: "同一功能規格，分別在 Fabric 與 NeoForge 實作、建置與驗證。",
    category: "Minecraft 共通",
    image: assets.minecraft,
    icon: Gamepad2,
  },
];

const emptyCustomKnowledge = {
  title: "",
  titleEn: "",
  category: "開始使用",
  terms: "",
  tags: "",
  content: "",
};

function splitKnowledgeValues(value: string) {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

function getHeadings(note: Note): string[] {
  return Array.from(note.body.matchAll(/^#{2,3}\s+(.+)$/gm), (match) => match[1]);
}

function HighlightedSearchText({ value, query }: { value: string; query: string }) {
  return <>{highlightKnowledgeText(value, query).map((part, index) => part.isMatch ? <mark className="rounded-sm bg-amber-300/70 px-0.5 text-inherit" key={`${part.text}-${index}`}>{part.text}</mark> : <span key={`${part.text}-${index}`}>{part.text}</span>)}</>;
}

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [selectedTag, setSelectedTag] = useState(() => new URLSearchParams(window.location.search).get("tag") ?? "");
  const [activeSlug, setActiveSlug] = useState(notes[0]?.slug ?? "");
  const [completed, setCompleted] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentReads, setRecentReads] = useState<{ slug: string; at: string }[]>([]);
  const [recentEdits, setRecentEdits] = useState<NoteRevision[]>([]);
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeSearchResult[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats>({ total: 0, notes: 0, terms: 0, custom: 0 });
  const [indexReady, setIndexReady] = useState(false);
  const [searchingKnowledge, setSearchingKnowledge] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(() => ["knowledge", "create"].includes(new URLSearchParams(window.location.search).get("view") ?? ""));
  const [overviewResults, setOverviewResults] = useState<KnowledgeSearchResult[]>([]);
  const [knowledgeView, setKnowledgeView] = useState<"overview" | "create" | "detail">(() => new URLSearchParams(window.location.search).get("view") === "create" ? "create" : "overview");
  const [selectedCustomKnowledge, setSelectedCustomKnowledge] = useState<KnowledgeRecord | null>(null);
  const [customKnowledge, setCustomKnowledge] = useState(emptyCustomKnowledge);
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newNoteRequest, setNewNoteRequest] = useState(0);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [quickSearchResults, setQuickSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [knowledgeTags, setKnowledgeTags] = useState<KnowledgeTag[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "graph");
  const [backupOpen, setBackupOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "backup");
  const [gitOpen, setGitOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "git");
  const [historyOpen, setHistoryOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "history");
  const [editorOpen, setEditorOpen] = useState(() => new URLSearchParams(window.location.search).get("view") === "editor");
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorHasSaved, setEditorHasSaved] = useState(false);
  const [editorCloseConfirm, setEditorCloseConfirm] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("java-learning-completed");
    if (!saved) return;
    try {
      setCompleted(JSON.parse(saved) as string[]);
    } catch {
      window.localStorage.removeItem("java-learning-completed");
    }
  }, []);

  useEffect(() => {
    try { setFavorites(JSON.parse(window.localStorage.getItem("java-learning-favorites") ?? "[]") as string[]); } catch { window.localStorage.removeItem("java-learning-favorites"); }
    try { setRecentReads(JSON.parse(window.localStorage.getItem("java-learning-recent-reads") ?? "[]") as { slug: string; at: string }[]); } catch { window.localStorage.removeItem("java-learning-recent-reads"); }
  }, []);

  useEffect(() => {
    let active = true;
    syncKnowledgeIndex(notes)
      .then(async (stats) => {
        if (!active) return;
        const tags = await getKnowledgeTags();
        if (!active) return;
        setKnowledgeStats(stats);
        setKnowledgeTags(tags);
        setIndexReady(true);
      })
      .catch(() => {
        if (!active) return;
        setIndexReady(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    syncNoteHistory(notes).catch(() => undefined);
    getRecentMarkdownChanges().then(setRecentEdits).catch(() => setRecentEdits([]));
  }, []);

  useEffect(() => {
    if (!indexReady) return;
    let active = true;
    setSearchingKnowledge(true);
    const timer = window.setTimeout(() => {
      searchKnowledge(query, activeCategory, selectedTag)
        .then((results) => {
          if (active) setKnowledgeResults(results);
        })
        .finally(() => {
          if (active) setSearchingKnowledge(false);
        });
    }, 90);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeCategory, indexReady, query, selectedTag]);

  useEffect(() => {
    if (!quickSearchOpen || !indexReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      searchKnowledge(quickSearchQuery, "全部", selectedTag)
        .then((results) => { if (active) setQuickSearchResults(results); })
        .catch(() => { if (active) setQuickSearchResults([]); });
    }, 70);
    return () => { active = false; window.clearTimeout(timer); };
  }, [indexReady, quickSearchOpen, quickSearchQuery, selectedTag]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTextEntry = Boolean(target?.closest("input, textarea, [contenteditable=\"true\"]"));

      if (modifier && event.shiftKey && key === "p") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (modifier && key === "k" && !event.shiftKey) {
        event.preventDefault();
        openQuickSearch();
        return;
      }
      if (modifier && key === "n" && !event.shiftKey && !isTextEntry) {
        event.preventDefault();
        setNewNoteRequest((value) => value + 1);
        return;
      }
      if (modifier && key === "p" && !event.shiftKey && !isTextEntry) {
        event.preventDefault();
        setPreviewOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!knowledgeOpen || !indexReady) return;
    let active = true;
    searchKnowledge("")
      .then((results) => {
        if (active) setOverviewResults(results);
      })
      .catch(() => {
        if (active) setOverviewResults([]);
      });
    return () => { active = false; };
  }, [indexReady, knowledgeOpen]);

  const filteredNotes = useMemo(() => searchNotes(query, activeCategory, selectedTag), [query, activeCategory, selectedTag]);
  const selectedNote = notes.find((note) => note.slug === activeSlug) ?? filteredNotes[0] ?? notes[0];
  const headings = selectedNote ? getHeadings(selectedNote) : [];
  const bilingualGuide = selectedNote ? guideForCategory(selectedNote.category) : guideForCategory("開始使用");
  const totalCompleted = completed.length;
  const completionPercent = notes.length ? Math.round((totalCompleted / notes.length) * 100) : 0;
  const favoriteNotes = useMemo(() => favorites.map((slug) => notes.find((note) => note.slug === slug)).filter((note): note is Note => Boolean(note)), [favorites]);

  useEffect(() => {
    if (filteredNotes.length && !filteredNotes.some((note) => note.slug === activeSlug)) {
      setActiveSlug(filteredNotes[0].slug);
    }
  }, [activeSlug, filteredNotes]);

  useEffect(() => {
    if (!selectedNote) return;
    setRecentReads((current) => {
      const next = [{ slug: selectedNote.slug, at: new Date().toISOString() }, ...current.filter((item) => item.slug !== selectedNote.slug)].slice(0, 6);
      window.localStorage.setItem("java-learning-recent-reads", JSON.stringify(next));
      return next;
    });
  }, [selectedNote]);

  function selectCategory(category: string) {
    setActiveCategory(category);
    setQuery("");
    const first = searchNotes("", category, selectedTag)[0];
    if (first) setActiveSlug(first.slug);
  }

  function selectTag(tag: string) {
    setSelectedTag(tag);
    setActiveCategory("全部");
    setQuery("");
    setTagOpen(false);
    const first = searchNotes("", "全部", tag)[0];
    if (first) setActiveSlug(first.slug);
  }

  function clearTag() {
    setSelectedTag("");
  }

  function openWikiNote(note: Note) {
    setActiveCategory(note.category);
    setSelectedTag("");
    setQuery("");
    setActiveSlug(note.slug);
    window.setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function toggleCompleted(slug: string) {
    setCompleted((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      window.localStorage.setItem("java-learning-completed", JSON.stringify(next));
      return next;
    });
  }

  function toggleFavorite(slug: string) {
    setFavorites((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current];
      window.localStorage.setItem("java-learning-favorites", JSON.stringify(next));
      return next;
    });
  }

  function scrollToHeading(index: number) {
    articleRef.current?.querySelectorAll("h2, h3")[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openQuickSearch() {
    setQuickSearchOpen(true);
    window.setTimeout(() => quickSearchInputRef.current?.focus(), 0);
  }

  function openPreview() {
    setPreviewOpen(true);
  }

  async function exportAllBackup() {
    try {
      const backup = await createLocalBackup();
      downloadBackup(backup);
      toast.success("已下載完整本機備份");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "匯出備份未完成");
    }
  }

  function selectKnowledgeResult(result: KnowledgeSearchResult) {
    const { record } = result;
    if (record.kind === "custom") {
      setSelectedCustomKnowledge(record);
      setKnowledgeView("detail");
      setKnowledgeOpen(true);
      return;
    }
    if (record.kind === "note") {
      const matchedNote = notes.find((note) => `note:${note.slug}` === record.id);
      if (matchedNote) {
        setActiveCategory(matchedNote.category);
        setActiveSlug(matchedNote.slug);
        return;
      }
    }
    setActiveCategory(record.category);
    setQuery(record.titleEn || record.title);
    const firstNote = searchNotes(record.titleEn || record.title, record.category)[0] ?? searchNotes("", record.category)[0];
    if (firstNote) setActiveSlug(firstNote.slug);
  }

  async function saveCustomKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSavedMessage("");
    if (!customKnowledge.title.trim() || !customKnowledge.content.trim()) {
      setFormError("請至少填寫知識標題與內容。");
      return;
    }

    try {
      setIsSavingKnowledge(true);
      const record = await addCustomKnowledge({
        title: customKnowledge.title,
        titleEn: customKnowledge.titleEn,
        category: customKnowledge.category,
        terms: splitKnowledgeValues(customKnowledge.terms),
        tags: splitKnowledgeValues(customKnowledge.tags),
        content: customKnowledge.content,
      });
      const [stats, results, tags] = await Promise.all([getKnowledgeStats(), searchKnowledge(""), getKnowledgeTags()]);
      setKnowledgeStats(stats);
      setOverviewResults(results);
      setKnowledgeTags(tags);
      setCustomKnowledge(emptyCustomKnowledge);
      setSavedMessage(`「${record.title}」已保存到這台瀏覽器的知識庫。`);
      setKnowledgeView("overview");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "無法保存知識，請再試一次。");
    } finally {
      setIsSavingKnowledge(false);
    }
  }

  function selectQuickSearchResult(result: KnowledgeSearchResult) {
    setQuickSearchOpen(false);
    selectKnowledgeResult(result);
  }

  const commandActions = [
    { id: "create-note", label: "新增筆記", description: "在知識樹建立一個新的 Markdown 筆記", shortcut: "Ctrl N", keywords: ["new", "markdown", "note"], icon: Plus, onSelect: () => setNewNoteRequest((value) => value + 1) },
    { id: "search-knowledge", label: "搜尋知識", description: "搜尋 Markdown、術語、標籤與本地知識", shortcut: "Ctrl K", keywords: ["search", "find", "knowledge"], icon: Search, onSelect: openQuickSearch },
    { id: "preview-note", label: "預覽目前筆記", description: "以閱讀模式開啟目前 Markdown 筆記", shortcut: "Ctrl P", keywords: ["preview", "read", "markdown"], icon: FileText, onSelect: openPreview },
    { id: "knowledge-graph", label: "開啟 Knowledge Graph", description: "查看 Markdown Wiki 連結的知識關聯圖", keywords: ["graph", "wiki", "links"], icon: Network, onSelect: () => setGraphOpen(true) },
    { id: "settings", label: "開啟設定與備份", description: "管理本機資料備份、還原與 Markdown 匯出", keywords: ["settings", "backup", "restore", "export"], icon: Settings, onSelect: () => setBackupOpen(true) },
    { id: "export-all", label: "匯出全部", description: "下載目前瀏覽器中的完整 JavaBase JSON 備份", keywords: ["export", "backup", "json", "download"], icon: Download, onSelect: () => void exportAllBackup() },
    { id: "git", label: "開啟 Git 工作台", description: "檢視、暫存、提交與推送 Markdown 變更", keywords: ["git", "commit", "push", "diff"], icon: GitBranch, onSelect: () => setGitOpen(true) },
    { id: "history", label: "開啟修改歷史", description: "查看目前筆記的版本快照與差異", keywords: ["history", "revision", "diff"], icon: History, onSelect: () => setHistoryOpen(true) },
    { id: "editor", label: "編輯實體 Markdown", description: "開啟具備自動保存與衝突檢查的編輯器", keywords: ["edit", "write", "save", "markdown"], icon: FileText, onSelect: () => { setEditorDirty(false); setEditorHasSaved(false); setEditorOpen(true); } },
    { id: "theme", label: theme === "dark" ? "切換至 Light" : "切換至 Dark", description: "切換學習基地的顯示主題", keywords: ["theme", "dark", "light"], icon: CommandIcon, onSelect: () => setTheme?.(theme === "dark" ? "light" : "dark") },
  ];

  if (!selectedNote) {
    return <main className="p-10">找不到可閱讀的 Markdown 筆記。</main>;
  }

  return (
    <div className="min-h-screen blueprint-shell text-slate-950">
      <header className="border-b border-slate-950/10 bg-[#f8f4e9]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => { setKnowledgeView("overview"); setKnowledgeOpen(true); }}
            className="header-brand group flex min-w-0 items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-teal-700/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            aria-label="開啟學習基地已保存知識總覽"
            title="開啟已保存知識"
          >
            <img className="brand-mark h-11 w-11 shrink-0" src={assets.mark} onError={handleStorageImageError} alt="程式學習基地識別標誌" />
            <div className="min-w-0">
              <p className="brand-metadata font-mono text-[9px] font-bold tracking-[0.16em]">LOCAL MARKDOWN WORKBENCH · OPEN</p>
              <h1 className="wordmark-lockup brand-wordmark truncate">
                <span className="wordmark-java">JAVA</span><span className="wordmark-divider">/</span><span>學習基地</span>
              </h1>
            </div>
          </button>
          <div className="flex shrink-0 gap-2 md:hidden"><button type="button" onClick={() => setCommandPaletteOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-teal-800/20 bg-teal-700/[0.08] text-teal-800 transition hover:border-teal-700/35 hover:bg-teal-700 hover:text-white" aria-label="開啟命令面板"><CommandIcon className="h-4 w-4" /></button><button type="button" onClick={() => setBackupOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-950/10 bg-white/65 text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟設定與備份中心"><Settings className="h-4 w-4" /></button><button type="button" onClick={() => setGitOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-950/10 bg-white/65 text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟本機 Git 工作台"><GitBranch className="h-4 w-4" /></button><button type="button" onClick={() => setGraphOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-950/10 bg-white/65 text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟 Wiki 知識關聯圖"><Network className="h-4 w-4" /></button></div>
          <div className="workbench-tools hidden items-center gap-3 text-xs text-slate-600 md:flex">
            <span className="inline-flex overflow-hidden rounded-md border border-slate-950/10 bg-white/65"><button type="button" onClick={() => setTheme?.("light")} className={`px-2 py-1.5 ${theme === "light" ? "bg-teal-700 text-white" : ""}`}>☀ Light</button><button type="button" onClick={() => setTheme?.("dark")} className={`px-2 py-1.5 ${theme === "dark" ? "bg-teal-700 text-white" : ""}`}>🌙 Dark</button><button type="button" onClick={() => setTheme?.("system")} className={`px-2 py-1.5 ${theme === "system" ? "bg-teal-700 text-white" : ""}`}>🖥 System</button></span>
            <button type="button" onClick={() => setGraphOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-950/10 bg-white/65 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟 Wiki 知識關聯圖"><Network className="h-3.5 w-3.5" />知識圖</button>
            <button type="button" onClick={() => setBackupOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-950/10 bg-white/65 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟設定與備份中心"><Settings className="h-3.5 w-3.5" />設定</button>
            <button type="button" onClick={() => setGitOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-slate-950/10 bg-white/65 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟本機 Git 工作台"><GitBranch className="h-3.5 w-3.5" />Git</button>
            <button type="button" onClick={() => setCommandPaletteOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-teal-800/20 bg-teal-700/[0.08] px-2.5 py-1.5 font-semibold text-teal-800 transition hover:border-teal-700/35 hover:bg-teal-700 hover:text-white" aria-label="開啟命令面板"><CommandIcon className="h-3.5 w-3.5" />命令面板 <kbd className="rounded border border-current/20 bg-white/50 px-1 font-mono text-[10px]">Ctrl ⇧ P</kbd></button>
            <button type="button" onClick={openQuickSearch} className="inline-flex items-center gap-2 rounded-md border border-slate-950/10 bg-white/65 px-2.5 py-1.5 font-semibold text-slate-700 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="開啟快速全文搜尋">
              <Search className="h-3.5 w-3.5" />快速搜尋 <kbd className="rounded border border-slate-950/10 bg-[#f8f4e9] px-1 font-mono text-[10px]">Ctrl K</kbd>
            </button>
            <span className="verification-dot" />
            <span>筆記由 Markdown 載入</span>
          </div>
        </div>
      </header>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} actions={commandActions} />
      <BackupCenter open={backupOpen} onOpenChange={setBackupOpen} />
      <GitWorkspace open={gitOpen} onOpenChange={setGitOpen} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
          <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
            <div className="flex items-center gap-2 text-teal-800"><FileText className="h-4 w-4" /><p className="section-label text-teal-800">MARKDOWN PREVIEW</p></div>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight">{selectedNote.title}</DialogTitle>
            <DialogDescription>{selectedNote.summary}</DialogDescription>
          </DialogHeader>
          <article className="reading-paper prose prose-slate max-w-none px-6 py-7 sm:px-10 sm:py-9">
            <WikiMarkdown markdown={selectedNote.body} onOpenNote={(note) => { setPreviewOpen(false); openWikiNote(note); }} />
          </article>
          <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8"><span className="mr-auto font-mono text-[10px] text-slate-500">{selectedNote.path} · READ-ONLY PREVIEW</span><DialogClose className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">關閉預覽</DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-6xl gap-0 overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
          <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
            <div className="flex items-center gap-2 text-teal-800"><Network className="h-4 w-4" /><p className="section-label text-teal-800">MARKDOWN WIKI GRAPH</p></div>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight">知識關聯圖</DialogTitle>
            <DialogDescription className="max-w-3xl leading-6 text-slate-600">圖中的節點來自含有 Wiki 連結的 Markdown 筆記；連線直接由 `[[筆記名稱]]` 建立。點擊節點可開啟文章，拖曳可調整你的閱讀座標。</DialogDescription>
          </DialogHeader>
          <div className="px-4 py-4 sm:px-6"><KnowledgeGraph activeSlug={selectedNote.slug} visibleNoteSlugs={filteredNotes.map((note) => note.slug)} onOpenNote={(note) => { setGraphOpen(false); openWikiNote(note); }} /></div>
          <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8"><span className="mr-auto font-mono text-[10px] text-slate-500">WIKI LINKS → LIVE GRAPH · DRAG / ZOOM / OPEN NOTE</span><DialogClose className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">關閉圖譜</DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <RevisionWorkspace note={selectedNote} open={historyOpen} onOpenChange={setHistoryOpen} />

      <Dialog open={editorOpen} onOpenChange={(next) => { if (!next && editorDirty) { setEditorCloseConfirm(true); return; } setEditorOpen(next); if (!next && editorHasSaved) window.setTimeout(() => location.reload(), 140); }}><DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-7xl overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0"><DialogHeader className="border-b border-slate-950/10 px-6 pb-4 pt-6"><DialogTitle className="font-serif text-2xl font-bold">Markdown 編輯工作台 · 實體檔案模式</DialogTitle><DialogDescription>停止輸入約 1.2 秒後會安全自動保存；Ctrl+S 可立即保存。每次寫入都會比對磁碟版本、建立備份，關閉工作台後才重新載入全域索引。</DialogDescription></DialogHeader><div className="p-4"><MarkdownEditor note={selectedNote} onDirtyChange={setEditorDirty} onSaved={() => setEditorHasSaved(true)} onOpenNote={(note) => { setEditorOpen(false); openWikiNote(note); }} /></div></DialogContent></Dialog>
      <AlertDialog open={editorCloseConfirm} onOpenChange={setEditorCloseConfirm}><AlertDialogContent className="border-slate-950/20 bg-[#fffdf7] text-slate-950"><AlertDialogHeader><AlertDialogTitle>尚有尚未保存的 Markdown 內容</AlertDialogTitle><AlertDialogDescription>再等候約 1.2 秒可讓自動保存完成，或按下「放棄未保存內容」關閉工作台。這不會刪除先前已寫入實體檔的版本。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>繼續編輯</AlertDialogCancel><AlertDialogAction onClick={() => { setEditorCloseConfirm(false); setEditorDirty(false); setEditorOpen(false); if (editorHasSaved) window.setTimeout(() => location.reload(), 140); }} className="bg-amber-700 text-white hover:bg-amber-800">放棄未保存內容</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={quickSearchOpen} onOpenChange={setQuickSearchOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl gap-0 overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
          <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
            <div className="flex items-center gap-2 text-teal-800"><Search className="h-4 w-4" /><p className="section-label text-teal-800">FULL-TEXT KNOWLEDGE SEARCH</p></div>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight">快速搜尋所有知識</DialogTitle>
            <DialogDescription className="leading-6 text-slate-600">搜尋檔名、Markdown 正文、分類、標籤與中英文術語；支援像 `Minecraft 26.2`、`Consumable`、`ResourceLocation`、`Fabric 26.2` 的技術查詢。</DialogDescription>
            <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input ref={quickSearchInputRef} value={quickSearchQuery} onChange={(event) => setQuickSearchQuery(event.target.value)} placeholder="輸入中文概念、英文 API、檔名或標籤…" className="h-11 border-slate-900/15 bg-white pl-9 pr-16" aria-label="快速全文搜尋" /><kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-950/10 bg-[#f8f4e9] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">ESC</kbd></div>
          </DialogHeader>
          <div className="divide-y divide-slate-950/10">
            {quickSearchResults.slice(0, 12).map((result) => (
              <button key={result.record.id} type="button" onClick={() => selectQuickSearchResult(result)} className="group flex w-full items-start gap-3 px-6 py-3.5 text-left transition hover:bg-teal-700/[0.05] sm:px-8">
                <span className="mt-0.5 rounded-sm border border-teal-800/20 bg-teal-700/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-800">{result.record.kind === "term" ? "TERM" : result.record.kind === "custom" ? "LOCAL" : "MD"}</span>
                <span className="min-w-0 flex-1"><span className="font-serif text-base font-bold group-hover:text-teal-900"><HighlightedSearchText value={result.record.title} query={quickSearchQuery} /></span>{result.record.titleEn && result.record.titleEn !== result.record.title && <span className="ml-2 font-mono text-xs text-teal-800"><HighlightedSearchText value={result.record.titleEn} query={quickSearchQuery} /></span>}<span className="mt-1 block text-xs leading-5 text-slate-600"><HighlightedSearchText value={createKnowledgeSnippet(result.record, quickSearchQuery)} query={quickSearchQuery} /></span><span className="mt-2 block font-mono text-[10px] text-slate-500">{result.record.path.split("/").pop()} · 命中：{result.matchedIn.join("、")}</span></span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-teal-800 opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
            {indexReady && quickSearchResults.length === 0 && <p className="px-6 py-8 text-sm leading-6 text-slate-600 sm:px-8">找不到結果。試試較短的 API 名稱、標籤或修正常見拼寫，例如 `resourcelocaton`、`consumable`、`fabric 26.2`。</p>}
          </div>
          <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-3 sm:px-8"><span className="mr-auto font-mono text-[10px] text-slate-500">{quickSearchResults.length} MATCHES · Ctrl／⌘ K 開啟 · Esc 關閉</span><DialogClose className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">關閉</DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={knowledgeOpen} onOpenChange={(open) => { setKnowledgeOpen(open); if (!open) { setKnowledgeView("overview"); setSelectedCustomKnowledge(null); setFormError(""); } }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl gap-0 overflow-y-auto border-slate-950/20 bg-[#f8f4e9] p-0 text-slate-950 shadow-2xl">
          {knowledgeView === "overview" ? (
            <>
          <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
            <div className="flex items-center justify-between gap-3 text-teal-800"><span className="inline-flex items-center gap-2"><Database className="h-4 w-4" /><p className="section-label text-teal-800">LOCAL KNOWLEDGE ARCHIVE</p></span><button type="button" onClick={() => { setSavedMessage(""); setFormError(""); setKnowledgeView("create"); }} className="inline-flex items-center gap-1.5 rounded-md border border-teal-800/20 bg-white px-2.5 py-1.5 text-xs font-bold text-teal-800 transition hover:border-teal-700 hover:bg-teal-700 hover:text-white"><Plus className="h-3.5 w-3.5" />新增知識</button></div>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight">學習基地已保存的知識</DialogTitle>
            <DialogDescription className="max-w-2xl leading-6 text-slate-600">這裡列出目前儲存在此瀏覽器本地索引中的 Markdown 筆記與中英文術語。點選任一項目，就能回到相對應的學習內容或搜尋結果。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b border-slate-950/10 bg-teal-700/[0.045] px-6 py-4 sm:grid-cols-4 sm:px-8">
            <div className="rounded-md border border-teal-800/15 bg-white/70 p-3"><p className="section-label text-teal-800">SAVED NOTES</p><p className="mt-1 font-serif text-2xl font-bold">{knowledgeStats.notes}</p><p className="text-xs text-slate-600">可閱讀的 Markdown 筆記</p></div>
            <div className="rounded-md border border-teal-800/15 bg-white/70 p-3"><p className="section-label text-teal-800">BILINGUAL TERMS</p><p className="mt-1 font-serif text-2xl font-bold">{knowledgeStats.terms}</p><p className="text-xs text-slate-600">中英文技術術語</p></div>
            <div className="rounded-md border border-teal-800/15 bg-white/70 p-3"><p className="section-label text-teal-800">MY KNOWLEDGE</p><p className="mt-1 font-serif text-2xl font-bold">{knowledgeStats.custom}</p><p className="text-xs text-slate-600">本地自建知識</p></div>
            <div className="rounded-md border border-teal-800/15 bg-white/70 p-3"><p className="section-label text-teal-800">CATEGORIES</p><p className="mt-1 font-serif text-2xl font-bold">{categories.length}</p><p className="text-xs text-slate-600">可分類探索的主題</p></div>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            {savedMessage && <p role="status" className="rounded-md border border-teal-700/25 bg-teal-700/[0.08] px-3 py-2 text-sm font-semibold text-teal-900">{savedMessage}</p>}
            <section>
              <div className="flex items-center justify-between gap-4"><div><p className="section-label">SAVED KNOWLEDGE</p><h3 className="mt-1 font-serif text-xl font-bold">已保存筆記與自訂知識</h3></div><span className="font-mono text-xs text-slate-500">{overviewResults.filter((result) => result.record.kind === "note" || result.record.kind === "custom").length} RECORDS</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {overviewResults.filter((result) => result.record.kind === "note" || result.record.kind === "custom").map((result) => (
                  <button key={result.record.id} type="button" onClick={() => { selectKnowledgeResult(result); if (result.record.kind !== "custom") setKnowledgeOpen(false); }} className="group rounded-md border border-slate-950/10 bg-white/65 p-3 text-left transition hover:border-teal-700/35 hover:bg-white">
                    <span className="font-mono text-[10px] text-teal-800">{result.record.kind === "custom" ? "LOCAL · " : ""}{result.record.category}</span>
                    <span className="mt-1 block font-serif text-base font-bold group-hover:text-teal-900">{result.record.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{result.record.preview}</span>
                  </button>
                ))}
                {indexReady && overviewResults.filter((result) => result.record.kind === "note" || result.record.kind === "custom").length === 0 && <p className="text-sm text-slate-600">目前沒有可顯示的筆記資料。</p>}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4"><div><p className="section-label">BILINGUAL GLOSSARY</p><h3 className="mt-1 font-serif text-xl font-bold">已保存雙語術語</h3></div><span className="font-mono text-xs text-slate-500">{overviewResults.filter((result) => result.record.kind === "term").length} TERMS</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {overviewResults.filter((result) => result.record.kind === "term").map((result) => (
                  <button key={result.record.id} type="button" onClick={() => { selectKnowledgeResult(result); setKnowledgeOpen(false); }} className="rounded-md border border-teal-800/15 bg-white/70 px-2.5 py-1.5 text-left text-xs transition hover:border-teal-700/40 hover:bg-white">
                    <span className="font-semibold text-slate-800">{result.record.title}</span><span className="mx-1 text-slate-400">·</span><span className="font-mono text-teal-800">{result.record.titleEn}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4"><div><p className="section-label">TAG DIRECTORY</p><h3 className="mt-1 font-serif text-xl font-bold">依標籤探索知識</h3></div><span className="font-mono text-xs text-slate-500">{knowledgeTags.length} TAGS</span></div>
              <div className="mt-3 flex flex-wrap gap-2">{knowledgeTags.map((tag) => <button key={tag.normalized} type="button" onClick={() => { selectTag(tag.name); setKnowledgeOpen(false); }} className="inline-flex items-center gap-1.5 rounded-md border border-teal-800/15 bg-white/70 px-2.5 py-1.5 text-xs transition hover:border-teal-700/40 hover:bg-white"><span className="font-semibold text-slate-800">{tag.name}</span><span className="font-mono text-teal-800">{tag.count}</span></button>)}</div>
            </section>
          </div>

          <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8">
            <DialogClose className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">回到學習頁</DialogClose>
          </DialogFooter>
            </>
          ) : knowledgeView === "create" ? (
            <form onSubmit={saveCustomKnowledge}>
              <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
                <div className="flex items-center gap-2 text-teal-800"><Plus className="h-4 w-4" /><p className="section-label text-teal-800">CREATE LOCAL KNOWLEDGE</p></div>
                <DialogTitle className="font-serif text-2xl font-bold tracking-tight">新增一則本地知識</DialogTitle>
                <DialogDescription className="max-w-2xl leading-6 text-slate-600">填寫後會保存到目前瀏覽器的 IndexedDB，立即加入學習基地總覽與中英文搜尋；不會覆蓋 Markdown 原稿。</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
                <label className="space-y-1.5"><span className="text-sm font-semibold">知識標題 <span className="text-teal-800">Title</span></span><Input value={customKnowledge.title} onChange={(event) => setCustomKnowledge((current) => ({ ...current, title: event.target.value }))} placeholder="例如：Java 例外處理" required /></label>
                <label className="space-y-1.5"><span className="text-sm font-semibold">英文術語 <span className="text-slate-500">English term</span></span><Input value={customKnowledge.titleEn} onChange={(event) => setCustomKnowledge((current) => ({ ...current, titleEn: event.target.value }))} placeholder="例如：exception handling" /></label>
                <label className="space-y-1.5"><span className="text-sm font-semibold">分類 <span className="text-slate-500">Category</span></span><Select value={customKnowledge.category} onValueChange={(category) => setCustomKnowledge((current) => ({ ...current, category }))}><SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></label>
                <label className="space-y-1.5"><span className="text-sm font-semibold">標籤 <span className="text-slate-500">Tags</span></span><Input value={customKnowledge.tags} onChange={(event) => setCustomKnowledge((current) => ({ ...current, tags: event.target.value }))} placeholder="以逗號分隔，例如：error, debug" /></label>
                <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">補充術語 <span className="text-slate-500">Extra terms</span></span><Input value={customKnowledge.terms} onChange={(event) => setCustomKnowledge((current) => ({ ...current, terms: event.target.value }))} placeholder="以逗號分隔，例如：try, catch, finally" /></label>
                <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">知識內容 <span className="text-teal-800">Knowledge note</span></span><Textarea value={customKnowledge.content} onChange={(event) => setCustomKnowledge((current) => ({ ...current, content: event.target.value }))} className="min-h-44 resize-y bg-white" placeholder="用自己的話寫下定義、範例、易錯點或待查問題…" required /></label>
                {formError && <p role="alert" className="sm:col-span-2 rounded-md border border-red-700/20 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
              </div>
              <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8"><button type="button" onClick={() => setKnowledgeView("overview")} className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">返回總覽</button><button type="submit" disabled={isSavingKnowledge} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60">{isSavingKnowledge ? "保存中…" : "保存到知識庫"}</button></DialogFooter>
            </form>
          ) : selectedCustomKnowledge ? (
            <>
              <DialogHeader className="border-b border-slate-950/10 bg-[#fffdf7]/80 px-6 pb-5 pt-6 sm:px-8">
                <div className="flex items-center gap-2 text-teal-800"><Database className="h-4 w-4" /><p className="section-label text-teal-800">LOCAL CUSTOM KNOWLEDGE</p></div>
                <DialogTitle className="font-serif text-2xl font-bold tracking-tight">{selectedCustomKnowledge.title}</DialogTitle>
                {selectedCustomKnowledge.titleEn && <DialogDescription className="font-mono text-teal-800">{selectedCustomKnowledge.titleEn}</DialogDescription>}
              </DialogHeader>
              <div className="space-y-5 px-6 py-6 sm:px-8">
                <div className="flex flex-wrap gap-1.5">{selectedCustomKnowledge.tags.map((tag) => <button type="button" className="tag-chip transition hover:border-teal-700/40 hover:bg-white" key={tag} onClick={() => { selectTag(tag); setKnowledgeOpen(false); }}>#{tag}</button>)}</div>
                {selectedCustomKnowledge.terms.length > 0 && <div className="rounded-md border border-teal-800/15 bg-teal-700/[0.05] p-3"><p className="section-label text-teal-800">SEARCH TERMS</p><p className="mt-2 font-mono text-sm leading-6 text-slate-700">{selectedCustomKnowledge.terms.join(" · ")}</p></div>}
                <article className="whitespace-pre-wrap font-serif text-base leading-8 text-slate-800">{selectedCustomKnowledge.content}</article>
              </div>
              <DialogFooter className="border-t border-slate-950/10 bg-[#fffdf7]/80 px-6 py-4 sm:px-8"><button type="button" onClick={() => { setSelectedCustomKnowledge(null); setKnowledgeView("overview"); }} className="rounded-md border border-slate-950/15 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-950 hover:text-white">返回總覽</button></DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="mx-auto grid max-w-[1540px] gap-5 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[238px_minmax(0,1fr)_258px] xl:gap-7">
        <aside className="workbench-panel h-fit p-3 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
          <div className="mb-3 flex items-center justify-between px-2 pt-1">
            <p className="section-label">LEARNING INDEX</p>
            <span className="font-mono text-[10px] text-slate-500">{knowledgeStats.total.toString().padStart(2, "0")} RECORDS</span>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="全文搜尋：概念、API、檔名、標籤…"
              className="w-full rounded-md border border-slate-900/15 bg-white/80 py-2.5 pl-9 pr-14 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              aria-label="搜尋 Markdown、術語與本地知識"
            />
            <button type="button" onClick={openQuickSearch} className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-950/10 bg-[#f8f4e9] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 transition hover:border-teal-700/35 hover:text-teal-900" aria-label="以快速搜尋開啟全文搜尋">Ctrl K</button>
          </div>
          <div className="mb-4 flex items-center gap-2 px-1 text-[10px] font-mono text-teal-800">
            <Database className="h-3.5 w-3.5" />
            <span>{indexReady ? `LOCAL INDEX · ${knowledgeStats.notes} NOTES · ${knowledgeStats.terms} TERMS` : "LOCAL INDEX · 建立中"}</span>
          </div>
          <section className="mb-4 rounded-md border border-teal-800/15 bg-teal-700/[0.045] p-2">
            <button type="button" onClick={() => setTagOpen((open) => !open)} className="flex w-full items-center gap-2 px-1 py-1 text-left"><Tags className="h-3.5 w-3.5 text-teal-800" /><span className="section-label text-teal-800">EXPLORE TAGS</span><span className="ml-auto font-mono text-[10px] text-teal-800">{knowledgeTags.length}</span></button>
            {tagOpen && <div className="mt-2 flex flex-wrap gap-1.5">{knowledgeTags.slice(0, 24).map((tag) => <button key={tag.normalized} type="button" onClick={() => selectTag(tag.name)} className={`rounded-sm border px-1.5 py-1 text-[10px] transition ${selectedTag.toLocaleLowerCase() === tag.normalized ? "border-teal-700 bg-teal-700 text-white" : "border-teal-800/15 bg-white/70 text-slate-700 hover:border-teal-700/40"}`}>{tag.name} <span className="font-mono opacity-70">{tag.count}</span></button>)}</div>}
          </section>

          <KnowledgeTree notes={filteredNotes} activeSlug={activeSlug} completed={completed} onOpenNote={openWikiNote} createNoteRequest={newNoteRequest} />

          <div className="mt-5 rounded-md border border-teal-700/20 bg-teal-700/[0.07] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label text-teal-800">READING PROGRESS</span>
              <span className="font-mono text-xs font-bold text-teal-800">{completionPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-teal-900/10">
              <div className="h-full rounded-full bg-teal-700 transition-[width] duration-300" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">已做完 {totalCompleted} / {notes.length} 篇。進度只保存於這台瀏覽器。</p>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {selectedTag && <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-800/20 bg-teal-700/[0.07] px-4 py-3"><div className="flex items-center gap-2"><Tags className="h-4 w-4 text-teal-800" /><span className="section-label text-teal-800">TAG FILTER</span><span className="rounded-sm bg-white px-2 py-1 font-mono text-xs font-bold text-teal-900">{selectedTag}</span><span className="text-xs text-slate-600">{filteredNotes.length} 篇 Markdown 筆記</span></div><button type="button" onClick={clearTag} className="rounded-md border border-teal-800/20 bg-white px-2.5 py-1.5 text-xs font-bold text-teal-800 transition hover:border-teal-700 hover:bg-teal-700 hover:text-white">清除標籤</button></section>}
          {!query.trim() && !selectedTag && (
            <>
          <section className="mb-5 grid gap-3 md:grid-cols-2"><div className="dark-surface rounded-md border border-slate-950/15 bg-[#fffdf7]/80 p-4"><p className="section-label text-teal-800">RECENTLY EDITED</p>{recentEdits.length ? recentEdits.map((item) => { const note = notes.find((entry) => entry.slug === item.noteSlug); return note && <button key={item.id} type="button" onClick={() => openWikiNote(note)} className="dark-recent-item mt-2 block w-full text-left text-sm font-semibold hover:text-teal-800">📝 {note.title}<span className="ml-2 font-mono text-[10px] font-normal text-slate-500">{new Date(item.savedAt).toLocaleString("zh-TW")}</span></button>; }) : <p className="mt-2 text-sm text-slate-500">Markdown 下一次內容變更後會出現在此處。</p>}</div><div className="dark-surface rounded-md border border-slate-950/15 bg-[#fffdf7]/80 p-4"><p className="section-label text-teal-800">RECENTLY READ</p>{recentReads.map((item) => { const note = notes.find((entry) => entry.slug === item.slug); return note && <button key={item.slug} type="button" onClick={() => openWikiNote(note)} className="dark-recent-item mt-2 block w-full text-left text-sm font-semibold hover:text-teal-800">📖 {note.title}<span className="ml-2 font-mono text-[10px] font-normal text-slate-500">{new Date(item.at).toLocaleString("zh-TW")}</span></button>; })}</div></section>
          {favoriteNotes.length > 0 && <section className="dark-surface mb-5 rounded-md border border-amber-700/25 bg-amber-50/70 p-4 shadow-sm"><div className="flex items-center gap-2"><Star className="h-4 w-4 fill-amber-500 text-amber-700" /><p className="section-label text-amber-800">PINNED NOTES · {favoriteNotes.length}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{favoriteNotes.map((note) => <button key={note.slug} type="button" onClick={() => openWikiNote(note)} className="dark-surface-raised rounded-md border border-slate-950/10 bg-[#fffdf7] px-3 py-2.5 text-left transition hover:border-amber-700/40"><span className="block font-serif font-bold">{note.title}</span><span className="mt-1 block font-mono text-[10px] text-teal-800">{note.category} · {note.tags.slice(0, 2).join(" · ")}</span></button>)}</div></section>}
          <section className="hero-workbench overflow-hidden">
            <div className="hero-schematic" aria-hidden="true"><span className="schematic-code">public static void main(String[] args)</span><span className="schematic-note">VERIFY · BUILD · REPEAT</span><span className="schematic-axis">JAVA / PYTHON / MINECRAFT</span><i className="schematic-orbit schematic-orbit-one" /><i className="schematic-orbit schematic-orbit-two" /></div>
            <div className="hero-coordinate-rail" aria-hidden="true"><span>00</span><i /><span>10</span><i /><span>20</span><i /><span>30</span></div>
            <div className="hero-copy">
              <div className="mb-3 flex items-center gap-2"><span className="coordinate-chip">00.01</span><p className="section-label text-teal-800">YOUR CODE COORDINATES</p></div>
              <h2 className="max-w-xl font-serif text-3xl font-bold leading-[1.16] tracking-tight sm:text-4xl">先讓程式跑起來，再理解它為什麼能跑。</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-700 sm:text-base">這裡把 Java 與 Python 筆記留在 Markdown 裡；中文先幫你理解，English terms 幫你接上文件。忘記時，直接回到上一個座標。</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" className="primary-stamp" onClick={() => selectCategory("開始使用")}>
                  從零開始 <ArrowRight className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs text-slate-500">00.01 → 10.XX</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="route-title" className="workbench-panel p-4 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="section-label">PRACTICE ROUTES</p>
                <h2 id="route-title" className="mt-1 font-serif text-xl font-bold">同一個基礎，三條可實作的路。</h2>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">點選路線，開啟對應筆記</span>
            </div>
            <div className="route-path-ruler" aria-hidden="true"><span>00</span><i /><span>01</span><i /><span>02</span><i /><span>03</span><b>→</b></div>
            <div className="route-module-grid grid gap-3 lg:grid-cols-3">
              {tracks.map((track, index) => {
                const Icon = track.icon;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => selectCategory(track.category)}
                    className="track-card route-path-stop group text-left"
                  >
                    <img className="track-card-image" src={track.image} onError={handleStorageImageError} alt="" aria-hidden="true" />
                    <div className="relative z-10 flex min-h-[228px] flex-col p-4">
                      <div className="flex items-center justify-between">
                        <span className="route-coordinate">{track.kicker}</span>
                        <span className="route-anchor"><span>{String(index + 1).padStart(2, "0")}</span><i /><Icon className="h-3.5 w-3.5" /></span>
                      </div>
                      <div className="dark-route-copy mt-auto rounded-md bg-[#fbf7ee]/94 p-3 backdrop-blur-sm">
                        <h3 className="font-serif text-lg font-bold leading-snug">{track.title}</h3>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">{track.description}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="route-status">NEXT: {track.category}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800">開啟 <ChevronRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
            </>
          )}

          <section className="workbench-panel current-note-canvas overflow-hidden">
            <div className="dark-surface-raised flex flex-col gap-4 border-b border-slate-900/10 bg-[#fffdf7]/75 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="section-label">CURRENT NOTE · {selectedNote.category.toUpperCase()}</p>
                <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight">{selectedNote.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{selectedNote.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleCompleted(selectedNote.slug)}
                className={`completion-stamp ${completed.includes(selectedNote.slug) ? "completion-stamp-done" : ""}`}
              >
                <Check className="h-4 w-4" />
                {completed.includes(selectedNote.slug) ? "已完成" : "標記完成"}
              </button>
              <button type="button" onClick={() => setHistoryOpen(true)} className="completion-stamp"><History className="h-4 w-4" />修改歷史</button>
              <button type="button" onClick={() => { setEditorDirty(false); setEditorHasSaved(false); setEditorOpen(true); }} className="completion-stamp"><FileText className="h-4 w-4" />編輯實體 Markdown</button>
              <button type="button" onClick={() => toggleFavorite(selectedNote.slug)} className={`completion-stamp ${favorites.includes(selectedNote.slug) ? "completion-stamp-done" : ""}`}><Star className={`h-4 w-4 ${favorites.includes(selectedNote.slug) ? "fill-current" : ""}`} />{favorites.includes(selectedNote.slug) ? "已收藏" : "收藏"}</button>
            </div>

            <div className="dark-surface border-b border-slate-900/10 bg-[#f6f1e7] px-4 py-2.5 sm:px-6">
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {(filteredNotes.length ? filteredNotes : notes).map((note) => (
                  <button
                    key={note.slug}
                    type="button"
                    onClick={() => openWikiNote(note)}
                    className={`note-tab ${note.slug === selectedNote.slug ? "note-tab-active" : ""}`}
                  >
                    <span className="font-mono text-[10px]">{String(note.order).padStart(2, "0")}</span>
                    {note.title}
                  </button>
                ))}
              </div>
            </div>

            {query.trim() && (
              <div className="border-b border-slate-900/10 bg-[#fffdf7]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 bg-teal-700/[0.04] px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-teal-800" />
                    <div>
                      <p className="section-label">LOCAL KNOWLEDGE QUERY</p>
                      <h2 className="mt-0.5 font-serif text-lg font-bold">「{query}」的資料庫結果</h2>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{searchingKnowledge ? "SEARCHING…" : `${knowledgeResults.length} MATCHES`}</span>
                </div>
                <div className="divide-y divide-slate-900/10">
                  {knowledgeResults.slice(0, 6).map((result) => (
                    <button
                      key={result.record.id}
                      type="button"
                      onClick={() => selectKnowledgeResult(result)}
                      className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-teal-700/[0.045] sm:px-6"
                    >
                      <span className="mt-0.5 rounded-sm border border-teal-800/20 bg-teal-700/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-800">{result.record.kind === "term" ? "TERM" : "NOTE"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <strong className="font-serif text-base group-hover:text-teal-900"><HighlightedSearchText value={result.record.title} query={query} /></strong>
                          {result.record.titleEn !== result.record.title && <span className="font-mono text-xs text-teal-800"><HighlightedSearchText value={result.record.titleEn} query={query} /></span>}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600"><HighlightedSearchText value={createKnowledgeSnippet(result.record, query)} query={query} /></span>
                        <span className="mt-2 block font-mono text-[10px] text-slate-500">{result.record.path.split("/").pop()} · {result.record.category} · 命中：{result.matchedIn.join("、")}</span>
                        {result.record.tags.length > 0 && <span className="mt-2 flex flex-wrap gap-1.5">{result.record.tags.slice(0, 5).map((tag) => <button key={tag} type="button" onClick={(event) => { event.stopPropagation(); selectTag(tag); }} className="rounded-sm border border-teal-800/15 bg-white px-1.5 py-0.5 font-mono text-[10px] text-teal-800 hover:border-teal-700/40">#{tag}</button>)}</span>}
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-teal-800 opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}
                  {!searchingKnowledge && knowledgeResults.length === 0 && (
                    <p className="px-4 py-6 text-sm leading-6 text-slate-600 sm:px-6">找不到完全符合的本地資料。請改用較短的中英文術語，例如 `loop`、`迴圈`、`API` 或 `registry`。</p>
                  )}
                </div>
              </div>
            )}

            <article ref={articleRef} className="reading-paper prose prose-slate max-w-none px-5 py-7 sm:px-9 sm:py-9">
              <WikiMarkdown markdown={selectedNote.body} onOpenNote={openWikiNote} />
            </article>
          </section>
        </main>

        <aside className="reference-drawer space-y-4 xl:sticky xl:top-5 xl:h-fit">
          <section className="workbench-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="coordinate-chip">{String(selectedNote.order).padStart(2, "0")}</span>
              <p className="section-label">NOTE METADATA</p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-900/10 pb-3">
                <dt className="text-slate-500">難度</dt>
                <dd className="font-bold">{selectedNote.level}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-slate-900/10 pb-3">
                <dt className="text-slate-500">來源檔</dt>
                <dd className="max-w-[150px] break-all text-right font-mono text-[10px] leading-4 text-slate-700">{selectedNote.path}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(selectedNote.path)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-teal-800 transition hover:text-teal-950"
            >
              <Clipboard className="h-3.5 w-3.5" /> 複製 Markdown 路徑
            </button>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedNote.tags.map((tag) => <button type="button" className="tag-chip transition hover:border-teal-700/40 hover:bg-white" key={tag} onClick={() => selectTag(tag)}>#{tag}</button>)}
            </div>
          </section>

          <section className="workbench-panel border-teal-800/20 bg-teal-700/[0.045] p-4">
            <div className="flex items-center gap-2 text-teal-800">
              <Languages className="h-4 w-4" />
              <p className="section-label text-teal-800">雙語對照 · BILINGUAL COMPANION</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{bilingualGuide.explanation}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {bilingualGuide.terms.map((term) => (
                <span className="tag-chip border-teal-800/15 bg-white/70" key={term.en}>{term.zh} · {term.en}</span>
              ))}
            </div>
            <div className="mt-4 border-l-2 border-teal-700/50 pl-3">
              <p className="font-mono text-[10px] font-bold tracking-[0.13em] text-teal-800">ENGLISH CHECKPOINT</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{bilingualGuide.checkpoint}</p>
            </div>
          </section>

          <section className="workbench-panel p-4">
            <p className="section-label">SECTION LOCATOR</p>
            {headings.length ? (
              <ol className="mt-3 space-y-1.5">
                {headings.map((heading, index) => (
                  <li key={`${heading}-${index}`}>
                    <button type="button" onClick={() => scrollToHeading(index)} className="locator-row">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{heading}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-slate-500">這篇筆記還沒有章節標題。</p>}
          </section>

          <section className="rounded-md border border-slate-950/15 bg-slate-950 p-4 text-[#f9f5e9] shadow-sm">
            <div className="flex items-center gap-2 text-teal-300"><Sparkles className="h-4 w-4" /><p className="section-label text-teal-200">RETURN POINT</p></div>
            <p className="mt-3 font-serif text-lg font-bold leading-snug">忘了沒關係；把這一頁當成你回來接續的座標。</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">筆記原稿可直接在 `client/src/content/` 修改，重整本地網頁後即可重新閱讀。</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
