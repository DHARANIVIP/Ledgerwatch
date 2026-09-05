-- =============================================================================
-- LedgerWatch — Supabase Seed Data (Optional / Testing Only)
-- Run AFTER schema.sql
-- =============================================================================
-- This file inserts a minimal set of sample transactions for smoke-testing
-- the database layer without running the full data_gen.py pipeline.
-- For real data, run: python server/data_gen.py
-- =============================================================================

-- Customer A: sample clean transactions
INSERT INTO transactions (transaction_id, customer_id, date, time, description, payee, amount, channel) VALUES
('TXN-0001', 'customer_A', '2024-01-03', '09:15:22', 'Monthly salary credit',        'TechCorp Pvt Ltd',      45000.00, 'netbanking'),
('TXN-0002', 'customer_A', '2024-01-05', '10:30:00', 'Electricity bill payment',     'BESCOM',                 1850.00, 'UPI'),
('TXN-0003', 'customer_A', '2024-01-07', '11:20:45', 'Grocery shopping',             'DMart',                   3200.00, 'card'),
('TXN-0004', 'customer_A', '2024-01-10', '14:05:11', 'Mobile recharge',              'Airtel',                   599.00, 'UPI'),
('TXN-0005', 'customer_A', '2024-01-15', '16:45:33', 'OTT subscription',             'Netflix India',            649.00, 'card')
ON CONFLICT (customer_id, transaction_id) DO NOTHING;

-- Customer B: sample suspicious transactions
INSERT INTO transactions (transaction_id, customer_id, date, time, description, payee, amount, channel) VALUES
('TXN-0001', 'customer_B', '2024-01-03', '09:00:00', 'Salary credit',                'Employer Ltd',          50000.00, 'netbanking'),
('TXN-0002', 'customer_B', '2024-01-06', '11:30:00', 'Grocery',                      'BigBasket',               2100.00, 'UPI'),
-- Burst new payee (3 transactions in 3 days to a new payee)
('TXN-0041', 'customer_B', '2024-04-10', '13:22:10', 'Transfer to new contact',      'QuickPay Wallet',        8000.00, 'UPI'),
('TXN-0042', 'customer_B', '2024-04-11', '14:05:33', 'Transfer to new contact',      'QuickPay Wallet',        7500.00, 'UPI'),
('TXN-0043', 'customer_B', '2024-04-12', '15:18:44', 'Transfer to new contact',      'QuickPay Wallet',        9200.00, 'UPI'),
-- Large transfer (10x outlier)
('TXN-0044', 'customer_B', '2024-04-13', '10:00:00', 'Large fund transfer',          'Unknown Beneficiary', 480000.00, 'netbanking'),
-- Odd hours
('TXN-0045', 'customer_B', '2024-04-14', '03:20:17', 'Late night transfer',          'QuickPay Wallet',       15000.00, 'UPI')
ON CONFLICT (customer_id, transaction_id) DO NOTHING;

-- Customer C: single odd-hours hit
INSERT INTO transactions (transaction_id, customer_id, date, time, description, payee, amount, channel) VALUES
('TXN-0001', 'customer_C', '2024-01-04', '10:00:00', 'Salary',                       'ABC Corp',              40000.00, 'netbanking'),
('TXN-0002', 'customer_C', '2024-01-08', '12:30:00', 'Utility bill',                 'Tata Power',             1200.00, 'UPI'),
-- Single odd-hours transaction
('TXN-0058', 'customer_C', '2024-03-22', '02:45:10', 'Emergency transfer',           'Family Member',          5000.00, 'UPI')
ON CONFLICT (customer_id, transaction_id) DO NOTHING;

-- Customer D: pattern break — small UPI then large netbanking surge
INSERT INTO transactions (transaction_id, customer_id, date, time, description, payee, amount, channel) VALUES
('TXN-0001', 'customer_D', '2024-01-05', '09:30:00', 'Food delivery',                'Swiggy',                   320.00, 'UPI'),
('TXN-0002', 'customer_D', '2024-01-09', '13:15:00', 'Auto fare',                    'Ola',                       180.00, 'UPI'),
('TXN-0003', 'customer_D', '2024-01-15', '11:00:00', 'Recharge',                     'Jio',                       239.00, 'UPI'),
-- Surge begins (month 5 onwards)
('TXN-0091', 'customer_D', '2024-05-01', '10:00:00', 'Large transfer',               'Investment Account',    65000.00, 'netbanking'),
('TXN-0092', 'customer_D', '2024-05-02', '11:00:00', 'Large transfer',               'Investment Account',    72000.00, 'netbanking'),
('TXN-0093', 'customer_D', '2024-05-03', '10:30:00', 'Large transfer',               'Investment Account',    58000.00, 'netbanking')
ON CONFLICT (customer_id, transaction_id) DO NOTHING;
