import { describe, expect, it } from "vitest";

import { bilingualGuides, bilingualSearchTerms, guideForCategory } from "./bilingual";

describe("bilingual guides", () => {
  it("contains a usable guide for every main category", () => {
    for (const category of ["Java 基礎", "Java 開發", "Python 基礎", "C 語言基礎", "Fabric", "NeoForge"]) {
      const guide = guideForCategory(category);
      expect(guide.explanation).not.toBe("");
      expect(guide.checkpoint).not.toBe("");
      expect(guide.terms.length).toBeGreaterThan(0);
    }
  });

  it("includes both Chinese and English terms in search data", () => {
    const javaTerms = bilingualSearchTerms["Java 基礎"];
    expect(javaTerms).toContain("變數");
    expect(javaTerms).toContain("variable");
    expect(javaTerms).toContain(bilingualGuides["Java 基礎"].checkpoint);
  });

  it("includes Java Development engineering vocabulary", () => {
    const developmentTerms = bilingualSearchTerms["Java 開發"];
    expect(developmentTerms).toContain("建置工具");
    expect(developmentTerms).toContain("build tool");
    expect(developmentTerms).toContain("version control");
  });

  it("includes C language fundamentals vocabulary", () => {
    const cTerms = bilingualSearchTerms["C 語言基礎"];
    expect(cTerms).toContain("指標");
    expect(cTerms).toContain("pointer");
    expect(cTerms).toContain("undefined behavior");
  });

  it("falls back to the beginner guide for unknown categories", () => {
    expect(guideForCategory("unknown")).toBe(bilingualGuides["開始使用"]);
  });
});
