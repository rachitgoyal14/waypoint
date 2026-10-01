import { el } from "../utils/dom.js";

export function renderNotesBar(side, activeId, actions) {
  let bar = side.querySelector("#notesbar");
  if (!bar) {
    bar = el("div");
    bar.id = "notesbar";
    side.append(bar);
  }

  const add = el("button", "", "+ Note");
  add.onclick = actions.onNew;

  const folder = el("button", "", "+ Folder");
  folder.onclick = () => actions.onNewFolder(null);

  const del = el("button", "", "Delete");
  del.disabled = !activeId;
  del.onclick = actions.onDelete;

  bar.replaceChildren(add, folder, del);
}

export function noteRow(note, activeId, onPick, folders, onMoveNote) {
  const b = el("button", note.id === activeId ? "active" : "", note.title || "Untitled");
  b.onclick = () => onPick(note.id);

  const row = el("div", "note-row");
  row.draggable = true;
  row.ondragstart = (e) => e.dataTransfer.setData("text/plain", note.id);
  row.append(b);

  if (note.id === activeId && folders && folders.length) {
    row.append(moveChips(note, folders, onMoveNote));
  }
  return row;
}

function moveChips(note, folders, onMoveNote) {
  const wrap = el("span", "moves");
  const name = (id) => {
    const f = folders.find((f) => f.id === id);
    return f ? f.name : "(unknown)";
  };
  const targets = [null, ...folders.map((f) => f.id)];
  for (const id of targets) {
    if (id === (note.folder_id || null)) continue;
    const chip = el("button", "move", id ? "→ " + name(id) : "→ root");
    chip.onclick = () => onMoveNote(note.id, id);
    wrap.append(chip);
  }
  return wrap;
}
