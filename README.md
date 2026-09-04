LedgerWatch — Transaction Risk Investigation AssistantAn enterprise-grade, deterministic, and explainable transaction risk investigation assistant built for a bank's fraud desk. LedgerWatch evaluates multi-month customer transaction streams against individualized behavioral baselines and deterministic risk rules, leveraging Google Gemini to generate clear, non-accusatory investigation reports for human operators.Architecture & System Flow+-----------------------------------------------------------------------------------+
|                                 Single Host (:8000)                               |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                        Client (React 19 Dashboard)                        |   |
|   |   - Account Selector  - Investigation Trigger  - Traceability Modal       |   |
|   |   - Verdict Banner    - Ranked Findings Grid   - Fallback State Displays  |   |
|   +---------------------------------------------------------------------------+   |
|                                         |                                         |
|                                (REST / JSON IPC)                                  |
|                                         v                                         |
|   +---------------------------------------------------------------------------+   |
|   |                          Server (FastAPI Engine)                          |   |
|   |                                                                           |   |
|   |   1. Ingestion Engine                                                     |   |
|   |      └── data/customers/*.csv (CSV parsing, malformed row sanitizer)     |   |
|   |                                                                           |   |
|   |   2. Behavioral Profiler (baseline.py)                                    |   |
|   |      └── μ, σ, Diurnal Windows, Known Payee Maps (>=14d span check)       |   |
|   |                                                                           |   |
|   |   3. Deterministic Risk Core (rules.py)                                   |   |
|   |      ├── Rule 1: Large Outlier Transfer (Amount > μ + 3σ)                 |   |
|   |      ├── Rule 2: Rapid Burst to New Payee (>=3 tx / 7d to payee <=14d)    |   |
|   |      ├── Rule 3: Off-Hours Initiation (Outside 95% diurnal boundary)     |   |
|   |      └── Rule 4: Structural Pattern Break (Velocity/volume shift > 2.5x)  |   |
|   |                                                                           |   |
|   |   4. Aggregator & Prioritizer (correlate.py & prioritize.py)              |   |
|   |      └── Deduplication -> Metric Distance Scoring (1 - 100)              |   |
|   |                                                                           |   |
|   |   5. Explainability Layer (gemini_client.py & narrate.py)                 |   |
|   |      ├── Primary: Google GenAI (gemini-2.5-flash) via GEMINI_API_KEY      |   |
|   |      ├── Secondary: Pure Python Deterministic Template Fallback           |   |
|   |      └── Guardrail: Regex Safety Filter (Strikes "fraud"/"theft" terms)   |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
Technology Stack & Design SystemCore Engine & BackendFramework: FastAPI (Python 3.10+) mounted with Uvicorn ASGIAnalytical Compute: Pandas & NumPy (Vectorized baseline computing and outlier detection)Validation Engine: Pydantic v2 (Strict report schema serialization)External AI Integration: google-genai SDK (gemini-2.5-flash)Presentation LayerFramework: React 19 (scaffolded via Vite)UI Components & Icons: Lucide ReactDesign Tokens: Slate & Crimson/Emerald Design SystemHigh-visibility verdict status banners (--verdict-attention, --verdict-clean)Glassmorphic finding metric cards with CSS backdrop filtersMonospace transaction audit drawers (--font-mono)Sub-90-second asset delivery served directly via FastAPI StaticFilesCore Engineering Patterns1. Zero-LLM Deterministic Rule Core (server/rules.py)LLMs are never used to decide whether an anomaly exists. Every risk detection runs purely through isolated, unit-tested deterministic Python routines:Pythondef rule_large_transfer(tx: pd.Series, baseline: CustomerBaseline) -> Optional[RuleHit]:
    threshold = baseline.amount_mean + (3.0 * baseline.amount_std)
    if tx["amount"] > threshold:
        return RuleHit(
            rule_id="RULE_LARGE_TRANSFER",
            transaction_id=tx["transaction_id"],
            deviation_magnitude=(tx["amount"] - baseline.amount_mean) / baseline.amount_std,
            observed=f"${tx['amount']:,.2f}",
            expected=f"< ${threshold:,.2f} (mean + 3σ)"
        )
    return None
2. Idempotent Hit Deduplication (server/correlate.py)Correlated anomalies—such as a 4-part rapid fund drainage burst to a novel counterparty—are unified into a single investigator-facing finding entity rather than fragmenting into multiple duplicate alerts:Pythondef correlate_hits(hits: List[RuleHit]) -> List[Finding]:
    grouped = defaultdict(list)
    for hit in hits:
        grouped[(hit.rule_id, hit.payee_target)].append(hit)
        
    return [
        Finding(
            finding_id=f"FND-{idx+1:03d}",
            rule_name=group_key[0],
            transaction_ids=[h.transaction_id for h in matched_hits],
            observed_metric=matched_hits[-1].observed,
            baseline_metric=matched_hits[-1].expected
        )
        for idx, (group_key, matched_hits) in enumerate(grouped.items())
    ]
3. Graceful LLM Fallback & Self-Healing Narrator (server/gemini_client.py)If the network drops, rate limits trigger, or GEMINI_API_KEY is missing, the platform automatically switches to a deterministic reporting template without crashing:Pythondef generate_investigation_narrative(finding: dict) -> str:
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=construct_safe_prompt(finding),
            config=types.GenerateContentConfig(timeout=8.0)
        )
        return sanitize_safety_language(response.text)
    except Exception:
        return (
            f"Rule {finding['rule_name']} triggered for transaction(s) {finding['transaction_ids']}. "
            f"Observed value of {finding['observed_value']} deviated from baseline expectation of "
            f"{finding['baseline_value']}. Investigator should cross-reference counterparty registration."
        )
4. Non-Accusatory Post-Generation Guardrail (server/narrate.py)To ensure compliance with regulatory standards, an automated post-generation regex filter strips accusatory claims of illegality before reports reach investigator screens:PythonBANNED_REGEX = re.compile(r"\b(fraud|fraudulent|theft|criminal|stolen|scam)\b", re.IGNORECASE)

def sanitize_safety_language(text: str) -> str:
    return BANNED_REGEX.sub("flagged pattern", text)
Getting StartedPrerequisitesPython 3.10 or higherModern Web Browser (Chrome, Edge, Firefox, Safari)Valid Google Gemini API KeyInstallationClone the repository and move into the project directory:Bashgit clone https://github.com/your-org/ledgerwatch.git
cd ledgerwatch
Install the unified Python environment dependencies:Bashpip install -r requirements.txt
Environment ConfigurationConfigure your Gemini API Key in your current shell:Bash# macOS / Linux
export GEMINI_API_KEY="your_api_key_here"

# Windows Command Prompt
set GEMINI_API_KEY=your_api_key_here

# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"
Running the ApplicationStart the combined API and dashboard interface using the single mandatory start command:Bashpython app.py
Local Server Interface: http://localhost:8000Startup Benchmark: Sub-5 seconds cold start (meets the 90-second hackathon constraint)Performance: Investigation pipeline completes in < 3 seconds per customer historySynthetic Dataset ReferenceDatasets are generated programmatically via python -m server.data_gen and reside under data/customers/:Dataset IdentifierBehavioral ProfileDiagnostic ProfileOutput Verdictcustomer_A.csvBalanced Salary, Utilities, GroceryNormal diurnal transactions, consistent ticket sizenothing_flaggedcustomer_B.csvSudden Drain via Unseen PayeeMultiple rapid payments, odd-hour access (03:15 AM), amount > 3σattention_neededcustomer_C.csvRegular Profile with Outlier EventConsistent history across 5 months; isolated single 02:45 AM accessattention_needed (Low Severity)customer_D.csvAccount Turnover Velocity ShiftSustained multi-day transition from low card volume to high netbanking transfersattention_needed (Pattern Break)API ReferenceLocal Endpoints1. Retrieve Available Customer ProfilesHTTPGET /api/customers
Response:JSON[
  "customer_A",
  "customer_B",
  "customer_C",
  "customer_D"
]
2. Execute Risk InvestigationHTTPGET /api/investigate/{customer_id}
Response Schema:JSON{
  "customer_id": "customer_B",
  "verdict": "attention_needed",
  "summary": "Multiple behavioral deviations detected including rapid transfers to a novel payee.",
  "findings": [
    {
      "finding_id": "FND-001",
      "rule_name": "RULE_BURST_NEW_PAYEE",
      "severity_score": 85,
      "transaction_ids": ["TXN-9021", "TXN-9022", "TXN-9025"],
      "observed_metric": "3 transactions within 48h to payee added 2 days ago",
      "baseline_metric": "0 prior transfers to this payee in historical profile",
      "investigator_guidance": "Verify recipient account authenticity and confirm customer channel authentication factors."
    }
  ],
  "disclaimer": "This is a flag-and-explain report for human investigator review — it does not determine wrongdoing."
}
3. Audit Underlying RecordsHTTPGET /api/transactions/{customer_id}
Returns raw row-level records mapped directly to customer transaction entries for complete audit traceability.Compliance & Output Safety StandardsTraceability: Every transaction identifier listed in any generated report is strictly bound to real rows in data/customers/*.csv.Defensible Baseline: Insufficient history profiles (< 14 calendar days or < 15 transactions) reject baseline construction explicitly without guess-estimates.Regulatory Tone: No outputs label, infer, or determine guilt or wrongdoing. Every finding serves as a decision-support aid for human fraud operations specialists.
