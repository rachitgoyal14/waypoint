import { el, qs } from "../utils/dom.js";
import { drawGraph } from "./render.js";
import { runSimulation } from "./simulation.js";

export function initGraphOverlay({ build, activeId, onOpen }) {
  const backdrop = el("div", "graph-overlay");
  const box = el("div", "graph-box");
  const head = el("div", "graph-head");
  const label = el("span", "", "Vault graph");
  const count = el("span", "graph-count", "");
  const closeBtn = el("button", "", "Close");
  head.append(label, count, closeBtn);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "graph-full";

  box.append(head, svg);
  backdrop.append(box);

  const close = () => backdrop.classList.remove("open");
  const open = () => {
    const graph = build();
    if (!graph.nodes.length) {
      label.textContent = "Vault graph";
      count.textContent = "no trails yet";
      svg.replaceChildren();
      svg.setAttribute("viewBox", "-100 -100 200 200");
      backdrop.classList.add("open");
      return;
    }
    // The mini panel positions its nodes through the simulation; the
    // overlay used to skip that step and drew every node at undefined.
    runSimulation(graph.nodes, graph.edges, () => {
      drawGraph(svg, graph, activeId(), onOpen);
    });
    label.textContent = "Vault graph";
    count.textContent = `${graph.nodes.length} notes · ${graph.edges.length} trails`;
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
