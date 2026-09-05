"""
server/database.py
SQLite connection manager and schema creation for LedgerWatch.

Database file: database/ledgerwatch.db
All tables are created here via create_tables().
Uses Python's built-in sqlite3 — zero extra dependencies.
"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager

# ---------------------------------------------------------------------------
# Path config
# ---------------------------------------------------------------------------
_ROOT = os.path.join(os.path.dirname(__file__), "..")
DB_DIR = os.path.join(_ROOT, "database")
DB_PATH = os.path.join(DB_DIR, "ledgerwatch.db")


def _ensure_db_dir() -> None:
    os.makedirs(DB_DIR, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """
    Returns a new SQLite connection with:
      - WAL mode for concurrent reads
      - Row factory set to sqlite3.Row (column-name access)
      - Foreign key enforcement enabled
    """
    _ensure_db_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_session():
    """
    Context manager for a DB session with auto-commit and auto-close.

    Usage:
        with db_session() as conn:
            conn.execute(...)
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Schema creation
# ---------------------------------------------------------------------------
CREATE_CUSTOMERS = """
CREATE TABLE IF NOT EXISTS customers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id  TEXT    NOT NULL UNIQUE,
    display_name TEXT    NOT NULL,
    profile_type TEXT    NOT NULL
);
"""

CREATE_TRANSACTIONS = """
CREATE TABLE IF NOT EXISTS transactions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT    NOT NULL,
    customer_id    TEXT    NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    date           TEXT    NOT NULL,
    time           TEXT    NOT NULL,
    description    TEXT    NOT NULL,
    payee          TEXT    NOT NULL,
    amount         REAL    NOT NULL CHECK(amount > 0),
    channel        TEXT    NOT NULL CHECK(channel IN ('UPI','card','netbanking','ATM')),
    UNIQUE(customer_id, transaction_id)
);
"""

CREATE_INVESTIGATIONS = """
CREATE TABLE IF NOT EXISTS investigations (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id    TEXT    NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    verdict        TEXT    NOT NULL CHECK(verdict IN ('attention_needed','nothing_flagged')),
    finding_count  INTEGER NOT NULL DEFAULT 0,
    gemini_used    INTEGER NOT NULL DEFAULT 0,
    duration_ms    INTEGER,
    run_at         TEXT    NOT NULL,
    raw_response   TEXT
);
"""

CREATE_FINDINGS = """
CREATE TABLE IF NOT EXISTS findings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    customer_id      TEXT    NOT NULL,
    finding_ref      TEXT    NOT NULL,
    rule             TEXT    NOT NULL,
    severity_score   INTEGER NOT NULL CHECK(severity_score BETWEEN 1 AND 100),
    severity_level   TEXT    NOT NULL,
    observed_value   TEXT,
    baseline_value   TEXT,
    narrative        TEXT,
    action_tip       TEXT
);
"""

CREATE_FINDING_TRANSACTIONS = """
CREATE TABLE IF NOT EXISTS finding_transactions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    finding_id     INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    transaction_id TEXT    NOT NULL,
    customer_id    TEXT    NOT NULL,
    UNIQUE(finding_id, transaction_id)
);
"""

# Indexes for fast lookups
CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_txn_customer   ON transactions(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_txn_id         ON transactions(customer_id, transaction_id);",
    "CREATE INDEX IF NOT EXISTS idx_txn_date       ON transactions(customer_id, date);",
    "CREATE INDEX IF NOT EXISTS idx_inv_customer   ON investigations(customer_id, run_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_finding_inv    ON findings(investigation_id);",
    "CREATE INDEX IF NOT EXISTS idx_ft_finding     ON finding_transactions(finding_id);",
    "CREATE INDEX IF NOT EXISTS idx_ft_txn         ON finding_transactions(customer_id, transaction_id);",
]


def create_tables() -> None:
    """Creates all tables and indexes if they don't exist. Safe to call on every startup."""
    _ensure_db_dir()
    with db_session() as conn:
        conn.execute(CREATE_CUSTOMERS)
        conn.execute(CREATE_TRANSACTIONS)
        conn.execute(CREATE_INVESTIGATIONS)
        conn.execute(CREATE_FINDINGS)
        conn.execute(CREATE_FINDING_TRANSACTIONS)
        for idx_sql in CREATE_INDEXES:
            conn.execute(idx_sql)
    print(f"[database] Schema ready -> {DB_PATH}")


def is_seeded() -> bool:
    """Returns True if the transactions table has at least 1 row."""
    try:
        with db_session() as conn:
            row = conn.execute("SELECT COUNT(*) as n FROM transactions").fetchone()
            return row["n"] > 0
    except Exception:
        return False


def get_db_path() -> str:
    return DB_PATH


if __name__ == "__main__":
    create_tables()
    print("Done.")
