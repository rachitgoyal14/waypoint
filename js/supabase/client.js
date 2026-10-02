import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Keys resolve in three steps:
//
//   1. localStorage overrides ("sb_url" / "sb_key") — handy for pointing a
//      running app at a different project without touching any files,
//   2. js/supabase/config.js, which sets window.WAYPOINT_CONFIG at page
//      load (copy config.example.js to create it),
//   3. nothing, in which case a placeholder client is created. It never
//    reaches the network; the login screen just says the app isn't set up.
//
// The placeholder matters because auth.js wires onAuthStateChange at
// startup, before any configuration check — a null client would crash
// there, and every module imports this one.

const overrideUrl = localStorage.getItem("sb_url");
const overrideKey = localStorage.getItem("sb_key");
const config = window.WAYPOINT_CONFIG || {};

const url = overrideUrl || config.url || "";
const key = overrideKey || config.key || "";

export const supabase = createClient(
  url || "https://not-configured.invalid",
  key || "not-configured",
);

export const isConfigured = () => Boolean(url.startsWith("https://") && key.length > 20);

export function getConfigSource() {
  if (overrideUrl || overrideKey) return "localStorage overrides (sb_url / sb_key)";
  if (config.url || config.key) return "js/supabase/config.js";
  return "none";
}

// Every row in notes/folders carries its owner's id, and RLS requires
// WITH CHECK (auth.uid() = user_id). Insert helpers must stamp user_id
// explicitly — a missing id fails as an RLS violation, not a NULL error.
export async function ownerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { id: null, error };
  if (!data?.user) return { id: null, error: new Error("Not signed in.") };
  return { id: data.user.id, error: null };
}

/** Lightweight reachability probe — distinguishes "wrong keys" from "no network". */
export async function pingSupabase(timeoutMs = 8000) {
  if (!isConfigured()) return { ok: false, reason: "not-configured" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      signal: ctrl.signal,
      headers: { apikey: key },
    });
    // Any HTTP response (even 401) proves DNS + network + project exist.
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timeout" : "network", error: e };
  } finally {
    clearTimeout(t);
  }
}
