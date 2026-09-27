import { marked } from "https://esm.sh/marked@13";
import { el } from "../utils/dom.js";

const TAG = /(^|\s)#([a-zA-Z][\w-]*)\b/g;
const HIGHLIGHT = /==([^=\n]+)==/g;
const CALLOUT = /^\[!(\w+)\]\s*(.*)$/;
const WIKILINK = /\[\[([^\][\n]+)\]\]/g;

export function extractTags(text) {
  const found = new Set();
  for (const [, , tag] of (text || "").matchAll(TAG)) {
    found.add(tag.toLowerCase());
  }
  return [...found];
}

export function extractWikilinks(text) {
  const found = [];
  for (const [, title] of (text || "").matchAll(WIKILINK)) {
    found.push(title.trim());
  }
  return found;
}

export function renderMarkdown(text, { onOpenLink } = {}) {
  const host = el("div", "preview");
  host.innerHTML = marked.parse(text || "", { gfm: true, breaks: true }); // marked's output, never raw user strings

  addHighlights(host);
  addTags(host);
  addWikilinks(host, onOpenLink);
  addCallouts(host);
  return host;
}

export function wikilinkHtml(s) {
  let changed = false;
  const html = escaped(s).replace(WIKILINK, (m, raw) => {
    changed = true;
    const title = unescaped(raw).trim();
    const attr = escaped(title).replace(/"/g, "&quot;");
    return '<a href="#" class="wikilink" data-title="' + attr + '">' + escaped(title) + "</a>";
  });
  return changed ? html : null;
}

function addWikilinks(host, onOpenLink) {
  for (const node of textNodes(host)) {
    const s = node.textContent;
    if (!s.includes("[[")) continue;
    const html = wikilinkHtml(s);
    if (!html) continue;
    const span = swapHtml(node, html);
    for (const a of span.querySelectorAll("a.wikilink")) {
      a.onclick = (e) => {
        e.preventDefault();
        onOpenLink(a.dataset.title);
      };
    }
  }
}

function addHighlights(host) {
  for (const node of textNodes(host)) {
    const s = node.textContent;
    if (!s.includes("==")) continue;
    const html = escaped(s).replace(HIGHLIGHT, "<mark>$1</mark>");
    if (html === escaped(s)) continue;
    swapHtml(node, html);
  }
}

function addTags(host) {
  for (const node of textNodes(host)) {
    const s = node.textContent;
    if (!s.includes("#")) continue;
    const html = escaped(s).replace(TAG, (m, pre, tag) => {
      return pre + '<a href="#" class="tag">#' + escaped(tag) + "</a>";
    });
    if (html === escaped(s)) continue;
    swapHtml(node, html);
  }
}

function swapHtml(node, html) {
  const span = document.createElement("span");
  span.innerHTML = html; // escapes applied above, tags/mark written by this file
  node.replaceWith(span);
  return span;
}

function escaped(s) {
  const d = el("div");
  d.textContent = s;
  return d.innerHTML;
}

function unescaped(s) {
  const d = el("div");
  d.innerHTML = s; // entity-only text: escaped() left no real tags to parse
  return d.textContent;
}

function addCallouts(host) {
  for (const quote of host.querySelectorAll("blockquote")) {
    const first = quote.firstElementChild;
    if (!first) continue;
    const match = first.textContent.match(CALLOUT);
    if (!match) continue;

    const kind = match[1].toLowerCase();
    const box = el("div", "callout callout-" + kind);
    const label = el("p", "callout-title", match[2] || kind);
    box.append(label);
    while (first.nextSibling) {
      box.append(first.nextSibling);
    }
    first.remove();
    quote.replaceWith(box);
  }
}

function textNodes(root) {
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.parentElement?.closest("code, pre")) continue;
    out.push(n);
  }
  return out;
}
