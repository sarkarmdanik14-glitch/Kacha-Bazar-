-- =====================================================================
-- Kacha Bazar - Phase 2 Supabase Migration Script (PostgreSQL)
-- Complete schema for:
--  1. Buy & Sell Marketplace (listings, reports, buyer-seller chat)
--  2. Live Customer Support Chat & Messages
--  3. Real-Time WebRTC Voice Calls & Call Center Agents
--  4. Loyalty Rewards, Gift Claims & Redemptions
--  5. Referral Program & Bonus Tracking
--  6. Multi-role Notifications (Users, Riders, Sellers, Staff)
--  7. Admin Memos & Invoices
--  8. App Settings & Configs
--  9. Riders & Sellers Profiles
-- 10. Visitor & Daily Analytics Sessions
--
-- Instructions:
-- Run this script in your Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

-- 1. BUY & SELL MARKETPLACE LISTINGS
CREATE TABLE IF NOT EXISTS public.buy_sell_listings (
    id TEXT PRIMARY KEY DEFAULT ('bs_' || substr(md5(random()::text), 1, 12)),
    title TEXT NOT NULL,
    title_bn TEXT,
    category TEXT NOT NULL DEFAULT 'mobiles',
    condition TEXT NOT NULL DEFAULT 'used',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN DEFAULT false,
    location TEXT NOT NULL,
    description TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    seller_uid TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    seller_email TEXT,
    seller_whatsapp TEXT,
    allow_call BOOLEAN DEFAULT true,
    allow_whatsapp BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active', -- 'active', 'sold', 'archived', 'flagged'
    views INT DEFAULT 0,
    report_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for marketplace browsing
CREATE INDEX IF NOT EXISTS idx_buy_sell_status_created ON public.buy_sell_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buy_sell_category ON public.buy_sell_listings(category);
CREATE INDEX IF NOT EXISTS idx_buy_sell_seller ON public.buy_sell_listings(seller_uid);

-- 2. BUY & SELL REPORTS
CREATE TABLE IF NOT EXISTS public.buy_sell_reports (
    id TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 12)),
    listing_id TEXT REFERENCES public.buy_sell_listings(id) ON DELETE CASCADE,
    listing_title TEXT,
    seller_uid TEXT,
    reported_by_uid TEXT,
    reported_by_name TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'removed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BUY & SELL DIRECT CHATS
CREATE TABLE IF NOT EXISTS public.buy_sell_chats (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES public.buy_sell_listings(id) ON DELETE CASCADE,
    listing_title TEXT,
    listing_price NUMERIC(12, 2),
    listing_image TEXT,
    seller_uid TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    buyer_uid TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buy_sell_chats_parties ON public.buy_sell_chats(seller_uid, buyer_uid);

-- 4. CUSTOMER SUPPORT CHAT ROOMS & MESSAGES
CREATE TABLE IF NOT EXISTS public.chats (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_email TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count_for_support INT DEFAULT 0,
    unread_count_for_customer INT DEFAULT 0,
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY DEFAULT ('msg_' || substr(md5(random()::text), 1, 12)),
    chat_id TEXT REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    sender_role TEXT DEFAULT 'customer', -- 'customer', 'support', 'admin'
    text TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id, created_at ASC);

-- 5. REAL-TIME WEBRTC VOICE CALLS & CALL CENTER AGENTS
CREATE TABLE IF NOT EXISTS public.voice_calls (
    id TEXT PRIMARY KEY DEFAULT ('call_' || substr(md5(random()::text), 1, 12)),
    call_number TEXT,
    caller_id TEXT NOT NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT,
    caller_type TEXT DEFAULT 'customer', -- 'customer', 'guest'
    status TEXT DEFAULT 'waiting', -- 'waiting', 'calling', 'ringing', 'connected', 'ended', 'rejected', 'missed', 'cancelled'
    queue_position INT DEFAULT 1,
    assigned_agent_id TEXT,
    assigned_agent_name TEXT,
    offer JSONB,
    answer JSONB,
    ice_candidates JSONB DEFAULT '[]'::jsonb,
    duration_seconds INT DEFAULT 0,
    ended_by TEXT,
    notes TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON public.voice_calls(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.call_center_agents (
    id TEXT PRIMARY KEY, -- e.g. 'agent_01'
    agent_number INT UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    role_title_bn TEXT,
    role_title_en TEXT,
    status TEXT DEFAULT 'available', -- 'available', 'ringing', 'in_call', 'offline'
    current_call_id TEXT REFERENCES public.voice_calls(id) ON DELETE SET NULL,
    active_caller_name TEXT,
    total_calls_handled INT DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    current_admin_uid TEXT,
    current_admin_name TEXT
);

-- Seed Initial 20 Call Center Agents if not already present
INSERT INTO public.call_center_agents (id, agent_number, name_bn, name_en, role_title_bn, role_title_en, status)
VALUES
('agent_01', 1, 'প্রতিনিধি ১ - আনিস রহমান', 'Agent 01 - Anis Rahman', 'সিনিয়র সাপোর্ট স্পেশালিস্ট', 'Senior Support Specialist', 'available'),
('agent_02', 2, 'প্রতিনিধি ২ - সাদিয়া আফরিন', 'Agent 02 - Sadia Afrin', 'অর্ডার হেল্পডেস্ক এক্সিকিউটিভ', 'Order Helpdesk Executive', 'available'),
('agent_03', 3, 'প্রতিনিধি ৩ - তানভীর হাসান', 'Agent 03 - Tanvir Hasan', 'কাস্টমার কেয়ার অফিসার', 'Customer Care Officer', 'available'),
('agent_04', 4, 'প্রতিনিধি ৪ - নুসরাত জাহান', 'Agent 04 - Nusrat Jahan', 'লাইভ সাপোর্ট প্রতিনিধি', 'Live Support Agent', 'available'),
('agent_05', 5, 'প্রতিনিধি ৫ - মাহমুদুল হক', 'Agent 05 - Mahmudul Haque', 'গ্রাহক সেবা কর্মকর্তা', 'Client Relations Officer', 'available'),
('agent_06', 6, 'প্রতিনিধি ৬ - ফাতেমা আক্তার', 'Agent 06 - Fatema Akter', 'অর্ডার ট্র্যাকিং ডেস্ক', 'Order Tracking Desk', 'available'),
('agent_07', 7, 'প্রতিনিধি ৭ - সাব্বির আহমেদ', 'Agent 07 - Sabbir Ahmed', 'ডেলিভারি সমন্বয়ক', 'Delivery Coordinator', 'available'),
('agent_08', 8, 'প্রতিনিধি ৮ - রুমানা পারভীন', 'Agent 08 - Rumana Parvin', 'সাপোর্ট কনসালট্যান্ট', 'Support Consultant', 'available'),
('agent_09', 9, 'প্রতিনিধি ৯ - রাকিবুল ইসলাম', 'Agent 09 - Rakibul Islam', 'কল সেন্টার প্রতিনিধি', 'Call Center Representative', 'available'),
('agent_10', 10, 'প্রতিনিধি ১০ - সুমাইয়া কবীর', 'Agent 10 - Sumaiya Kabir', 'কাস্টমার সাকসেস লিড', 'Customer Success Lead', 'available'),
('agent_11', 11, 'প্রতিনিধি ১১ - হাসান জামিল', 'Agent 11 - Hasan Jamil', 'জরুরি সেবা টিম', 'Priority Helpline', 'available'),
('agent_12', 12, 'প্রতিনিধি ১২ - মেহজাবিন চৌধুরী', 'Agent 12 - Mehzabin Chowdhury', 'অর্ডার সাপোর্ট ডেস্ক', 'Order Support Desk', 'available'),
('agent_13', 13, 'প্রতিনিধি ১৩ - আশরাফুল আলম', 'Agent 13 - Ashraful Alam', 'রিটার্ন ও রিফান্ড ডেস্ক', 'Refund & Support Desk', 'available'),
('agent_14', 14, 'প্রতিনিধি ১৪ - জেরিন তাসনিম', 'Agent 14 - Jerin Tasnim', 'কল অফিসার', 'Call Officer', 'available'),
('agent_15', 15, 'প্রতিনিধি ১৫ - কামরুল হাসান', 'Agent 15 - Kamrul Hasan', 'প্রডাক্ট কোয়ারি ডেস্ক', 'Product Query Desk', 'available'),
('agent_16', 16, 'প্রতিনিধি ১৬ - শারমিন জাহান', 'Agent 16 - Sharmin Jahan', 'গ্রাহক সন্তুষ্টি স্পেশালিস্ট', 'Satisfaction Specialist', 'available'),
('agent_17', 17, 'প্রতিনিধি ১৭ - নাজমুল হোসেন', 'Agent 17 - Nazmul Hossain', 'হেল্পডেস্ক অফিসার', 'Helpdesk Officer', 'available'),
('agent_18', 18, 'প্রতিনিধি ১৮ - রেশমা খাতুন', 'Agent 18 - Reshma Khatun', 'জরুরি সাপোর্ট টিম', 'Urgent Support Desk', 'available'),
('agent_19', 19, 'প্রতিনিধি ১৯ - আরিফুল ইসলাম', 'Agent 19 - Ariful Islam', 'সুপারভাইজার হেল্পলাইন', 'Supervisor Helpline', 'available'),
('agent_20', 20, 'প্রতিনিধি ২০ - তৌহিদুল করিম', 'Agent 20 - Touhidul Karim', 'প্রধান সমন্বয়ক ডেস্ক', 'Chief Coordinator Desk', 'available')
ON CONFLICT (id) DO NOTHING;

-- 6. LOYALTY REWARDS & CLAIMS
CREATE TABLE IF NOT EXISTS public.reward_claims (
    id TEXT PRIMARY KEY DEFAULT ('claim_' || substr(md5(random()::text), 1, 12)),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    notes TEXT,
    gift_id TEXT NOT NULL,
    gift_name_bn TEXT NOT NULL,
    gift_name_en TEXT NOT NULL,
    gift_image TEXT,
    points_deducted INT NOT NULL DEFAULT 0,
    market_value_taka NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'dispatched', 'delivered', 'rejected'
    claim_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON public.reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON public.reward_claims(status, created_at DESC);

-- 7. REFERRAL PROGRAM
CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY DEFAULT ('ref_' || substr(md5(random()::text), 1, 12)),
    referrer_uid TEXT NOT NULL,
    referred_uid TEXT NOT NULL,
    code TEXT NOT NULL,
    bonus_amount NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'rewarded', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_uid);

-- 8. IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(md5(random()::text), 1, 12)),
    user_id TEXT NOT NULL, -- Target user UID or 'all' or 'admin'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'order', 'promo', 'reward', 'alert', 'info'
    is_read BOOLEAN DEFAULT false,
    link_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- 9. ADMIN MEMOS & INVOICES
CREATE TABLE IF NOT EXISTS public.memos (
    id TEXT PRIMARY KEY DEFAULT ('memo_' || substr(md5(random()::text), 1, 12)),
    memo_number TEXT UNIQUE,
    title TEXT,
    date DATE DEFAULT CURRENT_DATE,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    order_id TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    delivery_charge NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    due_amount NUMERIC(12, 2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash_on_delivery',
    status TEXT DEFAULT 'issued', -- 'issued', 'paid', 'cancelled'
    prepared_by TEXT,
    founder_name TEXT,
    founder_designation TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memo_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('mlog_' || substr(md5(random()::text), 1, 12)),
    memo_id TEXT REFERENCES public.memos(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SYSTEM SETTINGS KEY-VALUE & JSON CONFIGS
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Seed default settings
INSERT INTO public.settings (key, value)
VALUES
('store_config', '{"storeName": "মেগা বাজার", "storeTagline": "হোম ডেলিভারি", "supportPhone": "+8801615581975", "deliveryFee": 30, "freeDeliveryThreshold": 500}'::jsonb),
('banner_management', '{"active": true, "showCallNotice": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 11. RIDERS & SELLERS PROFILES
CREATE TABLE IF NOT EXISTS public.riders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'bike',
    vehicle_number TEXT,
    nid_number TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    is_active BOOLEAN DEFAULT true,
    total_deliveries INT DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sellers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    trade_license TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    commission_rate NUMERIC(5, 2) DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. VISITOR ANALYTICS SESSIONS
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id TEXT PRIMARY KEY DEFAULT ('vs_' || substr(md5(random()::text), 1, 12)),
    visitor_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    page_views INT DEFAULT 1,
    country TEXT DEFAULT 'Bangladesh',
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_daily (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    unique_visitors INT DEFAULT 0,
    total_page_views INT DEFAULT 0,
    orders_placed INT DEFAULT 0,
    total_sales NUMERIC(12, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PHASE 2
-- ---------------------------------------------------------------------
ALTER TABLE public.buy_sell_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_sell_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_sell_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- Seamless open development policies (Allows anon and authenticated read & write)
CREATE POLICY "Public Read BuySell Listings" ON public.buy_sell_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read BuySell Reports" ON public.buy_sell_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read BuySell Chats" ON public.buy_sell_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Chat Messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Voice Calls" ON public.voice_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Agents" ON public.call_center_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Reward Claims" ON public.reward_claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Memos" ON public.memos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Memo Logs" ON public.memo_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Riders" ON public.riders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Sellers" ON public.sellers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Visitor Sessions" ON public.visitor_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Analytics Daily" ON public.analytics_daily FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- REALTIME REPLICATION (Instant updates across all clients)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.buy_sell_listings;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.buy_sell_chats;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_center_agents;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_claims;
    EXCEPTION WHEN duplicate_object THEN END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;
