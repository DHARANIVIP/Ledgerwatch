"""
server/correlate.py
Groups related raw rule hits into single correlated findings.

Strategy:
  - Hits from the same rule on the same payee (within 7 days) → merged into 1 finding
  - Hits from the same rule on different payees → separate findings
  - Each finding gets a stable finding_ref (F001, F002, ...)
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any


def correlate_hits(raw_hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Takes a flat list of RuleHit dicts and returns a list of Finding dicts.

    Finding dict shape:
      {
        "finding_ref":      str,           # F001, F002, ...
        "rule":             str,
        "transaction_ids":  list[str],
        "max_deviation":    float,
        "detail":           dict,          # merged detail from all hits
      }
    """
    if not raw_hits:
        return []

    # Deduplicate: same transaction_id + rule pair
    seen = set()
    deduped = []
    for hit in raw_hits:
        key = (hit["transaction_id"], hit["rule"])
        if key not in seen:
            seen.add(key)
            deduped.append(hit)

    # Group by rule → then by payee (for burst rule) or as single group
    groups: dict[str, list[dict]] = defaultdict(list)

    for hit in deduped:
        rule = hit["rule"]
        payee = hit.get("detail", {}).get("payee", "__single__")
        group_key = f"{rule}::{payee}"
        groups[group_key].append(hit)

    findings = []
    for idx, (group_key, hits_in_group) in enumerate(groups.items(), start=1):
        finding_ref = f"F{idx:03d}"
        rule = hits_in_group[0]["rule"]
        txn_ids = list({h["transaction_id"] for h in hits_in_group})
        max_deviation = max(h["deviation_ratio"] for h in hits_in_group)

        # Merge detail dicts — last one wins for scalar values, lists are unioned
        merged_detail: dict[str, Any] = {}
        for h in hits_in_group:
            merged_detail.update(h.get("detail", {}))

        findings.append({
            "finding_ref": finding_ref,
            "rule": rule,
            "transaction_ids": sorted(txn_ids),
            "max_deviation": round(max_deviation, 4),
            "detail": merged_detail,
        })

    return findings
