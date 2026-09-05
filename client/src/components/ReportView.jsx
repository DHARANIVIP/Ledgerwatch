import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import VerdictBanner from './VerdictBanner.jsx'
import FindingCard   from './FindingCard.jsx'
import TxModal       from './TxModal.jsx'

export default function ReportView({ report, transactions, customerId, onBack }) {
  const [activeTxnId, setActiveTxnId] = useState(null)

  if (!report) return null

  const {
    verdict,
    findings = [],
    baseline_summary,
    gemini_used,
    run_at,
    disclaimer,
    investigation_id,
  } = report

  const isAttention = verdict === 'attention_needed'
  const hasFindings = findings.length > 0

  return (
    <div className="report-view">

      {/* ── Back button ── */}
      <div>
        <button className="btn-text" onClick={onBack}>
          <ArrowLeft size={15} />
          New investigation
        </button>
      </div>

      {/* ── DB trace line ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7,
          borderRadius: '50%', background: 'var(--safe)',
          flexShrink: 0,
        }} />
        Results from{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>database/ledgerwatch.db</span>
        {investigation_id && (
          <span> · investigation #{investigation_id}</span>
        )}
        <span> · customer: {customerId}</span>
      </div>

      {/* ── Verdict banner — dominant visual ── */}
      <VerdictBanner
        verdict={verdict}
        findingCount={findings.length}
        baseline={baseline_summary}
        geminiUsed={gemini_used}
        runAt={run_at}
      />

      {/* ── Findings list (attention_needed only) ── */}
      {isAttention && hasFindings && (
        <section className="findings-section">
          <h3>Findings · {findings.length}</h3>
          <div className="findings-list">
            {findings.map(f => (
              <FindingCard
                key={f.finding_ref}
                finding={f}
                onTxnClick={setActiveTxnId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Clean confirmation (nothing_flagged or no findings) ── */}
      {(!isAttention || !hasFindings) && (
        <div className="card clean-confirmation">
          <p>
            All {baseline_summary?.total_transactions ?? ''} transactions reviewed for{' '}
            <strong>{customerId}</strong> matched the customer's established behavioural
            pattern. No anomalies were detected across large-transfer, burst-payee,
            odd-hours, and velocity-pattern checks.
          </p>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="disclaimer">
        {disclaimer || 'This is a flag-and-explain report for human investigator review — it does not determine wrongdoing.'}
      </p>

      {/* ── Transaction modal ── */}
      {activeTxnId && (
        <TxModal
          txnId={activeTxnId}
          transactions={transactions}
          onClose={() => setActiveTxnId(null)}
        />
      )}
    </div>
  )
}
