import { useState } from 'react'
import { Clock, AlertCircle, Sun, Moon } from 'lucide-react'

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

  const maxCount = Math.max(...hours.map(h => h.count), 1)
  const totalTxns = hours.reduce((acc, h) => acc + h.count, 0)
  const offHoursFlagged = hours.filter(h => !h.in_active_window && (h.count > 0 || h.flagged_count > 0))

  // Radar geometry
  const cx = 250
  const cy = 250
  const outerR = 190
  const innerR = 45

  // Arc path generator for active window
  const getCoordinates = (hour, radius) => {
    // 24 hours mapped around 360 deg, with 0 at the top (-90 deg)
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
    const largeArc = (endH - startH + 1 + 24) % 24 > 12 ? 1 : 0
    return `M ${cx} ${cy} L ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y} Z`
  }

  return (
    <div className="card diurnal-radar-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--accent)" />
            24-Hour Diurnal Circadian Radar
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Circadian activity mapping against customer's empirical 95% diurnal boundary. Outliers outside window flag suspicious access.
          </p>
        </div>

        {/* Quick Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-light)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
          <Sun size={14} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            Active Band: {String(active_hour_start).padStart(2, '0')}:00 – {String(active_hour_end).padStart(2, '0')}:59
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 500px) 1fr', gap: 24, alignItems: 'center' }}>
        {/* Polar SVG Clock Radar */}
        <div style={{ background: '#0F172A', borderRadius: 'var(--radius)', padding: 10, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)' }}>
          <svg viewBox="0 0 500 500" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="active-window-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#065F46" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Background concentric rings */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
              <circle
                key={`ring-${idx}`}
                cx={cx}
                cy={cy}
                r={innerR + (outerR - innerR) * frac}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Shaded Active Daylight Window Arc */}
            <path
              d={generateArcPath(active_hour_start, active_hour_end, outerR)}
              fill="url(#active-window-grad)"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.9"
            />

            {/* Spoke lines and hour bars */}
            {hours.map((hObj) => {
              const hour = hObj.hour
              const inWindow = hObj.in_active_window
              const hasFlagged = hObj.flagged_count > 0
              const count = hObj.count
              const isHovered = hoveredHour === hour

              const barLen = count > 0 ? innerR + ((outerR - innerR) * (count / maxCount)) : innerR
              const startCoord = getCoordinates(hour, innerR)
              const endCoord = getCoordinates(hour, barLen)
              const labelCoord = getCoordinates(hour, outerR + 22)

              let barColor = inWindow ? '#3B82F6' : '#64748B'
              let barWidth = 4
              if (hasFlagged) {
                barColor = '#EF4444'
                barWidth = 7
              } else if (isHovered) {
                barColor = '#A5B4FC'
                barWidth = 6
              }

              return (
                <g
                  key={`spoke-${hour}`}
                  onMouseEnter={() => setHoveredHour(hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Subtle spoke background guide */}
                  <line
                    x1={startCoord.x}
                    y1={startCoord.y}
                    x2={getCoordinates(hour, outerR).x}
                    y2={getCoordinates(hour, outerR).y}
                    stroke="rgba(255,255,255,0.05)"
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
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  )}

                  {/* Outlier Crimson Ping Dot for Flagged Hour */}
                  {hasFlagged && (
                    <g transform={`translate(${endCoord.x}, ${endCoord.y})`}>
                      <circle r="9" fill="rgba(239, 68, 68, 0.4)" />
                      <circle r="5" fill="#EF4444" stroke="#FECACA" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Hour Clock Label (every 3 hours or if flagged) */}
                  {(hour % 3 === 0 || hasFlagged) && (
                    <text
                      x={labelCoord.x}
                      y={labelCoord.y + 4}
                      textAnchor="middle"
                      fill={hasFlagged ? '#F87171' : (isHovered ? '#FFFFFF' : '#94A3B8')}
                      fontSize={hasFlagged ? '11' : '9'}
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
            <circle cx={cx} cy={cy} r={innerR - 4} fill="#1E293B" stroke="#334155" strokeWidth="2" />
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#94A3B8" fontSize="9" fontWeight="600" letterSpacing="0.05em">
              CIRCADIAN
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
              24H RADAR
            </text>
          </svg>
        </div>

        {/* Informational Panel & Outlier Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active stats */}
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h5 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Diurnal Metric Diagnostics
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Analyzed Events:</span>
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{totalTxns}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Off-Hours Activity:</span>
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: offHoursFlagged.length > 0 ? 'var(--danger)' : 'var(--safe)' }}>
                  {offHoursFlagged.reduce((acc, h) => acc + h.count, 0)} events
                </p>
              </div>
            </div>
          </div>

          {/* Hovered hour inspector or default guidance */}
          <div style={{
            background: hoveredHour !== null ? 'var(--surface)' : 'var(--border-light)',
            border: `1px solid ${hoveredHour !== null ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: 16,
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}>
            {hoveredHour !== null ? (() => {
              const hData = hours.find(h => h.hour === hoveredHour) || {}
              const isSafe = hData.in_active_window
              const isFlag = hData.flagged_count > 0

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {String(hoveredHour).padStart(2, '0')}:00 – {String(hoveredHour).padStart(2, '0')}:59 UTC
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: isFlag ? 'var(--danger-bg)' : (isSafe ? 'var(--safe-bg)' : 'var(--warning-bg)'),
                      color: isFlag ? 'var(--danger)' : (isSafe ? 'var(--safe)' : 'var(--warning)'),
                    }}>
                      {isFlag ? '🚨 OUTLIER HIT' : (isSafe ? '✓ Routine Window' : '⚠ Off-Hours')}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0' }}>
                    Recorded Volume: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>${(hData.volume || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> across <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{hData.count}</strong> transactions.
                  </p>
                  {isFlag && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 4 }}>
                      • Initiated outside 95% empirical active window ({active_hour_start}:00 – {active_hour_end}:59).
                    </p>
                  )}
                </div>
              )
            })() : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                <Clock size={20} style={{ margin: '0 auto 6px auto', display: 'block', opacity: 0.6 }} />
                Hover over any hour spoke on the radar dial to inspect transaction volume and window compliance.
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: '50%', display: 'inline-block' }} />
              <span>95% Active Diurnal Band</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Off-Hours Outlier Spike</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
