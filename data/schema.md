# LedgerWatch Transaction History Data Schema

All customer transaction files reside in `data/customers/{customer_id}.csv`.

| Field Name | Type | Constraints / Format | Description |
| :--- | :--- | :--- | :--- |
| `transaction_id` | String | Format: `TXN-{CUST_LETTER}-{INDEX:04d}` (e.g., `TXN-A-0001`) | Globally unique transaction identifier for audit traceability. |
| `date` | String | ISO 8601 Date (`YYYY-MM-DD`) | Calendar date on which the transaction cleared. |
| `time` | String | 24-Hour Format (`HH:MM:SS`) | Local timestamp of transaction execution. |
| `description` | String | ASCII Text, max 120 chars | Human-readable transfer narrative, purchase summary, or purpose. |
| `payee` | String | ASCII Alphanumeric string | Receiving beneficiary, entity, merchant, or internal counterparty. |
| `amount` | Float | Floating point with 2 decimals, `amount > 0.00` | Value of transaction in standard currency units. |
| `channel` | String | Enum: `UPI` \| `card` \| `netbanking` \| `ATM` | Initiation rail utilized for the transaction. |

---

## Edge Case Handling Protocol

1. **Malformed Rows:** If a row contains non-parsable dates, null transaction IDs, or non-numeric amounts, skip the row, log the line index, and track `unparseable_rows_count` without aborting evaluation.
2. **Minimum History:** Evaluation requires at least 15 valid transactions across a calendar span of ≥ 14 days. Histories falling below this boundary yield an explicit `insufficient_history` response.

---

## Customer Dataset Profiles

| File | Rows | Span | Anomaly Profile | Expected Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `customer_A.csv` | ~140 | 5 months | None — 100% routine | `nothing_flagged` |
| `customer_B.csv` | ~150 | 5 months | Burst + large transfer + odd-hours | `attention_needed` |
| `customer_C.csv` | ~110 | 4 months | Single 02:45 AM transaction only | `attention_needed` (low) |
| `customer_D.csv` | ~130 | 4 months | Velocity + ticket size surge (×2.5) | `attention_needed` |

---

## Transaction ID Format

```
TXN-{CUST_LETTER}-{INDEX:04d}
```

Examples:
- `TXN-A-0001` — Customer A, first transaction
- `TXN-B-0042` — Customer B, 42nd transaction
- `TXN-C-0110` — Customer C, 110th transaction
- `TXN-D-0007` — Customer D, 7th transaction

---

## Channel Distribution (Customer A baseline)

| Channel | Fraction |
| :--- | :--- |
| UPI | 60% |
| card | 30% |
| netbanking | 10% |

---

## Rule Trigger Reference

| Rule | Columns Used | Trigger Condition |
| :--- | :--- | :--- |
| `rule_large_transfer` | `amount` | amount > μ + 3σ of customer baseline |
| `rule_burst_new_payee` | `date`, `payee` | ≥ 3 txns in 7 days to payee first seen ≤ 14 days ago |
| `rule_odd_hours` | `time` | Transaction hour outside customer's 95% active window |
| `rule_pattern_break` | `date`, `amount`, `channel` | Rolling 7-day velocity > 2.5× baseline average |
