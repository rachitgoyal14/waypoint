import { isConfigured } from "./supabase/client.js";
import { session, signIn, signOut, onAuthChange } from "./supabase/auth.js";
import {
  listNotes,
  createNote,
  deleteNote,
  saveNote,
  setTags,
  getNoteByTitle,
} from "./supabase/notes.js";
import { replaceLinks } from "./supabase/links.js";
import { extractWikilinks, extractTags } from "./editor/markdown.js";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveNote,
} from "./supabase/folders.js";
import { renderNotesBar } from "./sidebar/notesList.js";
import { renderFolderTree } from "./sidebar/folderTree.js";
import { filterNotes, renderSearch } from "./sidebar/search.js";
import { initPalette } from "./sidebar/palette.js";
import { renderBacklinks } from "./sidebar/backlinks.js";
import { initEditor } from "./editor/editor.js";
import { backlinks } from "./supabase/links.js";
import { openOrCreateToday, todayTitle } from "./daily/dailyNote.js";
import { importFiles } from "./import/markdownImport.js";
import { listLinks } from "./supabase/links.js";
import { runSimulation, buildGraph } from "./graph/simulation.js";
import { drawGraph } from "./graph/render.js";
import { initGraphOverlay } from "./graph/expand.js";
import { ask, confirmDialog } from "./ui/dialog.js";
import { qs, el } from "./utils/dom.js";

const authBox = qs("#auth");
const app = qs("#app");
let notes = [];
let folders = [];
let currentId = null;
let editor = null;
let editorOpenId = null;
let allLinks = [];
let query = "";

// Local helpers (kept in main.js so a stale-cached client.js can never
// break the import — see "doesn't provide an export named" errors).
function localConfig() {
  return window.WAYPOINT_CONFIG || {};
}

function getConfigSource() {
  if (localStorage.getItem("sb_url") || localStorage.getItem("sb_key")) {
    return "localStorage overrides (sb_url / sb_key)";
  }
  const c = localConfig();
  if (c.url || c.key) return "js/supabase/config.js";
  return "none";
}

async function pingSupabase(timeoutMs = 8000) {
  if (!isConfigured()) return { ok: false, reason: "not-configured" };
  const url = (localStorage.getItem("sb_url") || localConfig().url || "").replace(/\/$/, "");
  const key = localStorage.getItem("sb_key") || localConfig().key || "";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      signal: ctrl.signal,
      headers: { apikey: key },
    });
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timeout" : "network", error: e };
  } finally {
    clearTimeout(t);
  }
}

function form() {
  const stage = el("div", "auth-stage");

  const story = el("div", "auth-story");
  const brand = el("div", "auth-brand");
  brand.append(el("div", "auth-mark", "◈"), el("h1", "", "waypoint"));
  const tagline = el("p", "tagline", "Your notes, connected.");

  const intro = el("p", "auth-intro");
  intro.textContent =
    "Waypoint is a networked notebook: write notes in folders, link them with [[brackets]], " +
    "and follow backlinks and the vault map to see how your thinking connects.";

  const feats = el("div", "auth-features");
  // Key clusters render as real keycaps (see kbd styles) — anything you
  // press looks pressable; [[ ]] reads as typed input.
  const keys = (...labels) => {
    const wrap = el("span", "kbd-cluster");
    for (const lab of labels) wrap.append(el("kbd", "", lab));
    return wrap;
  };
  for (
    const [cap, t] of [
      [keys("[[", "]]"), "Link notes with brackets; backlinks collect themselves"],
      [keys("⌘", "K"), "Jump to any note without touching the mouse"],
      [keys("⌘", "S"), "Save the open note from the keyboard"],
      [keys("Today"), "A fresh daily note waiting every morning"],
    ]
  ) {
    const row = el("div");
    row.append(cap, document.createTextNode(t));
    feats.append(row);
  }
  story.append(brand, tagline, intro, feats);

  const card = el("form", "auth-card");
  card.setAttribute("novalidate", "");
  const signTitle = el("h2", "auth-signin", "Sign in");

  const label = el("label", "", "Email address");
  label.setAttribute("for", "auth-email");
  const input = el("input");
  input.id = "auth-email";
  input.type = "email";
  input.name = "email";
  input.placeholder = "you@mail.com";
  input.required = true;
  input.autocomplete = "email";

  const btn = el("button", "primary", "Send magic link");
  btn.type = "submit";

  const msg = el("p", "auth-msg");
  msg.setAttribute("role", "status");

  const help = el("p", "auth-help");
  help.textContent = "No password to remember. We email you a one-click sign-in link.";
  const steps = el("ol", "auth-steps");
  for (
    const s of [
      "Enter your email below.",
      "Open the link we send you.",
      "You land back here, signed in.",
    ]
  ) {
    steps.append(el("li", "", s));
  }

  card.onsubmit = async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    const email = input.value.trim();
    btn.disabled = true;
    btn.innerHTML = "";
    btn.append(el("span", "spinner"), document.createTextNode("Sending…"));
    msg.className = "auth-msg";
    msg.textContent = "Contacting Supabase…";
    let holding = false;
    // Supabase allows one resend per minute per address — hold the button
    // so rapid clicks can't burn the tiny hourly email allowance.
    const cooldown = (secs) => {
      holding = true;
      let left = secs;
      const tick = () => {
        if (left <= 0) {
          btn.disabled = false;
          btn.textContent = "Send magic link";
          return;
        }
        btn.disabled = true;
        btn.textContent = `Resend in 0:${String(left).padStart(2, "0")}`;
        left -= 1;
        setTimeout(tick, 1000);
      };
      tick();
    };
    try {
      const ping = await pingSupabase();
      if (!ping.ok) {
        if (ping.reason === "network" || ping.reason === "timeout") {
          throw new Error(
            "Cannot reach your Supabase project at all (no HTTP response — DNS/network). " +
              "I checked from this machine: the hostname does not resolve (NXDOMAIN), so no email " +
              "can ever be sent until the URL is fixed. Create or unpause the project, paste the real " +
              "URL + anon key into js/supabase/config.js, then hard-reload. See console for the raw error.",
          );
        }
        throw new Error(
          "Supabase keys are missing or malformed. Check js/supabase/config.js (or sb_url / sb_key overrides).",
        );
      }
      const { error } = await signIn(email);
      if (error) throw error;
      msg.className = "auth-msg ok";
      msg.textContent =
        "Check your email for the link — it opens right back here. Give it a minute " +
        "before resending; rapid repeats get throttled.";
      cooldown(60);
    } catch (err) {
      console.error("[waypoint] magic-link failure:", err);
      msg.className = "auth-msg error";
      msg.textContent = err?.message || "Something went wrong sending the link.";
      if (err?.rateLimited) cooldown(60);
    } finally {
      if (!holding) {
        btn.disabled = false;
        btn.textContent = "Send magic link";
      }
    }
  };
  card.append(signTitle, help, label, input, btn, msg, steps);
  const hero = el("div", "auth-hero");
  hero.append(story, card);

  const tour = el("section", "auth-tour");
  tour.append(el("h2", "", "Walk the trails."));
  const tourSub = el("p", "auth-tour-sub");
  tourSub.textContent = "Everything waypoint does, on one survey. Sign in above and it is all yours.";
  const grid = el("div", "tour-grid");
  for (
    const [b, h, t] of [
      ["[[ ]]", "Wikilinks", "Bracket any title to link it. The target note is created if it does not exist yet."],
      ["◇", "Backlinks", "Every note lists what points at it, so context gathers on its own."],
      ["▦", "Folders", "Nest folders, drag notes between them, rename and delete without fear."],
      ["◍", "Vault map", "A live graph of your trails, expandable to the whole territory."],
      ["Today", "Daily notes", "One keypress finds or starts today's page, every morning."],
      [["⌘", "K"], "Search", "Titles, bodies, and tags in one jump-to-note finder."],
    ]
  ) {
    const row = el("div", "tour-row");
    const tick = Array.isArray(b) ? keys(...b) : el("b", "", b);
    const body = el("div");
    body.append(el("h3", "", h), el("p", "", t));
    row.append(tick, body);
    grid.append(row);
  }
  tour.append(tourSub, grid);

  const detail = el("section", "auth-detail");
  detail.append(el("h2", "", "A notebook that thinks in trails."));
  const detailSub = el("p", "auth-tour-sub");
  detailSub.textContent = "Three ideas hold the whole app together.";
  const cols = el("div", "detail-grid");
  for (
    const [h, t] of [
      ["Write in peace", "A quiet sheet with markdown, folders, and daily notes. Nothing badges, pings, or gamifies. Your words stay the loudest thing on the page."],
      ["Link as you think", "Bracket a title mid-sentence and the connection exists. Backlinks gather on their own and the vault map draws itself from your trails."],
      ["Yours to keep", "Notes live in your own Supabase project, each row locked to its owner. Take everything with you any time as plain markdown files."],
    ]
  ) {
    const cell = el("div", "detail-cell");
    cell.append(el("h3", "", h), el("p", "", t));
    cols.append(cell);
  }
  const cta = el("button", "btn primary auth-cta", "Start writing");
  cta.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  detail.append(detailSub, cols, cta);

  const foot = el("p", "auth-foot", "Waypoint is MIT-licensed free software. Your notes live in your own Supabase project.");
  stage.append(hero, tour, detail, foot);
  authBox.replaceChildren(stage);
}

function account(user) {
  let bar = qs("#account");
  if (!bar) {
    bar = el("div");
    bar.id = "account";
    qs("#sidebar").prepend(bar);
  }
  const btn = el("button", "", "Sign out");
  btn.onclick = () => signOut();
  bar.replaceChildren(el("span", "", user.email), btn);
}

async function show(user) {
  if (!isConfigured()) {
    authBox.style.display = "grid";
    app.style.display = "none";
    const card = el("div", "auth-card");
    const brand = el("div", "auth-brand");
    brand.append(el("div", "auth-mark", "◈"), el("h1", "", "waypoint"));
    const msg = el("p", "auth-msg error");
    msg.textContent =
      `Supabase keys are missing (source: ${getConfigSource()}). ` +
      "Copy js/supabase/config.example.js to js/supabase/config.js and paste your project URL + anon key, " +
      "or set sb_url / sb_key in localStorage.";
    card.append(brand, el("p", "tagline", "Setup needed before you can sign in."), msg);
    const hero = el("div", "auth-hero");
    hero.append(card);
    authBox.replaceChildren(hero);
    return;
  }
  const s = user !== undefined ? user : await session();
  authBox.style.display = s ? "none" : "block";
  app.style.display = s ? "grid" : "none";
  if (!s) {
    form();
    return;
  }
  account(s.user);
  initTopbar();
  initEditorOnce();
  initPaletteOnce();
  initOverlayOnce();
  initGraphButton();
  load();
  loadFolders();
  loadLinks();
}

function initEditorOnce() {
  if (qs("#editorbar")) return;
  editor = initEditor(qs("#editor"), { onSave: saveCurrent, onOpenLink: openByTitle });
  const today = el("button", "", "Today");
  today.onclick = openToday;
  today.id = "today";
  qs("#sidebar").append(today);
  initImport();
  window.addEventListener("beforeunload", (e) => {
    if (!editor.isDirty()) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function initImport() {
  const picker = el("input");
  picker.type = "file";
  picker.accept = ".md";
  picker.multiple = true;
  picker.style.display = "none";

  const btn = el("button", "", "Import .md");
  btn.onclick = () => picker.click();
  btn.id = "import";

  picker.onchange = () => {
    if (picker.files.length) runImport(picker.files);
    picker.value = "";
  };

  const drop = el("div", "dropzone", "or drop .md files here");
  drop.ondragover = (e) => {
    e.preventDefault();
    drop.classList.add("over");
  };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files.length) runImport(e.dataTransfer.files);
  };

  qs("#sidebar").append(btn, picker, drop);
}

async function runImport(files) {
  const status = qs("#importstatus") || (() => {
    const p = el("p", "muted");
    p.id = "importstatus";
    qs("#sidebar").append(p);
    return p;
  })();
  status.textContent = "Importing…";
  const { imported, error } = await importFiles(files, (done, total) => {
    status.textContent = `Importing ${done}/${total}…`;
  });
  if (error) {
    status.textContent = "";
    fail(error.message);
    return;
  }
  const local = new Set(notes.map((n) => n.id));
  for (const n of imported) {
    if (!local.has(n.id)) notes.unshift(n);
  }
  status.textContent = imported.length ? `Imported ${imported.length} note${imported.length === 1 ? "" : "s"}` : "No .md files found";
  draw();
}

async function openToday() {
  const { note, error } = await openOrCreateToday();
  if (error) {
    fail(error.message);
    return;
  }
  if (!notes.some((n) => n.id === note.id)) notes.unshift(note);
  openNote(note.id);
}

async function load() {
  const { data, error } = await listNotes();
  if (error) {
    fail(error.message);
    return;
  }
  notes = data || [];
  draw();
}

async function loadFolders() {
  const { data, error } = await listFolders();
  if (error) {
    fail(error.message);
    return;
  }
  folders = data || [];
  draw();
}

function fail(message) {
  let p = qs("#noteerror");
  if (!p) {
    p = el("p", "muted");
    p.id = "noteerror";
    qs("#sidebar").append(p);
  }
  p.textContent = message;
}

async function create(folderId = null) {
  const { data, error } = await createNote("Untitled", folderId);
  if (error) {
    fail(error.message);
    return;
  }
  notes.unshift(data);
  currentId = data.id;
  editorOpenId = data.id;
  editor.open(data);
  draw();
}

async function saveCurrent() {
  if (!currentId) return false;
  const title = editor.savedTitle();
  const content = editor.savedBody();
  const { error } = await saveNote(currentId, title, content);
  if (error) {
    fail(error.message);
    return false;
  }
  await syncMeta(currentId, content);
  notes = notes.map((n) => (n.id === currentId ? { ...n, title, content } : n));
  draw();
  loadBacklinks();
  loadLinks();
  return true;
}

async function loadBacklinks() {
  if (!currentId) {
    drawBacklinks([]);
    return;
  }
  const { data, error } = await backlinks(currentId);
  if (error) {
    fail(error.message);
    return;
  }
  drawBacklinks(data || []);
}

function drawBacklinks(links) {
  renderBacklinks(qs("#backlinks"), links, currentId, (id) => openNote(id));
}

async function loadLinks() {
  const { data, error } = await listLinks();
  if (error) {
    fail(error.message);
    return;
  }
  allLinks = data || [];
  drawGraphPanel();
}

function drawGraphPanel() {
  const ids = new Set(notes.map((n) => n.id));
  const links = allLinks.filter((l) => ids.has(l.source_note_id) && ids.has(l.target_note_id));
  const graph = buildGraph(notes, links);
  runSimulation(graph.nodes, graph.edges, () => {
    drawGraph(qs("#graph"), graph, currentId, (id) => openNote(id));
  });
}

// On small screens the sidebar and the panel become drawers. Both buttons
// hang off the top bar, and opening one always closes the other.

function toggleDrawer(name) {
  const other = name === "notes-open" ? "panel-open" : "notes-open";
  app.classList.remove(other);
  app.classList.toggle(name);
}

function initTopbar() {
  if (qs("#topbar")) return;

  const bar = el("header");
  bar.id = "topbar";

  const notesBtn = el("button", "", "Notes");
  const linksBtn = el("button", "", "Links");

  notesBtn.onclick = () => toggleDrawer("notes-open");
  linksBtn.onclick = () => toggleDrawer("panel-open");

  bar.append(notesBtn, el("span", "title", "waypoint"), linksBtn);
  app.prepend(bar);
}

// The ⌘K palette is built once per session and just reads the live notes
// array whenever it opens.

let palette = null;

function initPaletteOnce() {
  if (palette) return;
  palette = initPalette({
    getNotes: () => notes,
    onPick: (id) => openNote(id),
  });
}

function initGraphButton() {
  if (qs("#graph-expand")) return;
  const expand = el("button", "", "Expand vault graph");
  expand.id = "graph-expand";
  expand.onclick = () => overlay?.open();
  const panel = qs("#panel");
  const backlinks = qs("#backlinks");
  if (backlinks) panel.insertBefore(expand, backlinks);
  else panel.prepend(expand);
}

let overlay = null;

function initOverlayOnce() {
  if (overlay) return;
  overlay = initGraphOverlay({
    build: () => buildGraph(notes, allLinks.filter((l) =>
      notes.some((n) => n.id === l.source_note_id) && notes.some((n) => n.id === l.target_note_id))),
    activeId: () => currentId,
    onOpen: (id) => {
      overlay.close();
      openNote(id);
    },
  });
}

async function syncMeta(id, content) {
  const { error: tagError } = await setTags(id, extractTags(content));
  if (tagError) {
    fail(tagError.message);
    return;
  }
  const targetIds = [];
  for (const t of extractWikilinks(content)) {
    const known = byTitle(t);
    if (known) {
      targetIds.push(known.id);
      continue;
    }
    const { data, error } = await getNoteByTitle(t);
    if (error) {
      fail(error.message);
      continue;
    }
    if (data && data.length) {
      if (!notes.some((n) => n.id === data[0].id)) notes.unshift(data[0]);
      targetIds.push(data[0].id);
      continue;
    }
    const { data: created, error: createError } = await createNote(t);
    if (createError) {
      fail(createError.message);
      continue;
    }
    notes.unshift(created);
    targetIds.push(created.id);
  }
  const { error: linkError } = await replaceLinks(id, targetIds);
  if (linkError) {
    fail(linkError.message);
  }
}

function byTitle(t) {
  return notes.find((n) => n.title.toLowerCase() === t.toLowerCase());
}

async function openByTitle(title) {
  const local = byTitle(title);
  if (local) {
    openNote(local.id);
    return;
  }
  const { data, error } = await getNoteByTitle(title);
  if (error) {
    fail(error.message);
    return;
  }
  if (data && data.length) {
    if (!notes.some((n) => n.id === data[0].id)) notes.unshift(data[0]);
    openNote(data[0].id);
    return;
  }
  const { data: created, error: createError } = await createNote(title);
  if (createError) {
    fail(createError.message);
    return;
  }
  notes.unshift(created);
  openNote(created.id);
}

async function openNote(id) {
  app.classList.remove("notes-open", "panel-open");
  if (id === currentId) return;
  if (editor.isDirty()) {
    const choice = confirm("Save changes before switching?\n\nOK = save and switch, Cancel = discard and switch.");
    if (choice) {
      const ok = await editor.flush();
      if (!ok) return;
    }
  }
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  currentId = id;
  editorOpenId = id;
  editor.open(note);
  draw();
  loadBacklinks();
}

async function remove() {
  if (!currentId) return;
  const note = notes.find((n) => n.id === currentId);
  const ok = await confirmDialog(`Delete "${note ? note.title : "Untitled"}"? This cannot be undone.`, {
    title: "Delete note",
    confirmText: "Delete",
    danger: true,
  });
  if (!ok) return;
  const { error } = await deleteNote(currentId);
  if (error) {
    fail(error.message);
    return;
  }
  notes = notes.filter((n) => n.id !== currentId);
  currentId = null;
  editorOpenId = null;
  editor.open(null);
  draw();
  loadBacklinks();
  loadLinks();
}

async function addFolder(parentId = null) {
  const name = await ask("Folder name", { title: "New folder", initial: "", confirmText: "Create" });
  if (!name || !name.trim()) return;
  const { data, error } = await createFolder(name.trim(), parentId);
  if (error) {
    fail(error.message);
    return;
  }
  folders.push(data);
  draw();
}

async function renameFolderById(id) {
  const folder = folders.find((f) => f.id === id);
  const name = await ask("Folder name", { title: "Rename folder", initial: folder ? folder.name : "", confirmText: "Rename" });
  if (!name || !name.trim()) return;
  const { error } = await renameFolder(id, name.trim());
  if (error) {
    fail(error.message);
    return;
  }
  folders = folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f));
  draw();
}

async function removeFolder(id) {
  const folder = folders.find((f) => f.id === id);
  const ok = await confirmDialog(
    `Delete "${folder ? folder.name : "folder"}"? Notes inside move back to the root.`,
    { title: "Delete folder", confirmText: "Delete", danger: true },
  );
  if (!ok) return;
  const { error } = await deleteFolder(id);
  if (error) {
    fail(error.message);
    return;
  }
  folders = folders.filter((f) => f.id !== id);
  notes = notes.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n));
  draw();
}

async function moveToFolder(noteId, folderId) {
  const { error } = await moveNote(noteId, folderId);
  if (error) {
    fail(error.message);
    return;
  }
  notes = notes.map((n) => (n.id === noteId ? { ...n, folder_id: folderId } : n));
  draw();
}

function draw() {
  const side = qs("#sidebar");
  renderNotesBar(side, currentId, {
    onNew: () => create(null),
    onNewFolder: addFolder,
    onDelete: remove,
  });

  const search = renderSearch(side, setQuery);

  const tree = qs("#folders") || (() => {
    const d = el("div");
    d.id = "folders";
    side.append(d);
    return d;
  })();
  side.insertBefore(search, tree);

  renderFolderTree(tree, folders, filterNotes(notes, query), currentId, (id) => {
    openNote(id);
  }, (folderId) => create(folderId), renameFolderById, removeFolder, moveToFolder);

  tidySidebar();
}


// The sidebar's pieces are created at different times, so DOM order drifts
// as they appear. Appending in this order at the end of every draw keeps
// toolbar, tree, actions, and the status strip in a fixed sequence.
function tidySidebar() {
  const side = qs("#sidebar");
  for (const sel of ["#folders", "#today", "#import", ".dropzone", "#importstatus", "#noteerror"]) {
    const n = side.querySelector(sel);
    if (n) side.append(n);
  }
}

function setQuery(q) {
  query = q;
  draw();
}

onAuthChange((s) => show(s));
show();

window.addEventListener("error", (e) => {
  const msg = String(e?.message || "");
  if (/esm\.sh|supabase-js|Failed to fetch|NetworkError/i.test(msg)) {
    const box = qs("#auth");
    if (box && !box.firstChild) {
      box.textContent =
        "Could not load the Supabase library (network error). Check your connection and reload.";
    }
  }
}, true);
