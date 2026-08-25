import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function localKnowledgeManager(): Plugin {
  const root = path.join(import.meta.dirname, "client", "src", "content");
  const backups = path.join(import.meta.dirname, "local-backups");
  const safe = (value: string) => { const target = path.resolve(root, value); if (!target.startsWith(`${root}${path.sep}`)) throw new Error("不允許存取內容目錄以外的路徑。"); return target; };
  const read = (req: any) => new Promise<any>((resolve, reject) => { let body = ""; req.on("data", (chunk: Buffer) => body += chunk); req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); } }); });
  const backup = (file: string) => { fs.mkdirSync(backups, { recursive: true }); fs.copyFileSync(file, path.join(backups, `${Date.now()}-${path.basename(file)}`)); };
  return { name: "local-knowledge-manager", configureServer(server) { server.middlewares.use("/api/local", async (req, res) => { try { if (req.socket.remoteAddress && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) throw new Error("僅允許本機存取。"); const data = req.method === "GET" ? {} : await read(req); if (req.url === "/meta") { const files: any[] = []; const walk = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name.endsWith(".md")) files.push({ path: path.relative(root, file).replace(/\\/g, "/"), modifiedAt: fs.statSync(file).mtime.toISOString() }); }); walk(root); res.end(JSON.stringify({ ok: true, files })); return; } const from = data.from ? safe(data.from) : undefined; if (req.url === "/create") { const file = safe(data.path); if (fs.existsSync(file)) throw new Error("檔案已存在。"); if (data.kind === "folder") fs.mkdirSync(file, { recursive: true }); else { if (!file.endsWith(".md")) throw new Error("只能建立 Markdown。"); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `---\ntitle: ${data.title || path.basename(file, ".md")}\ncategory: 自訂\ntags: []\n---\n\n# ${data.title || "新筆記"}\n`); } } else if (req.url === "/move" || req.url === "/rename") { const to = safe(data.to); if (!from?.endsWith(".md") || !to.endsWith(".md") || fs.existsSync(to)) throw new Error("目標筆記無效或已存在。"); backup(from); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); } else if (req.url === "/delete") { const file = safe(data.path); if (!file.endsWith(".md") || !fs.existsSync(file)) throw new Error("找不到筆記。"); backup(file); fs.unlinkSync(file); } else { throw new Error("未知本機操作。"); } res.end(JSON.stringify({ ok: true })); } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); } }); } };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), jsxLocPlugin(), localKnowledgeManager()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
});
