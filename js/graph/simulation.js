import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "https://esm.sh/d3-force@3";

const idOf = (v) => (v !== null && typeof v === "object" ? v.id : v);

// Runs the layout without mutating the caller's data: d3's forceLink
// rewrites edge source/target in place (strings become node refs), which
// used to corrupt graph.edges for every later draw. Positions are copied
// back onto the original nodes so drawGraph can place them.
export function runSimulation(nodes, links, onTick) {
  for (const n of nodes) {
    if (typeof n.x !== "number" || typeof n.y !== "number") {
      n.x = (Math.random() - 0.5) * 220;
      n.y = (Math.random() - 0.5) * 220;
    }
  }

  const simNodes = nodes.map((n) => ({ ...n }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks = [];
  for (const l of links) {
    const a = byId.get(idOf(l.source));
    const b = byId.get(idOf(l.target));
    if (a && b) simLinks.push({ source: a, target: b });
  }

  const sim = forceSimulation(simNodes)
    .force("link", forceLink(simLinks).id((d) => d.id).distance(60))
    .force("charge", forceManyBody().strength(-120))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide((d) => d.r + 4))
    .stop();

  for (let i = 0; i < 300; i++) {
    sim.tick();
  }
  const originals = new Map(nodes.map((n) => [n.id, n]));
  for (const s of simNodes) {
    const orig = originals.get(s.id);
    if (orig) {
      orig.x = s.x;
      orig.y = s.y;
    }
  }
  onTick();
  return { nodes, links };
}

export function buildGraph(notes, links) {
  const ids = new Set(notes.map((n) => n.id));
  const nodes = notes.map((n) => ({ id: n.id, title: n.title, r: 4 }));
  const edges = [];
  for (const l of links) {
    if (ids.has(l.source_note_id) && ids.has(l.target_note_id)) {
      edges.push({ source: l.source_note_id, target: l.target_note_id });
    }
  }
  const degree = new Map();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  }
  for (const n of nodes) {
    n.r = 4 + Math.min(6, (degree.get(n.id) || 0));
  }
  return { nodes, edges };
}
