/**
 * Design reminder — 藍圖工作桌：三帶式工作畫布，讓導覽、閱讀與下一步始終同時可見。
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Database,
  FileText,
  Gamepad2,
  LayoutPanelTop,
  Languages,
  MonitorCog,
  Plus,
  Search,
  Server,
  Sparkles,
} from "lucide-react";
import { categories, notes, searchNotes, type Note } from "@/lib/notes";
import { guideForCategory } from "@/lib/bilingual";
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
import {
  addCustomKnowledge,
  createKnowledgeSnippet,
  getKnowledgeStats,
  searchKnowledge,
  syncKnowledgeIndex,
  type KnowledgeRecord,
  type KnowledgeSearchResult,
  type KnowledgeStats,
} from "@/lib/knowledge-db";

const assets = {
  hero: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=85",
  foundation: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=85",
  backend: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=85",
  minecraft: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=85",
};

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

function categoryIcon(category: string) {
  if (category === "桌面工具") return MonitorCog;
  if (category === "後端 API") return Server;
  if (["Minecraft 共通", "Fabric", "NeoForge"].includes(category)) return Gamepad2;
  if (category === "物件導向") return LayoutPanelTop;
  return BookOpen;
}

export default function Home() {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeSlug, setActiveSlug] = useState(notes[0]?.slug ?? "");
  const [completed, setCompleted] = useState<string[]>([]);
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
  const articleRef = useRef<HTMLElement>(null);

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
    let active = true;
    syncKnowledgeIndex(notes)
      .then((stats) => {
        if (!active) return;
        setKnowledgeStats(stats);
        setIndexReady(true);
      })
      .catch(() => {
        if (!active) return;
        setIndexReady(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!indexReady) return;
    let active = true;
    setSearchingKnowledge(true);
    const timer = window.setTimeout(() => {
      searchKnowledge(query, activeCategory)
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
  }, [activeCategory, indexReady, query]);

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

  const filteredNotes = useMemo(() => searchNotes(query, activeCategory), [query, activeCategory]);
  const selectedNote = notes.find((note) => note.slug === activeSlug) ?? filteredNotes[0] ?? notes[0];
  const headings = selectedNote ? getHeadings(selectedNote) : [];
  const bilingualGuide = selectedNote ? guideForCategory(selectedNote.category) : guideForCategory("開始使用");
  const totalCompleted = completed.length;
  const completionPercent = notes.length ? Math.round((totalCompleted / notes.length) * 100) : 0;

  useEffect(() => {
    if (filteredNotes.length && !filteredNotes.some((note) => note.slug === activeSlug)) {
      setActiveSlug(filteredNotes[0].slug);
    }
  }, [activeSlug, filteredNotes]);

  function selectCategory(category: string) {
    setActiveCategory(category);
    setQuery("");
    const first = searchNotes("", category)[0];
    if (first) setActiveSlug(first.slug);
  }

  function toggleCompleted(slug: string) {
    setCompleted((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      window.localStorage.setItem("java-learning-completed", JSON.stringify(next));
      return next;
    });
  }

  function scrollToHeading(index: number) {
    articleRef.current?.querySelectorAll("h2, h3")[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const [stats, results] = await Promise.all([getKnowledgeStats(), searchKnowledge("")]);
      setKnowledgeStats(stats);
      setOverviewResults(results);
      setCustomKnowledge(emptyCustomKnowledge);
      setSavedMessage(`「${record.title}」已保存到這台瀏覽器的知識庫。`);
      setKnowledgeView("overview");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "無法保存知識，請再試一次。");
    } finally {
      setIsSavingKnowledge(false);
    }
  }

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
            className="group flex min-w-0 items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-teal-700/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            aria-label="開啟學習基地已保存知識總覽"
            title="開啟已保存知識"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-teal-800/25 bg-white/70 text-teal-800 shadow-sm" aria-hidden="true"><BookOpen className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-teal-700">LEARNING KNOWLEDGE BASE · OPEN</p>
              <h1 className="wordmark-lockup truncate">
                <span className="wordmark-java">CODE</span><span className="wordmark-divider">/</span><span>學習基地</span>
              </h1>
            </div>
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-600 md:flex">
            <span className="verification-dot" />
            <span>筆記由 Markdown 載入</span>
          </div>
        </div>
      </header>

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
                <div className="flex flex-wrap gap-1.5">{selectedCustomKnowledge.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}</div>
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
              placeholder="搜尋中文概念或 English term…"
              className="w-full rounded-md border border-slate-900/15 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              aria-label="搜尋 Markdown 筆記"
            />
          </div>
          <div className="mb-4 flex items-center gap-2 px-1 text-[10px] font-mono text-teal-800">
            <Database className="h-3.5 w-3.5" />
            <span>{indexReady ? `LOCAL INDEX · ${knowledgeStats.notes} NOTES · ${knowledgeStats.terms} TERMS` : "LOCAL INDEX · 建立中"}</span>
          </div>

          <nav aria-label="學習分類" className="space-y-1">
            <button
              type="button"
              onClick={() => selectCategory("全部")}
              className={`nav-row ${activeCategory === "全部" ? "nav-row-active" : ""}`}
            >
              <BookMarked className="h-4 w-4" />
              <span>全部筆記</span>
              <span className="ml-auto font-mono text-[10px]">{notes.length}</span>
            </button>
            {categories.map((category, index) => {
              const Icon = categoryIcon(category);
              const count = notes.filter((note) => note.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`nav-row ${activeCategory === category ? "nav-row-active" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="min-w-0 flex-1 text-left">{`${String(index + 1).padStart(2, "0")} · ${category}`}</span>
                  <span className="font-mono text-[10px] text-slate-500">{count}</span>
                </button>
              );
            })}
          </nav>

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
          {!query.trim() && (
            <>
          <section className="hero-workbench overflow-hidden">
            <img className="hero-photo" src={assets.hero} alt="擺有藍圖紙、筆記本與技術工具的學習工作桌" />
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
            <div className="route-module-grid grid gap-3 lg:grid-cols-3">
              {tracks.map((track) => {
                const Icon = track.icon;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => selectCategory(track.category)}
                    className="track-card group text-left"
                  >
                    <img className="track-card-image" src={track.image} alt="" aria-hidden="true" />
                    <div className="relative z-10 flex min-h-[228px] flex-col p-4">
                      <div className="flex items-center justify-between">
                        <span className="route-coordinate">{track.kicker}</span>
                        <Icon className="h-4 w-4 text-teal-800" />
                      </div>
                      <div className="mt-auto rounded-md bg-[#fbf7ee]/94 p-3 backdrop-blur-sm">
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

          <section className="workbench-panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-900/10 bg-[#fffdf7]/75 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
            </div>

            <div className="border-b border-slate-900/10 bg-[#f6f1e7] px-4 py-2.5 sm:px-6">
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {(filteredNotes.length ? filteredNotes : notes).map((note) => (
                  <button
                    key={note.slug}
                    type="button"
                    onClick={() => setActiveSlug(note.slug)}
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
                          <strong className="font-serif text-base group-hover:text-teal-900">{result.record.title}</strong>
                          {result.record.titleEn !== result.record.title && <span className="font-mono text-xs text-teal-800">{result.record.titleEn}</span>}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">{createKnowledgeSnippet(result.record, query)}</span>
                        <span className="mt-2 block font-mono text-[10px] text-slate-500">{result.record.category} · 比對：{result.matchedIn.join("、")}</span>
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
              <Streamdown>{selectedNote.body}</Streamdown>
            </article>
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:h-fit">
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
              {selectedNote.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}
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
