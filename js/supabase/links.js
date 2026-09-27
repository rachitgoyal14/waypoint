import { supabase } from "./client.js";

export function listLinks() {
  return supabase.from("note_links").select("*");
}

export function backlinks(note_id) {
  return supabase
    .from("note_links")
    .select("source_note_id, notes!note_links_source_note_id_fkey(id, title)")
    .eq("target_note_id", note_id);
}

export function replaceLinks(source_note_id, target_ids) {
  const del = supabase.from("note_links").delete().eq("source_note_id", source_note_id);
  if (!target_ids.length) return del;
  const rows = target_ids.map((target_note_id) => ({ source_note_id, target_note_id }));
  return del.then(() => supabase.from("note_links").insert(rows));
}
