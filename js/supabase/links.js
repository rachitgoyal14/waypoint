import { supabase } from "./client.js";

export function listLinks() {
  return supabase.from("note_links").select("*");
}

export function backlinks(note_id) {
  return supabase.from("note_links").select("source_note_id").eq("target_note_id", note_id);
}

export function replaceLinks(source_note_id, target_ids) {
  const rows = target_ids.map((target_note_id) => ({ source_note_id, target_note_id }));
  return supabase.from("note_links").delete().eq("source_note_id", source_note_id)
    .then(() => supabase.from("note_links").insert(rows));
}
