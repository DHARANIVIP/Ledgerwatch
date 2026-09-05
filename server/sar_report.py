"""
server/sar_report.py
Generates formal, regulatory-ready Suspicious Activity Report (SAR) dossiers for LedgerWatch.
Complies with FinCEN / FIU / FATF standards with non-accusatory tone and cryptographic audit hashes.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from server.repository import get_customer, get_transactions
from server.report import build_report


def generate_sar_dossier(customer_id: str) -> dict[str, Any]:
    """
    Assembles an official SAR document for an investigated customer.
    """
    report = build_report(customer_id)
    customer = get_customer(customer_id) or {
        "customer_id": customer_id,
        "display_name": customer_id,
        "profile_type": "standard",
    }
    txns = get_transactions(customer_id)

    # Collect flagged transaction IDs from findings
    flagged_ids = set()
    for f in report.get("findings", []):
        for tid in f.get("transaction_ids", []):
            flagged_ids.add(tid)

    flagged_txns = [t for t in txns if t["transaction_id"] in flagged_ids]

    # Generate cryptographic audit hash of all flagged transaction IDs
    raw_hash_str = f"{customer_id}|{sorted(flagged_ids)}|{report.get('run_at')}"
    sha256_hash = hashlib.sha256(raw_hash_str.encode("utf-8")).hexdigest()
    filing_ref = f"SAR-2026-LW-{sha256_hash[:8].upper()}"

    now = datetime.now(timezone.utc)

    # Regulatory narrative summary
    narratives = [f.get("narrative", "") for f in report.get("findings", [])]
    consolidated_narrative = (
        "\n\n".join(narratives)
        if narratives
        else "No anomalous activity or significant baseline deviations were detected during this review cycle."
    )

    return {
        "filing_reference":        filing_ref,
        "filing_timestamp":        now.isoformat(),
        "filing_date_display":     now.strftime("%B %d, %Y - %H:%M:%S UTC"),
        "compliance_standard":     "FinCEN Form 111 / FIU / FATF Recommendation 20 Compliant",
        "reporting_institution":   "LedgerWatch Institutional Risk Operations",
        "subject": {
            "customer_id":         customer_id,
            "display_name":        customer.get("display_name", customer_id),
            "profile_classification": customer.get("profile_type", "standard"),
            "total_transactions_analyzed": len(txns),
        },
        "verdict":                 report.get("verdict"),
        "baseline_metrics":        report.get("baseline_summary", {}),
        "findings_count":          len(report.get("findings", [])),
        "findings":                report.get("findings", []),
        "flagged_transactions":    flagged_txns,
        "consolidated_narrative":  consolidated_narrative,
        "sha256_audit_hash":       sha256_hash,
        "legal_disclaimer": (
            "STATUTORY NOTICE: This Suspicious Activity Report dossier is prepared strictly for human "
            "investigative review and operational decision-support. It flag-and-explains statistical "
            "deviations and does not establish legal wrongdoing or criminal guilt."
        ),
        "sign_off": {
            "investigator_id": "INV-OPERATOR-8842",
            "compliance_officer_review": "PENDING_FORMAL_SUBMISSION",
            "status": "DRAFT_DOSSIER_READY",
        },
    }
