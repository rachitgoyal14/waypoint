const SVG_NS = "http://www.w3.org/2000/svg";

let tip = null;

function getTip() {
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "graph-tip";
    tip.hidden = true;
    document.body.append(tip);
  }
  return tip;
}

export function hideTip() {
  if (tip) tip.hidden = true;
}

function showTip(text, x, y) {
  const t = getTip();
  t.textContent = text;
  t.hidden = false;
  moveTip(x, y);
}

function moveTip(x, y) {
  const t = getTip();
  const gap = 14;
  const w = t.offsetWidth;
  const h = t.offsetHeight;
  let left = x + gap;
  let top = y + gap;
  if (left + w > window.innerWidth - 8) left = x - w - gap;
  if (top + h > window.innerHeight - 8) top = y - h - gap;
  t.style.left = left + "px";
  t.style.top = top + "px";
}

const sid = (v) => (v !== null && typeof v === "object" ? v.id : v);

export function drawGraph(svg, graph, activeId, onOpen) {
  svg.replaceChildren();

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

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
    line.setAttribute("x1", a.x ?? 0);
    line.setAttribute("y1", a.y ?? 0);
    line.setAttribute("x2", b.x ?? 0);
    line.setAttribute("y2", b.y ?? 0);
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
    if (onOpen) {
      const label = n.title || "Untitled";
      c.style.cursor = "pointer";
      c.addEventListener("click", () => {
        hideTip();
        onOpen(n.id);
      });
      c.addEventListener("mouseenter", (ev) => {
        highlight(svg, n.id, neighbors);
        showTip(label, ev.clientX, ev.clientY);
      });
      c.addEventListener("mousemove", (ev) => moveTip(ev.clientX, ev.clientY));
      c.addEventListener("mouseleave", () => {
        highlight(svg, null, neighbors);
        hideTip();
      });
    }
    svg.append(c);
  }

  fitView(svg, graph.nodes);
}

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
