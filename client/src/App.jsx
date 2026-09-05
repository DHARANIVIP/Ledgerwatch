import { useState, useCallback } from 'react'
import { Search, Radio, UploadCloud, Shield } from 'lucide-react'
import CustomerSelector    from './components/CustomerSelector.jsx'
import ReportView          from './components/ReportView.jsx'
import LiveWireSurveillance from './components/LiveWireSurveillance.jsx'
import StatementImporter   from './components/StatementImporter.jsx'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export default function App() {
  // Navigation mode: 'desk' | 'live' | 'importer'
  const [navMode, setNavMode]       = useState('desk')
  // Report view state: 'home' | 'report'
  const [view, setView]             = useState('home')
  const [selectedCustomer, setCustomer] = useState('')
  const [report, setReport]         = useState(null)
  const [transactions, setTxns]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // ── Run full investigation for a customer ─────────────────────────────
  const runInvestigation = useCallback(async (customerId) => {
    setLoading(true)
    setError('')
    setReport(null)
    setTxns([])

    try {
      const [reportRes, txnRes] = await Promise.all([
        fetch(`${API}/api/investigate/${customerId}`),
        fetch(`${API}/api/transactions/${customerId}`),
      ])

      if (!reportRes.ok) {
        const cType = reportRes.headers.get('content-type') || ''
        let msg = `Server error ${reportRes.status}`
        if (cType.includes('application/json')) {
          const errData = await reportRes.json().catch(() => ({}))
          msg = errData.detail || msg
        }
        throw new Error(msg)
      }

      const reportData = await reportRes.json()
      setReport(reportData)

      if (txnRes.ok) {
        const txnData = await txnRes.json()
        setTxns(txnData.transactions || [])
      }

      setCustomer(customerId)
      setNavMode('desk')
      setView('report')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Callback when statement is successfully ingested ─────────────────
  const handleStatementIngested = useCallback((customerId, ingestedReport) => {
    setCustomer(customerId)
    setReport(ingestedReport)

    // Fetch transactions for the newly imported statement
    fetch(`${API}/api/transactions/${customerId}`)
      .then(r => r.json())
      .then(data => setTxns(data.transactions || []))
      .catch(() => setTxns([]))

    setNavMode('desk')
    setView('report')
  }, [])

  // ── Reset to home desk ────────────────────────────────────────────────
  const goHome = useCallback(() => {
    setView('home')
    setReport(null)
    setTxns([])
    setError('')
  }, [])

  return (
    <>
      {/* ── Sticky Header ── */}
      <header className="app-header">
        <div className="app-header-inner">
          <div
            className="app-logo"
            onClick={() => { setNavMode('desk'); goHome() }}
            style={{ cursor: 'pointer' }}
          >
            <span className="app-logo-wordmark">LedgerWatch</span>
            <div className="app-logo-divider" />
            <span className="app-logo-tagline">Risk Intelligence Platform</span>
          </div>

          {/* Center Navigation Switcher */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => { setNavMode('desk'); if (view !== 'report') goHome() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: navMode === 'desk' ? 700 : 500,
                background: navMode === 'desk' ? 'var(--surface)' : 'transparent',
                color: navMode === 'desk' ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: navMode === 'desk' ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <Search size={14} />
              Investigation Desk
            </button>

            <button
              onClick={() => setNavMode('live')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: navMode === 'live' ? 700 : 500,
                background: navMode === 'live' ? 'var(--surface)' : 'transparent',
                color: navMode === 'live' ? 'var(--danger)' : 'var(--text-secondary)',
                boxShadow: navMode === 'live' ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <Radio size={14} />
              Live Wire Surveillance
            </button>

            <button
              onClick={() => setNavMode('importer')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: navMode === 'importer' ? 700 : 500,
                background: navMode === 'importer' ? 'var(--surface)' : 'transparent',
                color: navMode === 'importer' ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: navMode === 'importer' ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <UploadCloud size={14} />
              Statement Importer
            </button>
          </nav>

          <span className="app-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={12} color="var(--accent)" />
            Fraud Ops
          </span>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="app-main">
        {navMode === 'live' ? (
          <LiveWireSurveillance
            onInvestigateCustomer={(cid) => {
              runInvestigation(cid)
            }}
          />
        ) : navMode === 'importer' ? (
          <StatementImporter
            onStatementIngested={handleStatementIngested}
          />
        ) : view === 'home' ? (
          <CustomerSelector
            loading={loading}
            error={error}
            onRun={(customerId) => {
              setCustomer(customerId)
              runInvestigation(customerId)
            }}
            onNavigate={(mode) => setNavMode(mode)}
          />

        ) : (
          <ReportView
            report={report}
            transactions={transactions}
            customerId={selectedCustomer}
            onBack={goHome}
          />
        )}
      </main>
    </>
  )
}
