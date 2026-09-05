"""
server/repository.py
All database read/write queries for LedgerWatch.
No SQL anywhere else in the codebase — only here.

Functions:
  Customers:
    get_all_customers()
    get_customer(customer_id)
    insert_customer(customer)

  Transactions:
    get_transactions(customer_id) -> list[dict]
    get_transactions_df(customer_id) -> pd.DataFrame
    get_transaction_by_id(customer_id, transaction_id) -> dict | None
    insert_transactions(rows)

  Investigations:
    save_investigation(report) -> investigation_id
    get_latest_investigation(customer_id) -> dict | None
    get_investigation_by_id(investigation_id) -> dict | None

  Findings:
    get_findings_for_investigation(investigation_id) -> list[dict]
"""

from __future__ import annotations

import json
from typing import Any, Optional

import pandas as pd  # type: ignore

from server.database import db_session


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------

def get_all_customers() -> list[dict]:
    """Returns all customers ordered by customer_id."""
    with db_session() as conn:
        rows = conn.execute(
            "SELECT customer_id, display_name, profile_type FROM customers ORDER BY customer_id"
        ).fetchall()
        return [dict(r) for r in rows]


def get_customer(customer_id: str) -> dict | None:
    """Returns a single customer record or None."""
    with db_session() as conn:
        row = conn.execute(
            "SELECT customer_id, display_name, profile_type FROM customers WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()
        return dict(row) if row else None


def insert_customer(customer_id: str, display_name: str, profile_type: str) -> None:
    """Inserts a customer. Uses INSERT OR IGNORE for idempotency."""
    with db_session() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO customers (customer_id, display_name, profile_type)
            VALUES (?, ?, ?)
            """,
            (customer_id, display_name, profile_type),
        )


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

def get_transactions(customer_id: str) -> list[dict]:
    """
    Returns all transactions for a customer ordered by date, time.
    Each row is a plain dict matching the CSV schema.
    """
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT transaction_id, customer_id, date, time,
                   description, payee, amount, channel
            FROM   transactions
            WHERE  customer_id = ?
            ORDER  BY date, time
            """,
            (customer_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_transactions_df(customer_id: str) -> pd.DataFrame:
    """
    Returns transactions as a pandas DataFrame for the risk engine.
    Adds computed columns: parsed date, hour.
    """
    rows = get_transactions(customer_id)
    if not rows:
        return pd.DataFrame(columns=[
            "transaction_id", "customer_id", "date", "time",
            "description", "payee", "amount", "channel", "hour"
        ])

    df = pd.DataFrame(rows)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["date"]   = pd.to_datetime(df["date"],   errors="coerce")
    df["hour"]   = df["time"].str.split(":").str[0].astype(int, errors="ignore")
    df = df.dropna(subset=["amount", "date"]).reset_index(drop=True)
    return df


def get_transaction_by_id(customer_id: str, transaction_id: str) -> dict | None:
    """
    Returns a single transaction row as a dict, or None if not found.
    Used by the frontend modal to fetch real DB records.
    """
    with db_session() as conn:
        row = conn.execute(
            """
            SELECT transaction_id, customer_id, date, time,
                   description, payee, amount, channel
            FROM   transactions
            WHERE  customer_id = ? AND transaction_id = ?
            """,
            (customer_id, transaction_id),
        ).fetchone()
        return dict(row) if row else None


def insert_transactions(rows: list[dict]) -> int:
    """
    Bulk-inserts transaction rows. Uses INSERT OR IGNORE for idempotency.
    Returns the number of rows actually inserted.
    """
    if not rows:
        return 0

    inserted = 0
    with db_session() as conn:
        for row in rows:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO transactions
                    (transaction_id, customer_id, date, time,
                     description, payee, amount, channel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["transaction_id"],
                    row["customer_id"],
                    row["date"],
                    row["time"],
                    row["description"],
                    row["payee"],
                    float(row["amount"]),
                    row["channel"],
                ),
            )
            inserted += cursor.rowcount
    return inserted


def get_transaction_count(customer_id: str) -> int:
    """Returns the number of transactions stored for a customer."""
    with db_session() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as n FROM transactions WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()
        return row["n"] if row else 0


# ---------------------------------------------------------------------------
# Investigations
# ---------------------------------------------------------------------------

def save_investigation(report: dict[str, Any]) -> int:
    """
    Persists a full investigation report to the DB.
    Saves: investigation row + finding rows + finding_transactions rows.
    Returns the new investigation rowid.
    """
    customer_id   = report["customer_id"]
    verdict       = report["verdict"]
    findings_list = report.get("findings", [])
    gemini_used   = 1 if report.get("gemini_used") else 0
    duration_ms   = report.get("duration_ms", 0)
    run_at        = report.get("run_at", "")
    raw_response  = json.dumps(report, default=str)

    with db_session() as conn:
        # 1. Insert investigation
        cursor = conn.execute(
            """
            INSERT INTO investigations
                (customer_id, verdict, finding_count, gemini_used,
                 duration_ms, run_at, raw_response)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (customer_id, verdict, len(findings_list),
             gemini_used, duration_ms, run_at, raw_response),
        )
        investigation_id = cursor.lastrowid

        # 2. Insert each finding + its transaction links
        for f in findings_list:
            fcursor = conn.execute(
                """
                INSERT INTO findings
                    (investigation_id, customer_id, finding_ref, rule,
                     severity_score, severity_level, observed_value,
                     baseline_value, narrative, action_tip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    investigation_id,
                    customer_id,
                    f.get("finding_ref", ""),
                    f.get("rule", ""),
                    f.get("severity_score", 1),
                    f.get("severity_level", "low"),
                    f.get("observed_value", ""),
                    f.get("baseline_value", ""),
                    f.get("narrative", ""),
                    f.get("action_tip", ""),
                ),
            )
            finding_id = fcursor.lastrowid

            # 3. Insert junction rows (traceability)
            for txn_id in f.get("transaction_ids", []):
                conn.execute(
                    """
                    INSERT OR IGNORE INTO finding_transactions
                        (finding_id, transaction_id, customer_id)
                    VALUES (?, ?, ?)
                    """,
                    (finding_id, txn_id, customer_id),
                )

    return int(investigation_id) if investigation_id is not None else 0


def get_latest_investigation(customer_id: str) -> dict | None:
    """
    Returns the most recent investigation row for a customer, or None.
    Useful for caching — avoids re-running the full pipeline unnecessarily.
    """
    with db_session() as conn:
        row = conn.execute(
            """
            SELECT id, customer_id, verdict, finding_count,
                   gemini_used, duration_ms, run_at
            FROM   investigations
            WHERE  customer_id = ?
            ORDER  BY run_at DESC
            LIMIT  1
            """,
            (customer_id,),
        ).fetchone()
        return dict(row) if row else None


def get_investigation_by_id(investigation_id: int) -> dict | None:
    """Returns a full investigation row including raw_response JSON."""
    with db_session() as conn:
        row = conn.execute(
            "SELECT * FROM investigations WHERE id = ?",
            (investigation_id,),
        ).fetchone()
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# Findings
# ---------------------------------------------------------------------------

def get_findings_for_investigation(investigation_id: int) -> list[dict]:
    """
    Returns all findings for an investigation, each enriched with
    the list of linked transaction_ids from the finding_transactions table.
    """
    with db_session() as conn:
        findings = conn.execute(
            """
            SELECT id, finding_ref, rule, severity_score, severity_level,
                   observed_value, baseline_value, narrative, action_tip
            FROM   findings
            WHERE  investigation_id = ?
            ORDER  BY severity_score DESC
            """,
            (investigation_id,),
        ).fetchall()

        result = []
        for f in findings:
            fd = dict(f)
            # Fetch linked transaction IDs from junction table
            txn_rows = conn.execute(
                """
                SELECT transaction_id
                FROM   finding_transactions
                WHERE  finding_id = ?
                ORDER  BY transaction_id
                """,
                (f["id"],),
            ).fetchall()
            fd["transaction_ids"] = [r["transaction_id"] for r in txn_rows]
            result.append(fd)

        return result
