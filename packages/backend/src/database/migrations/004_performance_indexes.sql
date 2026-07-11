-- ============================================================
-- Migration 004: Additional Performance Indexes
-- ============================================================

-- Orders — common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status_created
  ON orders(tenant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_paid_at
  ON orders(tenant_id, paid_at DESC)
  WHERE paid_at IS NOT NULL;

-- Order items — kitchen display queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_status_created
  ON order_items(status, created_at)
  WHERE status IN ('pending', 'preparing');

-- Payments — financial reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_created_status
  ON payments(tenant_id, created_at DESC, status);

-- Audit logs — retention queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_retention
  ON audit_logs(tenant_id, created_at)
  WHERE created_at < NOW() - INTERVAL '12 months';

-- Notifications — unread inbox
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON notifications(tenant_id, recipient_id, created_at DESC)
  WHERE is_read = FALSE AND is_dismissed = FALSE;

-- Sync operations — delta fetch
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_ops_tenant_timestamp
  ON sync_operations(tenant_id, timestamp DESC)
  WHERE status = 'applied';

-- Menu items — availability check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_available
  ON menu_items(tenant_id, category_id)
  WHERE is_available = TRUE;
