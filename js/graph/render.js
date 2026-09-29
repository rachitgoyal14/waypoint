import { el } from "../utils/dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawGraph(svg, graph, activeId, onOpen) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "-110 -110 220 220");

  for (const e of graph.edges) {
    const line = document.createElementNS(SVG_NS, "line");
    const a = graph.nodes.find((n) => n.id === e.source);
    const b = graph.nodes.find((n) => n.id === e.target);
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "edge");
    svg.append(line);
  }

  for (const n of graph.nodes) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", n.x);
    c.setAttribute("cy", n.y);
    c.setAttribute("r", n.r);
    c.setAttribute("class", n.id === activeId ? "node active" : "node");
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = n.title || "Untitled";
    c.append(title);
    if (onOpen) {
      c.style.cursor = "pointer";
      c.addEventListener("click", () => onOpen(n.id));
    }
    svg.append(c);
  }
}
