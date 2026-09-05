import { useState, useEffect } from 'react'
import { Search, ChevronDown, AlertCircle, Shield, AlertTriangle, Zap, Building2, Smartphone, FileSpreadsheet } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

const FALLBACK_CUSTOMERS = [
  { customer_id: 'customer_A', display_name: 'Customer A — Clean Baseline', profile_type: 'clean' },
  { customer_id: 'customer_B', display_name: 'Customer B — Suspicious Activity', profile_type: 'suspicious' },
  { customer_id: 'customer_C', display_name: 'Customer C — Borderline Odd-Hours', profile_type: 'borderline' },
  { customer_id: 'customer_D', display_name: 'Customer D — Velocity Pattern Break', profile_type: 'pattern_break' },
  { customer_id: 'benchmark_PaySim_mule', display_name: 'PaySim Benchmark — Mobile Money Mule Drain', profile_type: 'benchmark_mule' },
  { customer_id: 'benchmark_corporate_payroll', display_name: 'Treasury Benchmark — Corporate Payroll Diversion', profile_type: 'benchmark_corporate' },
]

export default function CustomerSelector({ loading, error, onRun }) {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState('customer_B')
  const [fetchError, setFetchError] = useState('')

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

  // Categorize customers
  const standardProfiles = customers.filter(c => c.customer_id.startsWith('customer_'))
  const benchmarkProfiles = customers.filter(c => c.customer_id.startsWith('benchmark_'))
  const importedProfiles = customers.filter(c => !c.customer_id.startsWith('customer_') && !c.customer_id.startsWith('benchmark_'))

  return (
    <div className="home-view" style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="card selector-card" style={{ padding: 32 }}>
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 'var(--radius)',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={26} color="var(--accent)" strokeWidth={2} />
          </div>
        </div>

        <h2 style={{ textAlign: 'center' }}>Transaction Risk Investigation Desk</h2>
        <p style={{ textAlign: 'center', maxWidth: 540, margin: '6px auto 24px auto' }}>
          Evaluate multi-month financial streams against customer diurnal baselines and deterministic detection rules with Google Gemini explainability.
        </p>

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
              Select Target Account Profile
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="customer-select"
                className="styled-select"
                value={selected}
                onChange={e => setSelected(e.target.value)}
                disabled={loading}
              >
                <optgroup label="⚡ Standard Test Scenarios">
                  {standardProfiles.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.display_name}
                    </option>
                  ))}
                </optgroup>

                {benchmarkProfiles.length > 0 && (
                  <optgroup label="🏛️ Institutional Real-World Benchmarks">
                    {benchmarkProfiles.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.display_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {importedProfiles.length > 0 && (
                  <optgroup label="📁 User Imported Statements">
                    {importedProfiles.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.display_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              Executing deterministic rules & compiling Gemini narration…
            </div>
          ) : (
            <button
              type="submit"
              className="btn-primary"
              disabled={!selected || loading}
              style={{ width: '100%', padding: '13px 24px', fontSize: 15 }}
            >
              <Search size={16} />
              Run Risk Investigation
            </button>
          )}
        </form>

        {/* Quick Launch Scenarios Grid */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Quick Launch Diagnostic Profiles
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            <div
              onClick={() => { setSelected('customer_A'); onRun('customer_A') }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--safe)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Shield size={14} color="var(--safe)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Customer A</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                100% Routine activity · Day hours · Zero anomalies
              </p>
            </div>

            <div
              onClick={() => { setSelected('customer_B'); onRun('customer_B') }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle size={14} color="var(--danger)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Customer B</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                4-Part Drainage Burst · 03:20 AM · Amount &gt; 3σ
              </p>
            </div>

            <div
              onClick={() => { setSelected('benchmark_PaySim_mule'); onRun('benchmark_PaySim_mule') }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Smartphone size={14} color="var(--accent)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>PaySim Benchmark</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                Mobile Money Mule Drain · 5.2× Velocity Spike
              </p>
            </div>
          </div>
        </div>

        {/* Error from parent (API failure during investigation) */}
        {error && !loading && (
          <div className="error-card" style={{ marginTop: 20 }}>
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
        {' '}· 4 deterministic risk rules · Gemini 2.5 Flash narration · Zero mock data
      </p>
    </div>
  )
}
