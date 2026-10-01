import { el } from "../utils/dom.js";


// Small styled replacements for window.prompt and window.confirm.
// Both return promises; both reuse the same single dialog node.
//
//   const name = await ask("Folder name", { initial: "Old name" });
//   const ok = await confirmDialog("Delete this note?", { danger: true });

let root = null;
let active = null;

function settle(value) {
  if (!active) return;
  const { resolve } = active;
  root.classList.remove("open");
  active = null;
  resolve(value);
}

function ensure() {
  if (root) return;

  root = el("div", "dialog-backdrop");
  const card = el("div", "dialog");
  const title = el("h2", "dialog-title", "waypoint");
  const msg = el("p", "dialog-msg");
  const field = el("input");
  field.type = "text";
  const row = el("div", "dialog-row");
  const cancel = el("button", "dialog-btn", "Cancel");
  const ok = el("button", "dialog-btn primary", "OK");

  row.append(cancel, ok);
  card.append(title, msg, field, row);
  root.append(card);
  document.body.append(root);

  cancel.onclick = () => settle(null);
  ok.onclick = () => settle(field.style.display === "none" ? true : field.value);
  root.onclick = (e) => {
    if (e.target === root) settle(null);
  };

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Enter") {
      e.preventDefault();
      ok.onclick();
    } else if (e.key === "Escape") {
      settle(null);
    }
  });
}

function open({ message, title, initial, confirmText, danger, withField }) {
  ensure();
  return new Promise((resolve) => {
    const card = root.firstChild;
    const heading = card.children[0];
    const msg = card.children[1];
    const field = card.children[2];
    const ok = card.children[3].children[1];

    // Prompts resolve with the typed string or null; confirms always
    // resolve with a real boolean so callers can write `if (!ok) return`.
    active = {
      resolve: (v) => resolve(withField ? v : v === true),
    };
    heading.textContent = title;
    msg.textContent = message;
    field.style.display = withField ? "" : "none";
    field.value = initial || "";
    ok.textContent = confirmText;
    ok.classList.toggle("danger", Boolean(danger));
    root.classList.add("open");

    requestAnimationFrame(() => {
      if (withField) {
        field.focus();
        field.select();
      } else {
        ok.focus();
      }
    });
  });
}


// Returns the typed string, or null when cancelled.
export function ask(message, { title = "waypoint", initial = "", confirmText = "OK" } = {}) {
  return open({ message, title, initial, confirmText, withField: true });
}


// Returns true (confirmed) or false (cancelled).
export function confirmDialog(message, { title = "Are you sure?", confirmText = "OK", danger = false } = {}) {
  return open({ message, title, confirmText, danger, withField: false });
}
