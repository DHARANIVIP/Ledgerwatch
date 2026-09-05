import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export default function VerdictBanner({ verdict, findingCount, baseline, geminiUsed, runAt }) {
  const isAttention  = verdict === 'attention_needed'
  const isClean      = verdict === 'nothing_flagged'
  const isInsufficient = baseline?.insufficient_history

  // ── Variant config ────────────────────────────────────────────────────
  let variant, Icon, heading, body

  if (isInsufficient) {
    variant = 'warning'
    Icon    = Info
    heading = 'Insufficient History'
    body    = 'This customer does not have enough transaction history (minimum 15 transactions over 14 days) to produce a reliable baseline. Results may be incomplete.'
  } else if (isAttention) {
    variant = 'danger'
    Icon    = AlertTriangle
    heading = 'Attention Needed'
    body    = `${findingCount} finding${findingCount !== 1 ? 's' : ''} detected that deviate from this customer's established behavioural baseline. Review each finding below before concluding.`
  } else {
    variant = 'safe'
    Icon    = CheckCircle2
    heading = 'Nothing Flagged'
    body    = 'All transactions fall within expected patterns for this customer. No anomalies were detected by any of the four risk rules.'
  }

  const iconColor = variant === 'danger' ? 'var(--danger)'
                  : variant === 'safe'   ? 'var(--safe)'
                  : 'var(--warning)'

  return (
    <div className={`verdict-banner ${variant}`}>
      <div className="verdict-banner-icon">
        <Icon size={28} color={iconColor} strokeWidth={2} />
      </div>

      <div className="verdict-banner-body">
        <div className="verdict-banner-heading">{heading}</div>
        <div className="verdict-banner-text">{body}</div>

        {/* Baseline meta chips */}
        {baseline && !isInsufficient && (
          <div className="verdict-meta">
            {baseline.amount_mean != null && (
              <span className="verdict-meta-chip">
                avg ₹{Number(baseline.amount_mean).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
            {baseline.amount_std != null && (
              <span className="verdict-meta-chip">
                ±₹{Number(baseline.amount_std).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
            {baseline.active_window && (
              <span className="verdict-meta-chip">
                active {baseline.active_window}
              </span>
            )}
            {baseline.total_transactions != null && (
              <span className="verdict-meta-chip">
                {baseline.total_transactions} transactions
              </span>
            )}
            {baseline.avg_weekly_txns != null && (
              <span className="verdict-meta-chip">
                ~{baseline.avg_weekly_txns}/week
              </span>
            )}
            <span className="verdict-meta-chip">
              {geminiUsed ? 'Gemini narrated' : 'Fallback narration'}
            </span>
            {runAt && (
              <span className="verdict-meta-chip">
                {new Date(runAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
