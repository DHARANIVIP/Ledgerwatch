import { useState } from 'react'
import { Clock, AlertCircle, Sun, Moon, ShieldCheck, AlertTriangle, Compass, CheckCircle2 } from 'lucide-react'

export default function DiurnalRadar({ diurnalProfile, customerId }) {
  const [hoveredHour, setHoveredHour] = useState(null)

  if (!diurnalProfile || !diurnalProfile.hours) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No diurnal activity profile available for this account.
      </div>
    )
  }

  const { active_hour_start = 8, active_hour_end = 22, hours = [] } = diurnalProfile

  const maxCount = Math.max(...hours.map(h => h.count || 0), 1)
  const totalTxns = hours.reduce((acc, h) => acc + (h.count || 0), 0)
  const totalVolume = hours.reduce((acc, h) => acc + (h.volume || 0), 0)
  const offHoursFlagged = hours.filter(h => !h.in_active_window && ((h.count || 0) > 0 || (h.flagged_count || 0) > 0))
  const offHoursTotalTxns = offHoursFlagged.reduce((acc, h) => acc + (h.count || 0), 0)
  const offHoursTotalVolume = offHoursFlagged.reduce((acc, h) => acc + (h.volume || 0), 0)

  // Radar geometry (540x540 viewBox)
  const cx = 270
  const cy = 270
  const outerR = 200
  const innerR = 52

  // 24 hours mapped around 360 degrees, 00:00 at 12 o'clock (-90 deg)
  const getCoordinates = (hour, radius) => {
    const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  }

  // Generate SVG path for the active daytime window sector
  const generateArcPath = (startH, endH, r) => {
    const startPt = getCoordinates(startH, r)
    const endPt = getCoordinates((endH + 1) % 24, r)
    const span = (endH - startH + 1 + 24) % 24
    const largeArc = span > 12 ? 1 : 0
    return `M ${cx} ${cy} L ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`
  }

  const activeHourData = hoveredHour !== null ? hours.find(h => h.hour === hoveredHour) : null

  return (
    <div className="card diurnal-radar-card" style={{ padding: 24, position: 'relative' }}>
      {/* Header & Metrics Overview */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h4 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Clock size={18} color="var(--accent)" />
            24-Hour Diurnal Circadian Radar
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Circadian activity telemetry mapped against empirical 95% daylight boundaries. Detects off-hours automated draining or compromised sessions.
          </p>
        </div>

        {/* Active Window Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--safe-bg)', border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '6px 12px', borderRadius: 'var(--radius-sm)',
          }}>
            <Sun size={14} color="var(--safe)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--safe)', fontFamily: 'var(--font-mono)' }}>
              Empirical Active Band: {String(active_hour_start).padStart(2, '0')}:00 – {String(active_hour_end).padStart(2, '0')}:59 UTC
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: offHoursTotalTxns > 0 ? 'var(--danger-bg)' : 'var(--bg)',
            border: `1px solid ${offHoursTotalTxns > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
            padding: '6px 12px', borderRadius: 'var(--radius-sm)',
          }}>
            <Moon size={14} color={offHoursTotalTxns > 0 ? 'var(--danger)' : 'var(--text-secondary)'} />
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: offHoursTotalTxns > 0 ? 'var(--danger)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              Off-Hours Events: {offHoursTotalTxns}
            </span>
          </div>
        </div>
      </div>

      {/* Dual Cockpit Grid: Left = Polar Clock Radar, Right = Analytics & Outlier Stream */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 24,
        alignItems: 'stretch',
      }}>
        {/* LEFT: Polar Radar Dial */}
        <div style={{
          background: 'radial-gradient(circle at center, #1E293B 0%, #0B0F19 100%)',
          borderRadius: 'var(--radius)',
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #334155',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 540 540" style={{ width: '100%', maxWidth: 480, height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="active-daylight-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.06" />
              </linearGradient>

              <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0F172A" />
              </radialGradient>
            </defs>

            {/* Concentric reference depth rings */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
              <circle
                key={`ring-${idx}`}
                cx={cx}
                cy={cy}
                r={innerR + (outerR - innerR) * frac}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            ))}

            {/* Daytime Window Shaded Sector */}
            <path
              d={generateArcPath(active_hour_start, active_hour_end, outerR)}
              fill="url(#active-daylight-grad)"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.9"
            />

            {/* 24-Hour Radial Spokes and Activity Bars */}
            {hours.map((hObj) => {
              const hour = hObj.hour
              const inWindow = hObj.in_active_window
              const hasFlagged = (hObj.flagged_count || 0) > 0
              const count = hObj.count || 0
              const isHovered = hoveredHour === hour

              const barFraction = count > 0 ? (count / maxCount) : 0
              const barLen = innerR + ((outerR - innerR) * barFraction)
              const startCoord = getCoordinates(hour, innerR)
              const endCoord = getCoordinates(hour, barLen)
              const fullRadiusCoord = getCoordinates(hour, outerR)
              const labelCoord = getCoordinates(hour, outerR + 24)

              let barColor = inWindow ? '#38BDF8' : '#64748B'
              let barWidth = 4
              if (hasFlagged) {
                barColor = '#EF4444'
                barWidth = 7
              } else if (isHovered) {
                barColor = '#818CF8'
                barWidth = 6
              }

              return (
                <g
                  key={`spoke-${hour}`}
                  onMouseEnter={() => setHoveredHour(hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Spoke guide line */}
                  <line
                    x1={startCoord.x}
                    y1={startCoord.y}
                    x2={fullRadiusCoord.x}
                    y2={fullRadiusCoord.y}
                    stroke={isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}
                    strokeWidth="1"
                  />

                  {/* Activity Bar */}
                  {count > 0 && (
                    <line
                      x1={startCoord.x}
                      y1={startCoord.y}
                      x2={endCoord.x}
                      y2={endCoord.y}
                      stroke={barColor}
                      strokeWidth={barWidth}
                      strokeLinecap="round"
                      style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  )}

                  {/* Outlier Crimson Ping Dot for Flagged Off-Hours Transaction */}
                  {hasFlagged && (
                    <g transform={`translate(${endCoord.x}, ${endCoord.y})`}>
                      <circle r="10" fill="rgba(239, 68, 68, 0.35)" />
                      <circle r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Hour Clock Labels (Every 3 hours or if flagged) */}
                  {(hour % 3 === 0 || hasFlagged) && (
                    <text
                      x={labelCoord.x}
                      y={labelCoord.y + 4}
                      textAnchor="middle"
                      fill={hasFlagged ? '#F87171' : (isHovered ? '#FFFFFF' : '#94A3B8')}
                      fontSize={hasFlagged ? '11' : '10'}
                      fontWeight={hasFlagged || isHovered ? '700' : '500'}
                      fontFamily="var(--font-mono)"
                    >
                      {String(hour).padStart(2, '0')}h
                    </text>
                  )}
                </g>
              )
            })}

            {/* Center Dial Hub */}
            <circle cx={cx} cy={cy} r={innerR - 6} fill="url(#hub-grad)" stroke="#475569" strokeWidth="2" />

            {hoveredHour !== null ? (
              <>
                <text x={cx} y={cy - 4} textAnchor="middle" fill="#38BDF8" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
                  {String(hoveredHour).padStart(2, '0')}:00
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="600">
                  {activeHourData?.count || 0} TXNS
                </text>
              </>
            ) : (
              <>
                <text x={cx} y={cy - 5} textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="700" letterSpacing="0.08em">
                  CIRCADIAN
                </text>
                <text x={cx} y={cy + 11} textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
                  24H RADAR
                </text>
              </>
            )}
          </svg>

          {/* Compass & Timezone Indicator */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', width: '100%',
            padding: '8px 12px 0 12px', fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)',
          }}>
            <span>00:00 (Midnight)</span>
            <span>12:00 (Noon)</span>
          </div>
        </div>

        {/* RIGHT: Analytical Diagnostics & Outlier Breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metric Summary Strip */}
          <div style={{
            background: 'var(--surface)', padding: 18,
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h5 style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Circadian Compliance Telemetry
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Reviewed Events:</span>
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                  {totalTxns} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>txns</span>
                </p>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })} total
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Off-Hours Outliers:</span>
                <p style={{
                  fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: offHoursTotalTxns > 0 ? 'var(--danger)' : 'var(--safe)',
                  margin: '2px 0 0 0',
                }}>
                  {offHoursTotalTxns} <span style={{ fontSize: 12, fontWeight: 500 }}>events</span>
                </p>
                <span style={{ fontSize: 11, color: offHoursTotalTxns > 0 ? 'var(--danger)' : 'var(--safe)' }}>
                  {offHoursTotalTxns > 0 ? `$${offHoursTotalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })} flagged` : '100% Daylight compliant'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Spoke Inspector */}
          <div style={{
            background: hoveredHour !== null ? 'var(--surface)' : 'var(--bg)',
            border: `1px solid ${hoveredHour !== null ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: 16,
            minHeight: 110,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}>
            {hoveredHour !== null ? (() => {
              const hData = activeHourData || {}
              const isSafe = hData.in_active_window
              const isFlag = (hData.flagged_count || 0) > 0

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {String(hoveredHour).padStart(2, '0')}:00 – {String(hoveredHour).padStart(2, '0')}:59 UTC
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      background: isFlag ? 'var(--danger-bg)' : (isSafe ? 'var(--safe-bg)' : 'var(--warning-bg)'),
                      color: isFlag ? 'var(--danger)' : (isSafe ? 'var(--safe)' : 'var(--warning)'),
                      border: `1px solid ${isFlag ? 'var(--danger)' : (isSafe ? 'var(--safe)' : 'var(--warning)')}33`,
                    }}>
                      {isFlag ? '🚨 OUTLIER SPIKE' : (isSafe ? '✓ Routine Daylight Window' : '⚠ Off-Hours Inactive')}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0' }}>
                    Activity Volume: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>${(hData.volume || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> across <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{hData.count || 0}</strong> transactions.
                  </p>

                  {isFlag && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      • Triggered Rule 3: Initiated outside empirical 95% daylight window ({active_hour_start}:00 – {active_hour_end}:59 UTC).
                    </p>
                  )}
                </div>
              )
            })() : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>
                <Clock size={20} style={{ margin: '0 auto 6px auto', display: 'block', opacity: 0.6 }} />
                Hover over any hour spoke on the polar dial to inspect UTC volume and window compliance.
              </div>
            )}
          </div>

          {/* Off-Hours Incident Status Card */}
          <div style={{
            background: offHoursFlagged.length > 0 ? 'var(--danger-bg)' : 'var(--safe-bg)',
            border: `1px solid ${offHoursFlagged.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 'var(--radius)',
            padding: 14,
          }}>
            {offHoursFlagged.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
                    Circadian Boundary Breach Detected
                  </h6>
                  <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0 0', opacity: 0.9 }}>
                    Activity recorded during off-hours window ({offHoursFlagged.map(h => `${String(h.hour).padStart(2, '0')}:00`).join(', ')}). Correlated with burst payee novelty rules.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={18} color="var(--safe)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--safe)', margin: 0 }}>
                    100% Circadian Regularity Verified
                  </h6>
                  <p style={{ fontSize: 12, color: 'var(--safe)', margin: '4px 0 0 0', opacity: 0.9 }}>
                    All financial operations initiated strictly within the customer's daylight pattern. Zero nocturnal anomalies detected.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Radar Dial Legend */}
          <div style={{
            display: 'flex', gap: 18, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-secondary)',
            marginTop: 'auto', paddingTop: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: '50%', display: 'inline-block' }} />
              <span>95% Active Diurnal Band</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#38BDF8', borderRadius: '50%', display: 'inline-block' }} />
              <span>Daylight Activity Spoke</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Off-Hours Spike</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
