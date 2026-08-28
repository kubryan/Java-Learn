import { describe, expect, it } from "vitest";
import { javaBaseTree, folderDocumentCount, notesForFolder } from "./knowledge-tree";
import { notes } from "./notes";

describe("knowledge tree", () => {
  it("exposes C language as a distinct top-level learning folder", () => {
    const cFolder = javaBaseTree.children?.find((folder) => folder.id === "c-language");

    expect(cFolder).toMatchObject({
      label: "C 語言",
      categories: ["C 語言基礎"],
      directory: "11-c-basics",
    });

    const cNotes = cFolder ? notesForFolder(cFolder, notes) : [];
    expect(cNotes.some((note) => note.slug === "c-basics")).toBe(true);
    expect(cNotes.some((note) => note.slug === "c-pointers-memory")).toBe(true);
    expect(cNotes.every((note) => note.category === "C 語言基礎")).toBe(true);
    expect(folderDocumentCount(cFolder!, notes)).toBe(cNotes.length);
  });

  it("exposes Java Development as a distinct Java folder", () => {
    const javaFolder = javaBaseTree.children?.find((folder) => folder.id === "java");
    const developmentFolder = javaFolder?.children?.find((folder) => folder.id === "java-development");

    expect(developmentFolder).toMatchObject({
      label: "Java 開發",
      categories: ["Java 開發"],
      directory: "10-java-development",
    });

    const developmentNotes = developmentFolder ? notesForFolder(developmentFolder, notes) : [];
    expect(developmentNotes.some((note) => note.slug === "java-development")).toBe(true);
    expect(developmentNotes.some((note) => note.slug === "java-git-for-java")).toBe(true);
    expect(developmentNotes.every((note) => note.category === "Java 開發")).toBe(true);
    expect(folderDocumentCount(developmentFolder!, notes)).toBe(developmentNotes.length);
  });
});
