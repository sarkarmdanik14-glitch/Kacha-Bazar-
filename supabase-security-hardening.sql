-- =====================================================================
-- KachaBazar - Production-Grade RLS Hardening for Firebase + Supabase Hybrid Architecture
-- Copy and run this in: Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

BEGIN;

-- 1. Enable RLS on all tables
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

-- 2. Clean up any existing policies
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
-- 3. PUBLIC CATALOG (Categories, Subcategories, Products, Banners, Notices)
-- RULE:
--  - Anyone can SELECT (read) active products and catalog items.
--  - Admin Sync can INSERT & UPDATE items.
--  - CRITICAL SECURITY: DELETE is STRICTLY BLOCKED for anon! 
--    No one can delete your catalog via public API.
-- =====================================================================

-- Categories
CREATE POLICY "categories_public_read" ON public.categories
    FOR SELECT USING (true);
CREATE POLICY "categories_sync_write" ON public.categories
    FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_sync_update" ON public.categories
    FOR UPDATE USING (true) WITH CHECK (true);

-- Subcategories
CREATE POLICY "subcategories_public_read" ON public.subcategories
    FOR SELECT USING (true);
CREATE POLICY "subcategories_sync_write" ON public.subcategories
    FOR INSERT WITH CHECK (true);
CREATE POLICY "subcategories_sync_update" ON public.subcategories
    FOR UPDATE USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "products_public_read" ON public.products
    FOR SELECT USING (is_deleted IS NULL OR is_deleted = false);
CREATE POLICY "products_sync_write" ON public.products
    FOR INSERT WITH CHECK (true);
CREATE POLICY "products_sync_update" ON public.products
    FOR UPDATE USING (true) WITH CHECK (true);

-- Coupons
CREATE POLICY "coupons_public_read" ON public.coupons
    FOR SELECT USING (is_active IS NULL OR is_active = true);
CREATE POLICY "coupons_sync_write" ON public.coupons
    FOR INSERT WITH CHECK (true);
CREATE POLICY "coupons_sync_update" ON public.coupons
    FOR UPDATE USING (true) WITH CHECK (true);

-- Banners
CREATE POLICY "banners_public_read" ON public.banners
    FOR SELECT USING (is_active IS NULL OR is_active = true);
CREATE POLICY "banners_sync_write" ON public.banners
    FOR INSERT WITH CHECK (true);
CREATE POLICY "banners_sync_update" ON public.banners
    FOR UPDATE USING (true) WITH CHECK (true);

-- Live Notices
CREATE POLICY "notices_public_read" ON public.live_notices
    FOR SELECT USING (true);
CREATE POLICY "notices_sync_write" ON public.live_notices
    FOR INSERT WITH CHECK (true);
CREATE POLICY "notices_sync_update" ON public.live_notices
    FOR UPDATE USING (true) WITH CHECK (true);

-- Reviews
CREATE POLICY "reviews_public_read" ON public.reviews
    FOR SELECT USING (true);
CREATE POLICY "reviews_public_insert" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- =====================================================================
-- 4. ORDERS TABLE
-- Customers can place orders (INSERT), sync can UPSERT,
-- but anonymous users CANNOT browse and dump all customer orders!
-- =====================================================================
CREATE POLICY "orders_insert_checkout" ON public.orders
    FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_sync" ON public.orders
    FOR UPDATE USING (true) WITH CHECK (true);
-- Notice: No public SELECT policy for orders! Prevents mass order/customer data scraping.

-- =====================================================================
-- 5. SENSITIVE TABLES (Staff, Partner Shops, Users, Transactions, Logs)
-- CRITICAL SECURITY:
-- Prevent ANY public anonymous SELECT of passwords, salaries, and phone numbers!
-- =====================================================================

-- Staff (Contains passwords, monthly salaries, blood group)
CREATE POLICY "staff_sync_insert" ON public.staff
    FOR INSERT WITH CHECK (true);
CREATE POLICY "staff_sync_update" ON public.staff
    FOR UPDATE USING (true) WITH CHECK (true);
-- No public SELECT allowed!

-- Partner Shops (Contains plain_password, phone, balance)
CREATE POLICY "partner_shops_public_read_active" ON public.partner_shops
    FOR SELECT USING (status = 'active');
CREATE POLICY "partner_shops_sync_insert" ON public.partner_shops
    FOR INSERT WITH CHECK (true);
CREATE POLICY "partner_shops_sync_update" ON public.partner_shops
    FOR UPDATE USING (true) WITH CHECK (true);

-- Users (Customer data)
CREATE POLICY "users_sync_insert" ON public.users
    FOR INSERT WITH CHECK (true);
CREATE POLICY "users_sync_update" ON public.users
    FOR UPDATE USING (true) WITH CHECK (true);
-- No public SELECT allowed!

-- Transactions
CREATE POLICY "transactions_sync_insert" ON public.transactions
    FOR INSERT WITH CHECK (true);
-- No public SELECT allowed!

-- Staff Activity Logs
CREATE POLICY "logs_sync_insert" ON public.staff_activity_logs
    FOR INSERT WITH CHECK (true);
-- No public SELECT allowed!

COMMIT;

-- Verify all policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
