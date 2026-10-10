// Complete PostgreSQL Schema for KachaBazar on Supabase
export const SUPABASE_SCHEMA_SQL = `-- =====================================================================
-- KachaBazar Grocery - Supabase Database Schema (PostgreSQL)
-- Run this complete script in your Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon_name TEXT DEFAULT 'ShoppingBag',
    color_class TEXT DEFAULT 'bg-emerald-50 text-emerald-600',
    border_color TEXT DEFAULT 'border-emerald-200',
    image TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category_slug TEXT,
    description_bn TEXT,
    description_en TEXT,
    icon_name TEXT,
    image TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price NUMERIC(12, 2) DEFAULT 0,
    original_price NUMERIC(12, 2) DEFAULT 0,
    unit_bn TEXT DEFAULT 'কেজি',
    unit_en TEXT DEFAULT 'kg',
    unit TEXT,
    category TEXT,
    category_id TEXT,
    subcategory TEXT,
    sub_category_id TEXT,
    image TEXT,
    image_url TEXT,
    is_flash_sale BOOLEAN DEFAULT false,
    discount NUMERIC(5, 2) DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    stock INT DEFAULT 100,
    description_bn TEXT,
    description_en TEXT,
    is_best_selling BOOLEAN DEFAULT false,
    is_new_arrival BOOLEAN DEFAULT false,
    is_popular BOOLEAN DEFAULT false,
    is_seasonal BOOLEAN DEFAULT false,
    is_combo BOOLEAN DEFAULT false,
    is_buy_more_save_more BOOLEAN DEFAULT false,
    brand TEXT,
    sku TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    available_shops JSONB DEFAULT '[]'::jsonb,
    partner_shop_id TEXT,
    partner_shop_name TEXT,
    partner_id TEXT,
    is_available BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STAFF MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    staff_id TEXT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    photo_url TEXT,
    digital_signature TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    designation TEXT DEFAULT 'Staff Member',
    department TEXT DEFAULT 'Operations',
    joining_date TEXT,
    blood_group TEXT,
    emergency_contact TEXT,
    monthly_salary NUMERIC(12, 2) DEFAULT 0,
    salary_status TEXT DEFAULT 'unpaid',
    last_payment_date TEXT,
    salary_history JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    online_status TEXT DEFAULT 'offline',
    last_active_at TIMESTAMPTZ,
    password_hash TEXT,
    password_salt TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    assigned_agent_desk INT,
    is_super_admin BOOLEAN DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PARTNER SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.partner_shops (
    id TEXT PRIMARY KEY,
    partner_id TEXT UNIQUE NOT NULL,
    shop_name TEXT NOT NULL,
    logo TEXT,
    owner_name TEXT,
    mobile TEXT,
    email TEXT,
    address TEXT,
    category TEXT,
    joining_date TEXT,
    commission_rate NUMERIC(5, 2) DEFAULT 10.0,
    status TEXT DEFAULT 'active',
    plain_password TEXT,
    password_hash TEXT,
    password_salt TEXT,
    balance NUMERIC(12, 2) DEFAULT 0,
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_commission NUMERIC(12, 2) DEFAULT 0,
    net_earnings NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_area TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    delivery_charge NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash on Delivery',
    payment_status TEXT DEFAULT 'Pending',
    order_status TEXT DEFAULT 'Pending',
    notes TEXT,
    rider_id TEXT,
    rider_name TEXT,
    is_guest BOOLEAN DEFAULT false,
    coupon_used TEXT,
    partner_assignments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CUSTOMERS / USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE,
    full_name TEXT,
    display_name TEXT,
    email TEXT,
    mobile TEXT,
    phone TEXT,
    photo_url TEXT,
    address TEXT,
    role TEXT DEFAULT 'customer',
    membership_tier TEXT DEFAULT 'Silver',
    reward_points INT DEFAULT 0,
    wallet_balance NUMERIC(12, 2) DEFAULT 0,
    referral_code TEXT,
    referred_by TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expiry_date TIMESTAMPTZ,
    usage_limit INT DEFAULT 1000,
    used_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name TEXT,
    rating INT DEFAULT 5,
    comment_bn TEXT,
    comment_en TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BANNERS & PROMOS TABLE
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
    bg_gradient TEXT,
    image TEXT,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. LIVE NOTICES & ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.live_notices (
    id TEXT PRIMARY KEY DEFAULT 'default_notice',
    is_active BOOLEAN DEFAULT true,
    badge_bn TEXT,
    badge_en TEXT,
    title_bn TEXT,
    title_en TEXT,
    message_bn TEXT,
    message_en TEXT,
    theme TEXT DEFAULT 'rose',
    show_dot_pulse BOOLEAN DEFAULT true,
    order_disabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TRANSACTIONS & WALLET LEDGER
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    amount NUMERIC(12, 2) DEFAULT 0,
    description TEXT,
    reference_id TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. STAFF ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
    id TEXT PRIMARY KEY,
    staff_id TEXT,
    staff_name TEXT,
    staff_role TEXT,
    action TEXT,
    module TEXT,
    details TEXT,
    target_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling public read and write access for seamless app integration
-- ---------------------------------------------------------------------

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create Open Policies (allows reading & writing by client)
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

-- Done! Everything ready for KachaBazar on Supabase.
`;
