import { el } from "../utils/dom.js";

export function renderNotesList(side, notes, activeId, onPick, onNew, onDelete, foldersApi) {
  foldersApi = foldersApi || {};
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

  const newFolder = el("button", "", "New folder");
  newFolder.onclick = () => foldersApi.onAddFolder && foldersApi.onAddFolder(null);
  const rename = el("button", "", "Rename folder");
  rename.onclick = () => foldersApi.onRenameFolder && foldersApi.onRenameFolder(activeFolderId());
  const rmFolder = el("button", "", "Delete folder");
  rmFolder.onclick = () => foldersApi.onDeleteFolder && foldersApi.onDeleteFolder(activeFolderId());

  bar.replaceChildren(add, del, newFolder, rename, rmFolder);
  let list = side.querySelector("#notes");
  if (!list) {
    list = el("div");
    list.id = "notes";
    side.append(list);
  }

  function activeFolderId() {
    const note = notes.find((n) => n.id === activeId);
    return note ? note.folder_id : null;
  }

  const folderName = (id) => {
    const f = (foldersApi.folders || []).find((f) => f.id === id);
    return f ? f.name : "(unknown)";
  };

  const moveButtons = (note) => {
    const wrap = el("span", "moves");
    const options = [null, ...foldersApi.folders.map((f) => f.id)];
    for (const id of options) {
      if (id === note.folder_id) continue;
      const b = el("button", "move", id ? "→ " + folderName(id) : "→ root");
      b.onclick = () => foldersApi.onMoveNote(note.id, id);
      wrap.append(b);
    }
    return wrap;
  };
  list.replaceChildren();
  if (!notes.length) {
    list.append(el("p", "muted", "No notes yet."));
    return;
  }
  for (const n of notes) {
    const b = el("button", n.id === activeId ? "active" : "", n.title || "Untitled");
    b.onclick = () => onPick(n.id);
    const row = el("div", "note-row");
    row.append(b);
    if (n.folder_id || (foldersApi.folders || []).length) row.append(moveButtons(n));
    list.append(row);
  }
}
