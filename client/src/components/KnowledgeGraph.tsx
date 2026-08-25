/**
 * Design reminder — 藍圖工作桌：知識圖是可拖動的工程圖層；線條標示可追溯關係，節點仍要能回到可讀的原始 Markdown。
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import type { Note } from "@/lib/notes";
import { buildKnowledgeGraph, createGraphLayout, type GraphPosition } from "@/lib/knowledge-graph";

const GRAPH_WIDTH = 940;
const GRAPH_HEIGHT = 580;
const MIN_SCALE = 0.65;
const MAX_SCALE = 1.85;

type KnowledgeGraphProps = {
  activeSlug: string;
  visibleNoteSlugs: string[];
  onOpenNote: (note: Note) => void;
};

type Viewport = { x: number; y: number; scale: number };
type NodeDrag = { id: string; origin: GraphPosition; pointer: GraphPosition; moved: boolean };
type CanvasPan = { point: GraphPosition; view: Viewport };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function shortLabel(title: string) {
  return title.length > 17 ? `${title.slice(0, 16)}…` : title;
}

function nodeColor(category: string) {
  if (category === "Fabric") return { fill: "#0f766e", stroke: "#115e59", text: "#f8f4e9" };
  if (category === "NeoForge") return { fill: "#a16207", stroke: "#854d0e", text: "#fffdf7" };
  if (category === "Minecraft 共通") return { fill: "#1e3a5f", stroke: "#17263a", text: "#fffdf7" };
  return { fill: "#fffdf7", stroke: "#526477", text: "#17263a" };
}

export function KnowledgeGraph({ activeSlug, visibleNoteSlugs, onOpenNote }: KnowledgeGraphProps) {
  const graph = useMemo(() => buildKnowledgeGraph(), []);
  const visibleSlugSet = useMemo(() => new Set(visibleNoteSlugs), [visibleNoteSlugs]);
  const neighboringSlugs = useMemo(() => {
    const neighbors = new Set<string>();
    graph.edges.forEach((edge) => {
      if (visibleSlugSet.has(edge.source)) neighbors.add(edge.target);
      if (visibleSlugSet.has(edge.target)) neighbors.add(edge.source);
    });
    neighbors.add(activeSlug);
    return neighbors;
  }, [activeSlug, graph.edges, visibleSlugSet]);
  const graphNodes = useMemo(() => graph.nodes.filter((node) => {
    const noFilter = visibleNoteSlugs.length === 0;
    return noFilter || visibleSlugSet.has(node.id) || neighboringSlugs.has(node.id);
  }), [graph.nodes, neighboringSlugs, visibleNoteSlugs.length, visibleSlugSet]);
  const graphNodeIds = useMemo(() => new Set(graphNodes.map((node) => node.id)), [graphNodes]);
  const graphEdges = useMemo(() => graph.edges.filter((edge) => graphNodeIds.has(edge.source) && graphNodeIds.has(edge.target)), [graph.edges, graphNodeIds]);
  const [positions, setPositions] = useState<Record<string, GraphPosition>>(() => createGraphLayout(graphNodes));
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeDragRef = useRef<NodeDrag | null>(null);
  const canvasPanRef = useRef<CanvasPan | null>(null);

  useEffect(() => {
    setPositions(createGraphLayout(graphNodes));
    setView({ x: 0, y: 0, scale: 1 });
  }, [graphNodes]);

  function pointFromEvent(event: { clientX: number; clientY: number }) {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * GRAPH_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * GRAPH_HEIGHT,
    };
  }

  function zoomBy(amount: number) {
    setView((current) => ({ ...current, scale: clamp(Number((current.scale + amount).toFixed(2)), MIN_SCALE, MAX_SCALE) }));
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.12 : 0.12);
  }

  function startNodeDrag(event: PointerEvent<SVGGElement>, nodeId: string) {
    event.preventDefault();
    event.stopPropagation();
    const point = pointFromEvent(event);
    const position = positions[nodeId];
    if (!position) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    nodeDragRef.current = { id: nodeId, origin: position, pointer: point, moved: false };
  }

  function startCanvasPan(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest(".graph-node")) return;
    const point = pointFromEvent(event);
    svgRef.current?.setPointerCapture(event.pointerId);
    canvasPanRef.current = { point, view };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const point = pointFromEvent(event);
    const nodeDrag = nodeDragRef.current;
    if (nodeDrag) {
      const deltaX = (point.x - nodeDrag.pointer.x) / view.scale;
      const deltaY = (point.y - nodeDrag.pointer.y) / view.scale;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 3) nodeDrag.moved = true;
      setPositions((current) => ({
        ...current,
        [nodeDrag.id]: {
          x: clamp(nodeDrag.origin.x + deltaX, 58, GRAPH_WIDTH - 58),
          y: clamp(nodeDrag.origin.y + deltaY, 58, GRAPH_HEIGHT - 58),
        },
      }));
      return;
    }
    const canvasPan = canvasPanRef.current;
    if (canvasPan) {
      setView({
        ...canvasPan.view,
        x: canvasPan.view.x + (point.x - canvasPan.point.x),
        y: canvasPan.view.y + (point.y - canvasPan.point.y),
      });
    }
  }

  function handlePointerUp() {
    const nodeDrag = nodeDragRef.current;
    if (nodeDrag && !nodeDrag.moved) {
      const target = graphNodes.find((node) => node.id === nodeDrag.id);
      if (target) onOpenNote(target.note);
    }
    nodeDragRef.current = null;
    canvasPanRef.current = null;
  }

  function resetView() {
    setPositions(createGraphLayout(graphNodes));
    setView({ x: 0, y: 0, scale: 1 });
  }

  if (graph.nodes.length === 0) {
    return <p className="rounded-md border border-amber-700/20 bg-amber-50 px-4 py-5 text-sm leading-6 text-amber-950">目前還沒有由 `[[...]]` 建立的筆記關聯。先在 Markdown 加上一個 Wiki 連結，這裡就會出現節點與連線。</p>;
  }

  return (
    <section className="graph-workbench">
      <div className="graph-toolbar">
        <div className="min-w-0"><p className="section-label text-teal-800">LIVE WIKI NETWORK</p><p className="mt-1 text-sm leading-5 text-slate-600">拖曳節點排列、滾輪縮放，點一下節點回到原始 Markdown。</p></div>
        <div className="graph-controls" aria-label="知識圖控制"><button type="button" onClick={() => zoomBy(-0.15)} aria-label="縮小知識圖"><Minus className="h-4 w-4" /></button><button type="button" onClick={() => zoomBy(0.15)} aria-label="放大知識圖"><Plus className="h-4 w-4" /></button><button type="button" onClick={resetView} aria-label="重設知識圖"><RotateCcw className="h-4 w-4" /></button></div>
      </div>
      <div className="graph-canvas-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="graph-canvas"
          role="application"
          aria-label="可互動的 Markdown Wiki 知識關聯圖"
          onWheel={handleWheel}
          onPointerDown={startCanvasPan}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs><pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(25,57,84,0.10)" strokeWidth="1" /></pattern><marker id="graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#0f766e" /></marker></defs>
          <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="url(#graph-grid)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {graphEdges.map((edge) => {
              const source = positions[edge.source];
              const target = positions[edge.target];
              if (!source || !target) return null;
              const highlighted = edge.source === activeSlug || edge.target === activeSlug;
              return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={highlighted ? "graph-edge graph-edge-active" : "graph-edge"} markerEnd="url(#graph-arrow)" />;
            })}
            {graphNodes.map((node) => {
              const position = positions[node.id];
              if (!position) return null;
              const color = nodeColor(node.note.category);
              const active = node.id === activeSlug;
              const dimmed = visibleNoteSlugs.length > 0 && !visibleSlugSet.has(node.id) && !active;
              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x} ${position.y})`}
                  className={`graph-node${active ? " graph-node-active" : ""}${dimmed ? " graph-node-dimmed" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`開啟筆記：${node.note.title}`}
                  onPointerDown={(event) => startNodeDrag(event, node.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenNote(node.note); } }}
                >
                  <circle r={active ? 35 : 30} fill={color.fill} stroke={color.stroke} strokeWidth={active ? 4 : 2} />
                  <circle r={active ? 42 : 37} fill="none" stroke={color.stroke} strokeWidth="1" strokeDasharray="3 5" opacity="0.45" />
                  <text y="-3" textAnchor="middle" fill={color.text} className="graph-node-order">{String(node.note.order).padStart(2, "0")}</text>
                  <text y="12" textAnchor="middle" fill={color.text} className="graph-node-degree">{node.degree} LINK{node.degree === 1 ? "" : "S"}</text>
                  <text y={active ? 58 : 53} textAnchor="middle" className="graph-node-label">{shortLabel(node.note.title)}</text>
                </g>
              );
            })}
          </g>
        </svg>
        <div className="graph-move-hint"><Move className="h-3.5 w-3.5" />DRAG · WHEEL TO ZOOM</div>
      </div>
      <div className="graph-footer"><span>{graphNodes.length} NODES · {graphEdges.length} LINKS</span><span>Markdown `[[...]]` · 即時關聯</span></div>
      {graph.unresolvedTargets.length > 0 && <p className="mt-3 text-xs leading-5 text-amber-900">尚未找到 {graph.unresolvedTargets.length} 個目標：{graph.unresolvedTargets.slice(0, 4).join("、")}{graph.unresolvedTargets.length > 4 ? "…" : ""}</p>}
    </section>
  );
}
