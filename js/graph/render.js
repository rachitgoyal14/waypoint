import { el } from "../utils/dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawGraph(svg, graph, activeId, onOpen) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "-110 -110 220 220");

  const neighbors = new Map();
  for (const e of graph.edges) {
    push(neighbors, e.source, e.target);
    push(neighbors, e.target, e.source);
  }

  for (const e of graph.edges) {
    const line = document.createElementNS(SVG_NS, "line");
    const a = graph.nodes.find((n) => n.id === e.source);
    const b = graph.nodes.find((n) => n.id === e.target);
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "edge");
    line.dataset.source = e.source;
    line.dataset.target = e.target;
    svg.append(line);
  }

  for (const n of graph.nodes) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", n.x);
    c.setAttribute("cy", n.y);
    c.setAttribute("r", n.r);
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
