import { useEffect } from 'react'
import { X, Database } from 'lucide-react'

/**
 * TxModal
 *
 * Data strategy: fetch-once, cache in state, filter locally.
 * `transactions` is the full pre-fetched list passed from parent.
 * No per-click network call — instant display.
 */
export default function TxModal({ txnId, transactions = [], onClose }) {
  // Find the transaction from the already-fetched list
  const txn = transactions.find(t => t.transaction_id === txnId) || null

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!txnId) return null

  const amount = parseFloat(txn?.amount || 0)
  const channel = txn?.channel || ''

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Transaction details for ${txnId}`}
    >
      <div className="modal-panel">

        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">{txnId}</span>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">

          {/* DB source badge */}
          <div className="modal-source-badge">
            <Database size={11} />
            Real database record · ledgerwatch.db
          </div>

          {txn ? (
            <>
              {/* Amount hero */}
              <div className="modal-amount">
                <div className="modal-amount-label">Amount</div>
                <div className="modal-amount-value">
                  ₹{amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Key-value list */}
              <div className="modal-kv-list">
                <KVRow label="Date"        value={txn.date} />
                <KVRow label="Time"        value={txn.time} />
                <KVRow label="Channel"     value={<ChannelPill channel={channel} />} />
                <KVRow label="Payee"       value={txn.payee} />
                <KVRow label="Description" value={txn.description} />
                <KVRow label="Customer"    value={txn.customer_id} />
              </div>
            </>
          ) : (
            /* Not found fallback */
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: 'var(--text-muted)', fontSize: 14,
            }}>
              Transaction <span style={{ fontFamily: 'var(--font-mono)' }}>{txnId}</span>
              {' '}not found in local cache.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KVRow({ label, value }) {
  return (
    <div className="modal-kv-row">
      <span className="modal-kv-key">{label}</span>
      <span className="modal-kv-value">{value || '—'}</span>
    </div>
  )
}

function ChannelPill({ channel }) {
  const labels = {
    UPI: 'UPI', card: 'Card', netbanking: 'Net Banking', ATM: 'ATM',
  }
  return (
    <span className={`channel-pill ${channel}`}>
      {labels[channel] || channel}
    </span>
  )
}
