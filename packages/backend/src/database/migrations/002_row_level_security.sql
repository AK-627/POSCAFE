-- ============================================================
-- Migration 002: Row-Level Security (RLS) Policies
-- Enforces tenant isolation at the database level
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- APP ROLE for runtime tenant context
-- ============================================================
-- The application sets current_setting('app.current_tenant_id')
-- before executing tenant-scoped queries.

-- Helper function to get the current tenant id from session
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- RLS POLICIES - one per table using the tenant_id column
-- ============================================================

-- Macro-like helper: we create SELECT/INSERT/UPDATE/DELETE policies
-- for each tenant-scoped table.

-- branches
CREATE POLICY tenant_isolation ON branches
  USING (tenant_id = current_tenant_id());

-- users
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_tenant_id());

-- subscriptions
CREATE POLICY tenant_isolation ON subscriptions
  USING (tenant_id = current_tenant_id());

-- subscription_invoices
CREATE POLICY tenant_isolation ON subscription_invoices
  USING (tenant_id = current_tenant_id());

-- menu_categories
CREATE POLICY tenant_isolation ON menu_categories
  USING (tenant_id = current_tenant_id());

-- menu_items
CREATE POLICY tenant_isolation ON menu_items
  USING (tenant_id = current_tenant_id());

-- table_groups
CREATE POLICY tenant_isolation ON table_groups
  USING (tenant_id = current_tenant_id());

-- tables
CREATE POLICY tenant_isolation ON tables
  USING (tenant_id = current_tenant_id());

-- customers
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = current_tenant_id());

-- orders
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_tenant_id());

-- order_items (via parent order's tenant)
CREATE POLICY tenant_isolation ON order_items
  USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = current_tenant_id()
    )
  );

-- payments
CREATE POLICY tenant_isolation ON payments
  USING (tenant_id = current_tenant_id());

-- invoices
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_tenant_id());

-- financial_audit_log
CREATE POLICY tenant_isolation ON financial_audit_log
  USING (tenant_id = current_tenant_id());

-- notifications
CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id = current_tenant_id());

-- notification_preferences
CREATE POLICY tenant_isolation ON notification_preferences
  USING (tenant_id = current_tenant_id());

-- staff_schedules
CREATE POLICY tenant_isolation ON staff_schedules
  USING (tenant_id = current_tenant_id());

-- staff_performance
CREATE POLICY tenant_isolation ON staff_performance
  USING (tenant_id = current_tenant_id());

-- audit_logs
CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_tenant_id());

-- sync_metadata
CREATE POLICY tenant_isolation ON sync_metadata
  USING (tenant_id = current_tenant_id());

-- sync_operations
CREATE POLICY tenant_isolation ON sync_operations
  USING (tenant_id = current_tenant_id());

-- offline_queue
CREATE POLICY tenant_isolation ON offline_queue
  USING (tenant_id = current_tenant_id());

-- printers
CREATE POLICY tenant_isolation ON printers
  USING (tenant_id = current_tenant_id());

-- print_jobs
CREATE POLICY tenant_isolation ON print_jobs
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- BYPASS ROLE for migrations & superadmin operations
-- (The application DB user must be a superuser OR have BYPASSRLS)
-- In production: create a separate 'app_admin' role for migrations
-- and 'app_user' role for runtime.
-- ============================================================

-- Example (run as superuser during initial setup):
-- CREATE ROLE app_user NOLOGIN;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- CREATE ROLE app_admin NOLOGIN BYPASSRLS;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
