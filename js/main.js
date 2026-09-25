import { isConfigured } from "./supabase/client.js";
import { session, signIn, signOut, onAuthChange } from "./supabase/auth.js";
import { listNotes, createNote, deleteNote, saveNote } from "./supabase/notes.js";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveNote,
} from "./supabase/folders.js";
import { renderNotesBar } from "./sidebar/notesList.js";
import { renderFolderTree } from "./sidebar/folderTree.js";
import { initEditor } from "./editor/editor.js";
import { qs, el } from "./utils/dom.js";

const authBox = qs("#auth");
const app = qs("#app");
let notes = [];
let folders = [];
let currentId = null;
let editor = null;
let editorOpenId = null;

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
  load();
  loadFolders();
}

function initEditorOnce() {
  if (qs("#editorbar")) return;
  editor = initEditor(qs("#editor"), { onSave: saveCurrent });
  window.addEventListener("beforeunload", (e) => {
    if (!editor.isDirty()) return;
    e.preventDefault();
    e.returnValue = "";
  });
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
  notes = notes.map((n) => (n.id === currentId ? { ...n, title, content } : n));
  draw();
  return true;
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
  const tree = qs("#folders") || (() => {
    const d = el("div");
    d.id = "folders";
    side.append(d);
    return d;
  })();
  renderFolderTree(tree, folders, notes, currentId, (id) => {
    openNote(id);
  }, (folderId) => create(folderId), renameFolderById, removeFolder, moveToFolder);
}

onAuthChange((s) => show(s));
show();
