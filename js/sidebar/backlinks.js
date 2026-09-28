import { el } from "../utils/dom.js";

export function renderBacklinks(root, links, activeId, onPick) {
  let box = qsBox(root);
  const head = el("h3", "", "Linked mentions");
  box.replaceChildren(head);

  if (!activeId) {
    box.append(el("p", "muted", "Open a note to see what links here."));
    return;
  }
  if (!links.length) {
    box.append(el("p", "muted", "Nothing links here yet."));
    return;
  }

  for (const row of links) {
    const note = row.notes || {};
    if (!note.id) continue;
    const b = el("button", "", note.title || "Untitled");
    b.onclick = () => onPick(note.id);
    box.append(b);
  }
}

function qsBox(root) {
  let box = root.querySelector("#backlinks-list");
  if (!box) {
    box = el("div");
    box.id = "backlinks-list";
    root.append(box);
  }
  return box;
}
