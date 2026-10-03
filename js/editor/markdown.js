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
    const t = title.trim();
    if (t) found.push(t);
  }
  return found;
}

export function continueList(text, start, end) {
  if (start !== end) return null;
  const head = text.slice(0, start);
  const sol = head.lastIndexOf("\n") + 1;
  const prefix = head.slice(sol);
  const tail = text.slice(start);
  const eol = tail.indexOf("\n");
  const suffix = eol === -1 ? tail : tail.slice(0, eol);
  const rest = eol === -1 ? "" : tail.slice(eol);
  const m = prefix.match(/^(\s*)(?:(\d+)\.|([-*+]))(\s+\[[ xX]\])?(\s*)(.*)$/);
  if (!m) return null;
  const indent = m[1];
  if (!((m[6] || "") + suffix).trim()) {
    const out = head.slice(0, sol) + indent + "\n" + tail;
    return { text: out, caret: sol + indent.length + 1 };
  }
  const marker = m[2] ? `${parseInt(m[2], 10) + 1}.` : m[3];
  const insert = `\n${indent}${marker}${m[4] ? " [ ]" : ""} `;
  return { text: head + insert + suffix + rest, caret: head.length + insert.length };
}

export function startTask(text, pos) {
  const head = text.slice(0, pos);
  const sol = head.lastIndexOf("\n") + 1;
  const m = head.slice(sol).match(/^(\s*)\[\]$/);
  if (!m) return null;
  const insert = `${m[1]}- [ ] `;
  return { text: head.slice(0, sol) + insert + text.slice(pos), caret: sol + insert.length };
}

export function toggleTaskInText(text, index) {
  const lines = text.split("\n");
  let fence = false;
  let seen = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) fence = !fence;
    if (fence) continue;
    const m = lines[i].match(/^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\]/);
    if (!m) continue;
    seen += 1;
    if (seen === index) {
      lines[i] = lines[i].replace(/\[([ xX])\]/, `[${m[2].toLowerCase() === "x" ? " " : "x"}]`);
      return { text: lines.join("\n"), changed: true };
    }
  }
  return { text, changed: false };
}

function sanitize(host) {
  host.querySelectorAll("script, iframe, object, embed, link, style").forEach((n) => n.remove());
  for (const n of host.querySelectorAll("*")) {
    for (const a of [...n.attributes]) {
      if (a.name.toLowerCase().startsWith("on")) n.removeAttribute(a.name);
    }
  }
}

export function renderMarkdown(text, { onOpenLink, onToggleTask } = {}) {
  const host = el("div", "preview");
  host.innerHTML = marked.parse(text || "", { gfm: true, breaks: true });
  sanitize(host);

  addHighlights(host);
  addTags(host);
  addWikilinks(host, onOpenLink);
  addTasks(host, onToggleTask);
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

function addTasks(host, onToggleTask) {
  if (!onToggleTask) return;
  let idx = -1;
  for (const box of host.querySelectorAll('li > input[type="checkbox"]')) {
    idx += 1;
    const i = idx;
    box.disabled = false;
    box.addEventListener("click", (e) => {
      e.preventDefault();
      onToggleTask(i);
    });
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
  span.innerHTML = html;
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
  d.innerHTML = s;
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
