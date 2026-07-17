-- =====================================================================
-- Migration: Normalize, Secure, and Optimize Shipplix Database
-- Target Database: Supabase (PostgreSQL 15+)
-- Description:
--   This migration normalizes the un-normalized 'shipments' table schema.
--   It unpacks embedded JSONB lists (milestones, notifications, notes, documents,
--   payments, and audit logs) into dedicated 3NF relational tables,
--   establishing referential integrity constraints, high-performance indexes,
--   and fine-grained Row-Level Security (RLS) policies.
--
-- Backward Compatibility is preserved:
--   - Existing columns are modified or migrated without dropping crucial data.
--   - Row-level data migration script is provided to unpack pre-existing JSONB data.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. EXTENSIONS SETUP
-- =====================================================================
-- Install pg_trgm for fast fuzzy-searching capabilities if not enabled
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Install uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 2. CREATE NORMALIZED TABLES
-- =====================================================================

-- 2.1 Core Shipments Table (Schema Alignment/Verification)
-- Ensure base shipments table exists with correct column types
CREATE TABLE IF NOT EXISTS shipments (
    tracking_number VARCHAR(50) PRIMARY KEY,
    reference_number VARCHAR(100),
    sender_name VARCHAR(150) NOT NULL,
    receiver_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    origin_country VARCHAR(100) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    weight NUMERIC(10, 2) NOT NULL CHECK (weight > 0),
    number_of_packages INTEGER NOT NULL CHECK (number_of_packages > 0),
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('Express', 'Standard', 'Economy')),
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE NOT NULL,
    shipment_notes TEXT,
    current_milestone_index INTEGER NOT NULL DEFAULT 0 CHECK (current_milestone_index >= 0 AND current_milestone_index <= 23),
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    port_gateway VARCHAR(100) DEFAULT '',
    shipment_health VARCHAR(30) NOT NULL DEFAULT 'optimal' CHECK (shipment_health IN ('optimal', 'delayed', 'action_required', 'critical')),
    delay_status VARCHAR(100) DEFAULT 'None',
    
    -- Maintain JSONB columns temporarily for fallback/compatibility, but mark as deprecated in documentation
    milestone_history JSONB DEFAULT '[]'::jsonb,
    notifications JSONB DEFAULT '[]'::jsonb,
    internal_notes JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    payment_history JSONB,
    audit_logs JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Table: shipment_milestone_histories (One-to-Many)
CREATE TABLE IF NOT EXISTS shipment_milestone_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    milestone_index INTEGER NOT NULL CHECK (milestone_index >= 0 AND milestone_index <= 23),
    milestone_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate milestone entries for a shipment at the same index
    UNIQUE (shipment_id, milestone_index)
);

-- 2.3 Table: shipment_notifications (One-to-Many)
CREATE TABLE IF NOT EXISTS shipment_notifications (
    id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'whatsapp')),
    recipient VARCHAR(150) NOT NULL,
    milestone_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'pending', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Table: shipment_internal_notes (One-to-Many)
CREATE TABLE IF NOT EXISTS shipment_internal_notes (
    id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    author VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Table: shipment_documents (One-to-Many)
CREATE TABLE IF NOT EXISTS shipment_documents (
    id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('invoice', 'receipt', 'image', 'attachment')),
    url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    size VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Table: shipment_payments (One-to-One Summary)
CREATE TABLE IF NOT EXISTS shipment_payments (
    shipment_id VARCHAR(50) PRIMARY KEY REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partially_paid')),
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_due >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_amounts CHECK (amount_paid <= amount_due)
);

-- 2.7 Table: shipment_payment_transactions (One-to-Many)
CREATE TABLE IF NOT EXISTS shipment_payment_transactions (
    id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method VARCHAR(100) NOT NULL,
    reference VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Table: shipment_audit_logs (One-to-Many Local Logs)
CREATE TABLE IF NOT EXISTS shipment_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(tracking_number) ON DELETE CASCADE,
    action VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT,
    author VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Table: admin_audit_logs (Administrative Audit Ledger)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    admin VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(150) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. AUTOMATED DATA MIGRATION SCRIPT (UNPACK JSONB DATA GRACEFULLY)
-- =====================================================================

-- 3.1 Migrate Milestone History
INSERT INTO shipment_milestone_histories (shipment_id, milestone_index, milestone_name, description, timestamp)
SELECT 
    s.tracking_number,
    (m->>'milestoneIndex')::integer,
    m->>'milestoneName',
    m->>'description',
    (m->>'timestamp')::timestamptz
FROM shipments s,
LATERAL jsonb_array_elements(s.milestone_history) AS m
ON CONFLICT (shipment_id, milestone_index) DO NOTHING;

-- 3.2 Migrate Notifications
INSERT INTO shipment_notifications (id, shipment_id, timestamp, type, recipient, milestone_name, status)
SELECT 
    n->>'id',
    s.tracking_number,
    (n->>'timestamp')::timestamptz,
    (n->>'type')::varchar,
    n->>'recipient',
    n->>'milestoneName',
    (n->>'status')::varchar
FROM shipments s,
LATERAL jsonb_array_elements(s.notifications) AS n
ON CONFLICT (id) DO NOTHING;

-- 3.3 Migrate Internal Notes
INSERT INTO shipment_internal_notes (id, shipment_id, text, timestamp, author)
SELECT 
    i->>'id',
    s.tracking_number,
    i->>'text',
    (i->>'timestamp')::timestamptz,
    i->>'author'
FROM shipments s,
LATERAL jsonb_array_elements(s.internal_notes) AS i
ON CONFLICT (id) DO NOTHING;

-- 3.4 Migrate Documents
INSERT INTO shipment_documents (id, shipment_id, name, type, url, uploaded_at, size)
SELECT 
    d->>'id',
    s.tracking_number,
    d->>'name',
    (d->>'type')::varchar,
    d->>'url',
    (d->>'uploadedAt')::timestamptz,
    d->>'size'
FROM shipments s,
LATERAL jsonb_array_elements(s.documents) AS d
ON CONFLICT (id) DO NOTHING;

-- 3.5 Migrate Payment Summaries and Payment Transactions
-- Unpack payment summary
INSERT INTO shipment_payments (shipment_id, status, amount_due, amount_paid)
SELECT 
    s.tracking_number,
    COALESCE(s.payment_history->>'status', 'pending')::varchar,
    COALESCE(s.payment_history->>'amountDue', '0.00')::numeric,
    COALESCE(s.payment_history->>'amountPaid', '0.00')::numeric
FROM shipments s
WHERE s.payment_history IS NOT NULL
ON CONFLICT (shipment_id) DO UPDATE SET
    status = EXCLUDED.status,
    amount_due = EXCLUDED.amount_due,
    amount_paid = EXCLUDED.amount_paid;

-- Unpack payment transactions
INSERT INTO shipment_payment_transactions (id, shipment_id, amount, date, method, reference)
SELECT 
    t->>'id',
    s.tracking_number,
    (t->>'amount')::numeric,
    (t->>'date')::date,
    t->>'method',
    t->>'reference'
FROM shipments s,
LATERAL jsonb_array_elements(COALESCE(s.payment_history->'transactions', '[]'::jsonb)) AS t
ON CONFLICT (id) DO NOTHING;

-- 3.6 Migrate Shipment Local Audit Logs
INSERT INTO shipment_audit_logs (id, shipment_id, action, timestamp, details, author)
SELECT 
    a->>'id',
    s.tracking_number,
    a->>'action',
    (a->>'timestamp')::timestamptz,
    a->>'details',
    a->>'author'
FROM shipments s,
LATERAL jsonb_array_elements(s.audit_logs) AS a
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 4. HIGH-PERFORMANCE INDEX CREATION (B-TREE & GIN)
-- =====================================================================

-- 4.1 B-Tree Indexes on foreign keys to accelerate joins and deletions
CREATE INDEX IF NOT EXISTS idx_milestone_history_shipment_id ON shipment_milestone_histories (shipment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_shipment_id ON shipment_notifications (shipment_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_shipment_id ON shipment_internal_notes (shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_shipment_id ON shipment_documents (shipment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_shipment_id ON shipment_payment_transactions (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_audit_logs_shipment_id ON shipment_audit_logs (shipment_id);

-- 4.2 B-Tree Indexes on commonly filtered and sorted metadata columns
CREATE INDEX IF NOT EXISTS idx_shipments_booking_date ON shipments (booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_service_type ON shipments (service_type);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_health ON shipments (shipment_health);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON admin_audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs (admin);

-- 4.3 Functional/Case-Insensitive Indexes for customer name searches
CREATE INDEX IF NOT EXISTS idx_shipments_lower_sender ON shipments (lower(sender_name));
CREATE INDEX IF NOT EXISTS idx_shipments_lower_receiver ON shipments (lower(receiver_name));

-- 4.4 Trigram GIN Indexes for fast fuzzy search on names and reference numbers
CREATE INDEX IF NOT EXISTS idx_shipments_trgm_sender ON shipments USING gin (sender_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shipments_trgm_receiver ON shipments USING gin (receiver_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shipments_trgm_ref ON shipments USING gin (reference_number gin_trgm_ops);

-- =====================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_milestone_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies for 'shipments' table
CREATE POLICY "Allow public select tracking by tracking number" ON shipments
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to shipments" ON shipments
    FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.2 Policies for 'shipment_milestone_histories' table
CREATE POLICY "Allow public select of milestone history" ON shipment_milestone_histories
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to milestone histories" ON shipment_milestone_histories
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.3 Policies for 'shipment_notifications' table
CREATE POLICY "Allow admin full access to notifications" ON shipment_notifications
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.4 Policies for 'shipment_internal_notes' table (strictly admin-only, no public select!)
CREATE POLICY "Allow admin full access to internal notes" ON shipment_internal_notes
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.5 Policies for 'shipment_documents' table
CREATE POLICY "Allow public select of documents" ON shipment_documents
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to documents" ON shipment_documents
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.6 Policies for 'shipment_payments' table
CREATE POLICY "Allow public select of payment summaries" ON shipment_payments
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to payment summaries" ON shipment_payments
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.7 Policies for 'shipment_payment_transactions' table
CREATE POLICY "Allow public select of payment transactions" ON shipment_payment_transactions
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to payment transactions" ON shipment_payment_transactions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.8 Policies for 'shipment_audit_logs' table (strictly admin-only, no public select!)
CREATE POLICY "Allow admin full access to shipment audit logs" ON shipment_audit_logs
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- 5.9 Policies for 'admin_audit_logs' table (strictly admin-only, no public select!)
CREATE POLICY "Allow admin full access to admin audit ledger" ON admin_audit_logs
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%@shipplix.com')
    WITH CHECK (auth.jwt() ->> 'email' LIKE '%@shipplix.com');

-- =====================================================================
-- 6. CREATE DB-SIDE TRIGGERS FOR METADATA INTEGRITY & PERFORMANCE
-- =====================================================================

-- Auto-update updated_at timestamp on record updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shipments_timestamp
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_update_shipment_payments_timestamp
    BEFORE UPDATE ON shipment_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

COMMIT;
