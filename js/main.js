import { isConfigured } from "./supabase/client.js";
import { session, signIn, signOut, onAuthChange } from "./supabase/auth.js";
import { listNotes } from "./supabase/notes.js";
import { renderNotesList } from "./sidebar/notesList.js";
import { qs, el } from "./utils/dom.js";

const authBox = qs("#auth");
const app = qs("#app");
let notes = [];
let currentId = null;

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
  load();
}

async function load() {
  const { data, error } = await listNotes();
  if (error) {
    qs("#sidebar").append(el("p", "muted", error.message));
    return;
  }
  notes = data || [];
  draw();
}

function draw() {
  renderNotesList(qs("#sidebar"), notes, currentId, (id) => {
    currentId = id;
    draw();
  });
}

onAuthChange((s) => show(s));
show();
