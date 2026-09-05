"""
server/data_gen.py
Deterministic synthetic transaction data generator for LedgerWatch.

Seeds: random.seed(42) + np.random.seed(42) — fully reproducible.

Transaction ID format: TXN-{CUST_LETTER}-{INDEX:04d}

Run:
    python server/data_gen.py
"""

import csv
import os
import random
from datetime import date, timedelta

import numpy as np

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
random.seed(42)
np.random.seed(42)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "customers")
FIELDNAMES = ["transaction_id", "date", "time", "description", "payee", "amount", "channel"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _txn_id(letter: str, index: int) -> str:
    return f"TXN-{letter}-{index:04d}"


def _date_range(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def _rand_time(h_start: int, h_end: int, m_start: int = 0, m_end: int = 59) -> str:
    """Returns a random HH:MM:SS within [h_start, h_end] hours."""
    h = random.randint(h_start, h_end)
    m = random.randint(m_start, m_end)
    s = random.randint(0, 59)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _exact_time(h: int, m: int, s: int) -> str:
    return f"{h:02d}:{m:02d}:{s:02d}"


def _write_csv(filename: str, rows: list[dict]) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def _channel_A() -> str:
    """60% UPI, 30% card, 10% netbanking — Customer A distribution."""
    r = random.random()
    if r < 0.60:
        return "UPI"
    if r < 0.90:
        return "card"
    return "netbanking"


# ---------------------------------------------------------------------------
# Customer A — 100% Routine, ZERO anomalies
# Span: 5 months (~140 rows)
# Amounts: mean ~45, std ~15, min 8, max 95
# Active window: 08:00–21:30
# Payees: fixed set of 6
# ---------------------------------------------------------------------------
def generate_A() -> list[dict]:
    rows = []
    start = date(2024, 1, 2)
    end   = date(2024, 5, 31)
    all_dates = _date_range(start, end)

    payees = [
        ("Grocery purchase",      "Supermarket",   30,  85,  "UPI"),
        ("Monthly utility bill",  "Electric_Corp", 40,  90,  "netbanking"),
        ("Transit fare",          "Metro_Transit",  8,  25,  "UPI"),
        ("Coffee and snack",      "Corner_Cafe",    8,  20,  "card"),
        ("Monthly rent",          "Landlord",       60, 95,  "netbanking"),
        ("Internet subscription", "ISP",            30, 55,  "card"),
    ]

    # Seed one transaction per payee on 2023-12-01 (>14 days before data start)
    # This ensures all 6 payees are "established" and never trigger burst_new_payee
    seed_date = date(2023, 12, 1)
    idx = 1
    for desc, payee, lo, hi, channel in payees:
        rows.append({
            "transaction_id": _txn_id("A", idx),
            "date":           seed_date.isoformat(),
            "time":           _rand_time(9, 17),
            "description":    desc,
            "payee":          payee,
            "amount":         round(np.clip(np.random.normal(45, 15), lo, hi), 2),
            "channel":        channel,
        })
        idx += 1

    # Sample ~140 dates with replacement over 5-month main window
    sampled = sorted(random.choices(all_dates, k=140))

    for d in sampled:
        desc, payee, lo, hi, _ = random.choice(payees)
        channel = _channel_A()
        amount = round(np.clip(np.random.normal(45, 15), lo, hi), 2)
        rows.append({
            "transaction_id": _txn_id("A", idx),
            "date":           d.isoformat(),
            "time":           _rand_time(8, 20),
            "description":    desc,
            "payee":          payee,
            "amount":         amount,
            "channel":        channel,
        })
        idx += 1

    return rows


# ---------------------------------------------------------------------------
# Customer B — Suspicious multi-rule trigger
# Span: 5 months (~150 rows)
# Baseline: months 1–4, mean ~50, active 08:00–22:00
# Anomalies in final 10 days:
#   - 4 burst transfers to Apex_Holdings_LLC within 48 hours (RULE_BURST_NEW_PAYEE)
#   - 1 transfer of $4,850.00 (RULE_LARGE_TRANSFER: mean ~50, std ~15 → +3σ = ~95)
#   - 1 transfer at 03:22:15 AM (RULE_ODD_HOURS)
# ---------------------------------------------------------------------------
def generate_B() -> list[dict]:
    rows = []
    idx = 1

    # --- Baseline: Jan 1 – Apr 20 ---
    baseline_payees = [
        ("Grocery shopping",       "FreshMart",     25, 80,  "UPI"),
        ("Utility payment",        "City_Power",    35, 75,  "UPI"),
        ("Online subscription",    "StreamFlix",    10, 20,  "card"),
        ("Dining out",             "Urban_Eats",    15, 55,  "card"),
        ("Fuel top-up",            "PetroStop",     40, 85,  "card"),
        ("Pharmacy",               "MediCare",      10, 45,  "UPI"),
        ("Rent transfer",          "Property_Mgmt", 50, 95,  "netbanking"),
    ]

    baseline_dates = _date_range(date(2024, 1, 1), date(2024, 4, 20))
    sampled_baseline = sorted(random.choices(baseline_dates, k=138))

    for d in sampled_baseline:
        desc, payee, lo, hi, _ = random.choice(baseline_payees)
        amount = round(np.clip(np.random.normal(50, 15), lo, hi), 2)
        rows.append({
            "transaction_id": _txn_id("B", idx),
            "date":           d.isoformat(),
            "time":           _rand_time(8, 21),
            "description":    "Routine payment",
            "payee":          payee,
            "amount":         amount,
            "channel":        random.choice(["UPI", "card"]),
        })
        idx += 1

    # --- ANOMALY 1: Burst new payee — 4 transfers to Apex_Holdings_LLC in 48 hrs ---
    # First seen Apr 22 → 4 txns on Apr 22–23 (within 48h, well within 7-day window)
    burst_times = [
        (date(2024, 4, 22), "10:15:33"),
        (date(2024, 4, 22), "14:42:08"),
        (date(2024, 4, 23), "09:05:51"),
        (date(2024, 4, 23), "17:30:22"),
    ]
    for d, t in burst_times:
        rows.append({
            "transaction_id": _txn_id("B", idx),
            "date":           d.isoformat(),
            "time":           t,
            "description":    "Transfer to Apex Holdings",
            "payee":          "Apex_Holdings_LLC",
            "amount":         round(np.random.uniform(200, 450), 2),
            "channel":        "netbanking",
        })
        idx += 1

    # --- ANOMALY 2: Large transfer — $4,850 (mean ~50, std ~15 → threshold ~95) ---
    rows.append({
        "transaction_id": _txn_id("B", idx),
        "date":           date(2024, 4, 25).isoformat(),
        "time":           "11:00:00",
        "description":    "Large wire transfer",
        "payee":          "Apex_Holdings_LLC",
        "amount":         4850.00,
        "channel":        "netbanking",
    })
    idx += 1

    # --- ANOMALY 3: Odd hours — 03:22:15 AM ---
    rows.append({
        "transaction_id": _txn_id("B", idx),
        "date":           date(2024, 4, 28).isoformat(),
        "time":           _exact_time(3, 22, 15),
        "description":    "Late night transfer",
        "payee":          "Apex_Holdings_LLC",
        "amount":         round(np.random.uniform(80, 150), 2),
        "channel":        "UPI",
    })
    idx += 1

    # --- Normal tail (Apr 29 – May 31) ---
    tail_dates = _date_range(date(2024, 4, 29), date(2024, 5, 31))
    sampled_tail = sorted(random.choices(tail_dates, k=5))
    for d in sampled_tail:
        desc, payee, lo, hi, _ = random.choice(baseline_payees)
        amount = round(np.clip(np.random.normal(50, 15), lo, hi), 2)
        rows.append({
            "transaction_id": _txn_id("B", idx),
            "date":           d.isoformat(),
            "time":           _rand_time(8, 21),
            "description":    "Routine payment",
            "payee":          payee,
            "amount":         amount,
            "channel":        random.choice(["UPI", "card"]),
        })
        idx += 1

    rows.sort(key=lambda r: (r["date"], r["time"]))
    return rows


# ---------------------------------------------------------------------------
# Customer C — Borderline: single odd-hours hit only
# Span: 4 months (~110 rows)
# Normal: 07:30–22:30, ticket $20–$80
# Anomaly: exactly 1 transaction at 02:45:10 to established payee for $35.00
# ---------------------------------------------------------------------------
def generate_C() -> list[dict]:
    rows = []
    idx = 1

    payees = [
        ("Grocery run",        "QuickShop",    20, 70,  "UPI"),
        ("Phone bill",         "TeleLink",     20, 50,  "UPI"),
        ("Coffee",             "BeanBar",      20, 35,  "card"),
        ("Bookstore",          "PageTurner",   20, 60,  "card"),
        ("Pharmacy",           "HealthPlus",   20, 80,  "UPI"),
        ("Streaming service",  "WatchNow",     20, 40,  "card"),
    ]

    all_dates = _date_range(date(2024, 1, 1), date(2024, 4, 30))

    # Reserve Mar 15 for the anomaly; sample the rest
    normal_dates = [d for d in all_dates if d != date(2024, 3, 15)]
    sampled = sorted(random.choices(normal_dates, k=109))

    for d in sampled:
        desc, payee, lo, hi, _ = random.choice(payees)
        amount = round(np.clip(np.random.normal(45, 12), lo, hi), 2)
        rows.append({
            "transaction_id": _txn_id("C", idx),
            "date":           d.isoformat(),
            "time":           _rand_time(7, 22, m_start=30 if random.random() < 0.5 else 0),
            "description":    desc,
            "payee":          payee,
            "amount":         amount,
            "channel":        random.choice(["UPI", "card"]),
        })
        idx += 1

    # --- SINGLE ANOMALY: 02:45:10 AM, established payee, small amount ---
    rows.append({
        "transaction_id": _txn_id("C", idx),
        "date":           date(2024, 3, 15).isoformat(),
        "time":           _exact_time(2, 45, 10),
        "description":    "Emergency pharmacy purchase",
        "payee":          "HealthPlus",       # established payee — not new
        "amount":         35.00,
        "channel":        "UPI",
    })

    rows.sort(key=lambda r: (r["date"], r["time"]))
    return rows


# ---------------------------------------------------------------------------
# Customer D — Structural pattern break
# Span: 4 months (~130 rows)
# Phase 1 (3.5 months): low-velocity, small ticket $10–$35, card + UPI
# Phase 2 (final 8 days): velocity ×3, netbanking, $600–$950 each
# ---------------------------------------------------------------------------
def generate_D() -> list[dict]:
    rows = []
    idx = 1

    phase1_payees = [
        ("Coffee shop",    "DailyBrews",      10, 35, "card"),
        ("Bus fare",       "CityBus",         10, 20, "UPI"),
        ("Snack purchase", "CornerStore",      10, 25, "card"),
        ("Streaming",      "MusicStream",      10, 15, "UPI"),
        ("Lunch",          "QuickBites",       10, 30, "card"),
        ("Top-up",         "MobileWallet",     10, 35, "UPI"),
    ]

    phase2_payees = [
        "WealthBridge_Investments",
        "AlphaCapital_Fund",
        "GlobalAssets_LLC",
        "PrimeHoldings_Co",
    ]

    # Phase 1: Jan 1 – Apr 22 (~113 rows, ~1 txn/day avg)
    phase1_dates = _date_range(date(2024, 1, 1), date(2024, 4, 22))
    sampled1 = sorted(random.choices(phase1_dates, k=113))

    for d in sampled1:
        desc, payee, lo, hi, channel = random.choice(phase1_payees)
        amount = round(np.clip(np.random.normal(22, 7), lo, hi), 2)
        rows.append({
            "transaction_id": _txn_id("D", idx),
            "date":           d.isoformat(),
            "time":           _rand_time(8, 22),
            "description":    desc,
            "payee":          payee,
            "amount":         amount,
            "channel":        channel,
        })
        idx += 1

    # Phase 2: Apr 23 – Apr 30 (8 days), ~3 txns/day = ~24 rows
    # Velocity: 3× baseline (~1/day → 3/day)
    # Amount: $600–$950, netbanking exclusively
    phase2_dates = _date_range(date(2024, 4, 23), date(2024, 4, 30))
    for d in phase2_dates:
        txns_today = random.randint(3, 4)  # ensures >2.5× baseline
        for _ in range(txns_today):
            payee = random.choice(phase2_payees)
            amount = round(np.random.uniform(600, 950), 2)
            rows.append({
                "transaction_id": _txn_id("D", idx),
                "date":           d.isoformat(),
                "time":           _rand_time(9, 20),
                "description":    "Netbanking fund transfer",
                "payee":          payee,
                "amount":         amount,
                "channel":        "netbanking",
            })
            idx += 1

    rows.sort(key=lambda r: (r["date"], r["time"]))
    return rows


# ---------------------------------------------------------------------------
# Verification summary
# ---------------------------------------------------------------------------
def _verify(letter: str, rows: list[dict]) -> None:
    cid = f"customer_{letter}"
    n = len(rows)
    amounts = [float(r["amount"]) for r in rows]
    dates = [r["date"] for r in rows]
    headers_ok = list(rows[0].keys()) == FIELDNAMES if rows else False

    print(f"\n{'─'*55}")
    print(f"  {cid}.csv")
    print(f"{'─'*55}")
    print(f"  Rows          : {n}")
    print(f"  Headers OK    : {headers_ok}")
    print(f"  Date range    : {min(dates)} → {max(dates)}")
    print(f"  Amount min    : ${min(amounts):.2f}")
    print(f"  Amount max    : ${max(amounts):.2f}")
    print(f"  Amount mean   : ${sum(amounts)/len(amounts):.2f}")
    print(f"  ≥ 100 rows    : {'✅' if n >= 100 else '❌'}")
    print(f"  ≥ 15 rows     : {'✅' if n >= 15 else '❌'}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 55)
    print("  LedgerWatch — Synthetic Data Generator")
    print("  TRACK_ID=PS06")
    print("=" * 55)

    customers = [
        ("A", generate_A),
        ("B", generate_B),
        ("C", generate_C),
        ("D", generate_D),
    ]

    all_rows = {}
    for letter, gen_fn in customers:
        rows = gen_fn()
        filename = f"customer_{letter}.csv"
        _write_csv(filename, rows)
        all_rows[letter] = rows
        print(f"  ✓ Written → data/customers/{filename}  ({len(rows)} rows)")

    print("\n" + "=" * 55)
    print("  Verification Summary")
    print("=" * 55)
    for letter, rows in all_rows.items():
        _verify(letter, rows)

    print(f"\n{'='*55}")
    print("  ✅ All 4 datasets generated successfully.")
    print(f"{'='*55}\n")
