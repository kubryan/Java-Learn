export type WorkspaceAssetKind = "code" | "config" | "text" | "image" | "pdf" | "binary";

export type WorkspaceAsset = {
  path: string;
  name: string;
  extension: string;
  kind: WorkspaceAssetKind;
  mimeType: string;
  bytes: number;
  modifiedAt: string;
};

export type WorkspaceAssetContent = WorkspaceAsset & {
  content?: string;
  base64?: string;
};

export type FileRelation = {
  notePath: string;
  assetPath: string;
  label: string;
};

export type JavaRunMode = "compile" | "run";

export type JavaProcessResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
};

export type JavaRunResult = {
  success: boolean;
  mode: JavaRunMode;
  sourcePath: string;
  className: string;
  compile: JavaProcessResult;
  execution?: JavaProcessResult;
  limits: {
    timeoutMs: number;
    maxHeapMb: number;
    maxOutputBytes: number;
  };
};

async function localResponse<T>(endpoint: string, init?: RequestInit) {
  const response = await fetch(`/api/local/${endpoint}`, { cache: "no-store", ...init });
  const result = await response.json().catch(() => ({ ok: false, error: "本機 Assets 服務未回傳可讀資料。" }));
  if (!response.ok || !result.ok) throw new Error(result.error || "本機 Workspace Assets 操作未完成。");
  return result as T & { ok: true };
}

function jsonRequest(payload: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
}

export function noteWorkspacePath(notePath: string) {
  return notePath.replace(/^content\//, "").replace(/\\/g, "/");
}

export async function getWorkspaceAssets() {
  const result = await localResponse<{ assets: WorkspaceAsset[] }>("assets");
  return result.assets;
}

export async function readWorkspaceAsset(path: string) {
  return localResponse<WorkspaceAssetContent>("asset", jsonRequest({ path }));
}

export function canRunJavaAsset(asset: WorkspaceAssetContent | null) {
  return asset?.kind === "code" && asset.extension === "java" && typeof asset.content === "string";
}

export async function runJavaAsset(path: string, content: string, mode: JavaRunMode = "run") {
  const result = await localResponse<JavaRunResult>("java-run", jsonRequest({ path, content, mode }));
  return result;
}

export function workspaceAssetUrl(path: string, download = false) {
  return `/api/local/asset-file?path=${encodeURIComponent(path)}${download ? "&download=1" : ""}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export async function importWorkspaceAsset(file: File, directory = "assets") {
  if (file.size > 40 * 1024 * 1024) throw new Error("Workspace Asset 不可超過 40 MB。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await localResponse<{ asset: WorkspaceAsset }>("asset-import", jsonRequest({ directory, filename: file.name, base64: bytesToBase64(bytes) }));
  return result.asset;
}

export async function deleteWorkspaceAsset(path: string) {
  await localResponse("asset-delete", jsonRequest({ path }));
}

export async function getFileRelations() {
  const result = await localResponse<{ relations: FileRelation[] }>("relations");
  return result.relations;
}

export async function saveFileRelations(relations: FileRelation[]) {
  const result = await localResponse<{ relations: FileRelation[] }>("relations", jsonRequest({ relations }));
  return result.relations;
}

export function formatAssetSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assetKindLabel(kind: WorkspaceAssetKind) {
  return { code: "CODE", config: "CONFIG", text: "TEXT", image: "IMAGE", pdf: "PDF", binary: "BINARY" }[kind];
}

export function assetLanguage(asset: WorkspaceAsset) {
  return { java: "java", json: "json", yaml: "yaml", yml: "yaml", toml: "toml", xml: "xml", properties: "properties", gradle: "groovy", kts: "kotlin", txt: "text" }[asset.extension] ?? "text";
}
