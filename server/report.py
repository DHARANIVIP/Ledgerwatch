"""
server/report.py
Assembles the final structured JSON report for /api/investigate/{customer_id}.

Pipeline (all DB-backed, zero mock data):
  1. Load transactions DataFrame from SQLite         (repository)
  2. Compute customer behavioral baseline            (baseline.py)
  3. Run 4 deterministic rule functions              (rules.py)      ← NO LLM
  4. Correlate + deduplicate hits into findings      (correlate.py)
  5. Score + rank findings by severity               (prioritize.py)
  6. Narrate each finding via Gemini (or fallback)   (narrate.py)
  7. Persist full report to SQLite                   (repository)
  8. Return structured JSON report dict

Verdict decision:
  "attention_needed"  — set here in Python if findings list is non-empty
  "nothing_flagged"   — set here in Python if findings list is empty
  Gemini NEVER influences the verdict. Gemini only writes the narrative text.

Final report shape:
  {
    "customer_id":       str,
    "verdict":           "attention_needed" | "nothing_flagged",
    "findings":          [...],
    "baseline_summary":  {...},
    "gemini_used":       bool,
    "duration_ms":       int,
    "run_at":            str,
    "disclaimer":        str
  }
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from server.repository import get_transactions_df, save_investigation
from server.baseline import compute_baseline
from server.rules import run_all_rules
from server.correlate import correlate_hits
from server.prioritize import prioritize_findings
from server.narrate import narrate_finding

DISCLAIMER = (
    "This is a flag-and-explain report for human investigator review "
    "— it does not determine wrongdoing."
)


def build_report(customer_id: str) -> dict[str, Any]:
    """
    Runs the complete investigation pipeline for customer_id.

    All data is read from SQLite via repository.
    Results are persisted back to SQLite via repository.save_investigation().
    Returns the full report dict ready for JSON serialisation.
    """
    t_start = time.monotonic()

    # ── Step 1: Load transactions from SQLite (single DB query) ───────────
    df = get_transactions_df(customer_id)

    if df.empty:
        raise FileNotFoundError(
            f"No transactions found for {customer_id} in the database. "
            "Run: py server/seed_database.py"
        )

    # ── Step 2: Compute baseline from DB data ─────────────────────────────
    baseline = compute_baseline(customer_id)

    # ── Step 3: Run 4 deterministic rules (pure Python, NO LLM) ──────────
    # df is passed in — rules do NOT re-query the DB
    raw_hits = run_all_rules(customer_id, baseline, df)

    # ── Step 4: Correlate + deduplicate hits ──────────────────────────────
    findings = correlate_hits(raw_hits)

    # ── Step 5: Score + rank findings ────────────────────────────────────
    findings = prioritize_findings(findings)

    # ── Step 6: Narrate (Gemini explanation or deterministic fallback) ────
    # Gemini receives: rule name, observed value, baseline value, real TXN IDs
    # Gemini returns:  2-3 sentence explanation only
    # Gemini NEVER changes verdict, severity_score, or transaction_ids
    gemini_used_any = False
    enriched_findings = []
    for f in findings:
        enriched, gemini_used = narrate_finding(customer_id, f)
        if gemini_used:
            gemini_used_any = True
        enriched_findings.append(enriched)

    # ── Step 7: Verdict — set deterministically from rule results ─────────
    verdict = "attention_needed" if enriched_findings else "nothing_flagged"

    duration_ms = int((time.monotonic() - t_start) * 1000)
    run_at      = datetime.now(timezone.utc).isoformat()

    report: dict[str, Any] = {
        "customer_id": customer_id,
        "verdict":     verdict,
        "findings":    enriched_findings,
        "baseline_summary": {
            "amount_mean":          baseline.get("amount_mean"),
            "amount_std":           baseline.get("amount_std"),
            "amount_p95":           baseline.get("amount_p95"),
            "active_window":        (
                f"{baseline.get('active_hour_start', 8):02d}:00 – "
                f"{baseline.get('active_hour_end', 22):02d}:59"
            ),
            "total_transactions":   baseline.get("total_transactions"),
            "avg_weekly_txns":      baseline.get("avg_weekly_txns"),
            "insufficient_history": baseline.get("insufficient_history", False),
        },
        "gemini_used": gemini_used_any,
        "duration_ms": duration_ms,
        "run_at":      run_at,
        "disclaimer":  DISCLAIMER,
    }

    # ── Step 8: Persist to SQLite ─────────────────────────────────────────
    # Saves: investigations row + findings rows + finding_transactions rows
    # Every transaction_id in findings is traceable to a real DB record
    try:
        investigation_id = save_investigation(report)
        report["investigation_id"] = investigation_id
    except Exception as exc:
        # Non-fatal — report is still returned even if persistence fails
        print(f"[report] Warning: failed to persist investigation: {exc}")

    return report
