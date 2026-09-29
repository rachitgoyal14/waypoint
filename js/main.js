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
import { renderBacklinks } from "./sidebar/backlinks.js";
import { initEditor } from "./editor/editor.js";
import { backlinks } from "./supabase/links.js";
import { openOrCreateToday, todayTitle } from "./daily/dailyNote.js";
import { importFiles } from "./import/markdownImport.js";
import { listLinks } from "./supabase/links.js";
import { runSimulation, buildGraph } from "./graph/simulation.js";
import { drawGraph } from "./graph/render.js";
import { initGraphOverlay } from "./graph/expand.js";
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

function form() {
  const input = el("input");
  input.type = "email";
  input.placeholder = "you@mail.com";
  const btn = el("button", "", "Send magic link");
  const msg = el("p", "muted");
  btn.onclick = async () => {
    const { error } = await signIn(input.value.trim());
    msg.textContent = error ? error.message : "Check your email for the link.";
  };
  authBox.replaceChildren(el("h1", "", "waypoint"), input, btn, msg);
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
  bar.replaceChildren(el("span", "muted", user.email), btn);
}

async function show(user) {
  if (!isConfigured()) {
    authBox.textContent = "Set keys in js/supabase/client.js";
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
  initEditorOnce();
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

function initGraphButton() {
  const expand = el("button", "", "Expand");
  expand.id = "graph-expand";
  expand.onclick = overlay.open;
  qs("#panel").prepend(expand);
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
}

async function addFolder(parentId = null) {
  const name = prompt("Folder name");
  if (!name) return;
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
  const name = prompt("New name", folder ? folder.name : "");
  if (!name) return;
  const { error } = await renameFolder(id, name.trim());
  if (error) {
    fail(error.message);
    return;
  }
  folders = folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f));
  draw();
}

async function removeFolder(id) {
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
}

function setQuery(q) {
  query = q;
  draw();
}

onAuthChange((s) => show(s));
show();
