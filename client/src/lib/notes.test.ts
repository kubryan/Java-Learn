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

  it("indexes the Java gap roadmap and Minecraft-priority handbooks", () => {
    const roadmap = notes.find((note) => note.slug === "java-gap-roadmap");
    const collections = searchNotes("HashMap", "Collections");
    const modern = searchNotes("Lambda", "Java 現代語法");
    const methodReferences = searchNotes("Method Reference", "Java 現代語法");
    const streams = searchNotes("flatMap", "Java 現代語法");
    const generics = searchNotes("Type Erasure", "Java 現代語法");
    const interfaces = searchNotes("Default Method", "OOP");
    const enums = searchNotes("EnumMap", "Java 現代語法");
    const annotations = searchNotes("Retention", "Java 現代語法");
    const jvm = searchNotes("Class Loader", "JVM");

    expect(roadmap?.tags).toEqual(expect.arrayContaining(["Minecraft Java", "checklist"]));
    expect(collections.some((note) => note.slug === "java-collections")).toBe(true);
    expect(modern.some((note) => note.slug === "modern-java")).toBe(true);
    expect(methodReferences.some((note) => note.slug === "modern-java")).toBe(true);
    expect(streams.some((note) => note.slug === "java-stream-api")).toBe(true);
    expect(generics.some((note) => note.slug === "java-generics")).toBe(true);
    expect(interfaces.some((note) => note.slug === "java-interface")).toBe(true);
    expect(enums.some((note) => note.slug === "java-enum")).toBe(true);
    expect(annotations.some((note) => note.slug === "java-annotations")).toBe(true);
    expect(jvm.some((note) => note.slug === "java-jvm")).toBe(true);
  });
});
