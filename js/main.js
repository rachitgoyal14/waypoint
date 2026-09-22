import { supabase, isConfigured } from "./supabase/client.js";
import { session, onAuthChange } from "./supabase/auth.js";
import { qs } from "./utils/dom.js";

const authBox = qs("#auth");
const app = qs("#app");

async function show() {
  if (!isConfigured()) {
    authBox.textContent = "Set YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY in js/supabase/client.js";
    return;
  }
  const s = await session();
  authBox.style.display = s ? "none" : "block";
  app.style.display = s ? "grid" : "none";
  if (!s) authBox.textContent = "Sign in ships in phase 3.";
}

onAuthChange(() => show());
show();
