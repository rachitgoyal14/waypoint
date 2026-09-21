import { supabase } from "./client.js";

export function listNotes() {
  return supabase.from("notes").select("*").order("updated_at", { ascending: false });
}

export function getNote(id) {
  return supabase.from("notes").select("*").eq("id", id).single();
}

export function createNote(title, folder_id = null) {
  return supabase.from("notes").insert({ title, folder_id }).select().single();
}

export function saveNote(id, title, content) {
  return supabase.from("notes").update({ title, content }).eq("id", id);
}

export function deleteNote(id) {
  return supabase.from("notes").delete().eq("id", id);
}
