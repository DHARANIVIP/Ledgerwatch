"""
server/prioritize.py
Scores and ranks correlated findings by deviation severity.

Scoring formula (1–100):
  - Base score from deviation_ratio capped at 100
  - Multipliers applied per rule type
  - More transactions in finding = slightly higher score
"""

from __future__ import annotations

from typing import Any

# Rule-specific multiplier weights (higher = more suspicious by nature)
RULE_WEIGHTS: dict[str, float] = {
    "rule_large_transfer":  1.4,
    "rule_burst_new_payee": 1.3,
    "rule_odd_hours":       1.1,
    "rule_pattern_break":   1.2,
}

# Human-readable severity bands
SEVERITY_BANDS = [
    (80, "critical"),
    (60, "high"),
    (40, "medium"),
    (1,  "low"),
]

# Investigator action tips per rule
ACTION_TIPS: dict[str, str] = {
    "rule_large_transfer": (
        "Verify the purpose and authorization of this unusually large transfer. "
        "Cross-check with customer's known income and typical spend patterns."
    ),
    "rule_burst_new_payee": (
        "Confirm the customer personally authorised multiple rapid transfers to this newly appearing payee. "
        "Check if the payee is a known beneficiary or registered entity."
    ),
    "rule_odd_hours": (
        "Contact the customer to confirm they initiated this transaction at an unusual hour. "
        "Look for signs of unauthorized access or account compromise."
    ),
    "rule_pattern_break": (
        "Review the sudden increase in transaction velocity or volume. "
        "Determine if a life event (salary change, large purchase) explains the shift."
    ),
}


def _severity_label(score: int) -> str:
    for threshold, label in SEVERITY_BANDS:
        if score >= threshold:
            return label
    return "low"


def score_finding(finding: dict[str, Any]) -> dict[str, Any]:
    """Adds severity_score and severity_level to a finding dict."""
    rule = finding["rule"]
    deviation = finding.get("max_deviation", 1.0)
    txn_count = len(finding.get("transaction_ids", []))

    # Base: deviation_ratio mapped to 0–70 range
    base = min(deviation * 20, 70.0)

    # Rule multiplier
    multiplier = RULE_WEIGHTS.get(rule, 1.0)

    # Volume bonus (up to +10)
    volume_bonus = min(txn_count * 2, 10)

    raw_score = base * multiplier + volume_bonus
    score = max(1, min(100, int(round(raw_score))))

    finding["severity_score"] = score
    finding["severity_level"] = _severity_label(score)
    finding["action_tip"] = ACTION_TIPS.get(rule, "Review this transaction carefully.")
    return finding


def prioritize_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Scores all findings and returns them sorted by severity_score descending.
    """
    scored = [score_finding(f) for f in findings]
    return sorted(scored, key=lambda f: f["severity_score"], reverse=True)
