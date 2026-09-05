import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, HelpCircle, Layers } from 'lucide-react'

export default function NetworkGraph({ graphData, customerId, onPayeeClick }) {
  const [filterFlaggedOnly, setFilterFlagged] = useState(false)
  const [hoveredNode, setHoveredNode] = useState(null)

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No counterparty network data available for this profile.
      </div>
    )
  }

  const { nodes, edges } = graphData

  // Separate center customer and counterparties
  const customerNode = nodes.find(n => n.type === 'customer') || { id: customerId, total_volume: 0, txn_count: 0 }
  const allPayees = nodes.filter(n => n.type === 'payee')
  const visiblePayees = filterFlaggedOnly ? allPayees.filter(p => p.is_flagged) : allPayees

  // Center coordinates in SVG viewBox (800x560)
  const cx = 400
  const cy = 270
  const radius = Math.min(220, Math.max(160, 30 + visiblePayees.length * 10))

  // Compute radial layout coordinates
  const payeeCoords = visiblePayees.map((payee, idx) => {
    const angle = (idx / Math.max(1, visiblePayees.length)) * 2 * Math.PI - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    return { ...payee, x, y, angle }
  })

  const maxVolume = Math.max(...allPayees.map(p => p.total_volume), 1)

  return (
    <div className="card network-graph-card" style={{ padding: 24, position: 'relative' }}>
      {/* Graph Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="var(--accent)" />
            Counterparty Risk Knowledge Graph
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Interactive topological mapping of capital flow, counterparty novelty, and flagged anomaly clusters.
          </p>
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <button
            className={`btn-ghost ${!filterFlaggedOnly ? 'active-filter' : ''}`}
            onClick={() => setFilterFlagged(false)}
            style={{
              padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              background: !filterFlaggedOnly ? 'var(--surface)' : 'transparent',
              boxShadow: !filterFlaggedOnly ? 'var(--shadow-sm)' : 'none',
              fontWeight: !filterFlaggedOnly ? 600 : 400,
            }}
          >
            All Counterparties ({allPayees.length})
          </button>
          <button
            className={`btn-ghost ${filterFlaggedOnly ? 'active-filter' : ''}`}
            onClick={() => setFilterFlagged(true)}
            style={{
              padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              background: filterFlaggedOnly ? 'var(--danger-bg)' : 'transparent',
              color: filterFlaggedOnly ? 'var(--danger)' : 'var(--text-secondary)',
              fontWeight: filterFlaggedOnly ? 600 : 400,
            }}
          >
            Flagged Only ({allPayees.filter(p => p.is_flagged).length})
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', height: 540, background: '#0F172A', borderRadius: 'var(--radius)', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)' }}>
        <svg viewBox="0 0 800 540" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            {/* Ambient grid pattern */}
            <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
            {/* Center glow filter */}
            <filter id="center-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Flagged pulse glow filter */}
            <filter id="crimson-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background grid */}
          <rect width="800" height="540" fill="url(#graph-grid)" />

          {/* Orbit reference circle */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" strokeWidth="1" />

          {/* Links from center customer to payees */}
          {payeeCoords.map((payee) => {
            const edge = edges.find(e => e.target === payee.id) || {}
            const isFlagged = payee.is_flagged
            const strokeWidth = Math.max(1.5, Math.min(6, (payee.total_volume / maxVolume) * 6))
            const isHovered = hoveredNode === payee.id

            return (
              <g key={`edge-${payee.id}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={payee.x}
                  y2={payee.y}
                  stroke={isFlagged ? '#EF4444' : (isHovered ? '#818CF8' : 'rgba(148, 163, 184, 0.25)')}
                  strokeWidth={isHovered ? strokeWidth + 1.5 : strokeWidth}
                  strokeDasharray={isFlagged ? '6 3' : 'none'}
                  opacity={isFlagged ? 0.9 : 0.6}
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            )
          })}

          {/* Center Customer Account Node */}
          <g transform={`translate(${cx}, ${cy})`} style={{ cursor: 'pointer' }}>
            <circle r="36" fill="rgba(79, 70, 229, 0.25)" filter="url(#center-glow)" />
            <circle r="26" fill="#4F46E5" stroke="#818CF8" strokeWidth="3" />
            <text textAnchor="middle" y="5" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">
              ACCOUNT
            </text>
            <text textAnchor="middle" y="44" fill="#E2E8F0" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
              {customerId}
            </text>
          </g>

          {/* Payee Nodes */}
          {payeeCoords.map((payee) => {
            const isFlagged = payee.is_flagged
            const isHovered = hoveredNode === payee.id
            const nodeRadius = isFlagged ? 16 : 12

            let nodeFill = '#334155'
            let nodeStroke = '#94A3B8'
            if (isFlagged) {
              nodeFill = '#DC2626'
              nodeStroke = '#FCA5A5'
            } else if (payee.first_seen) {
              nodeFill = '#059669'
              nodeStroke = '#6EE7B7'
            }

            return (
              <g
                key={`node-${payee.id}`}
                transform={`translate(${payee.x}, ${payee.y})`}
                onMouseEnter={() => setHoveredNode(payee.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onPayeeClick && onPayeeClick(payee.id)}
                style={{ cursor: 'pointer' }}
              >
                {isFlagged && (
                  <circle r={nodeRadius + 8} fill="rgba(220, 38, 38, 0.3)" filter="url(#crimson-glow)" />
                )}
                <circle
                  r={isHovered ? nodeRadius + 3 : nodeRadius}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />

                {/* Node Label */}
                <text
                  textAnchor={payee.x >= cx ? 'start' : 'end'}
                  x={payee.x >= cx ? nodeRadius + 8 : -nodeRadius - 8}
                  y={4}
                  fill={isFlagged ? '#FCA5A5' : '#CBD5E1'}
                  fontSize={isFlagged ? "11" : "10"}
                  fontWeight={isFlagged ? "700" : "500"}
                  fontFamily="var(--font-mono)"
                >
                  {payee.label.length > 18 ? `${payee.label.slice(0, 16)}…` : payee.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredNode && (() => {
          const p = payeeCoords.find(n => n.id === hoveredNode)
          if (!p) return null
          return (
            <div
              style={{
                position: 'absolute',
                top: Math.max(10, Math.min(420, p.y - 70)),
                left: Math.max(10, Math.min(540, p.x + (p.x >= cx ? 25 : -240))),
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${p.is_flagged ? 'var(--danger)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: '#F8FAFC',
                fontSize: 12,
                pointerEvents: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                minWidth: 210,
                zIndex: 10,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, color: p.is_flagged ? '#FCA5A5' : '#FFFFFF' }}>
                {p.is_flagged ? <AlertTriangle size={14} color="#EF4444" /> : <CheckCircle size={14} color="#10B981" />}
                {p.label}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '3px 0' }}>
                <span>Total Outflow:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFFFFF', fontWeight: 600 }}>${p.total_volume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '3px 0' }}>
                <span>Transactions:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>{p.txn_count}</span>
              </div>
              {p.first_seen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', margin: '3px 0' }}>
                  <span>First Observed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>{p.first_seen}</span>
                </div>
              )}
              {p.is_flagged && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: 11, fontWeight: 600 }}>
                  🚨 Flagged in behavioral risk findings
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
          <span>Subject Account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
          <span>Established Counterparty</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
          <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Flagged / Burst Anomaly Target</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 24, height: 2, background: 'rgba(148, 163, 184, 0.4)', display: 'inline-block' }} />
          <span>Transfer Volume Thickness</span>
        </div>
      </div>
    </div>
  )
}
