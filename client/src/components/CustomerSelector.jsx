import { useState, useEffect } from 'react'
import { Search, ChevronDown, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

const FALLBACK_CUSTOMERS = [
  { customer_id: 'customer_A', display_name: 'Customer A — Clean Baseline',    profile_type: 'clean' },
  { customer_id: 'customer_B', display_name: 'Customer B — Suspicious Activity', profile_type: 'suspicious' },
  { customer_id: 'customer_C', display_name: 'Customer C — Borderline',         profile_type: 'borderline' },
  { customer_id: 'customer_D', display_name: 'Customer D — Pattern Break',      profile_type: 'pattern_break' },
]

export default function CustomerSelector({ loading, error, onRun }) {
  const [customers, setCustomers]   = useState([])
  const [selected, setSelected]     = useState('')
  const [fetchError, setFetchError] = useState('')

  // Load customer list from API on mount
  useEffect(() => {
    fetch(`${API}/api/customers`)
      .then(r => r.json())
      .then(data => setCustomers(data.customers || FALLBACK_CUSTOMERS))
      .catch(() => {
        setFetchError('Could not reach the API — using default customer list.')
        setCustomers(FALLBACK_CUSTOMERS)
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selected && !loading) onRun(selected)
  }

  return (
    <div className="home-view">
      <div className="card selector-card">
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={24} color="var(--accent)" strokeWidth={2} />
          </div>
        </div>

        <h2>Select a customer to investigate</h2>
        <p>Choose a customer profile and run the risk analysis pipeline against their transaction history.</p>

        {fetchError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            fontSize: 13, color: 'var(--warning)', marginBottom: 16,
          }}>
            <AlertCircle size={14} />
            {fetchError}
          </div>
        )}

        <form className="selector-fields" onSubmit={handleSubmit}>
          <div>
            <label className="field-label" htmlFor="customer-select">
              Customer Profile
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="customer-select"
                className="styled-select"
                value={selected}
                onChange={e => setSelected(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>Select a customer…</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              Analyzing transaction history…
            </div>
          ) : (
            <button
              type="submit"
              className="btn-primary"
              disabled={!selected || loading}
              style={{ width: '100%', padding: '12px 24px', fontSize: 15 }}
            >
              <Search size={16} />
              Run Investigation
            </button>
          )}
        </form>

        {/* Error from parent (API failure during investigation) */}
        {error && !loading && (
          <div className="error-card" style={{ marginTop: 16 }}>
            <h3>Investigation Failed</h3>
            <p>{error}</p>
            <button className="btn-ghost" onClick={() => onRun(selected)} style={{ margin: '0 auto' }}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Data sourced from <span style={{ fontFamily: 'var(--font-mono)' }}>database/ledgerwatch.db</span>
        {' '}· 4 deterministic risk rules · Gemini narration
      </p>
    </div>
  )
}
