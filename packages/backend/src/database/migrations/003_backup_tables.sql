-- ============================================================
-- Migration 003: Backup & Restore Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS backups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  storage_key     VARCHAR(500),
  size_bytes      BIGINT NOT NULL DEFAULT 0,
  manifest        JSONB,
  is_encrypted    BOOLEAN NOT NULL DEFAULT TRUE,
  error_message   TEXT,
  triggered_by    VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backups_tenant_id ON backups(tenant_id);
CREATE INDEX idx_backups_created_at ON backups(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS restore_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_id         UUID NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
  requested_by      UUID NOT NULL REFERENCES users(id),
  reviewed_by       UUID REFERENCES users(id),
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
                    CHECK (status IN ('pending_approval','approved','rejected','in_progress','completed','failed')),
  reason            TEXT,
  rejection_reason  TEXT,
  reviewed_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restore_requests_tenant_id ON restore_requests(tenant_id);

-- RLS for new tables
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON backups
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation ON restore_requests
  USING (tenant_id = current_tenant_id());
