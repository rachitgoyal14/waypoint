import { supabase, ownerId } from "./client.js";

export function listNotes() {
  return supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function createNote(title, folder_id = null) {
  const owner = await ownerId();
  if (owner.error) return { data: null, error: owner.error };
  return supabase
    .from("notes")
    .insert({ title, folder_id, user_id: owner.id })
    .select()
    .single();
}

export function deleteNote(id) {
  return supabase.from("notes").delete().eq("id", id);
}

export function saveNote(id, title, content) {
  return supabase.from("notes").update({ title, content }).eq("id", id);
}

export function getNoteByTitle(title) {
  return supabase
    .from("notes")
    .select("*")
    .eq("title", title)
    .limit(1);
}

export function findDaily(date) {
  return supabase
    .from("notes")
    .select("*")
    .eq("is_daily", true)
    .eq("title", date)
    .limit(1);
}

export async function createDaily(date) {
  const owner = await ownerId();
  if (owner.error) return { data: null, error: owner.error };
  return supabase
    .from("notes")
    .insert({ title: date, is_daily: true, user_id: owner.id })
    .select()
    .single();
}

export function setTags(id, tags) {
  return supabase.from("notes").update({ tags }).eq("id", id);
}
