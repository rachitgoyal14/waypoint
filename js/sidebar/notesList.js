import { el } from "../utils/dom.js";

export function renderNotesList(side, notes, activeId, onPick, onNew, onDelete) {
  let bar = side.querySelector("#notesbar");
  if (!bar) {
    bar = el("div");
    bar.id = "notesbar";
    side.append(bar);
  }
  const add = el("button", "", "New note");
  add.onclick = onNew;
  const del = el("button", "", "Delete");
  del.disabled = !activeId;
  del.onclick = onDelete;
  bar.replaceChildren(add, del);
  let list = side.querySelector("#notes");
  if (!list) {
    list = el("div");
    list.id = "notes";
    side.append(list);
  }
  list.replaceChildren();
  if (!notes.length) {
    list.append(el("p", "muted", "No notes yet."));
    return;
  }
  for (const n of notes) {
    const b = el("button", n.id === activeId ? "active" : "", n.title || "Untitled");
    b.onclick = () => onPick(n.id);
    list.append(b);
  }
}
