import { describe, expect, it } from "vitest";

import {
  assetKindLabel,
  assetLanguage,
  canRunJavaAsset,
  formatAssetSize,
  noteWorkspacePath,
  type WorkspaceAsset,
  type WorkspaceAssetContent,
} from "./workspace-assets";

describe("workspace-assets pure helpers", () => {
  it("normalizes a note path for local File Relations", () => {
    expect(noteWorkspacePath("content/05-modern-java/01-modern-java.md")).toBe("05-modern-java/01-modern-java.md");
    expect(noteWorkspacePath("05-modern-java/01-modern-java.md")).toBe("05-modern-java/01-modern-java.md");
  });

  it("labels supported asset kinds and viewer languages", () => {
    const javaAsset: WorkspaceAsset = {
      path: "assets/Example.java",
      name: "Example.java",
      extension: "java",
      kind: "code",
      mimeType: "text/x-java",
      bytes: 128,
      modifiedAt: "2026-08-27T00:00:00.000Z",
    };
    expect(assetKindLabel(javaAsset.kind)).toBe("CODE");
    expect(assetLanguage(javaAsset)).toBe("java");
    expect(assetKindLabel("binary")).toBe("BINARY");
  });

  it("only enables the Java Playground for readable Java code assets", () => {
    const javaAsset: WorkspaceAssetContent = {
      path: "assets/Example.java",
      name: "Example.java",
      extension: "java",
      kind: "code",
      mimeType: "text/x-java",
      bytes: 20,
      modifiedAt: "2026-08-27T00:00:00.000Z",
      content: "class Example {}",
    };
    expect(canRunJavaAsset(javaAsset)).toBe(true);
    expect(canRunJavaAsset({ ...javaAsset, extension: "json", kind: "config" })).toBe(false);
    expect(canRunJavaAsset({ ...javaAsset, content: undefined })).toBe(false);
  });

  it("formats local file sizes without requiring the filesystem", () => {
    expect(formatAssetSize(512)).toBe("512 B");
    expect(formatAssetSize(2048)).toBe("2.0 KB");
    expect(formatAssetSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
