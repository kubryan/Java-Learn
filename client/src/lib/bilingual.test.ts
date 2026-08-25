import { describe, expect, it } from "vitest";

import { bilingualGuides, bilingualSearchTerms, guideForCategory } from "./bilingual";

describe("bilingual guides", () => {
  it("contains a usable guide for every main category", () => {
    for (const category of ["Java 基礎", "Python 基礎", "Fabric", "NeoForge"]) {
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

  it("falls back to the beginner guide for unknown categories", () => {
    expect(guideForCategory("unknown")).toBe(bilingualGuides["開始使用"]);
  });
});
