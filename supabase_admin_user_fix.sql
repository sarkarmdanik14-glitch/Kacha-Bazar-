-- =====================================================================
-- Kacha Bazar - Admin User Provisioning Fix
-- Inserts/upserts admin user profile for adminofficer@megabajar.com
-- into public.users and public.staff with full admin privileges.
-- =====================================================================

-- 1. Insert/Upsert into public.users
INSERT INTO public.users (
    id,
    uid,
    full_name,
    display_name,
    email,
    role,
    membership_tier,
    is_verified,
    updated_at
) VALUES (
    '60925d00-db78-4f19-9b9c-0cc6bdc34a98',
    '60925d00-db78-4f19-9b9c-0cc6bdc34a98',
    'Admin Officer',
    'Admin Officer',
    'adminofficer@megabajar.com',
    'admin',
    'Platinum',
    true,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    uid = EXCLUDED.uid,
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    membership_tier = 'Platinum',
    is_verified = true,
    updated_at = NOW();

-- 2. Insert/Upsert into public.staff
INSERT INTO public.staff (
    id,
    staff_id,
    username,
    full_name,
    mobile,
    email,
    role,
    designation,
    department,
    status,
    is_super_admin,
    updated_at
) VALUES (
    '60925d00-db78-4f19-9b9c-0cc6bdc34a98',
    'CFI-KB-003',
    'adminofficer',
    'Admin Officer',
    '+8801611181115',
    'adminofficer@megabajar.com',
    'admin',
    'Administrative Officer',
    'Executive Administration',
    'active',
    false,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    status = 'active',
    updated_at = NOW();
