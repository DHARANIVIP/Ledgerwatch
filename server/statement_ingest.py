"""
server/statement_ingest.py
Universal bank statement ingestion engine for LedgerWatch.

Parses CSV statements from diverse banking formats (Chase, Barclays, HDFC, Revolut, etc.)
with automated header inferencing, schema normalization, and instant baseline & risk pipeline execution.
"""

from __future__ import annotations

import io
import re
import uuid
from datetime import datetime
from typing import Any

import pandas as pd  # type: ignore

from server.repository import insert_customer, insert_transactions
from server.report import build_report


def _detect_column(columns: list[str], patterns: list[str]) -> str | None:
    """Finds the first column that matches any regex pattern in order."""
    for pat in patterns:
        regex = re.compile(pat, re.IGNORECASE)
        for col in columns:
            clean_col = col.strip()
            if regex.search(clean_col):
                return clean_col
    return None


def parse_and_ingest_statement(
    content: bytes | str,
    filename: str = "",
    custom_name: str = "",
) -> dict[str, Any]:
    """
    Parses an arbitrary bank CSV, normalizes to LedgerWatch schema,
    stores records in SQLite, runs the risk pipeline, and returns the full report.
    """
    if isinstance(content, bytes):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1", errors="replace")
    else:
        text = content

    if not text.strip():
        raise ValueError("Uploaded file is empty.")

    # Parse CSV with pandas
    try:
        df_raw = pd.read_csv(io.StringIO(text))
    except Exception as exc:
        raise ValueError(f"Could not parse CSV: {exc}") from exc

    if df_raw.empty:
        raise ValueError("The statement file contains no data rows.")

    cols = list(df_raw.columns)

    # ── 1. Column Detection ────────────────────────────────────────────────
    col_date = _detect_column(cols, [r"^date$", r"trans(action)?_?date", r"posting_date", r"value_date", r"timestamp", r"date"])
    col_time = _detect_column(cols, [r"^time$", r"trans(action)?_?time", r"time_stamp"])
    col_amt  = _detect_column(cols, [r"^amount$", r"^debit$", r"withdrawal", r"txn_amount", r"value", r"sum", r"paid_out"])
    col_payee = _detect_column(cols, [r"payee", r"merchant", r"beneficiary", r"recipient", r"counterparty", r"to", r"party"])
    col_desc = _detect_column(cols, [r"desc(ription)?", r"narrative", r"memo", r"details", r"remarks", r"particulars"])
    col_chan = _detect_column(cols, [r"channel", r"mode", r"type", r"method", r"payment_mode"])
    col_txid = _detect_column(cols, [r"transaction_?id", r"txn_?id", r"reference", r"ref_?no", r"id", r"cheque_no"])

    if not col_date:
        raise ValueError("Could not detect Date column. Please ensure header contains 'date' or 'timestamp'.")
    if not col_amt and "credit" not in [c.lower() for c in cols]:
        raise ValueError("Could not detect Amount column. Please ensure header contains 'amount', 'debit', or 'value'.")

    # If amount not found but debit/credit found
    if not col_amt:
        col_debit = _detect_column(cols, [r"debit", r"withdrawal"])
        col_credit = _detect_column(cols, [r"credit", r"deposit"])
        if col_debit:
            col_amt = col_debit
        elif col_credit:
            col_amt = col_credit

    # ── 2. Data Normalization ──────────────────────────────────────────────
    rows = []
    cust_id = f"stmt_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
    display_title = (
        custom_name.strip()
        or (f"Statement: {filename}" if filename else f"Imported Statement #{cust_id[-6:]}")
    )

    for row_num, (_, row) in enumerate(df_raw.iterrows(), start=1):
        # Parse Amount
        raw_amt = row.get(col_amt)
        if pd.isna(raw_amt):
            continue
        try:
            # Strip currency symbols and commas
            amt_clean = str(raw_amt).replace("$", "").replace("€", "").replace("£", "").replace("₹", "").replace(",", "").strip()
            amt = abs(float(amt_clean))
            if amt <= 0:
                continue
        except (ValueError, TypeError):
            continue

        # Parse Date & Time
        raw_date_val = str(row.get(col_date, "")).strip()
        parsed_dt = pd.to_datetime(raw_date_val, errors="coerce")
        if pd.isna(parsed_dt) or not hasattr(parsed_dt, "strftime"):
            continue

        date_str = parsed_dt.strftime("%Y-%m-%d")
        
        if col_time and not pd.isna(row.get(col_time)):
            time_str = str(row.get(col_time)).strip()
            if len(time_str) == 5:  # HH:MM
                time_str = f"{time_str}:00"
            elif len(time_str) < 8:
                time_str = "12:00:00"
        else:
            time_str = parsed_dt.strftime("%H:%M:%S") if hasattr(parsed_dt, "strftime") else "12:00:00"
            if time_str == "00:00:00":
                # Assign daylight default if no time was captured
                time_str = f"{10 + (row_num % 8):02d}:{(row_num * 7) % 60:02d}:00"

        # Payee & Description
        payee_val = (
            str(row.get(col_payee, "")).strip()
            if col_payee and not pd.isna(row.get(col_payee))
            else (str(row.get(col_desc, "")).strip() if col_desc and not pd.isna(row.get(col_desc)) else "Counterparty")
        )
        if not payee_val or payee_val == "nan":
            payee_val = "Unknown_Merchant"

        # Clean payee string (remove special characters)
        payee_val = re.sub(r"[^\w\s-]", "", payee_val)[:40].strip() or "Counterparty"

        desc_val = (
            str(row.get(col_desc, "")).strip()[:100]
            if col_desc and not pd.isna(row.get(col_desc))
            else f"Transaction with {payee_val}"
        )

        # Channel
        chan_val = (
            str(row.get(col_chan, "card")).strip().lower()
            if col_chan and not pd.isna(row.get(col_chan))
            else "card"
        )
        if "upi" in chan_val:
            channel = "UPI"
        elif "net" in chan_val or "bank" in chan_val or "wire" in chan_val or "ach" in chan_val:
            channel = "netbanking"
        else:
            channel = "card"

        # Txn ID
        if col_txid and not pd.isna(row.get(col_txid)):
            txid = str(row.get(col_txid)).strip()
        else:
            txid = f"TXN-IMP-{row_num:04d}"

        rows.append({
            "transaction_id": txid,
            "customer_id":    cust_id,
            "date":           date_str,
            "time":           time_str,
            "description":    desc_val,
            "payee":          payee_val,
            "amount":         round(amt, 2),
            "channel":        channel,
        })

    if len(rows) < 15:
        raise ValueError(
            f"Statement only contains {len(rows)} valid transactions. "
            "A minimum of 15 historical transactions is required to calculate a statistically defensible behavioral baseline."
        )

    # ── 3. Persist to SQLite ───────────────────────────────────────────────
    insert_customer(cust_id, display_title, "imported")
    insert_transactions(rows)

    # ── 4. Execute Full Risk Engine ────────────────────────────────────────
    report = build_report(cust_id)

    return {
        "success":      True,
        "customer_id":  cust_id,
        "display_name": display_title,
        "count":        len(rows),
        "report":       report,
    }
