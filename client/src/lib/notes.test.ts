import { describe, expect, it } from "vitest";

import { notes, searchNotes } from "./notes";

describe("notes", () => {
  it("loads Markdown notes in order", () => {
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((note) => note.title && note.slug && note.body)).toBe(true);
    expect(notes.map((note) => note.order)).toEqual([...notes].map((note) => note.order).sort((left, right) => left - right));
  });

  it("keeps the loader-specific Minecraft tags", () => {
    const fabric = notes.find((note) => note.category === "Fabric");
    const neoforge = notes.find((note) => note.category === "NeoForge");

    expect(fabric?.tags).toEqual(expect.arrayContaining(["Minecraft", "Fabric"]));
    expect(neoforge?.tags).toEqual(expect.arrayContaining(["Minecraft", "NeoForge"]));
  });

  it("searches bilingual terms and filters by category or tag", () => {
    const variableNotes = searchNotes("variable", "全部");
    const fabricNotes = searchNotes("", "全部", "Fabric");

    expect(variableNotes.length).toBeGreaterThan(0);
    expect(variableNotes.some((note) => note.category === "Java 基礎")).toBe(true);
    expect(fabricNotes.length).toBeGreaterThan(0);
    expect(fabricNotes.every((note) => note.tags.includes("Fabric"))).toBe(true);
  });
});
