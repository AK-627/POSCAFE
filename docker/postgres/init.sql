-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row-Level Security
ALTER SYSTEM SET row_security = on;

-- Create tenant schema template
CREATE SCHEMA IF NOT EXISTS tenant_template;
SET search_path TO tenant_template;

-- Create all tables in tenant_template schema
-- (This will be copied for each new tenant)

-- Tenants table (in public schema)
SET search_path TO public;
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_id UUID, tenant_name TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'tenant_' || REPLACE(tenant_id::text, '-', '_');
    
    -- Create schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(schema_name);
    
    -- Copy structure from template
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.users AS TABLE tenant_template.users WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.menu_categories AS TABLE tenant_template.menu_categories WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.menu_items AS TABLE tenant_template.menu_items WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.tables AS TABLE tenant_template.tables WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.orders AS TABLE tenant_template.orders WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.order_items AS TABLE tenant_template.order_items WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.payments AS TABLE tenant_template.payments WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.invoices AS TABLE tenant_template.invoices WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.customers AS TABLE tenant_template.customers WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.audit_logs AS TABLE tenant_template.audit_logs WITH NO DATA';
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.sync_metadata AS TABLE tenant_template.sync_metadata WITH NO DATA';
    
    -- Add indexes
    -- (Indexes will be created in application migrations)
    
    RAISE NOTICE 'Created schema % for tenant % (%)', schema_name, tenant_id, tenant_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO skynether;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO skynether;
GRANT EXECUTE ON FUNCTION create_tenant_schema TO skynether;