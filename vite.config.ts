import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execFile as execFileCallback } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { deflateRawSync } from "node:zlib";
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

type WorkspaceAssetKind = "code" | "config" | "text" | "image" | "pdf" | "binary";

const WORKSPACE_ASSET_EXTENSIONS = new Set([
  "java", "json", "yaml", "yml", "toml", "xml", "properties", "gradle", "kts", "txt",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "pdf", "zip", "jar", "gz", "7z", "rar", "bin",
]);
const CODE_ASSET_EXTENSIONS = new Set(["java", "gradle", "kts"]);
const CONFIG_ASSET_EXTENSIONS = new Set(["json", "yaml", "yml", "toml", "xml", "properties"]);
const IMAGE_ASSET_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const TEXT_ASSET_EXTENSIONS = new Set(["txt"]);
const ASSET_MIME_TYPES: Record<string, string> = {
  java: "text/x-java", json: "application/json", yaml: "application/yaml", yml: "application/yaml", toml: "application/toml",
  xml: "application/xml", properties: "text/plain", gradle: "text/plain", kts: "text/plain", txt: "text/plain",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon", pdf: "application/pdf",
  zip: "application/zip", jar: "application/java-archive", gz: "application/gzip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar", bin: "application/octet-stream",
};

function workspaceAssetExtension(relativePath: string) {
  return path.extname(relativePath).slice(1).toLocaleLowerCase();
}

function workspaceAssetKind(relativePath: string): WorkspaceAssetKind {
  const extension = workspaceAssetExtension(relativePath);
  if (CODE_ASSET_EXTENSIONS.has(extension)) return "code";
  if (CONFIG_ASSET_EXTENSIONS.has(extension)) return "config";
  if (TEXT_ASSET_EXTENSIONS.has(extension)) return "text";
  if (IMAGE_ASSET_EXTENSIONS.has(extension)) return "image";
  if (extension === "pdf") return "pdf";
  return "binary";
}

function workspaceAssetMimeType(relativePath: string) {
  return ASSET_MIME_TYPES[workspaceAssetExtension(relativePath)] ?? "application/octet-stream";
}

function isWorkspaceAssetPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return Boolean(normalized) && !segments.some((segment) => segment.startsWith(".")) && WORKSPACE_ASSET_EXTENSIONS.has(workspaceAssetExtension(normalized));
}

function isSearchableWorkspaceAssetPath(relativePath: string) {
  return workspaceAssetExtension(relativePath) === "txt";
}

function walkWorkspaceFiles(root: string, visit: (target: string, relativePath: string) => void) {
  if (!fs.existsSync(root)) return;
  fs.readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    if (entry.name.startsWith(".")) return;
    const target = path.join(root, entry.name);
    const relativePath = path.relative(root, target).replace(/\\/g, "/");
    if (entry.isDirectory()) walkWorkspaceFiles(target, (nestedTarget, nestedRelativePath) => visit(nestedTarget, `${relativePath}/${nestedRelativePath}`));
    else visit(target, relativePath);
  });
}

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

function crc32(value: Buffer) {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipArchive(entries: { name: string; data: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  entries.forEach(({ name, data }) => {
    const nameBuffer = Buffer.from(name, "utf8");
    const compressed = deflateRawSync(data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  });
  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(localData.length, 16);
  return Buffer.concat([localData, centralData, end]);
}

function vitePluginLocalKnowledgeManager(): Plugin {
  const contentRoot = path.join(PROJECT_ROOT, "client", "src", "content");
  const backupRoot = path.join(PROJECT_ROOT, "local-backups");
  const metadataRoot = path.join(contentRoot, ".javabase");
  const relationsFile = path.join(metadataRoot, "relations.json");
  const internalWrites = new Set<string>();
  const safePath = (relative: string) => {
    const normalized = relative.replace(/\\/g, "/");
    if (!normalized || normalized.includes("\0")) throw new Error("檔案路徑不可為空白或包含無效字元。");
    const target = path.resolve(contentRoot, normalized);
    if (!target.startsWith(`${contentRoot}${path.sep}`) && target !== contentRoot) throw new Error("不允許存取 workspace 以外的路徑。");
    return target;
  };
  const relativePath = (target: string) => path.relative(contentRoot, target).replace(/\\/g, "/");
  const body = (req: any) => new Promise<any>((resolve, reject) => { let value = ""; req.on("data", (chunk: Buffer) => value += chunk); req.on("end", () => { try { resolve(JSON.parse(value || "{}")); } catch (error) { reject(error); } }); });
  const backup = (target: string) => { if (!fs.existsSync(target)) return; fs.mkdirSync(backupRoot, { recursive: true }); const sourceLabel = relativePath(target).replace(/[\\/]/g, "__"); fs.copyFileSync(target, path.join(backupRoot, `${Date.now()}-${crypto.randomUUID()}-${sourceLabel}`)); };
  const digest = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
  const assetExtension = (value: string) => path.extname(value).slice(1).toLocaleLowerCase();
  const assetKind = (value: string) => { const extension = assetExtension(value); if (["java", "gradle", "kts"].includes(extension)) return "code"; if (["json", "yaml", "yml", "toml", "xml", "properties"].includes(extension)) return "config"; if (extension === "txt") return "text"; if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(extension)) return "image"; if (extension === "pdf") return "pdf"; return "binary"; };
  const assetMime = (value: string) => ({ java: "text/x-java", json: "application/json", yaml: "application/yaml", yml: "application/yaml", toml: "application/toml", xml: "application/xml", properties: "text/plain", gradle: "text/plain", kts: "text/plain", txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon", pdf: "application/pdf", zip: "application/zip", jar: "application/java-archive", gz: "application/gzip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar", bin: "application/octet-stream" } as Record<string, string>)[assetExtension(value)] ?? "application/octet-stream";
  const supportedAsset = (value: string) => { const normalized = value.replace(/\\/g, "/"); const extension = assetExtension(normalized); return Boolean(normalized) && !normalized.split("/").some((segment) => segment.startsWith(".")) && ["java", "json", "yaml", "yml", "toml", "xml", "properties", "gradle", "kts", "txt", "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "pdf", "zip", "jar", "gz", "7z", "rar", "bin"].includes(extension); };
  const assetMeta = (target: string) => { const stats = fs.statSync(target); const relative = relativePath(target); return { path: relative, name: path.basename(target), extension: assetExtension(relative), kind: assetKind(relative), mimeType: assetMime(relative), bytes: stats.size, modifiedAt: stats.mtime.toISOString() }; };
  const walk = (directory: string, visit: (target: string) => void) => { if (!fs.existsSync(directory)) return; fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => { if (entry.name.startsWith(".")) return; const target = path.join(directory, entry.name); if (entry.isDirectory()) walk(target, visit); else visit(target); }); };
  const listMarkdown = () => { const files: { path: string; modifiedAt: string; bytes: number }[] = []; walk(contentRoot, (target) => { if (!target.toLocaleLowerCase().endsWith(".md")) return; const stats = fs.statSync(target); files.push({ path: relativePath(target), modifiedAt: stats.mtime.toISOString(), bytes: stats.size }); }); return files; };
  const listAssets = () => { const assets: ReturnType<typeof assetMeta>[] = []; walk(contentRoot, (target) => { const relative = relativePath(target); if (supportedAsset(relative)) assets.push(assetMeta(target)); }); return assets.sort((left, right) => left.path.localeCompare(right.path, "zh-Hant")); };
  const readRelations = () => { if (!fs.existsSync(relationsFile)) return []; try { const value = JSON.parse(fs.readFileSync(relationsFile, "utf8")); return Array.isArray(value) ? value : []; } catch { return []; } };
  const validateRelation = (value: any) => { const notePath = String(value?.notePath || "").replace(/\\/g, "/"); const assetPath = String(value?.assetPath || "").replace(/\\/g, "/"); if (!notePath.toLocaleLowerCase().endsWith(".md") || !supportedAsset(assetPath)) throw new Error("File Relation 只允許 Markdown 筆記與支援的 Workspace Asset。"); const noteTarget = safePath(notePath); const assetTarget = safePath(assetPath); if (!fs.existsSync(noteTarget) || !fs.statSync(noteTarget).isFile()) throw new Error(`找不到關聯的 Markdown：${notePath}`); if (!fs.existsSync(assetTarget) || !fs.statSync(assetTarget).isFile()) throw new Error(`找不到關聯的 Asset：${assetPath}`); return { notePath, assetPath, label: typeof value?.label === "string" ? value.label.trim().slice(0, 120) : "" }; };
  const saveRelations = (values: any) => { if (!Array.isArray(values) || values.length > 500) throw new Error("File Relations 數量不合法。"); const unique = new Map<string, { notePath: string; assetPath: string; label: string }>(); values.map(validateRelation).forEach((relation) => unique.set(`${relation.notePath}→${relation.assetPath}`, relation)); fs.mkdirSync(metadataRoot, { recursive: true }); fs.writeFileSync(relationsFile, JSON.stringify(Array.from(unique.values()), null, 2), "utf8"); return Array.from(unique.values()); };
  return { name: "local-knowledge-manager", configureServer(server) { const invalidateMarkdownModules = () => server.moduleGraph.invalidateAll(); server.middlewares.use("/api/local", async (req, res) => {
    if (req.socket.remoteAddress && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) { res.writeHead(403); res.end("Local access only"); return; }
    try {
      const input = req.method === "GET" ? {} : await body(req);
      if ((req.url === "/meta" || req.url === "/rescan") && req.method === "GET") { const files = listMarkdown(); const assets = listAssets(); res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ ok: true, files, assets, scannedAt: new Date().toISOString() })); invalidateMarkdownModules(); return; }
      if (req.url === "/assets" && req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ ok: true, assets: listAssets() })); return; }
      if (req.url === "/asset" && req.method === "POST") { const relative = String(input.path || "").replace(/\\/g, "/"); if (!supportedAsset(relative)) throw new Error("不支援的 Workspace Asset 類型。"); const target = safePath(relative); if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error("找不到 Workspace Asset。"); const meta = assetMeta(target); const data = fs.readFileSync(target); res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ ok: true, ...meta, content: meta.kind === "code" || meta.kind === "config" || meta.kind === "text" ? data.toString("utf8") : undefined, base64: meta.kind === "code" || meta.kind === "config" || meta.kind === "text" ? undefined : data.toString("base64") })); return; }
      if (req.url?.startsWith("/asset-file") && req.method === "GET") { const query = new URL(req.url, "http://localhost").searchParams; const relative = String(query.get("path") || "").replace(/\\/g, "/"); if (!supportedAsset(relative)) throw new Error("不支援的 Workspace Asset 類型。"); const target = safePath(relative); if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error("找不到 Workspace Asset。"); const meta = assetMeta(target); const headers: Record<string, string> = { "Content-Type": meta.mimeType, "Content-Length": String(fs.statSync(target).size), "Cache-Control": "no-store" }; if (query.get("download") === "1") headers["Content-Disposition"] = `attachment; filename="${meta.name.replace(/["]+/g, "")}"`; res.writeHead(200, headers); res.end(fs.readFileSync(target)); return; }
      if (req.url === "/asset-import" && req.method === "POST") { const directory = String(input.directory || "").replace(/\\/g, "/"); const filename = String(input.filename || ""); if (!filename || path.basename(filename) !== filename || !supportedAsset(filename)) throw new Error("只允許匯入支援的 Workspace Asset 檔案。"); if (typeof input.base64 !== "string" || !input.base64) throw new Error("Asset 內容不可為空白。"); const folder = safePath(directory || "."); fs.mkdirSync(folder, { recursive: true }); const target = safePath(path.posix.join(directory, filename)); if (fs.existsSync(target)) throw new Error("目標資料夾已有同名 Asset，匯入已取消。"); const data = Buffer.from(input.base64, "base64"); if (data.length > 40 * 1024 * 1024) throw new Error("Workspace Asset 不可超過 40 MB。"); fs.writeFileSync(target, data); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, asset: assetMeta(target) })); return; }
      if (req.url === "/export-workspace" && req.method === "GET") { const entries: { name: string; data: Buffer }[] = []; walk(contentRoot, (target) => { const relative = relativePath(target); if (target.toLocaleLowerCase().endsWith(".md") || supportedAsset(relative)) entries.push({ name: relative, data: fs.readFileSync(target) }); }); if (fs.existsSync(relationsFile)) entries.push({ name: ".javabase/relations.json", data: fs.readFileSync(relationsFile) }); const archive = createZipArchive(entries); res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="JavaBase-workspace.zip"', "Content-Length": archive.length, "Cache-Control": "no-store" }); res.end(archive); return; }
      if (req.url === "/asset-delete" && req.method === "POST") { const relative = String(input.path || "").replace(/\\/g, "/"); if (!supportedAsset(relative)) throw new Error("不支援的 Workspace Asset 類型。"); const target = safePath(relative); if (!fs.existsSync(target)) throw new Error("找不到可刪除的 Workspace Asset。"); backup(target); fs.unlinkSync(target); const remaining = readRelations().filter((relation: any) => relation.assetPath !== relative); saveRelations(remaining); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true })); return; }
      if (req.url === "/relations" && req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ ok: true, relations: readRelations() })); return; }
      if (req.url === "/relations" && req.method === "POST") { const relations = saveRelations(input.relations); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, relations })); return; }
      if (req.url === "/export" && req.method === "GET") { const entries: { name: string; data: Buffer }[] = []; walk(contentRoot, (target) => { if (target.toLocaleLowerCase().endsWith(".md")) entries.push({ name: relativePath(target), data: fs.readFileSync(target) }); }); const archive = createZipArchive(entries); res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="JavaBase-knowledge-base.zip"', "Content-Length": archive.length, "Cache-Control": "no-store" }); res.end(archive); return; }
      if (req.url === "/create" && req.method === "POST") { const relative = String(input.path || "").replace(/\\/g, "/"); const target = safePath(relative); if (fs.existsSync(target)) throw new Error("檔案或資料夾已存在。"); if (input.kind === "folder") fs.mkdirSync(target, { recursive: true }); else { if (!relative.endsWith(".md")) throw new Error("只能建立 Markdown 筆記。"); const title = String(input.title || path.basename(relative, ".md")).replace(/\r?\n/g, " ").trim(); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `---\ntitle: ${title}\nslug: ${path.basename(relative, ".md")}\ncategory: 自訂\ntags:\n  - 本地 Markdown\nsummary: 本地 Markdown Workspace 筆記。\n---\n\n# ${title}\n`, "utf8"); } }
      else if (req.url === "/move" && req.method === "POST") { const from = safePath(String(input.from)); const to = safePath(String(input.to)); if (!from.endsWith(".md") || !to.endsWith(".md")) throw new Error("只能移動 Markdown 筆記。"); if (fs.existsSync(to)) throw new Error("目標筆記已存在。"); backup(from); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); }
      else if (req.url === "/rename" && req.method === "POST") { const from = safePath(String(input.from)); const to = safePath(String(input.to)); if (!from.endsWith(".md") || !to.endsWith(".md")) throw new Error("只能重新命名 Markdown 筆記。"); if (fs.existsSync(to)) throw new Error("目標檔名已存在。"); backup(from); fs.renameSync(from, to); }
      else if (req.url === "/delete" && req.method === "POST") { const target = safePath(String(input.path)); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可刪除的 Markdown 筆記。"); backup(target); fs.unlinkSync(target); }
      else if (req.url === "/read" && req.method === "POST") { const target = safePath(String(input.path)); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可讀取的 Markdown 筆記。"); const content = fs.readFileSync(target, "utf8"); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, content, hash: digest(content), modifiedAt: fs.statSync(target).mtime.toISOString() })); return; }
      else if (req.url === "/write" && req.method === "POST") { const target = safePath(String(input.path)); const content = input.content; if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可寫入的 Markdown 筆記。"); if (typeof content !== "string" || !content.trim()) throw new Error("Markdown 內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const current = fs.readFileSync(target, "utf8"); if (input.expectedHash && input.expectedHash !== digest(current)) throw new Error("檔案已由其他操作修改，請重新載入後再保存。"); backup(target); internalWrites.add(target); fs.writeFileSync(target, content, "utf8"); const updatedAt = fs.statSync(target).mtime.toISOString(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, hash: digest(content), modifiedAt: updatedAt })); return; }
      else if (req.url === "/restore" && req.method === "POST") { const target = safePath(String(input.path)); const content = input.content; if (input.confirm !== true) throw new Error("還原需要明確確認。"); if (!target.endsWith(".md") || !fs.existsSync(target)) throw new Error("找不到可還原的 Markdown 筆記。"); if (typeof content !== "string" || !content.trim()) throw new Error("還原版本內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const current = fs.readFileSync(target, "utf8"); if (!input.expectedHash || input.expectedHash !== digest(current)) throw new Error("目前檔案已由其他操作修改；請重新載入版本歷史後再還原。"); backup(target); internalWrites.add(target); fs.writeFileSync(target, content, "utf8"); const updatedAt = fs.statSync(target).mtime.toISOString(); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, hash: digest(content), modifiedAt: updatedAt })); return; }
      else if (req.url === "/import" && req.method === "POST") { const directory = String(input.directory || "").replace(/\\/g, "/"); const filename = path.basename(String(input.filename || "")); const content = input.content; if (!filename.endsWith(".md") || !/^[^\\/]+\.md$/i.test(filename)) throw new Error("只允許匯入單一 .md 檔案。"); if (typeof content !== "string" || !content.trim()) throw new Error("Markdown 內容不可為空白。"); if (Buffer.byteLength(content, "utf8") > 2 * 1024 * 1024) throw new Error("Markdown 檔案不可超過 2 MB。"); const folder = safePath(directory); if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new Error("目標資料夾不存在。"); const target = safePath(path.posix.join(directory, filename)); if (fs.existsSync(target)) throw new Error("目標資料夾已有同名檔案，匯入已取消。"); fs.writeFileSync(target, content, "utf8"); }
      else { res.writeHead(404); res.end(); return; }
      if (["/create", "/import", "/move", "/rename", "/delete"].includes(req.url ?? "")) invalidateMarkdownModules();
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true }));
    } catch (error) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); }
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
