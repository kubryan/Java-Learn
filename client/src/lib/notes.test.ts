import { describe, expect, it } from "vitest";

import { categories, notes, searchNotes } from "./notes";

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

  it("loads the Java Development track as a searchable category", () => {
    const developmentNotes = searchNotes("", "Java 開發");
    const expectedSlugs = [
      "java-development",
      "java-packages-access-modifiers",
      "java-access-modifiers",
      "java-object-contract",
      "java-immutability",
      "java-strings",
      "java-debugging",
      "java-logging",
      "java-project-tools",
      "java-junit",
      "java-git-for-java",
    ];

    expect(developmentNotes.map((note) => note.slug)).toEqual(expect.arrayContaining(expectedSlugs));
    expect(categories).toContain("Java 開發");
    expect(developmentNotes.every((note) => note.tags.includes("Java"))).toBe(true);
    expect(developmentNotes.every((note) => note.titleEn && note.topic && note.terms.length > 0 && note.aliases.length > 0 && note.summary)).toBe(true);
    expect(developmentNotes.find((note) => note.slug === "java-development")?.path).toContain("10-java-development/00-java-development.md");
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
    const optionals = searchNotes("orElseThrow", "Java 現代語法");
    const exceptionHierarchy = searchNotes("Throwable", "Exception");
    const io = searchNotes("BufferedReader", "Java 現代語法");
    const serialization = searchNotes("JSON", "Java 現代語法");
    const concurrency = searchNotes("ExecutorService", "Java 現代語法");
    const debugging = searchNotes("Breakpoint", "Java 開發");
    const projectTools = searchNotes("build.gradle", "Java 開發");
    const logging = searchNotes("Logger", "Java 開發");
    const junit = searchNotes("@Test", "Java 開發");
    const git = searchNotes("git status", "Java 開發");
    const jvmDeep = searchNotes("GC Roots", "JVM");
    const generics = searchNotes("Type Erasure", "Java 現代語法");
    const interfaces = searchNotes("Default Method", "OOP");
    const objectContract = searchNotes("hashCode", "Java 開發");
    const strings = searchNotes("StringBuilder", "Java 開發");
    const packages = searchNotes("protected", "Java 開發");
    const accessModifiers = searchNotes("protected", "Java 開發");
    const assertions = searchNotes("-ea", "Java 基礎");
    const immutability = searchNotes("Defensive Copy", "Java 開發");
    const enums = searchNotes("EnumMap", "Java 現代語法");
    const annotations = searchNotes("Retention", "Java 現代語法");
    const mixinRedirects = searchNotes("@Redirect", "Java 現代語法");
    const jvm = searchNotes("Class Loader", "JVM");

    expect(roadmap?.tags).toEqual(expect.arrayContaining(["Minecraft Java", "checklist"]));
    expect(collections.some((note) => note.slug === "java-collections")).toBe(true);
    expect(modern.some((note) => note.slug === "modern-java")).toBe(true);
    expect(methodReferences.some((note) => note.slug === "modern-java")).toBe(true);
    expect(streams.some((note) => note.slug === "java-stream-api")).toBe(true);
    expect(optionals.some((note) => note.slug === "modern-java")).toBe(true);
    expect(exceptionHierarchy.some((note) => note.slug === "java-exceptions")).toBe(true);
    expect(io.some((note) => note.slug === "java-io")).toBe(true);
    expect(serialization.some((note) => note.slug === "java-serialization")).toBe(true);
    expect(concurrency.some((note) => note.slug === "java-concurrency")).toBe(true);
    expect(debugging.some((note) => note.slug === "java-debugging")).toBe(true);
    expect(projectTools.some((note) => note.slug === "java-project-tools")).toBe(true);
    expect(logging.some((note) => note.slug === "java-logging")).toBe(true);
    expect(junit.some((note) => note.slug === "java-junit")).toBe(true);
    expect(git.some((note) => note.slug === "java-git-for-java")).toBe(true);
    expect(jvmDeep.some((note) => note.slug === "java-jvm-deep-dive")).toBe(true);
    expect(generics.some((note) => note.slug === "java-generics")).toBe(true);
    expect(interfaces.some((note) => note.slug === "java-interface")).toBe(true);
    expect(objectContract.some((note) => note.slug === "java-object-contract")).toBe(true);
    expect(strings.some((note) => note.slug === "java-strings")).toBe(true);
    expect(packages.some((note) => note.slug === "java-packages-access-modifiers")).toBe(true);
    expect(accessModifiers.some((note) => note.slug === "java-access-modifiers")).toBe(true);
    expect(assertions.some((note) => note.slug === "java-core-gaps")).toBe(true);
    expect(immutability.some((note) => note.slug === "java-immutability")).toBe(true);
    expect(enums.some((note) => note.slug === "java-enum")).toBe(true);
    expect(annotations.some((note) => note.slug === "java-annotations")).toBe(true);
    expect(mixinRedirects.some((note) => note.slug === "java-annotations")).toBe(true);
    expect(jvm.some((note) => note.slug === "java-jvm")).toBe(true);
  });
});
