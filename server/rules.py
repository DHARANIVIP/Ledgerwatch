"""
server/rules.py
Pure deterministic rule functions — zero LLM calls, zero CSV reads.

Data source: accepts a pd.DataFrame from repository.get_transactions_df()
             (already loaded from SQLite by the caller in report.py)

Each rule returns a list of RuleHit dicts:
  {
    "transaction_id":  str,
    "rule":            str,
    "deviation_ratio": float,
    "detail":          dict   (rule-specific evidence)
  }

Public API:
  run_all_rules(customer_id, baseline, df) -> list[dict]
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pandas as pd  # type: ignore


# ---------------------------------------------------------------------------
# Rule 1 — Large Transfer
# Flag: amount > mean + 3 * std
# ---------------------------------------------------------------------------
def rule_large_transfer(
    df: pd.DataFrame,
    baseline: dict[str, Any],
) -> list[dict]:
    hits = []
    if baseline.get("insufficient_history"):
        return hits

    mean      = baseline["amount_mean"]
    std       = baseline["amount_std"]
    threshold = mean + 3 * std

    if threshold <= 0:
        return hits

    flagged = df[df["amount"] > threshold]
    for _, row in flagged.iterrows():
        ratio = round(float(row["amount"]) / threshold, 4)
        hits.append({
            "transaction_id":  str(row["transaction_id"]),
            "rule":            "rule_large_transfer",
            "deviation_ratio": ratio,
            "detail": {
                "amount":    float(row["amount"]),
                "threshold": round(threshold, 2),
                "mean":      mean,
                "std":       std,
            },
        })
    return hits


# ---------------------------------------------------------------------------
# Rule 2 — Burst New Payee
# Flag: >= 3 transactions within 7 days to a payee first seen <= 14 days ago
# ---------------------------------------------------------------------------
def rule_burst_new_payee(
    df: pd.DataFrame,
    baseline: dict[str, Any],
) -> list[dict]:
    hits = []
    if baseline.get("insufficient_history"):
        return hits

    payee_first: dict[str, str] = baseline.get("payee_first_seen", {})
    avg_weekly = baseline.get("avg_weekly_txns", 1)

    for payee, first_seen_str in payee_first.items():
        first_seen        = pd.to_datetime(first_seen_str).date()
        new_payee_cutoff  = first_seen + timedelta(days=14)

        # Transactions to this payee within their "new" window
        start_ts = pd.to_datetime(first_seen)
        end_ts = pd.to_datetime(new_payee_cutoff) + timedelta(days=1)
        mask = (
            (df["payee"] == payee) &
            (pd.to_datetime(df["date"]) >= start_ts) &
            (pd.to_datetime(df["date"]) < end_ts)
        )
        payee_txns: pd.DataFrame = df[mask].sort_values(by="date")

        if len(payee_txns) < 3:
            continue

        # Rolling 7-day window scan
        txn_dates = [
            d.date() if hasattr(d, "date") else pd.to_datetime(d).date()
            for d in payee_txns["date"].tolist()
        ]
        for d in txn_dates:
            w_start = pd.to_datetime(d)
            w_end = w_start + timedelta(days=8)
            window_txns = payee_txns[
                (pd.to_datetime(payee_txns["date"]) >= w_start) &
                (pd.to_datetime(payee_txns["date"]) < w_end)
            ]
            if len(window_txns) >= 3:
                ratio = round(len(window_txns) / max(avg_weekly, 0.1), 4)
                for _, row in window_txns.iterrows():
                    hits.append({
                        "transaction_id":  str(row["transaction_id"]),
                        "rule":            "rule_burst_new_payee",
                        "deviation_ratio": ratio,
                        "detail": {
                            "payee":           payee,
                            "first_seen":      first_seen_str,
                            "txns_in_window":  len(window_txns),
                            "window_days":     7,
                        },
                    })
                break   # first qualifying window per payee only

    return hits


# ---------------------------------------------------------------------------
# Rule 3 — Odd Hours
# Flag: transaction hour outside customer's 95% active window
# ---------------------------------------------------------------------------
def rule_odd_hours(
    df: pd.DataFrame,
    baseline: dict[str, Any],
) -> list[dict]:
    hits = []
    if baseline.get("insufficient_history"):
        return hits

    h_start = baseline.get("active_hour_start", 8)
    h_end   = baseline.get("active_hour_end",   22)

    flagged = df[(df["hour"] < h_start) | (df["hour"] > h_end)]
    for _, row in flagged.iterrows():
        hour = int(row["hour"])
        dist = max(h_start - hour, hour - h_end, 0)
        ratio = round(1 + dist / max(h_end - h_start, 1), 4)
        hits.append({
            "transaction_id":  str(row["transaction_id"]),
            "rule":            "rule_odd_hours",
            "deviation_ratio": ratio,
            "detail": {
                "transaction_hour": hour,
                "active_window":    f"{h_start:02d}:00 – {h_end:02d}:59",
                "time":             str(row["time"]),
            },
        })
    return hits


# ---------------------------------------------------------------------------
# Rule 4 — Pattern Break
# Flag: rolling 7-day velocity > 2.5× baseline average
# ---------------------------------------------------------------------------
def rule_pattern_break(
    df: pd.DataFrame,
    baseline: dict[str, Any],
) -> list[dict]:
    hits = []
    if baseline.get("insufficient_history"):
        return hits

    avg_weekly            = baseline.get("avg_weekly_txns", 0)
    threshold_multiplier  = 2.5

    if avg_weekly == 0:
        return hits

    df_sorted: pd.DataFrame = df.sort_values(by="date").copy()
    df_sorted["date_only"] = [
        d.date() if hasattr(d, "date") else pd.to_datetime(d).date()
        for d in df_sorted["date"]
    ]
    all_dates = sorted(set(df_sorted["date_only"]))

    for d in all_dates:
        window_end  = d + timedelta(days=7)
        window_txns = df_sorted[
            (df_sorted["date_only"] >= d) &
            (df_sorted["date_only"] <  window_end)
        ]
        weekly_count = len(window_txns)
        if weekly_count == 0:
            continue

        ratio = round(weekly_count / avg_weekly, 4)
        if ratio > threshold_multiplier:
            for _, row in window_txns.iterrows():
                hits.append({
                    "transaction_id":  str(row["transaction_id"]),
                    "rule":            "rule_pattern_break",
                    "deviation_ratio": ratio,
                    "detail": {
                        "window_start":       d.isoformat(),
                        "window_end":         window_end.isoformat(),
                        "txns_in_window":     weekly_count,
                        "baseline_avg_weekly": avg_weekly,
                        "multiplier":         ratio,
                    },
                })
            break   # flag the first breach window only

    return hits


# ---------------------------------------------------------------------------
# Public API — run all 4 rules
# ---------------------------------------------------------------------------
def run_all_rules(
    customer_id: str,
    baseline: dict[str, Any],
    df: pd.DataFrame,
) -> list[dict]:
    """
    Runs all 4 deterministic rules against the provided DataFrame.

    Args:
        customer_id: Used for logging only.
        baseline:    Output of server.baseline.compute_baseline()
        df:          Output of repository.get_transactions_df()
                     (loaded from SQLite — no CSV reads here)

    Returns:
        Combined flat list of RuleHit dicts across all 4 rules.
        ZERO LLM calls. ZERO network calls. Pure Python math.
    """
    hits: list[dict] = []
    hits.extend(rule_large_transfer(df, baseline))
    hits.extend(rule_burst_new_payee(df, baseline))
    hits.extend(rule_odd_hours(df, baseline))
    hits.extend(rule_pattern_break(df, baseline))
    return hits
