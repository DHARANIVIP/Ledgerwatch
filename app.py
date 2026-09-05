"""
app.py — LedgerWatch root entrypoint
Single command start: py app.py

On startup:
  1. Creates SQLite tables (idempotent)
  2. Auto-seeds from CSVs if DB is empty
  3. Starts FastAPI on port 8000
  4. Serves React client/dist as SPA at /

All API routes read/write real SQLite records via server/repository.py.
Zero mock data. Zero hardcoded transactions.
"""

from __future__ import annotations

import os

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# ---------------------------------------------------------------------------
# Lifespan: replaces deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    from server.database import create_tables, is_seeded
    from server.seed_database import seed
    create_tables()
    if not is_seeded():
        print("[startup] Database is empty - running auto-seed from CSVs...")
        seed()
    else:
        print("[startup] Database already seeded - skipping.")
    yield   # app runs here


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LedgerWatch API",
    description="Transaction Risk Investigation Assistant — Track PS06",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Customer validation (dynamic DB check)
# ---------------------------------------------------------------------------
def _validate_customer(customer_id: str) -> None:
    from server.repository import get_customer
    cust = get_customer(customer_id)
    if not cust:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown customer '{customer_id}'. No record in database.",
        )


# ---------------------------------------------------------------------------
# API: Universal Statement Ingestion
# ---------------------------------------------------------------------------
@app.post("/api/ingest/statement", tags=["ingestion"])
async def ingest_statement(
    file: UploadFile = File(...),
    customer_name: str = Form(""),
):
    """
    Universal CSV bank statement parser and investigator.
    Ingests statements from arbitrary banking formats, normalizes schema,
    stores records in SQLite, and immediately runs full risk evaluation.
    """
    from server.statement_ingest import parse_and_ingest_statement
    try:
        content = await file.read()
        result = parse_and_ingest_statement(
            content=content,
            filename=file.filename or "statement.csv",
            custom_name=customer_name,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Statement processing error: {exc}")


# ---------------------------------------------------------------------------
# API: Real-Time Live Wire Streaming Telemetry
# ---------------------------------------------------------------------------
@app.get("/api/stream/events", tags=["streaming"])
def stream_event(
    customer_id: str = Query("customer_B"),
    anomaly: bool = Query(False),
):
    """
    Generates real-time streaming transaction telemetry packet with instant
    risk evaluation and rolling velocity metrics for Live Wire Surveillance.
    """
    from server.stream_engine import generate_live_event
    return generate_live_event(customer_id=customer_id, force_anomaly=anomaly)


# ---------------------------------------------------------------------------
# API: Official Regulatory SAR Dossier Export
# ---------------------------------------------------------------------------
@app.get("/api/reports/sar/{customer_id}", tags=["compliance"])
def export_sar_dossier(customer_id: str):
    """
    Assembles an official FinCEN / FIU compliant Suspicious Activity Report
    dossier complete with cryptographic SHA-256 integrity hash and audit trail.
    """
    _validate_customer(customer_id)
    try:
        from server.sar_report import generate_sar_dossier
        dossier = generate_sar_dossier(customer_id)
        return dossier
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SAR generation failed: {exc}")



# ---------------------------------------------------------------------------
# API: Customers
# ---------------------------------------------------------------------------
@app.get("/api/customers", tags=["customers"])
def list_customers():
    """
    Returns the list of all customers from the SQLite customers table.
    No hardcoded data — real DB rows only.
    """
    from server.repository import get_all_customers
    customers = get_all_customers()
    return {"customers": customers}


# ---------------------------------------------------------------------------
# API: Investigate
# ---------------------------------------------------------------------------
@app.get("/api/investigate/{customer_id}", tags=["investigation"])
def investigate(customer_id: str):
    """
    Runs the full risk pipeline for a customer and returns a structured report.

    Pipeline:
      SQLite transactions → baseline → 4 deterministic rules (NO LLM)
      → correlate → prioritize → Gemini narration (explanation only)
      → save to SQLite → return JSON report

    Verdict (attention_needed / nothing_flagged) is set by Python rules,
    never by Gemini.
    """
    _validate_customer(customer_id)

    try:
        from server.report import build_report
        report = build_report(customer_id)
        return report

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# API: All transactions for a customer (audit trail)
# ---------------------------------------------------------------------------
@app.get("/api/transactions/{customer_id}", tags=["transactions"])
def get_transactions(customer_id: str):
    """
    Returns all transaction rows for a customer from SQLite.
    Used for the full audit transaction list in the frontend.
    """
    _validate_customer(customer_id)

    from server.repository import get_transactions as repo_get_txns
    rows = repo_get_txns(customer_id)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No transactions found for '{customer_id}'. "
                "Run: py server/seed_database.py"
            ),
        )

    return {
        "customer_id":  customer_id,
        "count":        len(rows),
        "transactions": rows,
    }


# ---------------------------------------------------------------------------
# API: Single transaction by ID (for frontend modal drill-down)
# ---------------------------------------------------------------------------
@app.get("/api/transactions/{customer_id}/{transaction_id}", tags=["transactions"])
def get_transaction_by_id(customer_id: str, transaction_id: str):
    """
    Returns a single transaction record from SQLite by customer + txn ID.
    Called by the TxModal when user clicks a transaction ID in a finding.
    Every returned record is a real database row — no mock values.
    """
    _validate_customer(customer_id)

    from server.repository import get_transaction_by_id as repo_get_txn
    txn = repo_get_txn(customer_id, transaction_id)

    if not txn:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction '{transaction_id}' not found for '{customer_id}'.",
        )

    return txn


# ---------------------------------------------------------------------------
# API: Health check
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["system"])
def health():
    """Health check — reports DB path, row counts, env config."""
    from server.database import get_db_path, is_seeded
    from server.repository import get_transaction_count

    from server.repository import get_all_customers
    customers = get_all_customers()
    counts = {
        c["customer_id"]: get_transaction_count(c["customer_id"])
        for c in customers
    }


    return {
        "status":           "ok",
        "db_path":          get_db_path(),
        "db_seeded":        is_seeded(),
        "transaction_counts": counts,
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
    }


# ---------------------------------------------------------------------------
# API: DB stats (useful for judges / demo)
# ---------------------------------------------------------------------------
@app.get("/api/db/stats", tags=["system"])
def db_stats():
    """Returns row counts for all 5 SQLite tables."""
    from server.database import db_session
    tables = [
        "customers",
        "transactions",
        "investigations",
        "findings",
        "finding_transactions",
    ]
    stats = {}
    with db_session() as conn:
        for table in tables:
            row = conn.execute(
                f"SELECT COUNT(*) as n FROM {table}"  # noqa: S608
            ).fetchone()
            stats[table] = row["n"] if row else 0
    return {"tables": stats}


# ---------------------------------------------------------------------------
# Serve React SPA from client/dist
# ---------------------------------------------------------------------------
DIST_DIR = os.path.join(os.path.dirname(__file__), "client", "dist")

if os.path.isdir(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount(
            "/assets",
            StaticFiles(directory=assets_dir),
            name="assets",
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """Catch-all: returns index.html for all non-API routes (SPA routing)."""
        index = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {
            "message": (
                "Frontend not built yet. "
                "Run: cd client && npm install && npm run build"
            )
        }
else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "message": "LedgerWatch API is running. Frontend not built.",
            "docs": "http://localhost:8000/docs",
            "build": "cd client && npm install && npm run build",
        }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n[+] LedgerWatch starting on http://localhost:{port}")
    print(f"    API docs  -> http://localhost:{port}/docs")
    print(f"    DB stats  -> http://localhost:{port}/api/db/stats")
    print(f"    Frontend  -> http://localhost:{port}/\n")


    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
