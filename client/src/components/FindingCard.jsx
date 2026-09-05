// Rule metadata — human-readable labels for each rule key
const RULE_META = {
  rule_large_transfer:  { label: 'Large Transfer',       sub: 'Amount exceeded μ + 3σ threshold' },
  rule_burst_new_payee: { label: 'Burst to New Payee',   sub: '≥3 transfers in 7 days to a new payee' },
  rule_odd_hours:       { label: 'Odd Hours Activity',   sub: 'Transaction outside active hour window' },
  rule_pattern_break:   { label: 'Velocity Pattern Break', sub: 'Rolling 7-day volume shifted >2.5×' },
}

function severityClass(level, score) {
  if (score >= 70 || level === 'critical' || level === 'high') return 'critical'
  if (score >= 40 || level === 'medium')  return 'medium'
  return 'low'
}

export default function FindingCard({ finding, onTxnClick }) {
  const {
    finding_ref,
    rule,
    severity_score,
    severity_level,
    transaction_ids = [],
    observed_value,
    baseline_value,
    narrative,
    action_tip,
  } = finding

  const meta      = RULE_META[rule] || { label: rule, sub: '' }
  const badgeClass = severityClass(severity_level, severity_score)
  const badgeLabel = severity_score >= 70 ? 'High Risk'
                   : severity_score >= 40 ? 'Medium Risk'
                   : 'Low Risk'

  return (
    <div className="finding-card">
      {/* Header: rule label + severity badge */}
      <div className="finding-card-header">
        <div>
          <div className="finding-rule-label">{meta.label}</div>
          <div className="finding-rule-sublabel">{finding_ref} · {meta.sub}</div>
        </div>
        <span className={`severity-badge ${badgeClass}`}>
          {badgeLabel} · {severity_score}
        </span>
      </div>

      <div className="finding-card-body">

        {/* Observed vs Baseline */}
        {(observed_value || baseline_value) && (
          <div className="comparison-grid">
            <div>
              <div className="comparison-cell-label">Observed</div>
              <div className="comparison-cell-value">{observed_value || '—'}</div>
            </div>
            <div>
              <div className="comparison-cell-label">Baseline</div>
              <div className="comparison-cell-value">{baseline_value || '—'}</div>
            </div>
          </div>
        )}

        {/* AI Investigator notes */}
        {narrative && (
          <div className="investigator-notes">
            <div className="investigator-notes-label">Investigator Notes</div>
            <div className="investigator-notes-text">{narrative}</div>
          </div>
        )}

        {/* Transaction ID chips */}
        {transaction_ids.length > 0 && (
          <div>
            <div className="txn-chips-label">
              Affected Transactions · {transaction_ids.length}
            </div>
            <div className="txn-chips">
              {transaction_ids.map(id => (
                <button
                  key={id}
                  className="txn-chip"
                  onClick={() => onTxnClick(id)}
                  title={`View details for ${id}`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* What to check first */}
        {action_tip && (
          <div className="action-tip">
            <strong>What to check first: </strong>{action_tip}
          </div>
        )}
      </div>
    </div>
  )
}
