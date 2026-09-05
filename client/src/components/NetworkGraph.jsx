import { useState } from 'react'
import { Layers, AlertTriangle, CheckCircle, Shield, ArrowUpRight, Filter } from 'lucide-react'

export default function NetworkGraph({ graphData, customerId, onPayeeClick }) {
  const [filterFlaggedOnly, setFilterFlagged] = useState(false)
  const [hoveredNode, setHoveredNode] = useState(null)

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No counterparty network topology data available for this profile.
      </div>
    )
  }

  const { nodes, edges } = graphData

  // Separate center customer and counterparties
  const customerNode = nodes.find(n => n.type === 'customer') || { id: customerId, total_volume: 0, txn_count: 0 }
  const allPayees = nodes.filter(n => n.type === 'payee')
  const visiblePayees = filterFlaggedOnly ? allPayees.filter(p => p.is_flagged) : allPayees

  const totalNetworkVolume = allPayees.reduce((acc, p) => acc + (p.total_volume || 0), 0)
  const flaggedPayeesCount = allPayees.filter(p => p.is_flagged).length
  const flaggedVolume = allPayees.filter(p => p.is_flagged).reduce((acc, p) => acc + (p.total_volume || 0), 0)
  const maxVolume = Math.max(...allPayees.map(p => p.total_volume || 0), 1)

  // Layout geometry for wide 1000 x 600 viewBox
  const cx = 500
  const cy = 300
  const baseRadius = visiblePayees.length > 10 ? 175 : 185
  const outerRadius = visiblePayees.length > 10 ? 235 : 245

  // Compute staggered radial coordinates to eliminate label collision
  const payeeCoords = visiblePayees.map((payee, idx) => {
    const total = Math.max(1, visiblePayees.length)
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2
    // Stagger radius between even and odd indices so adjacent nodes have radial clearance
    const r = (idx % 2 === 0) ? baseRadius : outerRadius
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)

    // Calculate dynamic pill width based on label length
    const labelStr = payee.label || payee.id
    const displayLabel = labelStr.length > 18 ? `${labelStr.slice(0, 16)}…` : labelStr
    const pillWidth = Math.min(190, Math.max(120, displayLabel.length * 7.5 + 36))

    return {
      ...payee,
      displayLabel,
      pillWidth,
      x,
      y,
      angle,
      r,
    }
  })

  return (
    <div className="card network-graph-card" style={{ padding: 24, position: 'relative' }}>
      {/* Header & Analytical Metrics Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h4 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Layers size={18} color="var(--accent)" />
            Counterparty Risk Knowledge Graph
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Interactive topological mapping of capital flow, counterparty novelty, and flagged anomaly clusters.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Network Flow: </span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              ${totalNetworkVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div style={{
            background: flaggedPayeesCount > 0 ? 'var(--danger-bg)' : 'var(--safe-bg)',
            border: `1px solid ${flaggedPayeesCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12,
          }}>
            <span style={{ color: flaggedPayeesCount > 0 ? 'var(--danger)' : 'var(--safe)', fontWeight: 600 }}>
              {flaggedPayeesCount} Flagged Risk {flaggedPayeesCount === 1 ? 'Entity' : 'Entities'} (${flaggedVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })})
            </span>
          </div>

          {/* Filter Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--bg)', padding: '3px 6px',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setFilterFlagged(false)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer',
                fontWeight: !filterFlaggedOnly ? 700 : 500,
                background: !filterFlaggedOnly ? 'var(--surface)' : 'transparent',
                boxShadow: !filterFlaggedOnly ? 'var(--shadow-sm)' : 'none',
                color: !filterFlaggedOnly ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              All ({allPayees.length})
            </button>
            <button
              onClick={() => setFilterFlagged(true)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer',
                fontWeight: filterFlaggedOnly ? 700 : 500,
                background: filterFlaggedOnly ? 'var(--danger-bg)' : 'transparent',
                color: filterFlaggedOnly ? 'var(--danger)' : 'var(--text-secondary)',
              }}
            >
              Flagged Only ({flaggedPayeesCount})
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div style={{
        width: '100%',
        minHeight: 560,
        aspectRatio: '1000 / 600',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-inner, inset 0 1px 3px rgba(0,0,0,0.05))',
      }}>
        <svg viewBox="0 0 1000 600" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            {/* Subtle light dot grid pattern */}
            <pattern id="network-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1" fill="#CBD5E1" opacity="0.75" />
            </pattern>

            {/* Hub glow */}
            <filter id="hub-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Flagged pulse shadow */}
            <filter id="flagged-pill-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#EF4444" floodOpacity="0.25" />
            </filter>

            {/* Standard pill shadow */}
            <filter id="pill-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="600" fill="url(#network-dot-grid)" />

          {/* Reference concentric orbital rings */}
          <circle cx={cx} cy={cy} r={baseRadius} fill="none" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#E2E8F0" strokeDasharray="3 4" strokeWidth="1" />

          {/* Connecting Links (Center Subject -> Counterparties) */}
          {payeeCoords.map((payee) => {
            const isFlagged = payee.is_flagged
            const isHovered = hoveredNode === payee.id
            const strokeWidth = Math.max(1.2, Math.min(5, ((payee.total_volume || 0) / maxVolume) * 5))

            let linkStroke = '#CBD5E1'
            if (isFlagged) {
              linkStroke = '#EF4444'
            } else if (isHovered) {
              linkStroke = '#4F46E5'
            }

            return (
              <g key={`edge-${payee.id}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={payee.x}
                  y2={payee.y}
                  stroke={linkStroke}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={isFlagged ? '5 3' : 'none'}
                  opacity={isFlagged ? 0.95 : (isHovered ? 1 : 0.65)}
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            )
          })}

          {/* Center Subject Account Node */}
          <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
            <circle r="46" fill="rgba(79, 70, 229, 0.08)" />
            <circle r="34" fill="rgba(79, 70, 229, 0.16)" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle r="25" fill="#4F46E5" stroke="#6366F1" strokeWidth="2.5" filter="url(#hub-glow)" />

            <text textAnchor="middle" y="-2" fill="#E0E7FF" fontSize="8" fontWeight="700" letterSpacing="0.08em">
              SUBJECT
            </text>
            <text textAnchor="middle" y="9" fill="#FFFFFF" fontSize="9" fontWeight="700">
              ACCOUNT
            </text>

            {/* Subject account pill underneath */}
            <g transform="translate(0, 36)">
              <rect x="-60" y="-10" width="120" height="20" rx="10" fill="#0F172A" />
              <text textAnchor="middle" y="4" fill="#F8FAFC" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
                {customerId}
              </text>
            </g>
          </g>

          {/* Payee Nodes rendered as Clean Rounded Pill Badges (Zero Text Overlap) */}
          {payeeCoords.map((payee) => {
            const isFlagged = payee.is_flagged
            const isHovered = hoveredNode === payee.id
            const pillW = payee.pillWidth
            const pillH = 28
            const halfW = pillW / 2
            const halfH = pillH / 2

            // Pill styling
            let pillBg = '#FFFFFF'
            let pillBorder = '#CBD5E1'
            let statusDot = '#10B981'
            let textColor = 'var(--text-primary)'

            if (isFlagged) {
              pillBg = '#FEF2F2'
              pillBorder = '#EF4444'
              statusDot = '#DC2626'
              textColor = '#991B1B'
            } else if (isHovered) {
              pillBg = '#EEF2FF'
              pillBorder = '#4F46E5'
              statusDot = '#4F46E5'
              textColor = '#1E1B4B'
            }

            return (
              <g
                key={`pill-${payee.id}`}
                transform={`translate(${payee.x}, ${payee.y})`}
                onMouseEnter={() => setHoveredNode(payee.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onPayeeClick && onPayeeClick(payee.id)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHovered ? `translate(${payee.x}px, ${payee.y}px) scale(1.06)` : `translate(${payee.x}px, ${payee.y}px)`,
                }}
              >
                {/* Pill background capsule */}
                <rect
                  x={-halfW}
                  y={-halfH}
                  width={pillW}
                  height={pillH}
                  rx={halfH}
                  fill={pillBg}
                  stroke={pillBorder}
                  strokeWidth={isHovered ? 2 : (isFlagged ? 1.5 : 1)}
                  filter={isFlagged ? 'url(#flagged-pill-shadow)' : 'url(#pill-shadow)'}
                />

                {/* Status Dot */}
                <circle
                  cx={-halfW + 12}
                  cy={0}
                  r={isFlagged ? 5 : 4}
                  fill={statusDot}
                />

                {/* Counterparty Name Label */}
                <text
                  x={-halfW + 22}
                  y={4}
                  fill={textColor}
                  fontSize="11"
                  fontWeight={isFlagged ? 700 : 600}
                  fontFamily="var(--font-sans)"
                >
                  {payee.displayLabel}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Floating Rich Tooltip Popover */}
        {hoveredNode && (() => {
          const p = payeeCoords.find(n => n.id === hoveredNode)
          if (!p) return null

          // Compute tooltip absolute pixel position in container
          const leftPct = (p.x / 1000) * 100
          const topPct = (p.y / 600) * 100

          return (
            <div
              style={{
                position: 'absolute',
                top: `${Math.max(6, Math.min(74, topPct - 18))}%`,
                left: `${Math.max(6, Math.min(72, leftPct + (p.x >= cx ? -22 : 4)))}%`,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${p.is_flagged ? '#EF4444' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: '#F8FAFC',
                fontSize: 12,
                pointerEvents: 'none',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                minWidth: 230,
                zIndex: 20,
              }}
            >
              <div style={{
                fontWeight: 700, fontSize: 13, marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 6,
                color: p.is_flagged ? '#FCA5A5' : '#FFFFFF',
              }}>
                {p.is_flagged ? <AlertTriangle size={15} color="#EF4444" /> : <CheckCircle size={15} color="#10B981" />}
                {p.label || p.id}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '4px 0' }}>
                <span>Total Flow:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFFFFF', fontWeight: 600 }}>
                  ${(p.total_volume || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '4px 0' }}>
                <span>Transaction Count:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>{p.txn_count || 1}</span>
              </div>

              {p.first_seen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '4px 0' }}>
                  <span>First Observed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>{p.first_seen}</span>
                </div>
              )}

              {p.is_flagged && (
                <div style={{
                  marginTop: 8, paddingTop: 6,
                  borderTop: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#FCA5A5', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  🚨 Flagged in behavioral anomaly burst
                </div>
              )}

              <div style={{
                marginTop: 6, fontSize: 10, color: '#64748B', fontStyle: 'italic',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 4,
              }}>
                Click node to filter audit ledger
              </div>
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        marginTop: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
          <span>Subject Account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span>Established Counterparty</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
          <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Flagged Novel / Anomaly Cluster</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 2, background: '#CBD5E1', display: 'inline-block' }} />
          <span>Transfer Volume Stroke</span>
        </div>
      </div>
    </div>
  )
}
