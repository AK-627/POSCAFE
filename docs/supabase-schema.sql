-- ═══════════════════════════════════════════════════════════════
-- Sky Nether POS — Supabase Database Schema
-- Run this ENTIRE file in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PROFILES (extends Supabase Auth) ───────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  avatar      TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY['dashboard','pos','tables','kitchen'],
  can_edit    JSONB NOT NULL DEFAULT '{"menuPrices":false,"taxSettings":false,"employees":false,"settings":false}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar', UPPER(LEFT(split_part(NEW.email, '@', 1), 2))),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. MENU ITEMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '🍽️',
  price        INTEGER NOT NULL DEFAULT 0,
  category     TEXT NOT NULL DEFAULT 'Other',
  available    BOOLEAN NOT NULL DEFAULT true,
  orders_today INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. TABLES (floor plan) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cafe_tables (
  id         SERIAL PRIMARY KEY,
  table_id   TEXT UNIQUE NOT NULL,
  seats      INTEGER NOT NULL DEFAULT 2,
  status     TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','cleaning')),
  guest      TEXT DEFAULT '',
  order_ref  TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id           SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer     TEXT NOT NULL DEFAULT 'Walk-in',
  items        JSONB NOT NULL DEFAULT '[]',
  subtotal     INTEGER NOT NULL DEFAULT 0,
  tax          INTEGER NOT NULL DEFAULT 0,
  service_charge INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','paid','cancelled')),
  table_id     TEXT DEFAULT NULL,
  payment_method TEXT DEFAULT 'card',
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. KITCHEN ORDERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kitchen_orders (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT NOT NULL,
  table_id    TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','rush','critical')),
  notes       TEXT DEFAULT '',
  elapsed_min INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ready','served')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. STAFF ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'Waiter',
  shift        TEXT NOT NULL DEFAULT '9AM - 5PM',
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','break','off')),
  avatar       TEXT NOT NULL DEFAULT '',
  orders_count INTEGER NOT NULL DEFAULT 0,
  rating       NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7. SETTINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Profiles policies ─────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Owners can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Owners can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Menu items policies ───────────────────────────────────────
CREATE POLICY "All authenticated users can read menu"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can insert menu items"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can update menu items"
  ON public.menu_items FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can delete menu items"
  ON public.menu_items FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'owner');

-- ── Cafe tables policies ──────────────────────────────────────
CREATE POLICY "All authenticated users can read tables"
  ON public.cafe_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can update tables"
  ON public.cafe_tables FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can insert tables"
  ON public.cafe_tables FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can delete tables"
  ON public.cafe_tables FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'owner');

-- ── Orders policies ───────────────────────────────────────────
CREATE POLICY "All authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'owner');

-- ── Kitchen orders policies ───────────────────────────────────
CREATE POLICY "All authenticated users can read kitchen orders"
  ON public.kitchen_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert kitchen orders"
  ON public.kitchen_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update kitchen orders"
  ON public.kitchen_orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can delete kitchen orders"
  ON public.kitchen_orders FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'owner');

-- ── Staff policies ────────────────────────────────────────────
CREATE POLICY "All authenticated users can read staff"
  ON public.staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can manage staff"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can update staff"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can delete staff"
  ON public.staff FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'owner');

-- ── Settings policies ─────────────────────────────────────────
CREATE POLICY "All authenticated users can read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can modify settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'owner')
  WITH CHECK (public.get_user_role() = 'owner');


-- ═══════════════════════════════════════════════════════════════
-- REALTIME (enable for live-sync tables)
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Menu Items
INSERT INTO public.menu_items (name, emoji, price, category, available, orders_today) VALUES
  ('Espresso',           '☕', 149, 'Coffee',    true,  42),
  ('Cappuccino',         '☕', 199, 'Coffee',    true,  38),
  ('Latte',              '🥛', 219, 'Coffee',    true,  35),
  ('Mocha',              '🍫', 249, 'Coffee',    true,  28),
  ('Cold Brew',          '🧊', 229, 'Coffee',    true,  22),
  ('Americano',          '☕', 169, 'Coffee',    true,  19),
  ('Green Tea',          '🍵', 129, 'Tea',       true,  15),
  ('Chai Latte',         '🍵', 179, 'Tea',       true,  20),
  ('Matcha Latte',       '🍵', 249, 'Tea',       true,  12),
  ('Iced Tea',           '🧋', 149, 'Tea',       true,  18),
  ('Croissant',          '🥐', 129, 'Pastry',    true,  30),
  ('Blueberry Muffin',   '🧁', 149, 'Pastry',    true,  25),
  ('Chocolate Cake',     '🍰', 199, 'Pastry',    false, 15),
  ('Danish Pastry',      '🥐', 159, 'Pastry',    true,  10),
  ('Club Sandwich',      '🥪', 279, 'Food',      true,  22),
  ('Caesar Salad',       '🥗', 249, 'Food',      true,  14),
  ('Pasta Alfredo',      '🍝', 329, 'Food',      true,  18),
  ('Margherita Pizza',   '🍕', 349, 'Food',      true,  16),
  ('Mango Smoothie',     '🥭', 199, 'Beverages', true,  20),
  ('Fresh Orange Juice', '🍊', 179, 'Beverages', true,  24),
  ('Lemonade',           '🍋', 149, 'Beverages', true,  16),
  ('Berry Smoothie',     '🫐', 229, 'Beverages', true,  11)
ON CONFLICT DO NOTHING;

-- Cafe Tables
INSERT INTO public.cafe_tables (table_id, seats, status, guest, order_ref) VALUES
  ('T1',  2, 'available', '',      ''),
  ('T2',  2, 'occupied',  'Rahul', '#1042'),
  ('T3',  4, 'occupied',  'Priya', '#1041'),
  ('T4',  4, 'available', '',      ''),
  ('T5',  6, 'reserved',  'Amit',  ''),
  ('T6',  2, 'cleaning',  '',      ''),
  ('T7',  4, 'available', '',      ''),
  ('T8',  8, 'occupied',  'Sarah', '#1040'),
  ('T9',  2, 'available', '',      ''),
  ('T10', 4, 'reserved',  'Dev',   ''),
  ('T11', 6, 'available', '',      ''),
  ('T12', 2, 'occupied',  'Meera', '#1039')
ON CONFLICT (table_id) DO NOTHING;

-- Kitchen Orders
INSERT INTO public.kitchen_orders (order_id, table_id, items, priority, notes, elapsed_min) VALUES
  ('#1042', 'T2',  '[{"name":"Cappuccino","qty":2},{"name":"Croissant","qty":1}]', 'normal', '', 4),
  ('#1041', 'T3',  '[{"name":"Pasta Alfredo","qty":2},{"name":"Caesar Salad","qty":1},{"name":"Lemonade","qty":2}]', 'rush', 'No onions in salad', 12),
  ('#1040', 'T8',  '[{"name":"Margherita Pizza","qty":2},{"name":"Club Sandwich","qty":3},{"name":"Cold Brew","qty":4}]', 'critical', 'Birthday celebration — priority!', 18),
  ('#1039', 'T12', '[{"name":"Matcha Latte","qty":1},{"name":"Blueberry Muffin","qty":2}]', 'normal', '', 2),
  ('#1038', 'T2',  '[{"name":"Espresso","qty":1},{"name":"Danish Pastry","qty":1}]', 'normal', '', 6),
  ('#1037', 'T3',  '[{"name":"Mocha","qty":1},{"name":"Chocolate Cake","qty":1}]', 'rush', 'Extra whipped cream', 9)
ON CONFLICT DO NOTHING;

-- Recent Orders
INSERT INTO public.orders (order_number, customer, items, total, status, table_id, created_at) VALUES
  ('#1042', 'Rahul V.',  '[{"name":"Cappuccino","qty":2,"price":199},{"name":"Croissant","qty":1,"price":129}]', 527,  'preparing', 'T2',  now() - interval '2 minutes'),
  ('#1041', 'Priya S.',  '[{"name":"Pasta Alfredo","qty":2,"price":329},{"name":"Caesar Salad","qty":1,"price":249},{"name":"Lemonade","qty":2,"price":149}]', 1156, 'preparing', 'T3',  now() - interval '5 minutes'),
  ('#1040', 'Sarah K.',  '[{"name":"Margherita Pizza","qty":2,"price":349},{"name":"Club Sandwich","qty":3,"price":279},{"name":"Cold Brew","qty":4,"price":229}]', 2245, 'preparing', 'T8',  now() - interval '12 minutes'),
  ('#1039', 'Meera P.',  '[{"name":"Matcha Latte","qty":1,"price":249},{"name":"Blueberry Muffin","qty":2,"price":149}]', 547,  'pending',   'T12', now() - interval '15 minutes'),
  ('#1038', 'Walk-in',   '[{"name":"Espresso","qty":1,"price":149},{"name":"Danish Pastry","qty":1,"price":159}]', 308,  'paid',      NULL,  now() - interval '22 minutes'),
  ('#1037', 'Amit D.',   '[{"name":"Mocha","qty":1,"price":249},{"name":"Chocolate Cake","qty":1,"price":199}]', 448,  'paid',      NULL,  now() - interval '34 minutes')
ON CONFLICT (order_number) DO NOTHING;

-- Staff
INSERT INTO public.staff (name, role, shift, status, avatar, orders_count, rating) VALUES
  ('Arjun Kumar',  'Manager', '9AM - 5PM',  'active', 'AK', 0,  4.8),
  ('Priya Sharma', 'Cashier', '10AM - 6PM', 'active', 'PS', 34, 4.6),
  ('Rahul Verma',  'Waiter',  '8AM - 4PM',  'active', 'RV', 28, 4.9),
  ('Meera Patel',  'Waiter',  '12PM - 8PM', 'active', 'MP', 19, 4.7),
  ('Dev Nair',     'Chef',    '7AM - 3PM',  'active', 'DN', 45, 4.9),
  ('Anita Roy',    'Chef',    '2PM - 10PM', 'break',  'AR', 32, 4.5)
ON CONFLICT DO NOTHING;

-- Settings
INSERT INTO public.settings (key, value) VALUES
  ('tax_rate',       '{"percent": 5}'),
  ('service_charge', '{"percent": 10}'),
  ('currency',       '{"symbol": "₹", "code": "INR"}'),
  ('cafe_name',      '{"name": "Sky Nether"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ═══════════════════════════════════════════════════════════════
-- DONE! Now create demo users in Authentication:
--
-- Go to: Supabase Dashboard → Authentication → Users → Add User
--
--   1. Owner:    admin@skynether.cafe  /  admin123
--   2. Employee: staff@skynether.cafe  /  staff123
--
-- Then run this to set their roles correctly:
-- (Replace the UUIDs below with the actual UUIDs from the Users table)
-- ═══════════════════════════════════════════════════════════════

-- After creating users, run these UPDATE queries with their real UUIDs:
--
-- UPDATE public.profiles
-- SET role = 'owner',
--     permissions = ARRAY['dashboard','pos','tables','kitchen','menu','staff','reports'],
--     can_edit = '{"menuPrices":true,"taxSettings":true,"employees":true,"settings":true}',
--     name = 'Arjun Kumar',
--     avatar = 'AK'
-- WHERE email = 'admin@skynether.cafe';
--
-- UPDATE public.profiles
-- SET role = 'employee',
--     permissions = ARRAY['dashboard','pos','tables','kitchen'],
--     can_edit = '{"menuPrices":false,"taxSettings":false,"employees":false,"settings":false}',
--     name = 'Rahul Verma',
--     avatar = 'RV'
-- WHERE email = 'staff@skynether.cafe';
