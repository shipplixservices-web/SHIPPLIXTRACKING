import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bmloeehiafypotiduton.supabase.co/rest/v1/";

const SUPABASE_PUBLIC_KEY = "sb_publishable_rW-id_IsQU1PdjMyEJ7cog_LNhvlW44";

// Sanitize the URL to get the base Supabase domain (removing /rest/v1/)
// This ensures auth requests go to /auth/v1/ instead of /rest/v1/auth/v1/
const BASE_SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(BASE_SUPABASE_URL, SUPABASE_PUBLIC_KEY);
