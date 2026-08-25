import { describe, expect, it } from "vitest";

import {
  buildKnowledgeRecords,
  createKnowledgeSnippet,
  highlightKnowledgeText,
  normalizeTag,
  searchTokens,
} from "./knowledge-db";
import { notes } from "./notes";

describe("knowledge-db pure helpers", () => {
  it("normalizes tags and tokenizes mixed Chinese and English text", () => {
    expect(normalizeTag("  Fabric   API ")).toBe("fabric api");
    expect(searchTokens("ResourceLocation 資源識別碼"))
      .toEqual(expect.arrayContaining(["resourcelocation", "資源識別碼"]));
  });

  it("builds note and glossary records from Markdown notes", () => {
    const records = buildKnowledgeRecords(notes.slice(0, 1));
    const noteRecord = records.find((record) => record.kind === "note");
    const termRecord = records.find((record) => record.kind === "term");

    expect(noteRecord?.origin).toBe("markdown");
    expect(noteRecord?.id).toMatch(/^note:/);
    expect(termRecord?.origin).toBe("glossary");
    expect(records.length).toBeGreaterThan(1);
  });

  it("highlights query tokens without losing surrounding text", () => {
    const parts = highlightKnowledgeText("Java variable method", "variable");
    const match = parts.find((part) => part.isMatch);

    expect(parts.map((part) => part.text).join("")).toBe("Java variable method");
    expect(match).toEqual({ text: "variable", isMatch: true });
  });

  it("creates a focused snippet around a matching token", () => {
    const snippet = createKnowledgeSnippet(
      {
        id: "note:test",
        kind: "note",
        title: "測試筆記",
        titleEn: "Test",
        category: "Java 基礎",
        tags: ["Java"],
        terms: ["variable"],
        content: "這是一段很長的內容，介紹 variable 如何保存資料，以及 method 如何重用行為。",
        preview: "",
        path: "content/test.md",
        origin: "markdown",
      },
      "variable",
    );

    expect(snippet).toContain("variable");
    expect(snippet.length).toBeLessThanOrEqual(168);
  });
});
