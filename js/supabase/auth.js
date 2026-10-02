import { supabase } from "./client.js";

export function session() {
  return supabase.auth.getSession().then((r) => r.data.session);
}

function friendlyError(err) {
  const msg = String(err?.message || err || "");
  const code = String(err?.code || "");
  // Supabase throttles login mail: ~2 emails/hour per project on the
  // built-in provider, plus one resend per minute per address (HTTP 429).
  if (err?.status === 429 || /rate.?limit|too many|over_email_send/i.test(msg + " " + code)) {
    const err2 = new Error(
      "Email rate limit exceeded — Supabase throttled the login email. Its built-in " +
        "service allows about 2 login emails per hour per project, plus one resend per " +
        "minute per address, and every click counts. Wait an hour, then try exactly once. " +
        "For regular use, add a custom SMTP sender under Supabase → Authentication → Settings.",
    );
    err2.rateLimited = true;
    return err2;
  }
  // Built-in provider only delivers to project team addresses.
  if (/not authorized/i.test(msg)) {
    return new Error(
      "That email address is not authorized on this Supabase project — the built-in " +
        "email service only delivers to project team members. Sign in with a team " +
        "address, or add a custom SMTP sender under Supabase → Authentication → Settings.",
    );
  }
  // Fetch itself threw (offline, DNS NXDOMAIN, project paused/deleted, adblock, CORS).
  if (err instanceof TypeError || /network|fetch|failed/i.test(msg)) {
    return new Error(
      "Cannot reach Supabase — the project hostname does not resolve " +
        "(DNS NXDOMAIN for the configured URL). The project is paused, deleted, " +
        "or the URL in js/supabase/config.js is wrong. Create/check the project, " +
        "paste the real URL + anon key, and reload. Raw error: " +
        msg.slice(0, 160),
    );
  }
  return err;
}

export async function signIn(email) {
  const clean = String(email || "").trim();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { error: new Error("Enter a valid email address.") };
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      // Redirect back to the running app (works for localhost + deploys).
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) return { error: friendlyError(error) };
    return { error: null };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export function signOut() {
  return supabase.auth.signOut();
}

export function onAuthChange(fn) {
  return supabase.auth.onAuthStateChange((_e, s) => fn(s));
}
