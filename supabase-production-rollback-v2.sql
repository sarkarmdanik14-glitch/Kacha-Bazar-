-- =====================================================================
-- KachaBazar - Emergency Rollback Script for Production Security Migration v2
-- Target: Supabase PostgreSQL
-- Purpose: Restores grants and policies to pre-hardening state if issues occur.
-- =====================================================================

BEGIN;

-- 1. Restore Table Grants for anon and authenticated
GRANT ALL ON TABLE public.categories TO anon, authenticated;
GRANT ALL ON TABLE public.subcategories TO anon, authenticated;
GRANT ALL ON TABLE public.products TO anon, authenticated;
GRANT ALL ON TABLE public.coupons TO anon, authenticated;
GRANT ALL ON TABLE public.banners TO anon, authenticated;
GRANT ALL ON TABLE public.live_notices TO anon, authenticated;
GRANT ALL ON TABLE public.reviews TO anon, authenticated;
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.staff TO anon, authenticated;
GRANT ALL ON TABLE public.partner_shops TO anon, authenticated;
GRANT ALL ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.transactions TO anon, authenticated;
GRANT ALL ON TABLE public.staff_activity_logs TO anon, authenticated;

-- 2. Drop v2 Policies
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

-- 3. Re-create permissive standard policies
CREATE POLICY "Public Read Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Subcategories" ON public.subcategories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Partner Shops" ON public.partner_shops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Live Notices" ON public.live_notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Staff Activity Logs" ON public.staff_activity_logs FOR ALL USING (true) WITH CHECK (true);

COMMIT;
