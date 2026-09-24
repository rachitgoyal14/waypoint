import { el } from "../utils/dom.js";
import { noteRow } from "./notesList.js";

const open = new Set();

export function isOpen(id) {
  return open.has(id);
}

export function renderFolderTree(root, folders, notes, activeId, onPick, onNewNoteIn, onRename, onDelete, onMoveNote) {
  root.textContent = "";

  const rootNotes = notes.filter((n) => !n.folder_id);
  if (!folders.length && !rootNotes.length) {
    root.append(el("p", "muted", "No notes yet — write one."));
    return;
  }

  for (const f of folders.filter((f) => !f.parent_folder_id)) {
    root.append(folderNode(f));
  }
  for (const n of rootNotes) {
    root.append(noteRow(n, activeId, onPick, folders, onMoveNote));
  }

  function folderNode(f) {
    const kids = folders.filter((c) => c.parent_folder_id === f.id);
    const mine = notes.filter((n) => n.folder_id === f.id);

    const head = el("div", "folder-head");
    const chev = el("button", "chev", "▸");
    const label = el("button", "folder-name", f.name);
    const count = el("span", "count", String(mine.length + kids.length));
    head.append(chev, label, count);

    const add = el("button", "mini", "+ note");
    add.onclick = () => onNewNoteIn(f.id);
    const rename = el("button", "mini", "rename");
    rename.onclick = () => onRename(f.id);
    const rm = el("button", "mini", "delete");
    rm.onclick = () => onDelete(f.id);
    head.append(add, rename, rm);

    const node = el("div", "folder");
    node.append(head);

    const body = el("div", "folder-body");
    node.append(body);

    chev.onclick = () => {
      if (open.has(f.id)) {
        open.delete(f.id);
      } else {
        open.add(f.id);
      }
      body.classList.toggle("hidden");
      chev.textContent = body.classList.contains("hidden") ? "▸" : "▾";
    };
    if (open.has(f.id)) {
      chev.textContent = "▾";
    } else {
      body.classList.add("hidden");
    }

    for (const c of kids) {
      body.append(folderNode(c));
    }
    for (const n of mine) {
      const row = noteRow(n, activeId, onPick, folders, onMoveNote);
      row.classList.add("in-folder");
      body.append(row);
    }

    head.ondragover = (e) => e.preventDefault();
    head.ondrop = (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id) onMoveNote(id, f.id);
    };

    return node;
  }
}
