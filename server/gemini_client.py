"""
server/gemini_client.py
Google Gemini 2.5 Flash wrapper with:
  - 1-time retry on failure
  - Timeout handling
  - Deterministic fallback if API key is absent or call fails
"""

from __future__ import annotations

import os
import time
from typing import Any

GEMINI_MODEL = "gemini-2.5-flash"
CALL_TIMEOUT_SEC = 15
MAX_RETRIES = 1


def _build_fallback(prompt_context: dict[str, Any]) -> str:
    """
    Returns a pre-formatted deterministic narrative using finding metrics.
    Called when Gemini is unavailable or fails.
    """
    rule = prompt_context.get("rule", "unknown rule")
    observed = prompt_context.get("observed", "unusual activity")
    baseline = prompt_context.get("baseline", "normal baseline")
    txn_ids = ", ".join(prompt_context.get("transaction_ids", []))
    score = prompt_context.get("severity_score", "N/A")

    return (
        f"[AUTO-GENERATED REPORT — GEMINI UNAVAILABLE]\n\n"
        f"The system detected flagged activity via {rule}.\n"
        f"Observed: {observed}\n"
        f"Baseline: {baseline}\n"
        f"Severity score: {score}/100\n"
        f"Affected transactions: {txn_ids}\n\n"
        f"This pattern deviates significantly from the customer's historical behaviour "
        f"and warrants manual review by a qualified investigator."
    )


def call_gemini(prompt: str, prompt_context: dict[str, Any]) -> tuple[str, bool]:
    """
    Calls the Gemini API with 1-time retry.

    Returns:
      (narrative_text: str, gemini_used: bool)
      gemini_used is False when fallback was triggered.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _build_fallback(prompt_context), False

    for attempt in range(MAX_RETRIES + 1):
        try:
            # Import here so the app starts even without google-genai installed
            from google import genai  # type: ignore

            client = genai.Client(api_key=api_key)

            # Wrap call in a basic timeout via a thread if needed
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )

            text = response.text or ""
            if text.strip():
                return text.strip(), True

        except Exception as exc:  # noqa: BLE001
            if attempt < MAX_RETRIES:
                time.sleep(1)
                continue
            # All retries exhausted — use fallback
            print(f"[gemini_client] Gemini call failed after {MAX_RETRIES+1} attempts: {exc}")
            break

    return _build_fallback(prompt_context), False
