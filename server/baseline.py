"""
server/baseline.py
Computes customer-specific behavioral baseline metrics from the SQLite database.

Data source: repository.get_transactions_df(customer_id)
No CSV reads here — all data comes from the DB.

Metrics produced:
  amount_mean, amount_std, amount_p95
  active_hour_start, active_hour_end  (5th–95th percentile of transaction hours)
  payee_first_seen   {payee: "YYYY-MM-DD"}
  channel_distribution {channel: fraction}
  total_transactions, date_span_days, avg_weekly_txns
  insufficient_history (True if < 15 records or < 14-day span)
"""

from __future__ import annotations

from typing import Any

import numpy as np  # type: ignore
import pandas as pd  # type: ignore

from server.repository import get_transactions_df

# Minimum thresholds for a meaningful baseline
MIN_RECORDS   = 15
MIN_SPAN_DAYS = 14


def compute_baseline(customer_id: str) -> dict[str, Any]:
    """
    Returns a baseline dict for customer_id.
    Reads exclusively from the SQLite transactions table via repository.
    """
    df = get_transactions_df(customer_id)
    n  = len(df)

    if n == 0:
        return {
            "customer_id":        customer_id,
            "insufficient_history": True,
        }

    date_min   = df["date"].min().date()
    date_max   = df["date"].max().date()
    span_days  = (date_max - date_min).days
    insufficient = n < MIN_RECORDS or span_days < MIN_SPAN_DAYS

    # ── Amount statistics ──────────────────────────────────────────────────
    amounts      = df["amount"].values
    amount_mean  = float(np.mean(amounts))
    amount_std   = float(np.std(amounts, ddof=1)) if n > 1 else 0.0
    amount_p95   = float(np.percentile(amounts, 95))

    # ── Active hour window (5th–95th percentile) ───────────────────────────
    hours              = df["hour"].values
    active_hour_start  = int(np.percentile(hours, 5))
    active_hour_end    = int(np.percentile(hours, 95))

    # ── Payee first-seen registry ─────────────────────────────────────────
    df_sorted  = df.sort_values("date")
    payee_first = {
        str(payee): (d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10])
        for payee, d in df_sorted.groupby("payee")["date"].min().items()
    }

    # ── Channel distribution ──────────────────────────────────────────────
    channel_counts = df["channel"].value_counts(normalize=True)
    channel_dist   = {
        str(k): round(v, 4)
        for k, v in channel_counts.items()
    }

    # ── Weekly velocity ───────────────────────────────────────────────────
    avg_weekly = round((n / span_days) * 7, 2) if span_days > 0 else 0.0

    return {
        "customer_id":          customer_id,
        "insufficient_history": insufficient,
        "amount_mean":          round(amount_mean, 2),
        "amount_std":           round(amount_std,  2),
        "amount_p95":           round(amount_p95,  2),
        "active_hour_start":    active_hour_start,
        "active_hour_end":      active_hour_end,
        "payee_first_seen":     payee_first,
        "channel_distribution": channel_dist,
        "total_transactions":   n,
        "date_span_days":       span_days,
        "avg_weekly_txns":      avg_weekly,
    }


if __name__ == "__main__":
    import json
    for cid in ["customer_A", "customer_B", "customer_C", "customer_D"]:
        b = compute_baseline(cid)
        print(f"\n=== {cid} ===")
        print(json.dumps(b, indent=2, default=str))
