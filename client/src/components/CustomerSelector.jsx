import { useState, useEffect } from 'react'
import {
  Search, Shield, AlertTriangle, Zap, Building2, Smartphone,
  FileSpreadsheet, ArrowRight, Radio, UploadCloud, CheckCircle,
  Activity, Clock, FileCheck, Layers
} from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const FALLBACK_CUSTOMERS = [
  { customer_id: 'customer_A', display_name: 'Customer A — Clean Baseline', profile_type: 'clean' },
  { customer_id: 'customer_B', display_name: 'Customer B — Suspicious Activity', profile_type: 'suspicious' },
  { customer_id: 'customer_C', display_name: 'Customer C — Borderline Odd-Hours', profile_type: 'borderline' },
  { customer_id: 'customer_D', display_name: 'Customer D — Velocity Pattern Break', profile_type: 'pattern_break' },
  { customer_id: 'benchmark_PaySim_mule', display_name: 'PaySim Benchmark — Mobile Money Mule Drain', profile_type: 'benchmark_mule' },
  { customer_id: 'benchmark_corporate_payroll', display_name: 'Treasury Benchmark — Corporate Payroll Diversion', profile_type: 'benchmark_corporate' },
]

const PROFILE_DETAILS = {
  customer_A: {
    badge: '100% Routine',
    badgeColor: 'var(--safe)',
    badgeBg: 'var(--safe-bg)',
    title: 'Customer A — Clean Baseline',
    desc: 'Diurnal daytime transfers, recognized utility & grocery payees. Zero rule violations.',
    stats: '146 txns · Mean $38.78 · Safe Band',
    icon: Shield,
    iconColor: 'var(--safe)',
  },
  customer_B: {
    badge: 'High Alert',
    badgeColor: 'var(--danger)',
    badgeBg: 'var(--danger-bg)',
    title: 'Customer B — Rapid Drainage Burst',
    desc: '4 rapid transfers to novel counterparty within 48h, amount > 3σ, and 03:20 AM initiation.',
    stats: '149 txns · Max $4,850.00 · 3 Rules Flagged',
    icon: AlertTriangle,
    iconColor: 'var(--danger)',
  },
  customer_C: {
    badge: 'Borderline',
    badgeColor: 'var(--warning)',
    badgeBg: 'var(--warning-bg)',
    title: 'Customer C — Isolated Off-Hours Event',
    desc: 'Routine daytime baseline across 4 months with a single isolated 02:45 AM transaction.',
    stats: '110 txns · Mean $41.52 · Low Severity',
    icon: Clock,
    iconColor: 'var(--warning)',
  },
  customer_D: {
    badge: 'Pattern Break',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    title: 'Customer D — Structural Velocity Surge',
    desc: 'Abrupt 3.8× transition from small retail UPI payments to high-volume netbanking outflows.',
    stats: '142 txns · Mean $168.84 · Velocity Shift',
    icon: Zap,
    iconColor: '#7C3AED',
  },
  benchmark_PaySim_mule: {
    badge: 'PaySim Real Data',
    badgeColor: 'var(--accent)',
    badgeBg: 'var(--accent-light)',
    title: 'PaySim Benchmark — Mobile Money Mule Drain',
    desc: 'Modeled after real African mobile money distributions: micro-payments followed by $9,250 mule burst at 03:18 AM.',
    stats: '141 txns · Max $9,250.00 · 5.2× Velocity Spike',
    icon: Smartphone,
    iconColor: 'var(--accent)',
  },
  benchmark_corporate_payroll: {
    badge: 'Treasury Anomaly',
    badgeColor: '#BE123C',
    badgeBg: '#FFF1F2',
    title: 'Treasury Benchmark — Corporate Payroll Diversion',
    desc: 'Enterprise bi-weekly payroll followed by unauthorized off-hours overseas transfer of $48,900 at 02:40 AM.',
    stats: '98 txns · Max $48,900.00 · High Value Outflow',
    icon: Building2,
    iconColor: '#BE123C',
  },
}

export default function CustomerSelector({ loading, error, onRun, onNavigate }) {
  const [customers, setCustomers] = useState([])
  const [selectedTab, setSelectedTab] = useState('all') // 'all' | 'core' | 'benchmark'

  useEffect(() => {
    fetch(`${API}/api/customers`)
      .then(r => {
        const cType = r.headers.get('content-type') || ''
        if (!r.ok || !cType.includes('application/json')) {
          throw new Error('API not returning JSON')
        }
        return r.json()
      })
      .then(data => setCustomers(data.customers || FALLBACK_CUSTOMERS))
      .catch(() => {
        setCustomers(FALLBACK_CUSTOMERS)
      })
  }, [])

  const activeList = (customers.length > 0 ? customers : FALLBACK_CUSTOMERS).filter(c => {
    if (selectedTab === 'core') return c.customer_id.startsWith('customer_')
    if (selectedTab === 'benchmark') return c.customer_id.startsWith('benchmark_')
    return true
  })

  return (
    <div className="landing-container full-width-view" style={{ width: '100%', padding: '10px 0 40px 0' }}>
      
      {/* ── 1. Hero Section ── */}
      <section style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 99, padding: '4px 14px', marginBottom: 16,
          boxShadow: 'var(--shadow-sm)', fontSize: 11, fontWeight: 700,
          color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          Track PS06 · Zero-LLM Deterministic Surveillance
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2,
          marginBottom: 12,
        }}>
          Intelligent Transaction Risk Intelligence
        </h1>

        <p style={{
          fontSize: 15, color: 'var(--text-secondary)', maxWidth: 760,
          margin: '0 auto', lineHeight: 1.6,
        }}>
          Combines empirical circadian diurnal baselines and pure Python anomaly rules with Google Gemini explainability. Zero hallucinated risk verdicts.
        </p>
      </section>

      {/* ── 2. Three Pillars Capability Hub ── */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
        marginBottom: 36,
      }}>
        {/* Card 1: Investigation Desk */}
        <div
          style={{
            background: 'var(--surface)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{
              width: 42, height: 42, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Search size={20} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Account Investigation Desk
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Execute empirical μ + 3σ outlier, burst drainage, and odd-hours detection across historical streams.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
            Select Profile Below <ArrowRight size={13} />
          </span>
        </div>


        {/* Card 2: Live Wire Surveillance */}
        <div
          onClick={() => onNavigate && onNavigate('live')}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
        >
          <div>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Radio size={20} color="var(--danger)" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Live Wire Surveillance
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Real-time streaming authorization feed with dynamic rolling velocity tachometer and instant anomaly interception.
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            Launch Live Feed <ArrowRight size={12} />
          </span>
        </div>

        {/* Card 3: Universal Statement Importer */}
        <div
          onClick={() => onNavigate && onNavigate('importer')}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
        >
          <div>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <UploadCloud size={20} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Statement Ingestion Engine
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Drop arbitrary bank statement CSVs (Chase, Barclays, HDFC). Auto-maps columns and profiles risk in &lt;2s.
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            Open Dropzone <ArrowRight size={12} />
          </span>
        </div>
      </section>

      {/* ── 3. Diagnostic Target Accounts Showcase ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Diagnostic Target Profiles
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Click any verified financial scenario to execute the 4 deterministic rules and generate an AI-narrated report.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex', gap: 6, background: 'var(--surface)',
            padding: '3px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setSelectedTab('all')}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer',
                fontWeight: selectedTab === 'all' ? 700 : 500,
                background: selectedTab === 'all' ? 'var(--bg)' : 'transparent',
                color: selectedTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              All Scenarios ({customers.length || 6})
            </button>
            <button
              onClick={() => setSelectedTab('core')}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer',
                fontWeight: selectedTab === 'core' ? 700 : 500,
                background: selectedTab === 'core' ? 'var(--bg)' : 'transparent',
                color: selectedTab === 'core' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Core Baselines (4)
            </button>
            <button
              onClick={() => setSelectedTab('benchmark')}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer',
                fontWeight: selectedTab === 'benchmark' ? 700 : 500,
                background: selectedTab === 'benchmark' ? 'var(--bg)' : 'transparent',
                color: selectedTab === 'benchmark' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              Real-World Benchmarks (2)
            </button>
          </div>
        </div>

        {/* Profiles Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 16,
        }}>
          {activeList.map(cust => {
            const details = PROFILE_DETAILS[cust.customer_id] || {
              badge: 'Custom Statement',
              badgeColor: 'var(--accent)',
              badgeBg: 'var(--accent-light)',
              title: cust.display_name,
              desc: 'Imported user statement stored in SQLite.',
              stats: 'Real-world data',
              icon: FileSpreadsheet,
              iconColor: 'var(--accent)',
            }
            const IconComponent = details.icon || Shield

            return (
              <div
                key={cust.customer_id}
                onClick={() => !loading && onRun(cust.customer_id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = details.badgeColor
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  }
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        background: details.badgeBg, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <IconComponent size={16} color={details.iconColor} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {cust.customer_id}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      background: details.badgeBg, color: details.badgeColor,
                      border: `1px solid ${details.badgeColor}33`,
                    }}>
                      {details.badge}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {details.title}
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {details.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)',
                  fontSize: 11, color: 'var(--text-muted)',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{details.stats}</span>
                  <span style={{ fontWeight: 600, color: details.badgeColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Run Investigation →
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Global Error Banner */}
        {error && !loading && (
          <div className="error-card" style={{ marginTop: 20 }}>
            <h3>Investigation Failed</h3>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-state" style={{ marginTop: 24, padding: 30, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div className="spinner" />
            Computing behavioral baseline, running 4 deterministic rules, and assembling Gemini narration…
          </div>
        )}
      </section>

      {/* ── 4. Architecture & Integrity Strip ── */}
      <section style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 20,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        textAlign: 'center', fontSize: 12,
      }}>
        <div>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>📐</span>
          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Zero-LLM Decisioning</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Python math rules set verdicts</span>
        </div>
        <div>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>⏱️</span>
          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Circadian 24h Radar</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>95% active daylight tracking</span>
        </div>
        <div>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>🛡️</span>
          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Tone Guardrails</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Regulated non-accusatory terms</span>
        </div>
        <div>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>📄</span>
          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>1-Click SAR Dossier</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>FinCEN / FIU SHA-256 hash</span>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        LedgerWatch Platform · SQLite Engine (<span style={{ fontFamily: 'var(--font-mono)' }}>database/ledgerwatch.db</span>) · FastAPI + React 18
      </footer>
    </div>
  )
}
