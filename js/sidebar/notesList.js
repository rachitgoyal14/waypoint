export function renderNotesList(root, notes) {
  root.textContent = notes.length ? "" : "No notes yet.";
}
