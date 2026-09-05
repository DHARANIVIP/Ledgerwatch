TRACK_ID=PS06

# LedgerWatch — Transaction Risk Investigation Assistant

> **Track:** PS06 — Transaction Risk Investigation Assistant  
> **Repository:** [https://github.com/DHARANIVIP/Ledgerwatch.git](https://github.com/DHARANIVIP/Ledgerwatch.git)  
> **Stack:** Python 3.10+ / FastAPI / SQLite / React 18 / Vite / Tailwind CSS / Google Gemini 2.5 Flash / Supabase (PostgreSQL)

---

## Overview

**LedgerWatch** is an enterprise-grade transaction risk investigation platform engineered for banking fraud and risk operations desks. It bridges the gap between deterministic, auditable anomaly detection and intelligent human-readable narration.

Unlike naive AI solutions that delegate risk scoring directly to large language models, LedgerWatch follows a **Strict Separation of Concerns**:
1. **Mathematical & Deterministic Detection (Zero-LLM):** All risk evaluations, threshold calculations, and verdicts are computed deterministically in pure Python using customer-specific historical baselines.
2. **Intelligent Explainability Layer:** Google Gemini (Gemini 2.5 Flash) is used strictly for narration—translating complex statistical deviations and multi-transaction bursts into clear, actionable, non-accusatory findings for human investigators.
3. **Graceful Fallback:** If `GEMINI_API_KEY` is not provided or network is offline, a deterministic templating fallback seamlessly takes over with zero downtime.
4. **End-to-End Traceability & Auditability:** Backed by SQLite (and Supabase PostgreSQL schema), every finding links directly to immutable transaction records.

---

## Architecture & System Flow

```
+-----------------------------------------------------------------------------------+
|                             Single Host (:8000)                                   |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                        Client (React 18 Dashboard)                        |   |
|   |   - Account Selector  - Investigation Trigger  - Traceability Modal       |   |
|   |   - Verdict Banner    - Ranked Findings Grid   - DB & Audit Inspector     |   |
|   +---------------------------------------------------------------------------+   |
|                                         |                                         |
|                                (REST / JSON API)                                  |
|                                         v                                         |
|   +---------------------------------------------------------------------------+   |
|   |                          Server (FastAPI Engine)                          |   |
|   |                                                                           |   |
|   |   1. Ingestion & Persistence (SQLite / Supabase)                          |   |
|   |      └── Auto-seed from CSVs -> customers, transactions, findings         |   |
|   |                                                                           |   |
|   |   2. Behavioral Profiler (baseline.py)                                    |   |
|   |      └── Computes μ, σ, diurnal active windows, counterparty baselines    |   |
|   |                                                                           |   |
|   |   3. Deterministic Risk Core (rules.py)                                   |   |
|   |      ├── Rule 1: Large Outlier Transfer (Amount > μ + 3σ)                 |   |
|   |      ├── Rule 2: Rapid Burst to New Payee (≥3 tx / 7d to payee ≤14d)     |   |
|   |      ├── Rule 3: Off-Hours Initiation (Outside 95% diurnal boundary)      |   |
|   |      └── Rule 4: Structural Pattern Break (Velocity/volume shift > 2.5x)  |   |
|   |                                                                           |   |
|   |   4. Aggregator & Prioritizer (correlate.py & prioritize.py)              |   |
|   |      └── Hit Deduplication -> Multi-Factor Severity Scoring (1 - 100)     |   |
|   |                                                                           |   |
|   |   5. Explainability Layer (gemini_client.py & narrate.py)                 |   |
|   |      ├── Primary: Google GenAI (gemini-2.5-flash) via GEMINI_API_KEY      |   |
|   |      ├── Secondary: Pure Python Deterministic Template Fallback           |   |
|   |      └── Guardrail: Regex Safety Filter (Neutralizes accusatory terms)    |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## Directory Layout

```
Ledgerwatch/
├── app.py                     # Root entrypoint: FastAPI server + serves client/dist SPA
├── requirements.txt           # Python dependencies
├── README.md                  # Comprehensive project documentation
├── .gitignore                 # Excludes caches, node_modules, and binary databases
├── data/
│   ├── customers/
│   │   ├── customer_A.csv     # 100% Routine transactions — clean baseline
│   │   ├── customer_B.csv     # Suspicious: burst + large transfer + odd-hours
│   │   ├── customer_C.csv     # Borderline: single isolated off-hours hit
│   │   └── customer_D.csv     # Pattern break: sudden shift in velocity & volume
│   └── schema.md              # Transaction schema specifications
├── database/
│   └── .gitkeep               # Preserves database directory for SQLite
├── server/
│   ├── __init__.py
│   ├── database.py            # SQLite connection manager, schema setup, WAL mode
│   ├── repository.py          # Data access layer for customers, txns, findings
│   ├── seed_database.py       # Seeds SQLite from CSV datasets on startup
│   ├── data_gen.py            # Generates synthetic customer datasets
│   ├── baseline.py            # Customer-specific behavioral profiler
│   ├── rules.py               # 4 pure deterministic detection rules (No LLM)
│   ├── correlate.py           # Groups related hits into cohesive findings
│   ├── prioritize.py          # Ranks findings by deviation severity (1–100)
│   ├── gemini_client.py       # Google GenAI wrapper with automatic fallback
│   ├── narrate.py             # Prompt builder + post-generation safety guardrails
│   ├── models.py              # Pydantic data schemas
│   └── report.py              # Orchestrates the full end-to-end investigation
├── supabase/
│   ├── schema.sql             # Full PostgreSQL schema with RLS & indexes
│   └── seed.sql               # PostgreSQL seed data
└── client/                    # React 18 + Vite + Tailwind CSS Frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── App.jsx            # Main dashboard container
    │   ├── main.jsx           # React DOM root
    │   └── components/
    │       ├── CustomerSelector.jsx # Customer account selector
    │       ├── VerdictBanner.jsx    # Dynamic verdict banner
    │       ├── FindingCard.jsx      # Glassmorphic finding breakdown
    │       └── TxModal.jsx          # Row-level transaction audit drill-down
    └── dist/                  # Production-built bundle (served by app.py)
```

---

## Quick Start

### 1. Prerequisites
- **Python 3.10+**
- (Optional) **Node.js 18+** (only needed if modifying the frontend source)
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

**Command Prompt (Windows):**
```cmd
set GEMINI_API_KEY=your_gemini_api_key_here
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

> **Zero extra steps:** `app.py` automatically checks if the SQLite database is initialized, provisions tables, seeds from the customer CSVs, and serves both the backend API and the compiled React UI on port 8000.

---

## Detection Rules Engine

LedgerWatch enforces 4 deterministic detection rules that evaluate behavioral anomalies without relying on stochastic LLMs:

| Rule Name | Trigger Condition | Severity Impact |
|-----------|-------------------|-----------------|
| `rule_large_transfer` | Transaction amount > $\mu + 3\sigma$ of customer's historical baseline | High (Scaled by $Z$-score magnitude) |
| `rule_burst_new_payee` | $\ge 3$ transactions within 7 days to a payee first seen $\le 14$ days ago | High (Detects rapid fund drainage) |
| `rule_odd_hours` | Transaction initiated outside the customer's 95% active diurnal time window | Medium (Isolated off-hours access) |
| `rule_pattern_break` | Rolling 7-day velocity/volume shifts $> 2.5\times$ relative to baseline | Critical (Structural account hijacking signal) |

---

## Customer Datasets

LedgerWatch includes synthetic customer datasets in `data/customers/` representing distinct risk scenarios:

| Customer | Scenario & Behavioral Profile | Expected Verdict | Primary Flagged Behavior |
|----------|-------------------------------|------------------|--------------------------|
| **Customer A** | Baseline Routine Profile | `nothing_flagged` | Consistent ticket sizes, daytime activity, recognized payees |
| **Customer B** | Rapid Fund Drainage | `attention_needed` | Multiple rapid transfers to an unseen payee + 03:20 AM transaction + amount $> \mu + 3\sigma$ |
| **Customer C** | Borderline Anomaly | `attention_needed` | Single isolated 02:45 AM transaction with otherwise routine behavior |
| **Customer D** | Structural Pattern Shift | `attention_needed` | Sudden transition from small UPI transactions to high-velocity netbanking transfers |

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/customers` | Returns all customer profiles from the database |
| `GET` | `/api/investigate/{customer_id}` | Runs the complete risk pipeline and returns structured findings |
| `GET` | `/api/transactions/{customer_id}` | Returns all transaction rows for audit verification |
| `GET` | `/api/transactions/{customer_id}/{txn_id}` | Returns details of a specific transaction for modal drill-down |
| `GET` | `/api/health` | Health check reporting database status and Gemini configuration |
| `GET` | `/api/db/stats` | Returns real-time row counts across all database tables |

### Sample Response: `/api/investigate/customer_B`

```json
{
  "customer_id": "customer_B",
  "verdict": "attention_needed",
  "findings": [
    {
      "finding_id": "F001",
      "rule": "rule_burst_new_payee",
      "severity": 87,
      "transactions": ["TXN-0042", "TXN-0043", "TXN-0044"],
      "observed": "4 transactions in 3 days to new payee",
      "baseline": "avg 1.2 transactions/week per payee",
      "narrative": "Between Sep 12 and Sep 15, 4 successive transfers were initiated to an unfamiliar counterparty...",
      "action_tip": "Verify payee identity and confirm multi-factor authorization."
    }
  ],
  "disclaimer": "This is a flag-and-explain report for human investigator review — it does not determine wrongdoing."
}
```

---

## Safety, Compliance & Tone Guardrails

To comply with financial regulatory standards (e.g., Fair Lending, Adverse Action rules, and operational ethics):

1. **Non-Accusatory Tone:** LLM output passes through an automated regex sanitizer in `server/narrate.py` that intercepts terms like `fraud`, `fraudulent`, `theft`, `criminal`, `scam`, and `stolen`, replacing them with neutral terminology such as **"flagged activity"** or **"unusual pattern"**.
2. **Decision-Support Focus:** Every investigation report concludes with an immutable compliance disclaimer:
   > *"This is a flag-and-explain report for human investigator review — it does not determine wrongdoing."*
3. **Data Minimization & Privacy:** Reports reference internal `transaction_id` references rather than raw PII.
4. **Deterministic Integrity:** The risk verdict (`attention_needed` vs. `nothing_flagged`) is strictly locked to Python rule outputs—the LLM is never permitted to set or modify risk verdicts.

---

## Supabase / PostgreSQL Support

LedgerWatch provides enterprise PostgreSQL support via `supabase/schema.sql`:
- Complete relational schema: `customers`, `transactions`, `findings`, and `investigations` audit tables.
- Row-Level Security (RLS) policies for secure investigator tenant isolation.
- B-tree and composite indexing for sub-millisecond query execution.

Apply schema to your database:
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/schema.sql
```

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
