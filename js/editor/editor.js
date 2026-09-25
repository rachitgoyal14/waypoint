import { el } from "../utils/dom.js";

export function initEditor(root, { onLoadNote, onSave }) {
  const bar = el("div");
  bar.id = "editorbar";

  const status = el("span", "muted", "");
  const save = el("button", "", "Save");
  save.disabled = true;

  const title = el("input");
  title.id = "title";
  title.placeholder = "Untitled";

  const body = el("textarea");
  body.id = "body";
  body.placeholder = "Start writing… ([[link]], #tag, ==mark==)";

  const dirty = () => save.disabled === false;

  const markDirty = () => {
    if (!save.disabled) return;
    save.disabled = false;
    status.textContent = "Unsaved changes";
  };

  const markClean = () => {
    save.disabled = true;
    status.textContent = "";
  };

  title.oninput = markDirty;
  body.oninput = markDirty;

  const doSave = async () => {
    if (!dirty()) return;
    save.disabled = true;
    status.textContent = "Saving…";
    const ok = await onSave(title.value, body.value);
    if (ok) {
      markClean();
    } else {
      save.disabled = false;
      status.textContent = "Save failed";
    }
  };

  save.onclick = doSave;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      doSave();
    }
  });

  const open = (note) => {
    title.value = note ? note.title : "";
    body.value = note ? note.content : "";
    markClean();
  };

  const flush = async () => {
    if (!dirty()) return true;
    return await onSave(title.value, body.value);
  };

  bar.replaceChildren(status, save);
  root.replaceChildren(bar, title, body);

  return {
    open,
    flush,
    isDirty: dirty,
    savedTitle: () => title.value,
    savedBody: () => body.value,
  };
}
