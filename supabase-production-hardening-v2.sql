-- =====================================================================
-- KachaBazar - Production-Grade Security Hardening & Zero-Exposure Migration
-- Target: Supabase PostgreSQL (Production Environment)
-- Execution: Run manually via Supabase Dashboard -> SQL Editor
-- WARNING: DO NOT run automatically. Follow Pre-Migration Checklist first.
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =====================================================================
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partner_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 2: REVOKE INSECURE DEFAULT GRANTS (DEFENSE IN DEPTH)
-- Explicitly revokes all direct access from public/anon/authenticated roles
-- on sensitive and catalog tables, preventing unauthorized manipulation.
-- =====================================================================

-- 2.1 SENSITIVE TABLES (Lock down completely from client roles)
REVOKE ALL ON TABLE public.staff FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.partner_shops FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.transactions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.staff_activity_logs FROM PUBLIC, anon, authenticated;

-- Grant exclusive management rights only to service_role and postgres
GRANT ALL ON TABLE public.staff TO service_role, postgres;
GRANT ALL ON TABLE public.partner_shops TO service_role, postgres;
GRANT ALL ON TABLE public.users TO service_role, postgres;
GRANT ALL ON TABLE public.transactions TO service_role, postgres;
GRANT ALL ON TABLE public.staff_activity_logs TO service_role, postgres;

-- 2.2 ORDERS TABLE
REVOKE ALL ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.orders TO service_role, postgres;

-- 2.3 CATALOG & PUBLIC TABLES
REVOKE ALL ON TABLE public.categories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.subcategories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.coupons FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.banners FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.live_notices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;

-- Read-only grants for anonymous visitors & customers
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT SELECT ON TABLE public.subcategories TO anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.coupons TO anon, authenticated;
GRANT SELECT ON TABLE public.banners TO anon, authenticated;
GRANT SELECT ON TABLE public.live_notices TO anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon, authenticated;
GRANT INSERT ON TABLE public.reviews TO anon, authenticated; -- Customers can submit verified reviews

-- Service role retains full management access
GRANT ALL ON TABLE public.categories TO service_role, postgres;
GRANT ALL ON TABLE public.subcategories TO service_role, postgres;
GRANT ALL ON TABLE public.products TO service_role, postgres;
GRANT ALL ON TABLE public.coupons TO service_role, postgres;
GRANT ALL ON TABLE public.banners TO service_role, postgres;
GRANT ALL ON TABLE public.live_notices TO service_role, postgres;
GRANT ALL ON TABLE public.reviews TO service_role, postgres;

-- =====================================================================
-- STEP 3: SAFELY PURGE ALL LEGACY OR INSECURE POLICIES
-- =====================================================================
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'categories','subcategories','products','coupons',
        'banners','live_notices','reviews','orders','staff',
        'partner_shops','users','transactions','staff_activity_logs'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- =====================================================================
-- STEP 4: ESTABLISH RESTRICTIVE POLICIES FOR SENSITIVE TABLES
-- =====================================================================

-- 4.1 STAFF (Contains password_hash, password_salt, salaries, blood group, phone)
-- ZERO public access. Only backend with service_role can access.
CREATE POLICY "staff_service_role_all" ON public.staff
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.2 PARTNER SHOPS (Contains plain_password, password_hash, balance, sales)
-- ZERO direct public access. Only backend with service_role can access.
CREATE POLICY "partner_shops_service_role_all" ON public.partner_shops
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Provide a sanitized public view for active storefront listings without credentials
CREATE OR REPLACE VIEW public.public_partner_shops
WITH (security_invoker = false)
AS
SELECT
    id,
    partner_id,
    shop_name,
    logo,
    category,
    address,
    status,
    created_at
FROM public.partner_shops
WHERE status = 'active';

GRANT SELECT ON public.public_partner_shops TO anon, authenticated;

-- 4.3 USERS (Contains customer PII, mobile, wallet balance, reward points)
-- ZERO public access. Only backend with service_role can access.
CREATE POLICY "users_service_role_all" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.4 TRANSACTIONS & STAFF LOGS
CREATE POLICY "transactions_service_role_all" ON public.transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "logs_service_role_all" ON public.staff_activity_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================================
-- STEP 5: ORDERS TABLE SECURITY (PREVENTS CUSTOMER DATA HARVESTING)
-- =====================================================================
-- Allow customers to place orders (guest checkout insert), but STRICTLY BLOCK SELECT
CREATE POLICY "orders_anon_insert_checkout" ON public.orders
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Full management only for server backend via service_role
CREATE POLICY "orders_service_role_all" ON public.orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================================
-- STEP 6: PUBLIC CATALOG TABLES (SAFE SELECT ONLY, ZERO PUBLIC MUTATIONS)
-- =====================================================================

-- 6.1 Categories
CREATE POLICY "categories_public_select" ON public.categories
    FOR SELECT TO anon, authenticated USING (is_available = true);
CREATE POLICY "categories_service_role_all" ON public.categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.2 Subcategories
CREATE POLICY "subcategories_public_select" ON public.subcategories
    FOR SELECT TO anon, authenticated 
    USING (is_active = true AND (is_deleted IS NULL OR is_deleted = false));
CREATE POLICY "subcategories_service_role_all" ON public.subcategories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.3 Products
CREATE POLICY "products_public_select" ON public.products
    FOR SELECT TO anon, authenticated 
    USING ((is_deleted IS NULL OR is_deleted = false) AND (is_available IS NULL OR is_available = true));
CREATE POLICY "products_service_role_all" ON public.products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.4 Coupons
CREATE POLICY "coupons_public_select" ON public.coupons
    FOR SELECT TO anon, authenticated 
    USING ((is_active IS NULL OR is_active = true) AND (expiry_date IS NULL OR expiry_date >= NOW()));
CREATE POLICY "coupons_service_role_all" ON public.coupons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.5 Banners & Announcements
CREATE POLICY "banners_public_select" ON public.banners
    FOR SELECT TO anon, authenticated USING (is_active IS NULL OR is_active = true);
CREATE POLICY "banners_service_role_all" ON public.banners
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "live_notices_public_select" ON public.live_notices
    FOR SELECT TO anon, authenticated USING (is_active IS NULL OR is_active = true);
CREATE POLICY "live_notices_service_role_all" ON public.live_notices
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.6 Reviews
CREATE POLICY "reviews_public_select" ON public.reviews
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews_public_submit" ON public.reviews
    FOR INSERT TO anon, authenticated 
    WITH CHECK (rating >= 1 AND rating <= 5 AND product_id IS NOT NULL);
CREATE POLICY "reviews_service_role_all" ON public.reviews
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- =====================================================================
-- STEP 7: VERIFICATION QUERY (Run to verify that policies are active)
-- =====================================================================
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
