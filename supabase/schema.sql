-- =============================================================================
-- LedgerWatch — Supabase / PostgreSQL Database Schema
-- Track: PS06 — Transaction Risk Investigation Assistant
-- =============================================================================
-- Run this in your Supabase SQL Editor or via psql:
--   psql -h db.<project>.supabase.co -U postgres -d postgres -f supabase/schema.sql
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fast text search on payee/description
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

CREATE TYPE payment_channel AS ENUM (
    'UPI',
    'card',
    'netbanking',
    'ATM'
);

CREATE TYPE verdict_type AS ENUM (
    'attention_needed',
    'nothing_flagged'
);

CREATE TYPE rule_name AS ENUM (
    'rule_large_transfer',
    'rule_burst_new_payee',
    'rule_odd_hours',
    'rule_pattern_break'
);

CREATE TYPE severity_level AS ENUM (
    'critical',   -- score 80-100
    'high',       -- score 60-79
    'medium',     -- score 40-59
    'low'         -- score 1-39
);

-- =============================================================================
-- 2. CUSTOMERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id      VARCHAR(50)   NOT NULL UNIQUE,   -- e.g. "customer_A"
    display_name     VARCHAR(100)  NOT NULL,           -- e.g. "Customer A"
    profile_type     VARCHAR(50)   NOT NULL,           -- clean | suspicious | borderline | pattern_break
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Master list of customers tracked by LedgerWatch.';
COMMENT ON COLUMN customers.customer_id IS 'Short identifier used in API routes and CSV filenames (e.g. customer_A).';
COMMENT ON COLUMN customers.profile_type IS 'Synthetic anomaly profile label for the hackathon dataset.';

-- =============================================================================
-- 3. TRANSACTIONS TABLE
-- Mirrors the 7-column CSV schema defined in data/schema.md
-- =============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id   VARCHAR(20)     NOT NULL,            -- TXN-XXXX
    customer_id      VARCHAR(50)     NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    date             DATE            NOT NULL,             -- YYYY-MM-DD
    time             TIME            NOT NULL,             -- HH:MM:SS (24-hour, IST)
    description      TEXT            NOT NULL,
    payee            VARCHAR(200)    NOT NULL,
    amount           NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    channel          payment_channel NOT NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Composite unique: one TXN-XXXX per customer
    CONSTRAINT uq_transaction_per_customer UNIQUE (customer_id, transaction_id)
);

COMMENT ON TABLE transactions IS 'All financial transactions for every tracked customer. Mirrors CSV columns exactly.';
COMMENT ON COLUMN transactions.transaction_id IS 'Human-readable ID from CSV (TXN-XXXX). Not globally unique — scoped to customer_id.';
COMMENT ON COLUMN transactions.time IS 'Local IST time (UTC+5:30). Used for odd-hours rule.';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in Indian Rupees (INR).';

-- =============================================================================
-- 4. CUSTOMER BASELINES TABLE
-- Stores computed profiling metrics from server/baseline.py
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_baselines (
    id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id           VARCHAR(50)   NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    computed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Amount statistics
    amount_mean           NUMERIC(12, 2),
    amount_std            NUMERIC(12, 2),
    amount_min            NUMERIC(12, 2),
    amount_max            NUMERIC(12, 2),
    amount_p95            NUMERIC(12, 2),   -- 95th percentile

    -- Active hour window (24-hour integers, e.g. 8 to 22)
    active_hour_start     SMALLINT       CHECK (active_hour_start BETWEEN 0 AND 23),
    active_hour_end       SMALLINT       CHECK (active_hour_end BETWEEN 0 AND 23),

    -- History quality flag
    insufficient_history  BOOLEAN        NOT NULL DEFAULT FALSE,

    -- Transaction volume stats
    total_transactions    INTEGER,
    date_span_days        INTEGER,
    avg_weekly_txns       NUMERIC(8, 2),

    -- Channel distribution (stored as JSONB: {"UPI": 0.6, "card": 0.3, ...})
    channel_distribution  JSONB,

    -- Payee registry (stored as JSONB: {"PayeeName": "YYYY-MM-DD", ...} first-seen dates)
    payee_first_seen      JSONB,

    CONSTRAINT uq_baseline_per_customer UNIQUE (customer_id)
);

COMMENT ON TABLE customer_baselines IS 'Computed behavioral baselines per customer. Refreshed on each investigation run.';
COMMENT ON COLUMN customer_baselines.payee_first_seen IS 'JSONB map of payee name → first-seen date string (YYYY-MM-DD).';
COMMENT ON COLUMN customer_baselines.channel_distribution IS 'JSONB map of channel → fraction (0.0–1.0) of total transactions.';

-- =============================================================================
-- 5. INVESTIGATIONS TABLE
-- Audit log of every /api/investigate call
-- =============================================================================

CREATE TABLE IF NOT EXISTS investigations (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     VARCHAR(50)   NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    run_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    verdict         verdict_type  NOT NULL,
    finding_count   INTEGER       NOT NULL DEFAULT 0,
    gemini_used     BOOLEAN       NOT NULL DEFAULT FALSE,   -- TRUE if LLM call succeeded
    duration_ms     INTEGER,                                -- pipeline execution time
    raw_response    JSONB                                   -- full JSON response snapshot
);

COMMENT ON TABLE investigations IS 'Immutable audit log of every investigation run. One row per API call.';
COMMENT ON COLUMN investigations.gemini_used IS 'Whether the Gemini LLM was successfully called (vs deterministic fallback).';
COMMENT ON COLUMN investigations.raw_response IS 'Full JSON payload returned to the client, stored for audit replay.';

-- =============================================================================
-- 6. FINDINGS TABLE
-- Individual risk findings produced by the rule pipeline
-- =============================================================================

CREATE TABLE IF NOT EXISTS findings (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id  UUID          NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    customer_id       VARCHAR(50)   NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    finding_ref       VARCHAR(20)   NOT NULL,   -- e.g. "F001", "F002"

    -- Rule that triggered this finding
    rule              rule_name     NOT NULL,

    -- Scoring
    severity_score    SMALLINT      NOT NULL CHECK (severity_score BETWEEN 1 AND 100),
    severity_level    severity_level NOT NULL,

    -- Evidence
    transaction_ids   TEXT[]        NOT NULL,   -- Array of TXN-XXXX IDs
    observed_value    TEXT,                     -- e.g. "4 transactions in 3 days"
    baseline_value    TEXT,                     -- e.g. "avg 1.2 transactions/week per payee"

    -- Narrative
    narrative         TEXT,                     -- LLM or fallback narration
    action_tip        TEXT,                     -- Investigator guidance

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE findings IS 'Individual risk findings per investigation, one row per correlated finding group.';
COMMENT ON COLUMN findings.transaction_ids IS 'PostgreSQL array of TXN-XXXX IDs that triggered this finding.';
COMMENT ON COLUMN findings.severity_score IS 'Score 1–100 based on deviation ratio; higher = more severe.';

-- =============================================================================
-- 7. RULE_HITS TABLE
-- Raw, uncorrelated hits from each rule before grouping (for full audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS rule_hits (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID          NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    customer_id      VARCHAR(50)   NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    transaction_id   VARCHAR(20)   NOT NULL,
    rule             rule_name     NOT NULL,
    deviation_ratio  NUMERIC(10, 4),            -- e.g. 3.72 means 3.72× above threshold
    detail           JSONB,                     -- rule-specific detail payload
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rule_hits IS 'Every individual raw rule hit before correlation/deduplication. Full audit trail.';

-- =============================================================================
-- 8. INDEXES
-- =============================================================================

-- Transactions: fast lookup by customer + date range (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_customer_date
    ON transactions (customer_id, date DESC);

-- Transactions: fast lookup by payee name (burst/new-payee rule)
CREATE INDEX IF NOT EXISTS idx_transactions_payee
    ON transactions USING gin (payee gin_trgm_ops);

-- Transactions: lookup by specific transaction_id within a customer
CREATE INDEX IF NOT EXISTS idx_transactions_txn_id
    ON transactions (customer_id, transaction_id);

-- Transactions: time-based queries for odd-hours rule
CREATE INDEX IF NOT EXISTS idx_transactions_time
    ON transactions (time);

-- Transactions: channel-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_channel
    ON transactions (customer_id, channel);

-- Investigations: latest run per customer (for dashboard)
CREATE INDEX IF NOT EXISTS idx_investigations_customer_time
    ON investigations (customer_id, run_at DESC);

-- Findings: lookup all findings for an investigation
CREATE INDEX IF NOT EXISTS idx_findings_investigation
    ON findings (investigation_id);

-- Findings: lookup by rule across customers
CREATE INDEX IF NOT EXISTS idx_findings_rule
    ON findings (rule, severity_score DESC);

-- Rule hits: lookup by investigation
CREATE INDEX IF NOT EXISTS idx_rule_hits_investigation
    ON rule_hits (investigation_id);

-- =============================================================================
-- 9. UPDATED_AT TRIGGER
-- Auto-updates updated_at column on customers table
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- Supabase RLS policies — safe defaults for anon + service_role access
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_baselines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_hits              ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------
-- service_role bypass (backend server uses this)
-- service_role already bypasses RLS in Supabase by default.
-- Policies below are for anon / authenticated roles.
-- -------------------------------------------------

-- customers: public read (needed for dropdown population)
CREATE POLICY "anon_read_customers"
    ON customers FOR SELECT
    TO anon
    USING (TRUE);

-- transactions: public read (audit trail display)
CREATE POLICY "anon_read_transactions"
    ON transactions FOR SELECT
    TO anon
    USING (TRUE);

-- investigations: public read (investigation results)
CREATE POLICY "anon_read_investigations"
    ON investigations FOR SELECT
    TO anon
    USING (TRUE);

-- findings: public read
CREATE POLICY "anon_read_findings"
    ON findings FOR SELECT
    TO anon
    USING (TRUE);

-- customer_baselines: public read
CREATE POLICY "anon_read_baselines"
    ON customer_baselines FOR SELECT
    TO anon
    USING (TRUE);

-- rule_hits: restrict raw audit trail to service_role only (no anon reads)
-- (No anon policy = anon cannot read rule_hits)

-- Write policies: only service_role (backend) can INSERT/UPDATE/DELETE
-- service_role bypasses RLS by default in Supabase — no explicit policy needed.

-- =============================================================================
-- 11. VIEWS
-- Convenience views for the dashboard and API layer
-- =============================================================================

-- Latest investigation result per customer
CREATE OR REPLACE VIEW v_latest_investigations AS
SELECT DISTINCT ON (customer_id)
    i.id,
    i.customer_id,
    c.display_name,
    i.run_at,
    i.verdict,
    i.finding_count,
    i.gemini_used,
    i.duration_ms
FROM investigations i
JOIN customers c ON c.customer_id = i.customer_id
ORDER BY customer_id, run_at DESC;

COMMENT ON VIEW v_latest_investigations IS 'Most recent investigation result for each customer. Used by the dashboard summary.';

-- Finding summary with transaction count
CREATE OR REPLACE VIEW v_finding_summary AS
SELECT
    f.id,
    f.investigation_id,
    f.customer_id,
    f.finding_ref,
    f.rule::TEXT             AS rule,
    f.severity_score,
    f.severity_level::TEXT   AS severity_level,
    array_length(f.transaction_ids, 1) AS affected_transactions,
    f.observed_value,
    f.baseline_value,
    f.action_tip,
    f.created_at
FROM findings f
ORDER BY f.severity_score DESC;

COMMENT ON VIEW v_finding_summary IS 'Findings with affected transaction count, ordered by severity. Used by FindingCard component.';

-- =============================================================================
-- 12. SEED: CUSTOMER MASTER DATA
-- =============================================================================

INSERT INTO customers (customer_id, display_name, profile_type) VALUES
    ('customer_A', 'Customer A', 'clean'),
    ('customer_B', 'Customer B', 'suspicious'),
    ('customer_C', 'Customer C', 'borderline'),
    ('customer_D', 'Customer D', 'pattern_break')
ON CONFLICT (customer_id) DO NOTHING;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
