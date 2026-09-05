import { useState, useEffect, useRef } from 'react'
import { Radio, Play, Pause, AlertTriangle, ShieldAlert, Activity, Zap, RefreshCw, Eye } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

export default function LiveWireSurveillance({ onInvestigateCustomer }) {
  const [isRunning, setIsRunning] = useState(true)
  const [intervalMs, setIntervalMs] = useState(2000)
  const [events, setEvents] = useState([])
  const [activeAlerts, setActiveAlerts] = useState([])
  const [velocityTx, setVelocityTx] = useState(14)
  const [volumeRate, setVolumeRate] = useState(1850)
  const [threatScore, setThreatScore] = useState(18)
  const timerRef = useRef(null)

  // Fetch a single live stream packet from API
  const fetchPacket = async (forceAnomaly = false) => {
    try {
      const res = await fetch(`${API}/api/stream/events?anomaly=${forceAnomaly}`)
      if (!res.ok) return
      const packet = await res.json()

      setEvents(prev => [packet, ...prev.slice(0, 49)]) // keep last 50
      setVelocityTx(packet.rolling_velocity_tx_per_min)
      setVolumeRate(packet.rolling_volume_usd_per_min)

      if (packet.is_anomaly) {
        setThreatScore(Math.min(98, packet.severity + 5))
        setActiveAlerts(prev => [packet, ...prev.slice(0, 4)])
      } else {
        setThreatScore(prev => Math.max(12, prev - 2))
      }
    } catch (err) {
      console.error('Live wire stream error:', err)
    }
  }

  // Polling loop
  useEffect(() => {
    if (!isRunning) return

    // Initial packet
    fetchPacket()

    timerRef.current = setInterval(() => {
      fetchPacket()
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, intervalMs])

  const handleInjectBurst = () => {
    fetchPacket(true)
  }

  const handleClear = () => {
    setEvents([])
    setActiveAlerts([])
    setThreatScore(12)
  }

  return (
    <div className="live-wire-view" style={{ maxWidth: 960, margin: '0 auto', padding: '16px 0' }}>
      {/* Top Surveillance Cockpit Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: isRunning ? 'var(--safe)' : 'var(--warning)',
                boxShadow: isRunning ? '0 0 10px rgba(22, 163, 74, 0.6)' : 'none',
              }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={18} color="var(--accent)" />
                Live Wire Telemetry Surveillance
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Autonomous ingestion stream intercepting real-time wire authorizations. Dynamic Z-score thresholding evaluated in-flight.
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`btn-ghost ${isRunning ? '' : 'active-filter'}`}
              onClick={() => setIsRunning(!isRunning)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: isRunning ? 'var(--surface)' : 'var(--accent-light)',
                fontWeight: 600, fontSize: 13,
              }}
            >
              {isRunning ? <><Pause size={14} /> Pause Stream</> : <><Play size={14} /> Resume Stream</>}
            </button>

            <button
              className="btn-ghost"
              onClick={handleInjectBurst}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)',
                background: 'var(--danger-bg)', color: 'var(--danger)',
                fontWeight: 600, fontSize: 13,
              }}
            >
              <Zap size={14} />
              Inject Anomaly Burst
            </button>

            <select
              value={intervalMs}
              onChange={e => setIntervalMs(Number(e.target.value))}
              style={{
                padding: '7px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <option value={1000}>1.0s Speed</option>
              <option value={2000}>2.0s Speed</option>
              <option value={4000}>4.0s Speed</option>
            </select>
          </div>
        </div>

        {/* Real-time Telemetry Tachometer Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Rolling Velocity
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{velocityTx}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>tx / min</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Debit Velocity Rate
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ${volumeRate.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ min</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Threat Index
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{
                fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: threatScore > 60 ? 'var(--danger)' : (threatScore > 30 ? 'var(--warning)' : 'var(--safe)'),
              }}>
                {threatScore}
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${threatScore}%`, height: '100%',
                  background: threatScore > 60 ? 'var(--danger)' : (threatScore > 30 ? 'var(--warning)' : 'var(--safe)'),
                  transition: 'all 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Packets Intercepted
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{events.length}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active High-Priority Anomaly Drawer */}
      {activeAlerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <ShieldAlert size={15} />
              Active Anomaly Intercepts ({activeAlerts.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAlerts.map(alert => (
              <div
                key={alert.event_id}
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      background: 'var(--danger)', color: '#FFFFFF', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {alert.rule_triggered || 'RULE_ANOMALY'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {alert.time_display}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {alert.customer_id}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                    {alert.reason}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                    ${alert.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    className="btn-primary"
                    onClick={() => onInvestigateCustomer(alert.customer_id)}
                    style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={13} />
                    Open Investigation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Feed Ledger */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={16} color="var(--accent)" />
            Real-Time Wire Feed
          </h4>
          <button
            className="btn-ghost"
            onClick={handleClear}
            style={{ fontSize: 11, padding: '3px 8px', color: 'var(--text-muted)' }}
          >
            Clear Log
          </button>
        </div>

        {events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Waiting for live telemetry stream packets…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
            {events.map((evt) => (
              <div
                key={evt.event_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: evt.is_anomaly ? 'var(--danger-bg)' : 'var(--bg)',
                  border: `1px solid ${evt.is_anomaly ? 'var(--danger-border)' : 'var(--border)'}`,
                  fontSize: 13,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 80 }}>
                    {evt.time_display}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 100 }}>
                    {evt.customer_id}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {evt.description}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ({evt.payee})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`channel-pill ${evt.channel}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                    {evt.channel}
                  </span>
                  <span style={{
                    fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: evt.is_anomaly ? 'var(--danger)' : 'var(--text-primary)',
                    minWidth: 85, textAlign: 'right',
                  }}>
                    ${evt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  {evt.is_anomaly && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--danger)',
                      background: 'var(--surface)', padding: '1px 6px', borderRadius: 4,
                      border: '1px solid var(--danger-border)',
                    }}>
                      FLAGGED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
