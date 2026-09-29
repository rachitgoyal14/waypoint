import { el } from "../utils/dom.js";


// Client-side search: a note matches when the query shows up in its
// title, its body, or any of its tags. Case never matters.
export function filterNotes(notes, q) {
  q = q.trim().toLowerCase();
  if (!q) return notes;

  return notes.filter((n) => {
    const title = (n.title || "Untitled").toLowerCase();
    const body = (n.content || "").toLowerCase();
    const tags = (n.tags || []).join(" ").toLowerCase();
    return title.includes(q) || body.includes(q) || tags.includes(q);
  });
}


// The input itself is created once and never replaced, so typing keeps
// focus. Every keystroke just re-renders the tree below it.
export function renderSearch(side, onQuery) {
  let box = side.querySelector("#searchbox");

  if (!box) {
    box = el("div");
    box.id = "searchbox";

    const input = el("input");
    input.type = "search";
    input.placeholder = "Search notes…";
    input.oninput = () => onQuery(input.value);

    box.append(input);
    side.append(box);
  }

  return box;
}
