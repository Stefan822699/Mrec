// Paste your values from Supabase: Project Settings -> API
// The anon key is safe in frontend code. NEVER put the service_role key here.
const SUPABASE_URL = "https://ylvszgqrxdeppurgjvvx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JwQGKnG2kp4x2x7j8i4qxQ_gh0kUYS9";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
