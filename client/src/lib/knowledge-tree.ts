/**
 * Design reminder — 藍圖工作桌：資料夾是可追溯的知識座標；來源仍是可直接編輯的 Markdown。
 */
import type { Note } from "./notes";

export type KnowledgeFolder = {
  id: string;
  label: string;
  categories?: string[];
  tags?: string[];
  directory?: string;
  children?: KnowledgeFolder[];
};

export const javaBaseTree: KnowledgeFolder = {
  id: "javabase",
  label: "JavaBase",
  children: [
    { id: "start", label: "開始使用", categories: ["開始使用"], directory: "00-start" },
    {
      id: "java",
      label: "Java",
      children: [
        { id: "java-basics", label: "基礎", categories: ["Java 基礎"], directory: "01-java-basics" },
        { id: "java-oop", label: "OOP", categories: ["物件導向"], directory: "03-java-oop" },
        { id: "java-collections", label: "Collection", tags: ["Collection", "Collections"] },
        { id: "java-exception", label: "Exception", tags: ["Exception", "Exceptions"] },
        { id: "java-desktop", label: "桌面工具", categories: ["桌面工具"], directory: "05-java-desktop" },
        { id: "java-backend", label: "後端 API", categories: ["後端 API"], directory: "06-backend" },
      ],
    },
    { id: "python", label: "Python", categories: ["Python 基礎"], directory: "10-python" },
    {
      id: "minecraft",
      label: "Minecraft",
      children: [
        { id: "minecraft-common", label: "共通", categories: ["Minecraft 共通"], directory: "07-minecraft-common" },
        { id: "minecraft-fabric", label: "Fabric", categories: ["Fabric"], directory: "08-fabric" },
        { id: "minecraft-neoforge", label: "NeoForge", categories: ["NeoForge"], directory: "09-neoforge" },
        { id: "minecraft-paper", label: "Paper", tags: ["Paper"] },
        { id: "minecraft-cobblemon", label: "Cobblemon", tags: ["Cobblemon"] },
        { id: "minecraft-nms", label: "NMS", tags: ["NMS"] },
      ],
    },
    {
      id: "ai",
      label: "AI",
      children: [
        { id: "ai-cursor", label: "Cursor", tags: ["Cursor"] },
        { id: "ai-codex", label: "Codex", tags: ["Codex"] },
        { id: "ai-manus", label: "Manus", tags: ["Manus"] },
      ],
    },
    {
      id: "projects",
      label: "專案",
      children: [
        { id: "project-civilization", label: "Civilization", tags: ["Civilization"] },
        { id: "project-javabase", label: "JavaBase", tags: ["JavaBase"] },
      ],
    },
  ],
};

function normalized(value: string) {
  return value.toLocaleLowerCase().trim();
}

export function folderMatchesNote(folder: KnowledgeFolder, note: Note) {
  const categoryMatch = !folder.categories?.length || folder.categories.includes(note.category);
  const tagMatch = !folder.tags?.length || folder.tags.some((folderTag) => note.tags.some((noteTag) => normalized(noteTag) === normalized(folderTag)));
  return categoryMatch && tagMatch;
}

export function notesForFolder(folder: KnowledgeFolder, sourceNotes: Note[]) {
  return sourceNotes.filter((note) => folderMatchesNote(folder, note));
}

export function folderDocumentCount(folder: KnowledgeFolder, sourceNotes: Note[]): number {
  if (!folder.children?.length) return notesForFolder(folder, sourceNotes).length;
  return folder.children.reduce((total, child) => total + folderDocumentCount(child, sourceNotes), 0);
}
