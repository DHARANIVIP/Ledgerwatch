import { useState } from 'react'
import { ArrowLeft, FileText, Layers, Clock, Table, FileCheck, Search, Filter } from 'lucide-react'
import VerdictBanner from './VerdictBanner.jsx'
import FindingCard   from './FindingCard.jsx'
import TxModal       from './TxModal.jsx'
import NetworkGraph  from './NetworkGraph.jsx'
import DiurnalRadar  from './DiurnalRadar.jsx'
import SarDossierModal from './SarDossierModal.jsx'

export default function ReportView({ report, transactions = [], customerId, onBack }) {
  const [activeTxnId, setActiveTxnId] = useState(null)
  const [activeTab, setActiveTab] = useState('findings')
  const [showSarModal, setShowSarModal] = useState(false)
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')

  if (!report) return null

  const {
    verdict,
    findings = [],
    baseline_summary,
    graph_data,
    diurnal_profile,
    gemini_used,
    run_at,
    disclaimer,
    investigation_id,
  } = report

  const isAttention = verdict === 'attention_needed'
  const hasFindings = findings.length > 0

  // Filter transactions for the ledger tab
  const filteredTxns = transactions.filter(t => {
    const matchSearch = (
      (t.transaction_id || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (t.payee || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(ledgerSearch.toLowerCase())
    )
    const matchChannel = channelFilter === 'all' || (t.channel || '').toLowerCase() === channelFilter.toLowerCase()
    return matchSearch && matchChannel
  })

  return (
    <div className="report-view">
      {/* ── Top Bar with Back and SAR Export ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn-text" onClick={onBack}>
          <ArrowLeft size={15} />
          New investigation
        </button>

        <button
          className="btn-primary"
          onClick={() => setShowSarModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
        >
          <FileCheck size={16} />
          Export Official SAR Dossier
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
        <span> · subject: <strong>{customerId}</strong></span>
      </div>

      {/* ── Verdict banner — dominant visual ── */}
      <VerdictBanner
        verdict={verdict}
        findingCount={findings.length}
        baseline={baseline_summary}
        geminiUsed={gemini_used}
        runAt={run_at}
      />

      {/* ── Investigation Analytical Mode Sub-Navigation Tabs ── */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border)',
        paddingBottom: 2, marginTop: 12, overflowX: 'auto',
      }}>
        <button
          className={`report-tab ${activeTab === 'findings' ? 'active' : ''}`}
          onClick={() => setActiveTab('findings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
            borderBottom: `2px solid ${activeTab === 'findings' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'findings' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <FileText size={15} />
          Findings & AI Narration ({findings.length})
        </button>

        <button
          className={`report-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
            borderBottom: `2px solid ${activeTab === 'graph' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'graph' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Layers size={15} />
          Counterparty Network Graph
        </button>

        <button
          className={`report-tab ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
            borderBottom: `2px solid ${activeTab === 'radar' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'radar' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Clock size={15} />
          24h Diurnal Circadian Radar
        </button>

        <button
          className={`report-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', background: 'none',
            borderBottom: `2px solid ${activeTab === 'ledger' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'ledger' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Table size={15} />
          Audit Transaction Ledger ({transactions.length})
        </button>
      </div>

      {/* ── TAB 1: Findings & AI Narration ── */}
      {activeTab === 'findings' && (
        <>
          {isAttention && hasFindings && (
            <section className="findings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Correlated Anomaly Findings ({findings.length})
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Ranked by statistical deviation severity (1–100)
                </span>
              </div>
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

          {(!isAttention || !hasFindings) && (
            <div className="card clean-confirmation" style={{ marginTop: 16 }}>
              <p>
                All {baseline_summary?.total_transactions ?? ''} transactions reviewed for{' '}
                <strong>{customerId}</strong> matched the customer's established behavioural
                pattern. No anomalies were detected across large-transfer, burst-payee,
                odd-hours, and velocity-pattern checks.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: Counterparty Network Graph ── */}
      {activeTab === 'graph' && (
        <div style={{ marginTop: 16 }}>
          <NetworkGraph
            graphData={graph_data}
            customerId={customerId}
            onPayeeClick={(payeeId) => {
              setLedgerSearch(payeeId)
              setActiveTab('ledger')
            }}
          />
        </div>
      )}

      {/* ── TAB 3: 24h Diurnal Circadian Radar ── */}
      {activeTab === 'radar' && (
        <div style={{ marginTop: 16 }}>
          <DiurnalRadar
            diurnalProfile={diurnal_profile}
            customerId={customerId}
          />
        </div>
      )}

      {/* ── TAB 4: Audit Transaction Ledger ── */}
      {activeTab === 'ledger' && (
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Full Account Transaction Ledger ({filteredTxns.length} records)
            </h4>

            {/* Filter & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  placeholder="Filter payee or reference…"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 30px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                  }}
                />
              </div>

              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                style={{
                  padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}
              >
                <option value="all">All Channels</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Netbanking</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>Transaction ID</th>
                  <th style={{ padding: '10px 14px' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px' }}>Payee</th>
                  <th style={{ padding: '10px 14px' }}>Description</th>
                  <th style={{ padding: '10px 14px' }}>Channel</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map(tx => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() => setActiveTxnId(tx.transaction_id)}
                    style={{
                      borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      {tx.transaction_id}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {tx.date} <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{tx.time}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tx.payee}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {tx.description}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`channel-pill ${tx.channel}`}>{tx.channel}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="disclaimer" style={{ marginTop: 24 }}>
        {disclaimer || 'This is a flag-and-explain report for human investigator review — it does not determine wrongdoing.'}
      </p>

      {/* ── Single Transaction Modal Drill-down ── */}
      {activeTxnId && (
        <TxModal
          txnId={activeTxnId}
          transactions={transactions}
          onClose={() => setActiveTxnId(null)}
        />
      )}

      {/* ── Official SAR Dossier Export Modal ── */}
      {showSarModal && (
        <SarDossierModal
          customerId={customerId}
          onClose={() => setShowSarModal(false)}
        />
      )}
    </div>
  )
}
