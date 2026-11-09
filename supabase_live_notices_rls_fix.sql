-- =====================================================================
-- Kacha Bazar - Live Notices RLS & Permission Update
-- Allows authenticated users (admins) to INSERT and UPDATE live_notices
-- and allows public/anon read access for all visitors.
-- =====================================================================

-- 1. Ensure table exists with standard schema
CREATE TABLE IF NOT EXISTS public.live_notices (
    id TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    badge_bn TEXT,
    badge_en TEXT,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    message_bn TEXT NOT NULL,
    message_en TEXT,
    theme TEXT DEFAULT 'rose',
    show_dot_pulse BOOLEAN DEFAULT true,
    order_disabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE IF EXISTS public.live_notices ENABLE ROW LEVEL SECURITY;

-- 3. Grant table permissions to anon, authenticated, and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_notices TO anon, authenticated, service_role;

-- 4. Clean up legacy or conflicting policies
DROP POLICY IF EXISTS "live_notices_public_select" ON public.live_notices;
DROP POLICY IF EXISTS "notices_public_read" ON public.live_notices;
DROP POLICY IF EXISTS "notices_sync_write" ON public.live_notices;
DROP POLICY IF EXISTS "notices_sync_update" ON public.live_notices;
DROP POLICY IF EXISTS "live_notices_auth_insert" ON public.live_notices;
DROP POLICY IF EXISTS "live_notices_auth_update" ON public.live_notices;
DROP POLICY IF EXISTS "live_notices_auth_upsert" ON public.live_notices;
DROP POLICY IF EXISTS "live_notices_service_role_all" ON public.live_notices;

-- 5. Create permissive policies for Public Read and Authenticated / Service Role Upsert
CREATE POLICY "live_notices_public_select" ON public.live_notices
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

CREATE POLICY "live_notices_auth_insert" ON public.live_notices
    FOR INSERT TO authenticated, service_role
    WITH CHECK (true);

CREATE POLICY "live_notices_auth_update" ON public.live_notices
    FOR UPDATE TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "live_notices_service_role_all" ON public.live_notices
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
