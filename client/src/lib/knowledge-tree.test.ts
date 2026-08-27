import { describe, expect, it } from "vitest";
import { javaBaseTree, folderDocumentCount, notesForFolder } from "./knowledge-tree";
import { notes } from "./notes";

describe("knowledge tree", () => {
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
