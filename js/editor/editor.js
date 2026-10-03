import { el } from "../utils/dom.js";
import { renderMarkdown, continueList, startTask, toggleTaskInText } from "./markdown.js";

export function initEditor(root, { onSave, onOpenLink }) {
  const bar = el("div");
  bar.id = "editorbar";

  const status = el("span", "status", "");
  const save = el("button", "primary", "Save");
  save.disabled = true;

  const title = el("input");
  title.id = "title";
  title.placeholder = "Untitled";

  const body = el("textarea");
  body.id = "body";
  body.placeholder = "Start writing… ([[link]], #tag, ==mark==)";

  const preview = el("div");
  preview.id = "preview";
  let previewOn = false;

  const hint = el("p", "editor-hint");
  hint.append("Pick a note on the left, press ", el("kbd", "", "⌘K"), " to jump, or write a new one.");

  const drawPreview = () => {
    if (!previewOn) return;
    preview.replaceChildren(renderMarkdown(body.value, { onOpenLink, onToggleTask: flipTask }));
  };

  function flipTask(index) {
    const next = toggleTaskInText(body.value, index);
    if (!next.changed) return;
    body.value = next.text;
    markDirty();
    drawPreview();
  }

  function applyEdit(edit) {
    body.value = edit.text;
    body.selectionStart = body.selectionEnd = edit.caret;
    markDirty();
    drawPreview();
  }

  body.oninput = () => {
    markDirty();
    drawPreview();
  };

  body.addEventListener("keydown", (e) => {
    const plain = !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (e.key === "Enter" && plain) {
      const edit = continueList(body.value, body.selectionStart, body.selectionEnd);
      if (edit) {
        e.preventDefault();
        applyEdit(edit);
      }
    } else if (e.key === " " && plain && body.selectionStart === body.selectionEnd) {
      const edit = startTask(body.value, body.selectionStart);
      if (edit) {
        e.preventDefault();
        applyEdit(edit);
      }
    }
  });

  const toggle = el("button", "", "Preview");
  toggle.onclick = () => {
    previewOn = !previewOn;
    toggle.textContent = previewOn ? "Edit" : "Preview";
    preview.classList.toggle("on");
    body.classList.toggle("hidden");
    drawPreview();
  };

  const dirty = () => save.disabled === false;

  const markDirty = () => {
    if (!save.disabled) return;
    save.disabled = false;
    status.textContent = "Unsaved changes";
    status.classList.add("dirty");
    status.classList.remove("error");
  };

  const markClean = () => {
    save.disabled = true;
    status.textContent = "";
    status.classList.remove("dirty", "error");
  };

  title.oninput = markDirty;

  const doSave = async () => {
    if (!dirty()) return;
    save.disabled = true;
    status.textContent = "Saving…";
    status.classList.remove("dirty", "error");
    const ok = await onSave(title.value, body.value);
    if (ok) {
      markClean();
    } else {
      save.disabled = false;
      status.textContent = "Save failed";
      status.classList.add("error");
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
    hint.style.display = note ? "none" : "";
    title.style.display = note ? "" : "none";
    body.style.display = note ? "" : "none";
    if (!note && previewOn) toggle.onclick();
    title.value = note ? note.title : "";
    body.value = note ? note.content : "";
    drawPreview();
    markClean();
  };

  const flush = async () => {
    if (!dirty()) return true;
    return await onSave(title.value, body.value);
  };

  bar.replaceChildren(toggle, status, save);
  root.replaceChildren(bar, hint, title, body, preview);

  return {
    open,
    flush,
    isDirty: dirty,
    savedTitle: () => title.value,
    savedBody: () => body.value,
  };
}
