-- ============================================================================
-- KACHA BAZAR ONLINE (কাঁচা বাজার) - Supabase Banners Table Permission Fix
-- Run this script in your Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Ensure banners table exists with all standard columns
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title_bn TEXT,
    title_en TEXT,
    subtitle_bn TEXT,
    subtitle_en TEXT,
    tag_bn TEXT,
    tag_en TEXT,
    discount_bn TEXT,
    discount_en TEXT,
    bg_gradient TEXT DEFAULT 'from-emerald-800 via-teal-900 to-slate-900',
    image TEXT,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;

-- 3. Drop old restrictive policies
DROP POLICY IF EXISTS "banners_public_all" ON public.banners;
DROP POLICY IF EXISTS "banners_public_select" ON public.banners;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "banners_service_role_all" ON public.banners;

-- 4. Create permissive policy for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "banners_public_all" ON public.banners
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Grant permissions to anon, authenticated, and service_role
GRANT ALL ON TABLE public.banners TO anon, authenticated, service_role;
