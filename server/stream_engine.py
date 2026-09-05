"""
server/stream_engine.py
Real-time transaction streaming & live wire surveillance simulation engine for LedgerWatch.

Generates realistic telemetry packets with dynamic velocity metrics and instant rule triggers.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Any

# Simulation state
_STREAM_STATE = {
    "packet_counter": 1000,
    "last_minute_txns": 12,
    "last_minute_volume": 680.50,
}

ROUTINE_PAYEES = [
    ("Supermarket Groceries", "Supermarket_Metro", 25.0, 85.0, "UPI"),
    ("Coffee Roasters", "Artisan_Coffee", 8.0, 22.0, "card"),
    ("Pharmacy Prescription", "City_Pharmacy", 15.0, 60.0, "card"),
    ("Transit Reload", "Metro_Commuter", 10.0, 30.0, "UPI"),
    ("Utility Bill Auto-Pay", "Regional_Power_Grid", 45.0, 95.0, "netbanking"),
]

ANOMALY_PAYEES = [
    ("Urgent Peer Wire", "Mule_Account_092", 4850.0, 9200.0, "UPI", "rule_burst_new_payee"),
    ("Digital Asset Settlement", "Crypto_Exchange_Onramp", 6500.0, 11500.0, "netbanking", "rule_large_transfer"),
    ("Offshore Escrow Transfer", "Offshore_Holdings_LLC", 14500.0, 35000.0, "netbanking", "rule_large_transfer"),
]


def generate_live_event(
    customer_id: str = "customer_B",
    force_anomaly: bool = False,
) -> dict[str, Any]:
    """
    Generates a single live surveillance packet with real-time risk assessment.
    """
    _STREAM_STATE["packet_counter"] += 1
    seq = _STREAM_STATE["packet_counter"]
    now = datetime.now(timezone.utc)
    hour = now.hour

    # Decide if packet is anomalous
    is_anomaly = force_anomaly or (random.random() < 0.28)

    if is_anomaly:
        desc, payee, lo, hi, channel, rule = random.choice(ANOMALY_PAYEES)
        amount = round(random.uniform(lo, hi), 2)
        severity = random.randint(78, 96)
        # Check odd hours
        is_odd_hours = hour < 6 or hour > 23
        rule_triggered = "rule_odd_hours" if is_odd_hours else rule
        reason = f"Deviation detected: Transfer of ${amount:,.2f} to novel counterparty '{payee}'"
    else:
        desc, payee, lo, hi, channel = random.choice(ROUTINE_PAYEES)
        amount = round(random.uniform(lo, hi), 2)
        severity = random.randint(4, 18)
        rule_triggered = None
        reason = "Routine activity within diurnal 95% baseline boundaries"

    # Update rolling telemetry
    _STREAM_STATE["last_minute_txns"] = max(8, int(_STREAM_STATE["last_minute_txns"] + random.choice([-1, 0, 1, 2])))
    _STREAM_STATE["last_minute_volume"] = round(
        max(300.0, _STREAM_STATE["last_minute_volume"] * 0.95 + amount), 2
    )

    return {
        "event_id":                  f"EVT-LIVE-{seq:06d}",
        "transaction_id":            f"TXN-STRM-{uuid.uuid4().hex[:6].upper()}",
        "customer_id":               customer_id,
        "timestamp":                 now.isoformat(),
        "time_display":              now.strftime("%H:%M:%S UTC"),
        "description":               desc,
        "payee":                     payee,
        "amount":                    amount,
        "channel":                   channel,
        "is_anomaly":                is_anomaly,
        "rule_triggered":            rule_triggered,
        "severity":                  severity,
        "reason":                    reason,
        "rolling_velocity_tx_per_min": _STREAM_STATE["last_minute_txns"],
        "rolling_volume_usd_per_min":  _STREAM_STATE["last_minute_volume"],
    }
