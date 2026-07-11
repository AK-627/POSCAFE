-- ============================================================
-- Migration 001: Initial Schema for Sky Nether Café Management
-- Multi-tenant architecture with Row-Level Security (RLS)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search on menus

-- ============================================================
-- TENANTS & BRANCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone           VARCHAR(50),
  address         TEXT,
  logo_url        VARCHAR(500),
  timezone        VARCHAR(100) DEFAULT 'UTC',
  currency        VARCHAR(10) DEFAULT 'USD',
  tax_rate        DECIMAL(5, 2) DEFAULT 0.00,
  service_charge  DECIMAL(5, 2) DEFAULT 0.00,
  is_active       BOOLEAN DEFAULT TRUE,
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  address     TEXT,
  phone       VARCHAR(50),
  is_active   BOOLEAN DEFAULT TRUE,
  is_default  BOOLEAN DEFAULT FALSE,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(500) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  role            VARCHAR(50) NOT NULL CHECK (role IN ('owner','manager','cashier','waiter','chef')),
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan                  VARCHAR(50) NOT NULL CHECK (plan IN ('starter','professional','enterprise')),
  status                VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active','trial','past_due','cancelled','expired')),
  billing_cycle         VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  price_per_month       DECIMAL(10, 2) NOT NULL,
  max_locations         INTEGER NOT NULL DEFAULT 1,
  max_users             INTEGER NOT NULL DEFAULT 5,
  current_period_start  TIMESTAMPTZ NOT NULL,
  current_period_end    TIMESTAMPTZ NOT NULL,
  trial_ends_at         TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  stripe_customer_id    VARCHAR(200),
  stripe_subscription_id VARCHAR(200),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  invoice_number    VARCHAR(100) NOT NULL UNIQUE,
  amount            DECIMAL(10, 2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','void')),
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  paid_at           TIMESTAMPTZ,
  stripe_invoice_id VARCHAR(200),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_invoices_tenant_id ON subscription_invoices(tenant_id);

-- ============================================================
-- MENU
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_tenant_id ON menu_categories(tenant_id);

CREATE TABLE IF NOT EXISTS menu_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2) NOT NULL,
  cost             DECIMAL(10, 2),
  preparation_time INTEGER, -- minutes
  is_available     BOOLEAN DEFAULT TRUE,
  display_order    INTEGER DEFAULT 0,
  tags             TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_name_trgm ON menu_items USING GIN (name gin_trgm_ops);

-- ============================================================
-- TABLES & FLOOR PLAN
-- ============================================================

CREATE TABLE IF NOT EXISTS table_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_groups_tenant_id ON table_groups(tenant_id);

CREATE TABLE IF NOT EXISTS tables (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_number     VARCHAR(20) NOT NULL,
  table_name       VARCHAR(100),
  capacity         INTEGER NOT NULL DEFAULT 4,
  position_x       FLOAT,
  position_y       FLOAT,
  status           VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','cleaning')),
  current_order_id UUID,
  group_id         UUID REFERENCES table_groups(id) ON DELETE SET NULL,
  floor            VARCHAR(100),
  section          VARCHAR(100),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, branch_id, table_number)
);

CREATE INDEX idx_tables_tenant_id ON tables(tenant_id);
CREATE INDEX idx_tables_branch_id ON tables(branch_id);
CREATE INDEX idx_tables_status ON tables(tenant_id, status);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number       VARCHAR(50),
  email              VARCHAR(255),
  first_name         VARCHAR(100),
  last_name          VARCHAR(100),
  loyalty_points     INTEGER NOT NULL DEFAULT 0,
  total_orders       INTEGER NOT NULL DEFAULT 0,
  total_spent        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes              TEXT,
  last_order_at      TIMESTAMPTZ,
  is_active          BOOLEAN DEFAULT TRUE,
  data_consent_given BOOLEAN DEFAULT FALSE,
  data_consent_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone_number);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);

-- ============================================================
-- ORDERS & ORDER ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id        UUID REFERENCES tables(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number    VARCHAR(50) NOT NULL UNIQUE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','served','cancelled','paid')),
  subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax_amount      DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  tax_rate        DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  service_charge  DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  served_by       UUID REFERENCES users(id),
  confirmed_at    TIMESTAMPTZ,
  served_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_created_at ON orders(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id         UUID NOT NULL REFERENCES menu_items(id),
  menu_item_name       VARCHAR(255) NOT NULL,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  unit_price           DECIMAL(10, 2) NOT NULL,
  total_price          DECIMAL(10, 2) NOT NULL,
  special_instructions TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','served','cancelled')),
  prepared_by          UUID REFERENCES users(id),
  prepared_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- ============================================================
-- BILLING & PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method   VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','card','digital_wallet','bank_transfer')),
  amount           DECIMAL(10, 2) NOT NULL,
  tip_amount       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  change_given     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  reference_number VARCHAR(200),
  transaction_id   VARCHAR(200),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  processed_by     UUID REFERENCES users(id),
  processed_at     TIMESTAMPTZ,
  failure_reason   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);

CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id       UUID REFERENCES payments(id),
  invoice_number   VARCHAR(100) NOT NULL UNIQUE,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','emailed','void')),
  subtotal         DECIMAL(10, 2) NOT NULL,
  tax_amount       DECIMAL(10, 2) NOT NULL,
  service_charge   DECIMAL(10, 2) NOT NULL,
  discount_amount  DECIMAL(10, 2) NOT NULL,
  total_amount     DECIMAL(10, 2) NOT NULL,
  pdf_url          VARCHAR(500),
  emailed_to       VARCHAR(255),
  emailed_at       TIMESTAMPTZ,
  customer_name    VARCHAR(255),
  customer_email   VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,
  order_id     UUID REFERENCES orders(id),
  payment_id   UUID REFERENCES payments(id),
  invoice_id   UUID REFERENCES invoices(id),
  amount       DECIMAL(10, 2),
  performed_by UUID NOT NULL REFERENCES users(id),
  metadata     JSONB,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_audit_tenant_id ON financial_audit_log(tenant_id);
CREATE INDEX idx_financial_audit_created_at ON financial_audit_log(tenant_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  priority     VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  data         JSONB,
  is_read      BOOLEAN DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,
  channel      VARCHAR(20) NOT NULL DEFAULT 'websocket',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  order_ready      BOOLEAN DEFAULT TRUE,
  new_order        BOOLEAN DEFAULT TRUE,
  table_status     BOOLEAN DEFAULT TRUE,
  low_stock        BOOLEAN DEFAULT TRUE,
  system_alerts    BOOLEAN DEFAULT TRUE,
  shift_reminders  BOOLEAN DEFAULT TRUE,
  payment_received BOOLEAN DEFAULT TRUE,
  sound_enabled    BOOLEAN DEFAULT TRUE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF SCHEDULES & PERFORMANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  shift_type   VARCHAR(20),
  notes        TEXT,
  is_clocked_in  BOOLEAN DEFAULT FALSE,
  clocked_in_at  TIMESTAMPTZ,
  clocked_out_at TIMESTAMPTZ,
  hours_worked   DECIMAL(5, 2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_schedules_tenant_id ON staff_schedules(tenant_id);
CREATE INDEX idx_staff_schedules_user_date ON staff_schedules(user_id, date);

CREATE TABLE IF NOT EXISTS staff_performance (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  orders_handled    INTEGER NOT NULL DEFAULT 0,
  revenue_generated DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  average_order_time DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  items_prepared    INTEGER NOT NULL DEFAULT 0,
  rating            DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_performance_tenant_id ON staff_performance(tenant_id);
CREATE INDEX idx_staff_performance_user_date ON staff_performance(user_id, date);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category       VARCHAR(50) NOT NULL,
  action         VARCHAR(255) NOT NULL,
  user_id        UUID REFERENCES users(id),
  user_email     VARCHAR(255),
  entity_type    VARCHAR(100),
  entity_id      UUID,
  previous_state JSONB,
  new_state      JSONB,
  description    TEXT,
  ip_address     VARCHAR(50),
  user_agent     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- SYNC / OFFLINE QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_metadata (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id     VARCHAR(200) NOT NULL,
  entity_type   VARCHAR(100) NOT NULL,
  last_sync_at  TIMESTAMPTZ,
  sync_version  BIGINT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, device_id, entity_type)
);

CREATE INDEX idx_sync_metadata_tenant_id ON sync_metadata(tenant_id);

CREATE TABLE IF NOT EXISTS sync_operations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id       VARCHAR(200) NOT NULL,
  operation_type  VARCHAR(20) NOT NULL CHECK (operation_type IN ('create','update','delete')),
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       UUID,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','failed','conflict')),
  conflict_data   JSONB,
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_operations_tenant_id ON sync_operations(tenant_id);
CREATE INDEX idx_sync_operations_device ON sync_operations(device_id, status);

CREATE TABLE IF NOT EXISTS offline_queue (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id        VARCHAR(200) NOT NULL,
  operation_type   VARCHAR(20) NOT NULL,
  entity_type      VARCHAR(100) NOT NULL,
  entity_id        UUID,
  payload          JSONB NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','failed','conflict')),
  error_message    TEXT,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  client_timestamp TIMESTAMPTZ NOT NULL,
  received_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offline_queue_tenant_id ON offline_queue(tenant_id);
CREATE INDEX idx_offline_queue_device_status ON offline_queue(device_id, status);

-- ============================================================
-- PRINTERS & PRINT JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS printers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  printer_type VARCHAR(20) NOT NULL CHECK (printer_type IN ('kitchen','bar','receipt','label')),
  ip_address   VARCHAR(50),
  port         VARCHAR(10),
  is_online    BOOLEAN DEFAULT TRUE,
  is_default   BOOLEAN DEFAULT TRUE,
  paper_width  INTEGER DEFAULT 80,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_printers_tenant_id ON printers(tenant_id);

CREATE TABLE IF NOT EXISTS print_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  printer_id    UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('kitchen_ticket','receipt','invoice','daily_report')),
  content       TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','printing','completed','failed','cancelled')),
  retry_count   INTEGER NOT NULL DEFAULT 0,
  max_retries   INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  printed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_print_jobs_tenant_id ON print_jobs(tenant_id);
CREATE INDEX idx_print_jobs_printer_status ON print_jobs(printer_id, status);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants', 'branches', 'users', 'subscriptions',
    'menu_items', 'tables', 'customers', 'orders', 'order_items',
    'payments', 'notifications', 'notification_preferences',
    'staff_schedules', 'printers', 'print_jobs'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
