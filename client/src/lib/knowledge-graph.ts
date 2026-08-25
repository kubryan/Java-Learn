/**
 * Design reminder — 藍圖工作桌：圖譜不是裝飾性網路，而是從 Markdown 實際連結抽出的可驗證知識座標。
 */
import { notes, type Note } from "./notes";
import { resolveWikiNote } from "./wiki-links";

export type KnowledgeGraphNode = {
  id: string;
  note: Note;
  degree: number;
  inbound: number;
  outbound: number;
};

export type KnowledgeGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  unresolvedTargets: string[];
};

function wikiTargetsFromMarkdown(markdown: string) {
  const targets = new Set<string>();
  markdown.split(/(```[\s\S]*?```)/g).forEach((fencedPart, fenceIndex) => {
    if (fenceIndex % 2 === 1) return;
    fencedPart.split(/(`[^`\n]+`)/g).forEach((inlinePart, inlineIndex) => {
      if (inlineIndex % 2 === 1) return;
      Array.from(inlinePart.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)).forEach((match) => targets.add(match[1].trim()));
    });
  });
  return Array.from(targets);
}

export function buildKnowledgeGraph(sourceNotes: Note[] = notes): KnowledgeGraph {
  const edges: KnowledgeGraphEdge[] = [];
  const edgeIds = new Set<string>();
  const unresolvedTargets = new Set<string>();
  const degree = new Map<string, { inbound: number; outbound: number }>();

  sourceNotes.forEach((sourceNote) => {
    wikiTargetsFromMarkdown(sourceNote.body).forEach((target) => {
      const targetNote = resolveWikiNote(target, sourceNotes);
      if (!targetNote) {
        unresolvedTargets.add(target);
        return;
      }
      if (targetNote.slug === sourceNote.slug) return;
      const edgeId = `${sourceNote.slug}→${targetNote.slug}`;
      if (edgeIds.has(edgeId)) return;
      edgeIds.add(edgeId);
      edges.push({ id: edgeId, source: sourceNote.slug, target: targetNote.slug });
      const sourceDegree = degree.get(sourceNote.slug) ?? { inbound: 0, outbound: 0 };
      const targetDegree = degree.get(targetNote.slug) ?? { inbound: 0, outbound: 0 };
      sourceDegree.outbound += 1;
      targetDegree.inbound += 1;
      degree.set(sourceNote.slug, sourceDegree);
      degree.set(targetNote.slug, targetDegree);
    });
  });

  const nodes = sourceNotes
    .filter((note) => degree.has(note.slug))
    .map((note) => {
      const counts = degree.get(note.slug) ?? { inbound: 0, outbound: 0 };
      return { id: note.slug, note, inbound: counts.inbound, outbound: counts.outbound, degree: counts.inbound + counts.outbound };
    })
    .sort((a, b) => b.degree - a.degree || a.note.order - b.note.order);

  return { nodes, edges, unresolvedTargets: Array.from(unresolvedTargets).sort((a, b) => a.localeCompare(b, "zh-Hant")) };
}

export type GraphPosition = { x: number; y: number };

export function createGraphLayout(nodes: KnowledgeGraphNode[], width = 940, height = 580) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.28;
  return nodes.reduce<Record<string, GraphPosition>>((result, node, index) => {
    const ring = Math.floor(index / 8);
    const ringStart = ring * 8;
    const ringSize = Math.min(8, nodes.length - ringStart);
    const angle = -Math.PI / 2 + ((index - ringStart) / Math.max(ringSize, 1)) * Math.PI * 2;
    const radius = baseRadius + ring * 105;
    result[node.id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    return result;
  }, {});
}
