import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const url = localStorage.getItem("sb_url") || "https://zzyldohdatllqpdhxfmn.supabase.co";
const key = localStorage.getItem("sb_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6eWxkb2hkYXRsbHFwZGh4Zm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODk1NzEsImV4cCI6MjEwNTU2NTU3MX0.S5hHTIbVi2wNmP6KY51idHYTHKGl_k2tv4EB9fJJHHQ";

export const supabase = createClient(url, key);
export const isConfigured = () => url.startsWith("https://");
