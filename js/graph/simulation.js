import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "https://esm.sh/d3-force@3";

export function runSimulation(nodes, links, onTick) {
  const sim = forceSimulation(nodes)
    .force("link", forceLink(links).id((d) => d.id).distance(60))
    .force("charge", forceManyBody().strength(-120))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide((d) => d.r + 4))
    .stop();

  for (let i = 0; i < 300; i++) {
    sim.tick();
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
