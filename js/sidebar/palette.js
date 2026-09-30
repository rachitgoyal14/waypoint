import { el } from "../utils/dom.js";
import { filterNotes } from "./search.js";


// The jump-to-note palette. Cmd+K (or Ctrl+K) slides a small input over
// everything; type a few letters, arrow through the matches, Enter to go.
// It reuses the same filterNotes as the sidebar, so title, content, and
// tags all count as a match.

export function initPalette({ getNotes, onPick }) {
  const backdrop = el("div", "palette");
  const box = el("div", "palette-box");
  const input = el("input");
  input.placeholder = "Jump to note…";
  const list = el("div", "palette-list");

  let rows = [];
  let sel = 0;

  const draw = () => {
    rows = filterNotes(getNotes(), input.value).slice(0, 8);
    sel = Math.max(0, Math.min(sel, rows.length - 1));

    list.replaceChildren(...rows.map((n, i) => {
      const b = el("button", i === sel ? "selected" : "", n.title || "Untitled");
      b.onclick = () => pick(n);
      return b;
    }));

    if (!rows.length) list.append(el("p", "muted", "No matches."));
  };

  const close = () => {
    backdrop.classList.remove("open");
    input.value = "";
    sel = 0;
    draw();
  };

  const pick = (n) => {
    close();
    onPick(n.id);
  };

  const open = () => {
    backdrop.classList.add("open");
    draw();
    input.focus();
  };

  input.oninput = () => {
    sel = 0;
    draw();
  };

  input.onkeydown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sel = Math.min(sel + 1, rows.length - 1);
      draw();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(sel - 1, 0);
      draw();
    } else if (e.key === "Enter" && rows[sel]) {
      e.preventDefault();
      pick(rows[sel]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (backdrop.classList.contains("open")) close();
      else open();
    } else if (e.key === "Escape" && backdrop.classList.contains("open")) {
      close();
    }
  });

  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };

  box.append(input, list);
  backdrop.append(box);
  document.body.append(backdrop);

  return { open, close };
}
