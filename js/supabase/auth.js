import { supabase } from "./client.js";

export function session() {
  return supabase.auth.getSession().then((r) => r.data.session);
}

export function signIn(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function onAuthChange(fn) {
  return supabase.auth.onAuthStateChange((_e, s) => fn(s));
}
