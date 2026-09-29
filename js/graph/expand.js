import { el, qs } from "../utils/dom.js";
import { drawGraph } from "./render.js";

export function initGraphOverlay({ build, activeId, onOpen }) {
  const backdrop = el("div", "graph-overlay");
  const box = el("div", "graph-box");
  const head = el("div", "graph-head");
  const label = el("span", "", "Vault graph");
  const closeBtn = el("button", "", "Close");
  head.append(label, closeBtn);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "graph-full";

  box.append(head, svg);
  backdrop.append(box);

  const close = () => backdrop.classList.remove("open");
  const open = () => {
    const graph = build();
    svg.setAttribute("viewBox", "-160 -160 320 320");
    drawGraph(svg, graph, activeId(), onOpen);
    backdrop.classList.add("open");
  };

  closeBtn.onclick = close;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  document.body.append(backdrop);
  return { open, close };
}
