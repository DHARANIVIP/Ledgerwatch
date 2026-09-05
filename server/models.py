"""
server/models.py
Pure dataclass definitions for all 5 database tables.
No ORM — plain Python dataclasses used throughout the app.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Customer:
    customer_id: str          # e.g. "customer_A"
    display_name: str         # e.g. "Customer A"
    profile_type: str         # clean | suspicious | borderline | pattern_break
    id: Optional[int] = None  # SQLite rowid (set after insert)


@dataclass
class Transaction:
    transaction_id: str       # TXN-A-0001
    customer_id: str          # customer_A
    date: str                 # YYYY-MM-DD
    time: str                 # HH:MM:SS
    description: str
    payee: str
    amount: float
    channel: str              # UPI | card | netbanking | ATM
    id: Optional[int] = None  # SQLite rowid


@dataclass
class Investigation:
    customer_id: str
    verdict: str              # attention_needed | nothing_flagged
    finding_count: int
    gemini_used: bool
    duration_ms: int
    run_at: str               # ISO timestamp
    raw_response: str         # JSON string of full report
    id: Optional[int] = None


@dataclass
class Finding:
    investigation_id: int
    customer_id: str
    finding_ref: str          # F001, F002 ...
    rule: str
    severity_score: int       # 1-100
    severity_level: str       # critical | high | medium | low
    observed_value: str
    baseline_value: str
    narrative: str
    action_tip: str
    id: Optional[int] = None


@dataclass
class FindingTransaction:
    """Junction table — links each Finding to its contributing Transaction IDs."""
    finding_id: int
    transaction_id: str       # TXN-A-0001 (traceable to transactions table)
    customer_id: str
    id: Optional[int] = None
