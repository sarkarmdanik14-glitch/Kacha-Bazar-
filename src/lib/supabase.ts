import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read environment variables safely
export const SUPABASE_URL: string = (((import.meta as any).env?.VITE_SUPABASE_URL as string) || "").trim();
export const SUPABASE_ANON_KEY: string = (((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || "").trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes("unconfigured") && 
  SUPABASE_URL.startsWith("http")
);

if (!isSupabaseConfigured) {
  console.info("[Supabase] Running in local offline mode (no VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY configured).");
}

function createMockQueryBuilder() {
  let isSingle = false;

  const builder: any = {
    then(onfulfilled?: (value: any) => any, onrejected?: (value: any) => any) {
      const result = isSingle
        ? { data: null, error: null }
        : { data: [], error: null, count: 0 };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
    catch(onrejected?: (reason: any) => any) {
      return Promise.resolve({ data: [], error: null, count: 0 }).catch(onrejected);
    },
  };

  const chainMethods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
    "contains", "containedBy", "range", "match", "not", "filter", "or",
    "order", "limit", "offset", "textSearch"
  ];

  for (const method of chainMethods) {
    builder[method] = () => builder;
  }

  builder.single = () => {
    isSingle = true;
    return builder;
  };

  builder.maybeSingle = () => {
    isSingle = true;
    return builder;
  };

  return builder;
}

function createMockChannel(name: string) {
  const channel: any = {
    name,
    on: () => channel,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
      return channel;
    },
    unsubscribe: () => Promise.resolve(),
    send: () => Promise.resolve(),
    track: () => Promise.resolve(),
    untrack: () => Promise.resolve(),
  };
  return channel;
}

function createMockSupabaseClient(): SupabaseClient {
  const mockClient: any = {
    from: (_table: string) => createMockQueryBuilder(),
    channel: (name: string) => createMockChannel(name),
    removeChannel: async (_ch: any) => "ok",
    removeAllChannels: async () => [],
    getChannels: () => [],
    rpc: async () => ({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: async () => ({ data: [], error: null }),
        list: async () => ({ data: [], error: null }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: (_cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase credentials are not configured in environment." },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase credentials are not configured in environment." },
      }),
      signInWithOAuth: async () => ({
        data: { url: null, provider: "google" },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
    },
  };
  return mockClient as unknown as SupabaseClient;
}

// Client-side instance initialized with real client when configured, or resilient mock client when offline
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createMockSupabaseClient();

// Helper check to verify connection to Supabase
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    return { 
      success: false, 
      message: "Supabase is not configured (offline demo mode active)." 
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
