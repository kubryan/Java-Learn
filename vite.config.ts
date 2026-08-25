import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execFile as execFileCallback } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming
const execFile = promisify(execFileCallback);

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

function vitePluginLocalKnowledgeManager(): Plugin {
  const contentRoot = path.join(PROJECT_ROOT, "client", "src", "content");
  const backupRoot = path.join(PROJECT_ROOT, "local-backups");
  const internalWrites = new Set<string>();
  const safePath = (relative: string) => {
    const target = path.resolve(contentRoot, relative);
    if (!target.startsWith(`${contentRoot}${path.sep}`) && target !== contentRoot) throw new Error("不允許存取內容目錄以外的路徑。");
    return target;
  };
  const body = (req: any) => new Promise<any>((resolve, reject) => { let value = ""; req.on("data", (chunk: Buffer) => value += chunk); req.on("end", () => { try { resolve(JSON.parse(value || "{}")); } catch (error) { reject(error); } }); });
  const backup = (target: string) => { if (!fs.existsSync(target)) return; fs.mkdirSync(backupRoot, { recursive: true }); const sourceLabel = path.relative(contentRoot, target).replace(/[\\/]/g, "__"); fs.copyFileSync(target, path.join(backupRoot, `${Date.now()}-${crypto.randomUUID()}-${sourceLabel}`)); };
  const digest = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
  return { name: "local-knowledge-manager", configureServer(server) { server.middlewares.use("/api/local", async (req, res) => {
    if (req.socket.remoteAddress && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) { res.writeHead(403); res.end("Local access only"); return; }
    try { const input = req.method === "GET" ? {} : await body(req); if (req.url === "/meta" && req.method === "GET") { const files: { path: string; modifiedAt: string }[] = []; const walk = (directory: string) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => { const target = path.join(directory, entry.name); if (entry.isDirectory()) walk(target); else if (entry.name.endsWith(".md")) files.push({ path: path.relative(contentRoot, target).replace(/\\/g, "/"), modifiedAt: fs.statSync(target).mtime.toISOString() }); }); walk(contentRoot); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, files })); return; } if (req.url === "/create" && req.method === "POST") { const relative = String(input.path || "").replace(/\\/g, "/"); const target = safePath(relative); if (fs.existsSync(target)) throw new Error("檔案或資料夾已存在。"); if (input.kind === "folder") fs.mkdirSync(target, { recursive: true }); else { if (!relative.endsWith(".md")) throw new Error("只能建立 Markdown 筆記。"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `---\ntitle: ${input.title || path.basename(relative, ".md")}\ncategory: 自訂\ntags: []\n---\n\n# ${input.title || "新筆記"}\n`, "utf8"); } }
    else if (req.url === "/move" && req.method === "POST") { const from = safePath(String(input.from)); const to = safePath(String(input.to)); if (!from.endsWith(".md") || !to.endsWith(".md")) throw new Error("只能移動 Markdown 筆記。"); if (fs.existsSync(to)) throw new Error("目標筆記已存在。"); backup(from); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); }
    else if (req.url === "/rename" && req.method === "POST") { const from = safePath(String(input.from)); const to = safePath(String(input.to)); if (!from.endsWith(".md") || !to.endsWith(".md")) throw new Error("只能重新命名 Markdown 筆記。"); if (fs.existsSync(to)) throw new Error("目標檔名已存在。"); backup(from); fs.renameSync(from, to); }
    else if (req.url === "/delete" && req.method === "POST") { const target = safePath(String(input.path)); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可刪除的 Markdown 筆記。"); backup(target); fs.unlinkSync(target); }
    else if (req.url === "/read" && req.method === "POST") { const target = safePath(String(input.path)); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可讀取的 Markdown 筆記。"); const content = fs.readFileSync(target, "utf8"); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, content, hash: digest(content), modifiedAt: fs.statSync(target).mtime.toISOString() })); return; }
    else if (req.url === "/write" && req.method === "POST") { const target = safePath(String(input.path)); const content = input.content; if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可寫入的 Markdown 筆記。"); if (typeof content !== "string" || !content.trim()) throw new Error("Markdown 內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const current = fs.readFileSync(target, "utf8"); if (input.expectedHash && input.expectedHash !== digest(current)) throw new Error("檔案已由其他操作修改，請重新載入後再保存。"); backup(target); internalWrites.add(target); fs.writeFileSync(target, content, "utf8"); const updatedAt = fs.statSync(target).mtime.toISOString(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, hash: digest(content), modifiedAt: updatedAt })); return; }
    else if (req.url === "/restore" && req.method === "POST") { const target = safePath(String(input.path)); const content = input.content; if (input.confirm !== true) throw new Error("還原需要明確確認。"); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可還原的 Markdown 筆記。"); if (typeof content !== "string" || !content.trim()) throw new Error("還原版本內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const current = fs.readFileSync(target, "utf8"); if (!input.expectedHash || input.expectedHash !== digest(current)) throw new Error("目前檔案已由其他操作修改；請重新載入版本歷史後再還原。"); backup(target); internalWrites.add(target); fs.writeFileSync(target, content, "utf8"); const updatedAt = fs.statSync(target).mtime.toISOString(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, hash: digest(content), modifiedAt: updatedAt })); return; }
    else if (req.url === "/import" && req.method === "POST") { const directory = String(input.directory || "").replace(/\\/g, "/"); const filename = path.basename(String(input.filename || "")); const content = input.content; if (!filename.endsWith(".md") || !/^[^\\/]+\.md$/i.test(filename)) throw new Error("只允許匯入單一 .md 檔案。"); if (typeof content !== "string" || !content.trim()) throw new Error("Markdown 內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const folder = safePath(directory); if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new Error("目標資料夾不存在。"); const target = safePath(path.posix.join(directory, filename)); if (fs.existsSync(target)) throw new Error("目標資料夾已有同名檔案，匯入已取消。"); fs.writeFileSync(target, content, "utf8"); }
    else { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true })); } catch (error) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); }
  }); }, handleHotUpdate(context) { if (internalWrites.delete(context.file)) return []; } };
}

type GitChange = { path: string; status: string };

function vitePluginLocalGitWorkspace(): Plugin {
  const contentRoot = path.join(PROJECT_ROOT, "client", "src", "content");
  const localAddresses = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
  const body = (req: any) => new Promise<any>((resolve, reject) => { let value = ""; req.on("data", (chunk: Buffer) => value += chunk); req.on("end", () => { try { resolve(JSON.parse(value || "{}")); } catch (error) { reject(error); } }); });
  const runGit = async (args: string[]) => {
    const result = await execFile("git", args, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 });
    return String(result.stdout).trim();
  };
  const optionalGit = async (args: string[]) => { try { return await runGit(args); } catch { return ""; } };
  const isRepository = async () => (await optionalGit(["rev-parse", "--is-inside-work-tree"])) === "true";
  const safeMarkdownPath = (value: unknown) => {
    const relative = String(value || "").replace(/\\/g, "/");
    if (!relative || !relative.endsWith(".md") || relative.includes("\0")) throw new Error("只允許選取 content 目錄內的 Markdown 筆記。");
    const target = path.resolve(contentRoot, relative);
    if (!target.startsWith(`${contentRoot}${path.sep}`)) throw new Error("不允許操作 content 目錄以外的檔案。");
    return path.relative(PROJECT_ROOT, target).replace(/\\/g, "/");
  };
  const selectedPaths = (value: unknown) => {
    if (!Array.isArray(value) || !value.length || value.length > 40) throw new Error("請選擇 1 至 40 個 Markdown 檔案。 ");
    return Array.from(new Set(value.map(safeMarkdownPath)));
  };
  const parseChanges = (status: string): GitChange[] => status.split("\0").filter(Boolean).map((line) => ({ status: line.slice(0, 2), path: line.slice(3) })).filter((change) => change.path.startsWith("client/src/content/") && change.path.endsWith(".md")).map((change) => ({ ...change, path: change.path.replace(/^client\/src\/content\//, "") }));
  const info = async () => {
    const repository = await isRepository();
    if (!repository) return { repository: false, branch: "", remote: "", userName: "", userEmail: "", changes: [] as GitChange[] };
    const [branch, remote, userName, userEmail, status] = await Promise.all([optionalGit(["branch", "--show-current"]), optionalGit(["remote", "get-url", "origin"]), optionalGit(["config", "user.name"]), optionalGit(["config", "user.email"]), optionalGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"])]);
    return { repository: true, branch, remote, userName, userEmail, changes: parseChanges(status) };
  };
  return { name: "local-git-workspace", configureServer(server) { server.middlewares.use("/api/git", async (req, res) => {
    if (req.socket.remoteAddress && !localAddresses.includes(req.socket.remoteAddress)) { res.writeHead(403); res.end("Local access only"); return; }
    try {
      const input = req.method === "GET" ? {} : await body(req);
      if (req.url === "/status" && req.method === "GET") { const current = await info(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, ...current })); return; }
      if (!(await isRepository())) throw new Error("此 Windows 專案尚未初始化為 Git 儲存庫。請先完成本機 Git 設定。 ");
      if (req.url === "/diff" && req.method === "POST") { const gitPath = safeMarkdownPath(input.path); const [unstaged, staged] = await Promise.all([optionalGit(["diff", "--no-ext-diff", "--", gitPath]), optionalGit(["diff", "--cached", "--no-ext-diff", "--", gitPath])]); const workingFile = path.resolve(PROJECT_ROOT, gitPath); const untrackedPreview = !unstaged && !staged && fs.existsSync(workingFile) ? `--- /dev/null\n+++ b/${gitPath}\n@@ new Markdown file @@\n${fs.readFileSync(workingFile, "utf8").split(/\r?\n/).map((line) => `+${line}`).join("\n")}` : ""; res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, unstaged: unstaged || untrackedPreview, staged })); return; }
      if (req.url === "/stage" && req.method === "POST") { const paths = selectedPaths(input.paths); await runGit(["add", "--", ...paths]); }
      else if (req.url === "/commit" && req.method === "POST") { if (input.confirm !== true) throw new Error("提交需要明確確認。 "); const paths = selectedPaths(input.paths); const message = String(input.message || "").trim(); if (message.length < 5 || message.length > 120 || /[\r\n]/.test(message)) throw new Error("提交訊息需為 5 至 120 個字，且只能使用單行。 "); await runGit(["add", "--", ...paths]); const staged = (await runGit(["diff", "--cached", "--name-only"])).split("\n").filter(Boolean); if (!staged.length) throw new Error("沒有可提交的變更。 "); const allowed = new Set(paths); if (staged.some((file) => !allowed.has(file))) throw new Error("暫存區含有未選取的檔案；請先在 Git 工具中整理暫存區。 "); await runGit(["commit", "-m", message]); }
      else if (req.url === "/push" && req.method === "POST") { if (input.confirm !== true) throw new Error("推送需要明確確認。 "); const current = await info(); if (!current.remote) throw new Error("找不到 origin 遠端；請先設定 GitHub 遠端。 "); if (!current.branch) throw new Error("目前不在可推送的 Git 分支上。 "); await runGit(["push", "origin", current.branch]); }
      else { res.writeHead(404); res.end(); return; }
      const current = await info(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, ...current }));
    } catch (error) { const detail = error instanceof Error ? error.message : String(error); res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: detail })); }
  }); } };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy(), vitePluginLocalKnowledgeManager(), vitePluginLocalGitWorkspace()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "build"],
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    watch: {
      ignored: ["**/client/src/content/**"],
    },
  },
});
