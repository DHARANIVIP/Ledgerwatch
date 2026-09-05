import { useState, useCallback } from 'react'
import CustomerSelector from './components/CustomerSelector.jsx'
import ReportView       from './components/ReportView.jsx'

const API = import.meta.env.VITE_API_URL || ''

export default function App() {
  // ── View state: 'home' | 'report' ──────────────────────────────────────
  const [view, setView]             = useState('home')
  const [selectedCustomer, setCustomer] = useState('')
  const [report, setReport]         = useState(null)
  const [transactions, setTxns]     = useState([])   // fetched once, cached
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // ── Run investigation ─────────────────────────────────────────────────
  const runInvestigation = useCallback(async (customerId) => {
    setLoading(true)
    setError('')
    setReport(null)
    setTxns([])

    try {
      // Both real SQLite-backed endpoints
      const [reportRes, txnRes] = await Promise.all([
        fetch(`${API}/api/investigate/${customerId}`),
        fetch(`${API}/api/transactions/${customerId}`),
      ])

      if (!reportRes.ok) {
        const errData = await reportRes.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error ${reportRes.status}`)
      }

      const reportData = await reportRes.json()
      setReport(reportData)

      if (txnRes.ok) {
        const txnData = await txnRes.json()
        setTxns(txnData.transactions || [])
      }

      setView('report')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Reset to home ─────────────────────────────────────────────────────
  const goHome = useCallback(() => {
    setView('home')
    setReport(null)
    setTxns([])
    setError('')
  }, [])

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="app-logo-wordmark">LedgerWatch</span>
            <div className="app-logo-divider" />
            <span className="app-logo-tagline">Transaction Risk Investigation</span>
          </div>
          <span className="app-badge">Fraud Desk</span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {view === 'home' ? (
          <CustomerSelector
            loading={loading}
            error={error}
            onRun={(customerId) => {
              setCustomer(customerId)
              runInvestigation(customerId)
            }}
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
