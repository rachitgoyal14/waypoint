import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const url = localStorage.getItem("sb_url") || "something_something";
const key = localStorage.getItem("sb_key") || "something_something";

export const supabase = createClient(url, key);
export const isConfigured = () => !url.startsWith("YOUR_");
