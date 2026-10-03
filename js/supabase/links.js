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
  // One row per target: repeated [[links]] (or case variants of one title)
  // resolve to the same note, and the (source, target) primary key rejects
  // the duplicate. Deduping here fixes every caller at once.
  const ids = [...new Set(target_ids)];
  if (!ids.length) return del;
  const rows = ids.map((target_note_id) => ({ source_note_id, target_note_id }));
  return del.then(() => supabase.from("note_links").insert(rows));
}
