import { supabase } from "./client.js";

export function listFolders() {
  return supabase.from("folders").select("*").order("name");
}

export function createFolder(name, parent_folder_id = null) {
  return supabase.from("folders").insert({ name, parent_folder_id }).select().single();
}

export function renameFolder(id, name) {
  return supabase.from("folders").update({ name }).eq("id", id);
}

export function deleteFolder(id) {
  return supabase.from("folders").delete().eq("id", id);
}

// null folder_id means move to root
export function moveNote(id, folder_id) {
  return supabase.from("notes").update({ folder_id }).eq("id", id);
}
