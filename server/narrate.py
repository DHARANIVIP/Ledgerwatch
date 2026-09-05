"""
server/narrate.py
Builds LLM prompts per finding and applies mandatory safe-language post-filter.

Safe-language guard replaces:
  fraud, fraudulent, theft, stolen, criminal  →  "flagged activity"
"""

from __future__ import annotations

import re
from typing import Any

from server.gemini_client import call_gemini

# ---------------------------------------------------------------------------
# Safety filter
# ---------------------------------------------------------------------------
_BANNED_WORDS = re.compile(
    r"\b(fraud(?:ulent)?|theft|stolen|criminal)\b",
    flags=re.IGNORECASE,
)


def _apply_safety_filter(text: str) -> str:
    """Replaces banned words with 'flagged activity'."""
    return _BANNED_WORDS.sub("flagged activity", text)


# ---------------------------------------------------------------------------
# Observed / Baseline summary builders per rule
# ---------------------------------------------------------------------------
def _build_observed_baseline(finding: dict[str, Any]) -> tuple[str, str]:
    rule = finding["rule"]
    detail = finding.get("detail", {})
    txn_count = len(finding.get("transaction_ids", []))

    if rule == "rule_large_transfer":
        observed = f"Transfer of ₹{detail.get('amount', 'N/A'):,.2f}" if isinstance(detail.get("amount"), float) else "Large transfer detected"
        baseline = f"Customer baseline mean ₹{detail.get('mean', 0):,.2f} ± ₹{detail.get('std', 0):,.2f} (threshold ₹{detail.get('threshold', 0):,.2f})"

    elif rule == "rule_burst_new_payee":
        observed = f"{txn_count} transactions in {detail.get('window_days', 7)} days to new payee '{detail.get('payee', 'unknown')}'"
        baseline = f"Payee first seen {detail.get('first_seen', 'recently')}; avg {finding.get('max_deviation', 1.0):.1f}× above normal weekly frequency"

    elif rule == "rule_odd_hours":
        observed = f"Transaction at {detail.get('time', 'unusual time')} (hour {detail.get('transaction_hour', '?')})"
        baseline = f"Customer's normal active window: {detail.get('active_window', '08:00–22:00')}"

    elif rule == "rule_pattern_break":
        observed = f"{detail.get('txns_in_window', txn_count)} transactions in 7-day window (×{detail.get('multiplier', 0):.1f} above normal)"
        baseline = f"Baseline avg {detail.get('baseline_avg_weekly', 0):.1f} transactions/week"

    else:
        observed = "Unusual activity detected"
        baseline = "Deviates from historical baseline"

    return observed, baseline


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------
def _build_prompt(customer_id: str, finding: dict[str, Any], observed: str, baseline: str) -> str:
    rule = finding["rule"].replace("_", " ").title()
    txn_ids = ", ".join(finding.get("transaction_ids", []))
    score = finding.get("severity_score", "N/A")
    action_tip = finding.get("action_tip", "")

    return f"""You are a financial compliance analyst writing a concise investigation narrative.

Customer: {customer_id}
Alert Rule: {rule}
Severity Score: {score}/100
Affected Transactions: {txn_ids}

Observed: {observed}
Baseline: {baseline}
Investigator Guidance: {action_tip}

Write a 2–3 sentence professional narrative explaining what was detected, why it is unusual compared to baseline, and what an investigator should focus on. Be factual and objective. Do not state guilt or wrongdoing. Keep it under 80 words."""


# ---------------------------------------------------------------------------
# Main narration function
# ---------------------------------------------------------------------------
def narrate_finding(
    customer_id: str,
    finding: dict[str, Any],
) -> tuple[dict[str, Any], bool]:
    """
    Adds 'narrative', 'observed_value', 'baseline_value' to finding dict.

    Returns:
      (enriched_finding, gemini_used: bool)
    """
    observed, baseline = _build_observed_baseline(finding)

    prompt_context = {
        "rule": finding["rule"],
        "observed": observed,
        "baseline": baseline,
        "transaction_ids": finding.get("transaction_ids", []),
        "severity_score": finding.get("severity_score"),
    }

    prompt = _build_prompt(customer_id, finding, observed, baseline)
    narrative, gemini_used = call_gemini(prompt, prompt_context)

    # Apply safety filter to LLM output
    narrative = _apply_safety_filter(narrative)

    finding["narrative"] = narrative
    finding["observed_value"] = observed
    finding["baseline_value"] = baseline

    return finding, gemini_used
