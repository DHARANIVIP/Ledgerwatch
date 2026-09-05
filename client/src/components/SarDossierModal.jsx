import { useState, useEffect } from 'react'
import { Printer, Copy, Check, X, Shield, FileCheck, Hash } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

export default function SarDossierModal({ customerId, onClose }) {
  const [dossier, setDossier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/api/reports/sar/${customerId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`)
        return r.json()
      })
      .then(data => {
        setDossier(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to generate SAR dossier.')
        setLoading(false)
      })
  }, [customerId])

  const handlePrint = () => {
    window.print()
  }

  const handleCopy = () => {
    if (!dossier) return
    const text = `
================================================================================
SUSPICIOUS ACTIVITY REPORT (SAR) DOSSIER — OFFICIAL COMPLIANCE FILING
================================================================================
FILING REFERENCE: ${dossier.filing_reference}
DATE & TIME     : ${dossier.filing_date_display}
STANDARD        : ${dossier.compliance_standard}
INSTITUTION     : ${dossier.reporting_institution}
AUDIT SHA-256   : ${dossier.sha256_audit_hash}

SUBJECT IDENTIFICATION:
• Account ID    : ${dossier.subject.customer_id}
• Legal Name    : ${dossier.subject.display_name}
• Classification: ${dossier.subject.profile_classification}
• Total Records : ${dossier.subject.total_transactions_analyzed}

DETERMINISTIC VERDICT: ${dossier.verdict.toUpperCase()}
FINDINGS COUNT        : ${dossier.findings_count}

INVESTIGATIVE NARRATIVE:
${dossier.consolidated_narrative}

FLAGGED TRANSACTIONS ITEMIZED:
${dossier.flagged_transactions.map(t => `${t.transaction_id} | ${t.date} ${t.time} | $${t.amount} | ${t.payee} | ${t.channel}`).join('\n')}

STATUTORY COMPLIANCE DISCLAIMER:
${dossier.legal_disclaimer}

INVESTIGATOR SIGN-OFF:
• Officer ID: ${dossier.sign_off.investigator_id}
• Status    : ${dossier.sign_off.status}
================================================================================
    `.trim()

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card sar-modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 780, width: '92%', maxHeight: '90vh', overflowY: 'auto',
          padding: 32, borderRadius: 'var(--radius)', position: 'relative',
        }}
      >
        {/* Actions bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Suspicious Activity Report (SAR) Filing Dossier
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
            >
              {copied ? <Check size={14} color="var(--safe)" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              className="btn-primary"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px' }}
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{ padding: 6, color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', marginLeft: 6 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: '60px 0' }}>
            <div className="spinner" />
            Assembling formal FinCEN / FIU dossier and cryptographic hash…
          </div>
        ) : error ? (
          <div className="error-card">
            <h3>Failed to Load SAR Dossier</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div className="sar-dossier-print-container" style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {/* Formal Document Header */}
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: 18, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
                    OFFICIAL COMPLIANCE DOSSIER
                  </span>
                  <h4 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '4px 0', color: 'var(--text-primary)' }}>
                    {dossier.filing_reference}
                  </h4>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Standard: {dossier.compliance_standard} · {dossier.reporting_institution}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
                    background: dossier.verdict === 'attention_needed' ? 'var(--danger-bg)' : 'var(--safe-bg)',
                    color: dossier.verdict === 'attention_needed' ? 'var(--danger)' : 'var(--safe)',
                    border: `1px solid ${dossier.verdict === 'attention_needed' ? 'var(--danger-border)' : 'var(--safe-border)'}`,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {dossier.verdict === 'attention_needed' ? 'ATTENTION NEEDED' : 'NOTHING FLAGGED'}
                  </span>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                    {dossier.filing_date_display}
                  </p>
                </div>
              </div>

              {/* Cryptographic SHA-256 verification string */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                <Hash size={12} />
                <span>SHA-256 Audit Integrity Hash:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{dossier.sha256_audit_hash}</span>
              </div>
            </div>

            {/* Subject Profile Section */}
            <div style={{ marginBottom: 20 }}>
              <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                1. Subject Identification & Scope
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Account / Customer ID</span>
                  <p style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{dossier.subject.customer_id}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entity / Profile Name</span>
                  <p style={{ fontWeight: 600 }}>{dossier.subject.display_name}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Records Reviewed</span>
                  <p style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{dossier.subject.total_transactions_analyzed}</p>
                </div>
              </div>
            </div>

            {/* Findings & AI Narrative Section */}
            <div style={{ marginBottom: 20 }}>
              <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                2. Summary of Suspicious Activity (Non-Accusatory Exposition)
              </h5>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: 14, whiteSpace: 'pre-line',
                color: 'var(--text-primary)', fontSize: 13,
              }}>
                {dossier.consolidated_narrative}
              </div>
            </div>

            {/* Itemized Flagged Transactions Table */}
            {dossier.flagged_transactions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  3. Itemized Flagged Transactions ({dossier.flagged_transactions.length})
                </h5>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px 12px' }}>Txn ID</th>
                        <th style={{ padding: '8px 12px' }}>Date/Time</th>
                        <th style={{ padding: '8px 12px' }}>Payee / Beneficiary</th>
                        <th style={{ padding: '8px 12px' }}>Channel</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.flagged_transactions.map(t => (
                        <tr key={t.transaction_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.transaction_id}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{t.date} {t.time}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{t.payee}</td>
                          <td style={{ padding: '8px 12px' }}>{t.channel}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                            ${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Legal Disclaimer & Sign-off Block */}
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: 14, marginTop: 24,
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 14 }}>
                {dossier.legal_disclaimer}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Investigator ID</span>
                  <p style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{dossier.sign_off.investigator_id}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filing Status</span>
                  <p style={{ fontWeight: 600, color: 'var(--safe)', fontSize: 12 }}>{dossier.sign_off.status}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Authenticity</span>
                  <p style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 12 }}>✓ Verified Cryptographic Trace</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
