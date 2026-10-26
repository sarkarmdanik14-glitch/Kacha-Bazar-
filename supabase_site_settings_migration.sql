-- ============================================================================
-- KACHA BAZAR ONLINE (কাঁচা বাজার) - Supabase Schema Migration
-- Table: public.site_settings
-- Run this script in your Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Create site_settings table for Global Settings, Welcome Audio, Delivery Zones, and Leadership
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for read and write
DROP POLICY IF EXISTS "Public Read Site Settings" ON public.site_settings;
CREATE POLICY "Public Read Site Settings" 
ON public.site_settings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Public Upsert Site Settings" ON public.site_settings;
CREATE POLICY "Public Upsert Site Settings" 
ON public.site_settings FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Seed initial default settings if empty
INSERT INTO public.site_settings (key, settings, updated_at)
VALUES (
    'global_settings',
    '{
        "storeName": "কাঁচা বাজার",
        "supportPhone": "01734047881",
        "hotline": "01734047881",
        "whatsapp": "01734047881",
        "freeDeliveryThreshold": 500,
        "enableCOD": true,
        "enableBkash": true,
        "enableNagad": true,
        "enableRocket": false,
        "enableWelcomeVoice": false,
        "welcomeAudioUrl": ""
    }'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to anon and authenticated roles
GRANT ALL ON public.site_settings TO anon, authenticated;
