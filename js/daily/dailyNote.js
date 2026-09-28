import { findDaily, createDaily } from "../supabase/notes.js";

export function todayTitle(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function openOrCreateToday() {
  const date = todayTitle();
  const { data, error } = await findDaily(date);
  if (error) {
    return { error };
  }
  if (data && data.length) {
    return { note: data[0] };
  }
  const { data: created, error: createError } = await createDaily(date);
  if (createError) {
    return { error: createError };
  }
  return { note: created, created: true };
}
