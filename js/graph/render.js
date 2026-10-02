import { el } from "../utils/dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawGraph(svg, graph, activeId, onOpen) {
  svg.replaceChildren();

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const sid = (v) => (v !== null && typeof v === "object" ? v.id : v);

  const neighbors = new Map();
  for (const e of graph.edges) {
    push(neighbors, sid(e.source), sid(e.target));
    push(neighbors, sid(e.target), sid(e.source));
  }

  for (const e of graph.edges) {
    const a = byId.get(sid(e.source));
    const b = byId.get(sid(e.target));
    if (!a || !b) continue;
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "edge");
    line.dataset.source = sid(e.source);
    line.dataset.target = sid(e.target);
    svg.append(line);
  }

  for (const n of graph.nodes) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", n.x ?? 0);
    c.setAttribute("cy", n.y ?? 0);
    c.setAttribute("r", n.r ?? 4);
    c.setAttribute("class", n.id === activeId ? "node active" : "node");
    c.dataset.id = n.id;
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = n.title || "Untitled";
    c.append(title);
    if (onOpen) {
      c.style.cursor = "pointer";
      c.addEventListener("click", () => onOpen(n.id));
      c.addEventListener("mouseenter", () => highlight(svg, n.id, neighbors));
      c.addEventListener("mouseleave", () => highlight(svg, null, neighbors));
    }
    svg.append(c);
  }

  fitView(svg, graph.nodes);
}


// Size the viewBox to the settled layout so nothing clips at the edges.
// A square box keeps the circles circular in the short, wide mini panel.
function fitView(svg, nodes) {
  if (!nodes.length) {
    svg.setAttribute("viewBox", "-100 -100 200 200");
    return;
  }

  const pad = 30;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const side = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 60);

  svg.setAttribute("viewBox", `${minX} ${minY} ${side} ${side}`);
}

function highlight(svg, id, neighbors) {
  const nodes = svg.querySelectorAll(".node");
  const edges = svg.querySelectorAll(".edge");
  if (!id) {
    for (const c of nodes) c.classList.remove("dim", "lit");
    for (const l of edges) l.classList.remove("dim", "lit");
    return;
  }
  const near = new Set([id, ...(neighbors.get(id) || [])]);
  for (const c of nodes) {
    c.classList.toggle("lit", near.has(c.dataset.id));
    c.classList.toggle("dim", !near.has(c.dataset.id));
  }
  for (const l of edges) {
    const touching = near.has(l.dataset.source) && near.has(l.dataset.target);
    l.classList.toggle("lit", touching);
    l.classList.toggle("dim", !touching);
  }
}

function push(map, a, b) {
  if (!map.has(a)) map.set(a, []);
  map.get(a).push(b);
}
