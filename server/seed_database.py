"""
server/seed_database.py
Seeds the SQLite database from the 4 customer CSV files.

Safe to run multiple times — uses INSERT OR IGNORE throughout.

Run:
    py server/seed_database.py
"""

from __future__ import annotations

import csv
import os
import sys

# Allow running from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from server.database import create_tables, db_session
from server.repository import (
    insert_customer,
    insert_transactions,
    get_transaction_count,
)

# ---------------------------------------------------------------------------
# Master customer list
# ---------------------------------------------------------------------------
CUSTOMERS = [
    ("customer_A", "Customer A — Clean Baseline", "clean"),
    ("customer_B", "Customer B — Suspicious Activity", "suspicious"),
    ("customer_C", "Customer C — Borderline Odd-Hours", "borderline"),
    ("customer_D", "Customer D — Velocity Pattern Break", "pattern_break"),
    ("benchmark_PaySim_mule", "PaySim Benchmark — Mobile Money Mule Drain", "benchmark_mule"),
    ("benchmark_corporate_payroll", "Treasury Benchmark — Corporate Payroll Diversion", "benchmark_corporate"),
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "customers")


def _read_csv(customer_id: str) -> list[dict]:
    """Reads a customer CSV and returns list of row dicts with customer_id injected."""
    path = os.path.join(DATA_DIR, f"{customer_id}.csv")
    if not os.path.exists(path):
        print(f"  [!] CSV not found: {path} - run server/data_gen.py first")
        return []

    rows = []
    unparseable = 0
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for line_idx, row in enumerate(reader, start=2):  # start=2 (header is line 1)
            # Validate required fields per schema edge-case protocol
            if not row.get("transaction_id"):
                print(f"    Line {line_idx}: null transaction_id - skipped")
                unparseable += 1
                continue
            try:
                amount = float(row["amount"])
                if amount <= 0:
                    raise ValueError("amount must be > 0")
            except (ValueError, KeyError):
                print(f"    Line {line_idx}: non-numeric/invalid amount - skipped")
                unparseable += 1
                continue
            # Validate date is parseable (basic check)
            date_str = row.get("date", "")
            if len(date_str) != 10 or date_str[4] != "-" or date_str[7] != "-":
                print(f"    Line {line_idx}: malformed date '{date_str}' - skipped")
                unparseable += 1
                continue

            rows.append({
                "transaction_id": row["transaction_id"].strip(),
                "customer_id":    customer_id,
                "date":           date_str,
                "time":           row.get("time", "00:00:00").strip(),
                "description":    row.get("description", "").strip()[:120],
                "payee":          row.get("payee", "").strip(),
                "amount":         amount,
                "channel":        row.get("channel", "UPI").strip(),
            })

    if unparseable:
        print(f"    unparseable_rows_count: {unparseable}")
    return rows


def seed(force: bool = False) -> None:
    """
    Seeds the database from CSV files.

    Args:
        force: If True, re-seeds even if data already exists.
               If False (default), skips customers that already have transactions.
    """
    print("=" * 55)
    print("  LedgerWatch - Database Seeder")
    print("  TRACK_ID=PS06")
    print("=" * 55)

    # Ensure schema exists
    create_tables()

    total_inserted = 0

    for customer_id, display_name, profile_type in CUSTOMERS:
        print(f"\n> {customer_id}")

        # Insert customer master row (idempotent)
        insert_customer(customer_id, display_name, profile_type)

        # Check existing count
        existing = get_transaction_count(customer_id)
        if existing > 0 and not force:
            print(f"   Already has {existing} transactions - skipping (use force=True to re-seed)")
            continue

        # Read CSV
        rows = _read_csv(customer_id)
        if not rows:
            continue

        # Insert transactions
        inserted = insert_transactions(rows)
        total_inserted += inserted
        final_count = get_transaction_count(customer_id)
        print(f"   [OK] Inserted {inserted} rows (total in DB: {final_count})")

    # Summary
    print(f"\n{'='*55}")
    print(f"  [SUCCESS] Seeding complete - {total_inserted} rows inserted")
    _print_summary()
    print(f"{'='*55}\n")



def _print_summary() -> None:
    """Prints a verification table from the live DB."""
    print(f"\n  {'Customer':<14} {'Rows':>6}  {'Date Range':<25}  {'Min $':>8}  {'Max $':>10}")
    print(f"  {'-'*14} {'-'*6}  {'-'*25}  {'-'*8}  {'-'*10}")

    with db_session() as conn:
        for customer_id, _, _ in CUSTOMERS:
            row = conn.execute(
                """
                SELECT
                    COUNT(*)       AS n,
                    MIN(date)      AS d_min,
                    MAX(date)      AS d_max,
                    MIN(amount)    AS a_min,
                    MAX(amount)    AS a_max
                FROM transactions
                WHERE customer_id = ?
                """,
                (customer_id,),
            ).fetchone()
            if row and row["n"] > 0:
                date_range = f"{row['d_min']} -> {row['d_max']}"
                print(
                    f"  {customer_id:<14} {row['n']:>6}  {date_range:<25}  "
                    f"${row['a_min']:>7.2f}  ${row['a_max']:>9.2f}"
                )
            else:
                print(f"  {customer_id:<14}      0  (no data)")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed LedgerWatch database from CSV files")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-seed even if transactions already exist",
    )
    args = parser.parse_args()
    seed(force=args.force)
