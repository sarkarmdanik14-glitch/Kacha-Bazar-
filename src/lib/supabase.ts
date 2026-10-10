import { createClient } from "@supabase/supabase-js";

// Default configuration provided for KachaBazar Supabase migration
const DEFAULT_SUPABASE_URL = "https://syqiyurjeuibpprfrmwa.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_Qn84fITCN65xtGt1dRdrHg_d6zq4G0i";

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper check to verify connection to Supabase
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from("products").select("id").limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Connected successfully to Supabase!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Unknown error connecting to Supabase" };
  }
}
