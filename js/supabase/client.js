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
