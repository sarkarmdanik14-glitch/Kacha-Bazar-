import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read exclusively from environment variables with NO hardcoded fallbacks
export const SUPABASE_URL: string = ((import.meta as any).env?.VITE_SUPABASE_URL || "").trim();
export const SUPABASE_ANON_KEY: string = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "").trim();

if (!SUPABASE_URL) {
  console.error("[Configuration Error] Missing VITE_SUPABASE_URL in environment.");
}
if (!SUPABASE_ANON_KEY) {
  console.error("[Configuration Error] Missing VITE_SUPABASE_ANON_KEY in environment.");
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Client-side instance initialized strictly with provided env variables
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || "https://unconfigured.supabase.co",
  SUPABASE_ANON_KEY || "unconfigured-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Helper check to verify connection to Supabase
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    return { 
      success: false, 
      message: "Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables." 
    };
  }
  try {
    const { error } = await supabase.from("products").select("id").limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Connected successfully to Supabase!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Unknown error connecting to Supabase" };
  }
}
