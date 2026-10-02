import { supabase, ownerId } from "./client.js";

export function listFolders() {
  return supabase.from("folders").select("*").order("name");
}

export async function createFolder(name, parent_folder_id = null) {
  const owner = await ownerId();
  if (owner.error) return { data: null, error: owner.error };
  return supabase
    .from("folders")
    .insert({ name, parent_folder_id, user_id: owner.id })
    .select()
    .single();
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
