import { marked } from "https://esm.sh/marked@13";
import { el } from "../utils/dom.js";

export function renderMarkdown(text) {
  const html = marked.parse(text || "", { gfm: true, breaks: true });
  const host = el("div", "preview");
  host.innerHTML = html; // marked's output, never raw user strings
  return host;
}
