import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://yonxxqueozcfyzdkgppf.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_MRwmrXfQNMzk5Qp_7afO3w_dBMcrtxG";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
