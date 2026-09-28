export function saveNote(id, title, content) {
  return supabase.from("notes").update({ title, content }).eq("id", id);
}

export function findDaily(date) {
  return supabase
    .from("notes")
    .select("*")
    .eq("is_daily", true)
    .eq("title", date)
    .limit(1);
}

export function createDaily(date) {
  return supabase
    .from("notes")
    .insert({ title: date, is_daily: true })
    .select()
    .single();
}

export function setTags(id, tags) {
  return supabase.from("notes").update({ tags }).eq("id", id);
}
