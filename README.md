TRACK_ID=PS06

# LedgerWatch — Transaction Risk Intelligence Platform

> **Track:** PS06 — Transaction Risk Investigation Assistant  
> **Repository:** [https://github.com/DHARANIVIP/Ledgerwatch.git](https://github.com/DHARANIVIP/Ledgerwatch.git)  
> **Stack:** Python 3.10+ / FastAPI / SQLite / React 18 / Vite / Tailwind CSS / Google Gemini 2.5 Flash / Supabase (PostgreSQL)

---

## Executive Overview

**LedgerWatch** is an enterprise-grade financial surveillance and transaction risk investigation platform engineered for bank fraud operations, AML surveillance, and regulatory risk desks. It bridges the gap between deterministic, auditable anomaly detection and intelligent human-readable AI narration.

Unlike naive generative AI tools that hallucinate risk verdicts, LedgerWatch follows a **Strict Separation of Concerns**:
1. **Deterministic Risk Engine (Zero-LLM):** All risk evaluations, baseline calculations ($\mu + 3\sigma$, rolling velocity, diurnal boundaries), and verdicts (`attention_needed` vs. `nothing_flagged`) are executed deterministically in pure Python.
2. **Real-World Data Telemetry:** Ingests live bank statements from any CSV format, features pre-loaded institutional benchmarks modeled on real-world PaySim distributions, and provides simulated real-time wire surveillance.
3. **Interactive Visual Intelligence:** Topological Counterparty Knowledge Graph, 24-Hour Circadian Diurnal Radar, and dynamic full-ledger audit inspection.
4. **Official SAR Dossier Generator:** 1-click generation of FinCEN / FIU compliant Suspicious Activity Reports with SHA-256 cryptographic audit integrity hashes and print-ready PDF styling.
5. **Non-Accusatory Tone Guardrail:** Automatic post-generation regex filters intercept accusatory language, replacing terms like `fraud` and `criminal` with neutral, legally defensible operational terminology.

---

## Interactive Platform Capabilities

```
+-----------------------------------------------------------------------------------------------+
|                                    LEDGERWATCH COMMAND CENTER                                 |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|   1. INVESTIGATION DESK                  2. LIVE WIRE SURVEILLANCE     3. STATEMENT IMPORTER   |
|   • Core Profiles (Customer A–D)         • Real-Time Authorization Wire • Drag & Drop Bank CSV |
|   • Real-World Benchmarks (PaySim, Corp) • Rolling Velocity Tachometer  • Auto-Header Mapping  |
|   • Correlated Finding Cards             • Dynamic Threat Score (1–100) • Multi-Bank Normalizer|
|   • Google Gemini 2.5 Flash Narration    • Instant Anomaly Interception • Instant Baseline Run |
|                                                                                               |
|   +---------------------------------------------------------------------------------------+   |
|   |                              VISUAL & AUDIT ANALYTICS                                 |   |
|   |                                                                                       |   |
|   |   • Counterparty Knowledge Graph: Interactive node-edge topology mapping capital flow |   |
|   |   • 24h Diurnal Circadian Radar: Empirical 95% active daylight arc vs off-hours ping  |   |
|   |   • Full Audit Transaction Ledger: Searchable row-level drill-down with modal inspect |   |
|   |   • 1-Click SAR Dossier: Official FinCEN / FIU regulatory export with SHA-256 hash    |   |
|   +---------------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------------+
```

---

## Directory Layout

```
Ledgerwatch/
├── app.py                         # Root entrypoint: FastAPI server + serves client/dist SPA
├── requirements.txt               # Python dependencies
├── README.md                      # Comprehensive platform documentation
├── .gitignore                     # Excludes caches, node_modules, and binary databases
├── data/
│   ├── customers/
│   │   ├── customer_A.csv         # 100% Routine transactions — clean baseline
│   │   ├── customer_B.csv         # Suspicious: burst + large transfer + odd-hours
│   │   ├── customer_C.csv         # Borderline: single isolated off-hours hit
│   │   ├── customer_D.csv         # Pattern break: sudden shift in velocity & volume
│   │   ├── benchmark_PaySim_mule.csv            # PaySim Real Distribution: Mobile Money Mule Drain
│   │   └── benchmark_corporate_payroll.csv      # Corporate Treasury: Payroll Diversion Anomaly
│   └── schema.md                  # Canonical transaction schema specifications
├── database/
│   └── .gitkeep                   # Preserves database directory for SQLite
├── server/
│   ├── __init__.py
│   ├── database.py                # SQLite connection manager, schema setup, WAL mode
│   ├── repository.py              # Data access layer for customers, txns, findings
│   ├── seed_database.py           # Auto-seeds SQLite from CSV datasets on startup
│   ├── data_gen.py                # Generates synthetic & real-world benchmark datasets
│   ├── statement_ingest.py        # Universal bank statement parser & header inferencing
│   ├── stream_engine.py           # Real-time live wire surveillance telemetry generator
│   ├── sar_report.py              # FinCEN/FIU compliant Suspicious Activity Report builder
│   ├── baseline.py                # Customer-specific behavioral profiler (μ, σ, diurnal windows)
│   ├── rules.py                   # 4 pure deterministic detection rules (No LLM)
│   ├── correlate.py               # Groups related hits into cohesive findings
│   ├── prioritize.py              # Ranks findings by deviation severity (1–100)
│   ├── gemini_client.py           # Google GenAI wrapper with automatic fallback
│   ├── narrate.py                 # Prompt builder + post-generation safety guardrails
│   ├── models.py                  # Pydantic data schemas
│   └── report.py                  # Orchestrates the full end-to-end investigation
├── supabase/
│   ├── schema.sql                 # Full PostgreSQL schema with RLS & indexes
│   └── seed.sql                   # PostgreSQL seed data
└── client/                        # React 18 + Vite + Tailwind CSS Frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── App.jsx                # Main command center shell & navigation
    │   ├── main.jsx               # React DOM root
    │   ├── index.css              # Design system tokens & print styles
    │   └── components/
    │       ├── CustomerSelector.jsx     # Profile selector with quick launch cards
    │       ├── LiveWireSurveillance.jsx # Real-time wire surveillance cockpit
    │       ├── StatementImporter.jsx    # Universal drag-and-drop CSV importer
    │       ├── ReportView.jsx           # Tabbed investigation container
    │       ├── NetworkGraph.jsx         # Interactive counterparty risk knowledge graph
    │       ├── DiurnalRadar.jsx         # 24-Hour circadian diurnal polar clock
    │       ├── SarDossierModal.jsx      # Official FinCEN / FIU regulatory SAR dossier
    │       ├── VerdictBanner.jsx        # High-visibility verdict status banner
    │       ├── FindingCard.jsx          # Glassmorphic finding breakdown
    │       └── TxModal.jsx              # Modal drill-down for row-level audit
    └── dist/                      # Pre-compiled production bundle (served by app.py)
```

---

## Quick Start

### 1. Prerequisites
- **Python 3.10+**
- (Optional) **Node.js 18+** (only needed if modifying frontend source)
- (Optional) **Google Gemini API Key** (system includes deterministic fallback)

### 2. Clone the Repository
```bash
git clone https://github.com/DHARANIVIP/Ledgerwatch.git
cd Ledgerwatch
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment (Optional)
Set your Gemini API key if you want AI-generated narratives:

**PowerShell (Windows):**
```powershell
$env:GEMINI_API_KEY = "your_gemini_api_key_here"
```

**Bash (Linux / macOS):**
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
```

### 5. Launch LedgerWatch
Run the single start command:
```bash
python app.py
```

- **Web Dashboard:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **System Health:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Database Stats:** [http://localhost:8000/api/db/stats](http://localhost:8000/api/db/stats)

> **Single-Command Simplicity:** `app.py` automatically initializes tables, seeds both baseline and real-world benchmark datasets into SQLite, and immediately serves the API and React dashboard on port 8000.

---

## Detection Rules Engine

LedgerWatch enforces 4 deterministic detection rules that evaluate behavioral anomalies without stochastic LLM decisions:

| Rule Name | Trigger Condition | Severity Impact |
|-----------|-------------------|-----------------|
| `rule_large_transfer` | Transaction amount > $\mu + 3\sigma$ of customer's historical baseline | High (Scaled by $Z$-score magnitude) |
| `rule_burst_new_payee` | $\ge 3$ transactions within 7 days to a payee first seen $\le 14$ days ago | High (Detects rapid fund drainage) |
| `rule_odd_hours` | Transaction initiated outside the customer's 95% active diurnal time window | Medium (Isolated off-hours access) |
| `rule_pattern_break` | Rolling 7-day velocity/volume shifts $> 2.5\times$ relative to baseline | Critical (Structural account hijacking signal) |

---

## Customer & Benchmark Datasets

LedgerWatch includes synthetic baseline profiles and real-world institutional benchmark distributions in `data/customers/`:

| Dataset Identifier | Scenario Profile | Expected Verdict | Primary Flagged Behavior |
|--------------------|------------------|------------------|--------------------------|
| **Customer A** | Baseline Routine Profile | `nothing_flagged` | Consistent ticket sizes, daytime activity, recognized payees |
| **Customer B** | Rapid Fund Drainage | `attention_needed` | Multiple rapid transfers to novel payee + 03:20 AM transaction + amount $> \mu + 3\sigma$ |
| **Customer C** | Borderline Anomaly | `attention_needed` | Single isolated 02:45 AM transaction with otherwise routine daytime behavior |
| **Customer D** | Structural Pattern Shift | `attention_needed` | Sudden transition from small UPI transactions to high-velocity netbanking transfers |
| **PaySim Benchmark** | Mobile Money Mule Drain | `attention_needed` | Real-world PaySim distribution: 4 months of micro-payments followed by 4 rapid mule transfers ($4,850–$9,250) at 03:18 AM |
| **Treasury Benchmark** | Corporate Payroll Diversion | `attention_needed` | Steady bi-weekly contractor payroll followed by unauthorized off-hours overseas transfer ($48,900) at 02:40 AM |

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/customers` | Returns all customer profiles from the database |
| `GET` | `/api/investigate/{customer_id}` | Runs complete risk pipeline, returns structured findings, graph nodes, and diurnal profile |
| `GET` | `/api/transactions/{customer_id}` | Returns raw transaction records for audit verification |
| `GET` | `/api/transactions/{customer_id}/{txn_id}` | Returns single transaction record for modal drill-down |
| `POST` | `/api/ingest/statement` | Ingests arbitrary CSV bank statements, normalizes schema, and returns real-time risk report |
| `GET` | `/api/stream/events` | Telemetry endpoint emitting real-time simulated live wire transactions with dynamic velocity metrics |
| `GET` | `/api/reports/sar/{customer_id}` | Generates official FinCEN / FIU compliant Suspicious Activity Report dossier with SHA-256 hash |
| `GET` | `/api/health` | Health check reporting database status and Gemini configuration |
| `GET` | `/api/db/stats` | Returns real-time row counts across all database tables |

---

## Safety, Compliance & Tone Guardrails

To comply with financial regulatory standards (e.g., Fair Lending, Adverse Action rules, and operational ethics):

1. **Non-Accusatory Tone:** LLM output passes through an automated regex sanitizer in `server/narrate.py` that intercepts terms like `fraud`, `fraudulent`, `theft`, `criminal`, `scam`, and `stolen`, replacing them with neutral terminology such as **"flagged activity"** or **"unusual pattern"**.
2. **Decision-Support Focus:** Every investigation report concludes with an immutable compliance disclaimer:
   > *"This is a flag-and-explain report for human investigator review — it does not determine wrongdoing."*
3. **Data Minimization & Privacy:** Reports reference internal `transaction_id` references rather than raw PII.
4. **Deterministic Integrity:** The risk verdict (`attention_needed` vs. `nothing_flagged`) is strictly locked to Python rule outputs—the LLM is never permitted to set or modify risk verdicts.

---

## Frontend Development

The frontend is built with React 18, Vite, and Tailwind CSS. The compiled production bundle is pre-built in `client/dist` and served automatically by FastAPI.

To make frontend modifications:
```bash
cd client
npm install
npm run dev      # Starts Vite dev server with Hot Module Replacement on :5173
npm run build    # Compiles production assets directly into client/dist/
```

---

## License

This project is developed for the Transaction Risk Investigation Assistant (Track PS06) challenge.
