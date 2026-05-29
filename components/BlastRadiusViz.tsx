// ─────────────────────────────────────────────────────────────────────────────
// DROP THIS FILE AT: components/BlastRadiusViz.tsx
// Then import it in page.tsx:
//   import BlastRadiusViz from '@/components/BlastRadiusViz'
// And use it in your results section:
//   <BlastRadiusViz pr={result.pr} score={result.score} />
// ─────────────────────────────────────────────────────────────────────────────

'use client'
import { useEffect, useState } from 'react'

type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface PR {
  title: string
  changedFiles: number
  additions: number
  deletions: number
}

interface Zone {
  id: string
  label: string
  icon: string
  description: string
  x: number
  y: number
  w: number
  h: number
  // Keywords that trigger this zone — matched against PR title
  keywords: string[]
  // Risk multiplier — some zones are more dangerous to touch
  weight: number
}

const ZONES: Zone[] = [
  {
    id: 'auth',
    label: 'Auth & Security',
    icon: '🔐',
    description: 'Authentication, permissions, tokens',
    x: 8, y: 8, w: 28, h: 22,
    keywords: ['auth', 'login', 'permission', 'token', 'oauth', 'session', 'password', 'security', 'access', 'role', 'jwt'],
    weight: 2.5,
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: '🖥️',
    description: 'UI, components, styling',
    x: 40, y: 8, w: 26, h: 22,
    keywords: ['ui', 'component', 'page', 'view', 'style', 'css', 'frontend', 'dashboard', 'modal', 'button', 'form', 'layout', 'design'],
    weight: 1.0,
  },
  {
    id: 'api',
    label: 'API Layer',
    icon: '🔌',
    description: 'REST endpoints, request handling',
    x: 70, y: 8, w: 22, h: 22,
    keywords: ['api', 'endpoint', 'route', 'handler', 'rest', 'graphql', 'request', 'response', 'middleware', 'controller'],
    weight: 1.8,
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: '💳',
    description: 'Billing, transactions, stripe',
    x: 8, y: 36, w: 26, h: 22,
    keywords: ['payment', 'billing', 'stripe', 'invoice', 'charge', 'subscription', 'transaction', 'checkout', 'gateway', 'refund'],
    weight: 3.0,
  },
  {
    id: 'backend',
    label: 'Backend Logic',
    icon: '⚙️',
    description: 'Services, business logic, workers',
    x: 38, y: 36, w: 28, h: 22,
    keywords: ['service', 'worker', 'job', 'queue', 'logic', 'backend', 'process', 'task', 'cron', 'event', 'refactor'],
    weight: 1.5,
  },
  {
    id: 'database',
    label: 'Database',
    icon: '🗄️',
    description: 'Migrations, queries, schema',
    x: 70, y: 36, w: 22, h: 22,
    keywords: ['database', 'migration', 'schema', 'query', 'db', 'sql', 'table', 'index', 'model', 'orm', 'seed', 'postgres', 'mysql', 'mongo'],
    weight: 2.2,
  },
  {
    id: 'infra',
    label: 'Infrastructure',
    icon: '🏗️',
    description: 'Docker, cloud, networking',
    x: 8, y: 64, w: 26, h: 22,
    keywords: ['docker', 'kubernetes', 'k8s', 'deploy', 'infra', 'cloud', 'aws', 'gcp', 'azure', 'terraform', 'network', 'config', 'env'],
    weight: 2.0,
  },
  {
    id: 'cicd',
    label: 'CI/CD',
    icon: '🚀',
    description: 'Pipelines, builds, releases',
    x: 38, y: 64, w: 28, h: 22,
    keywords: ['ci', 'cd', 'pipeline', 'build', 'release', 'deploy', 'github action', 'workflow', 'test', 'lint', 'artifact'],
    weight: 1.3,
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: '📊',
    description: 'Logs, metrics, alerts',
    x: 70, y: 64, w: 22, h: 22,
    keywords: ['log', 'metric', 'monitor', 'alert', 'trace', 'observ', 'sentry', 'datadog', 'grafana', 'dashboard', 'error'],
    weight: 1.2,
  },
]

// Detect which zones are hit based on PR title + size
function detectImpact(pr: PR, score: RiskScore): Record<string, 'none' | 'low' | 'medium' | 'high' | 'critical'> {
  const titleLower = (pr.title || '').toLowerCase()
  const sizeMultiplier = pr.changedFiles > 10 ? 1.5 : pr.changedFiles > 5 ? 1.2 : 1.0
  const scoreBoost: Record<RiskScore, number> = { LOW: 0.6, MEDIUM: 1.0, HIGH: 1.4, CRITICAL: 1.8 }
  const boost = scoreBoost[score]

  const result: Record<string, 'none' | 'low' | 'medium' | 'high' | 'critical'> = {}

  for (const zone of ZONES) {
    const matched = zone.keywords.some(kw => titleLower.includes(kw))
    const baseScore = matched ? zone.weight * sizeMultiplier * boost : 0

    // Large PRs have some chance of touching any zone
    const spillover = pr.changedFiles > 15 ? 0.6 : pr.changedFiles > 8 ? 0.3 : 0
    const finalScore = baseScore + spillover

    if      (finalScore >= 3.0) result[zone.id] = 'critical'
    else if (finalScore >= 2.0) result[zone.id] = 'high'
    else if (finalScore >= 1.0) result[zone.id] = 'medium'
    else if (finalScore >= 0.4) result[zone.id] = 'low'
    else                        result[zone.id] = 'none'
  }

  return result
}

const IMPACT_COLORS = {
  none:     { fill: 'rgba(15,23,42,0.6)',  border: 'rgba(30,41,59,0.8)',  label: 'rgba(71,85,105,0.6)',  pulse: false },
  low:      { fill: 'rgba(20,83,45,0.3)',  border: 'rgba(34,197,94,0.3)', label: '#4ade80',              pulse: false },
  medium:   { fill: 'rgba(92,57,5,0.35)',  border: 'rgba(234,179,8,0.4)', label: '#facc15',              pulse: false },
  high:     { fill: 'rgba(124,45,18,0.4)', border: 'rgba(249,115,22,0.5)',label: '#fb923c',              pulse: true  },
  critical: { fill: 'rgba(127,29,29,0.5)', border: 'rgba(239,68,68,0.65)',label: '#f87171',              pulse: true  },
}

export default function BlastRadiusViz({ pr, score }: { pr: PR; score: RiskScore }) {
  const [impact, setImpact] = useState<Record<string, 'none' | 'low' | 'medium' | 'high' | 'critical'>>({})
  const [revealed, setRevealed] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null)

  useEffect(() => {
    // Animate reveal: stagger zone lighting
    const result = detectImpact(pr, score)
    setImpact({})
    setRevealed(false)
    const timer = setTimeout(() => {
      setImpact(result)
      setRevealed(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [pr, score])

  const hitZones   = ZONES.filter(z => impact[z.id] && impact[z.id] !== 'none')
  const critZones  = ZONES.filter(z => impact[z.id] === 'critical' || impact[z.id] === 'high')
  const totalScore = hitZones.reduce((acc, z) => acc + (impact[z.id] === 'critical' ? 4 : impact[z.id] === 'high' ? 3 : impact[z.id] === 'medium' ? 2 : 1), 0)

  return (
    <div style={{
      background: 'rgba(6,14,26,0.85)',
      border: '1px solid rgba(14,165,233,0.1)',
      borderRadius: 10,
      padding: '20px 24px',
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 7.5, color: 'rgba(239,68,68,0.5)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
            💣 Blast Radius Visualization
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(148,163,184,0.55)' }}>
            System areas affected by PR #{pr.number}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7.5, color: 'rgba(148,163,184,0.3)', letterSpacing: 2, marginBottom: 2 }}>IMPACT ZONES</div>
          <div style={{ fontSize: 22, fontFamily: "'Cinzel', serif", fontWeight: 700, color: hitZones.length > 5 ? '#ef4444' : hitZones.length > 3 ? '#f97316' : '#eab308', lineHeight: 1 }}>
            {hitZones.length} / {ZONES.length}
          </div>
        </div>
      </div>

      {/* Grid map */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '36%', marginBottom: 14 }}>
        <svg
          viewBox="0 0 100 90"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Blast origin — center marker */}
          <circle cx="50" cy="45" r="1.5" fill="rgba(239,68,68,0.4)" />
          <circle cx="50" cy="45" r="3" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="0.4"/>
          <circle cx="50" cy="45" r="5" fill="none" stroke="rgba(239,68,68,0.08)" strokeWidth="0.3"/>

          {/* Zone rectangles */}
          {ZONES.map(zone => {
            const lvl = impact[zone.id] || 'none'
            const colors = IMPACT_COLORS[lvl]
            const isHovered = hoveredZone?.id === zone.id
            return (
              <g key={zone.id}
                style={{ cursor: 'pointer', transition: 'opacity 0.3s' }}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Pulse ring for high/critical */}
                {colors.pulse && revealed && (
                  <rect
                    x={zone.x - 1} y={zone.y - 1}
                    width={zone.w + 2} height={zone.h + 2}
                    rx="2"
                    fill="none"
                    stroke={colors.border}
                    strokeWidth="0.6"
                    opacity="0.5"
                    style={{ animation: 'pulseRing 2s ease-in-out infinite' }}
                  />
                )}
                {/* Zone body */}
                <rect
                  x={zone.x} y={zone.y}
                  width={zone.w} height={zone.h}
                  rx="1.5"
                  fill={isHovered ? colors.fill.replace('0.', '0.8') : colors.fill}
                  stroke={colors.border}
                  strokeWidth={lvl !== 'none' ? '0.7' : '0.4'}
                  style={{ transition: 'all 0.4s ease' }}
                />
                {/* Icon */}
                <text x={zone.x + zone.w / 2} y={zone.y + 7} textAnchor="middle" fontSize="5.5">
                  {zone.icon}
                </text>
                {/* Label */}
                <text
                  x={zone.x + zone.w / 2} y={zone.y + 13}
                  textAnchor="middle" fontSize="2.8"
                  fill={colors.label}
                  fontFamily="'Cinzel', serif"
                  fontWeight={lvl !== 'none' ? 'bold' : 'normal'}
                >
                  {zone.label}
                </text>
                {/* Impact level badge */}
                {lvl !== 'none' && (
                  <text
                    x={zone.x + zone.w / 2} y={zone.y + 18}
                    textAnchor="middle" fontSize="2.2"
                    fill={colors.label} opacity="0.7"
                    fontFamily="'Share Tech Mono', monospace"
                  >
                    {lvl.toUpperCase()}
                  </text>
                )}
              </g>
            )
          })}

          {/* Blast lines from center to affected zones */}
          {revealed && hitZones.map(zone => {
            const zCx = zone.x + zone.w / 2
            const zCy = zone.y + zone.h / 2
            const lvl = impact[zone.id]!
            const strokeColor = lvl === 'critical' ? 'rgba(239,68,68,0.25)' : lvl === 'high' ? 'rgba(249,115,22,0.2)' : 'rgba(234,179,8,0.1)'
            return (
              <line
                key={zone.id}
                x1="50" y1="45" x2={zCx} y2={zCy}
                stroke={strokeColor} strokeWidth="0.3"
                strokeDasharray="1 1"
              />
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {(['none','low','medium','high','critical'] as const).map(lvl => (
          <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: IMPACT_COLORS[lvl].fill, border: `1px solid ${IMPACT_COLORS[lvl].border}` }}/>
            <span style={{ fontSize: 9, color: IMPACT_COLORS[lvl].label, letterSpacing: 1 }}>{lvl.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* Hovered zone detail */}
      {hoveredZone && (
        <div style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(14,165,233,0.15)',
          borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 11,
          color: 'rgba(241,245,249,0.7)', transition: 'all 0.2s',
        }}>
          <span style={{ color: IMPACT_COLORS[impact[hoveredZone.id] || 'none'].label, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 1 }}>
            {hoveredZone.icon} {hoveredZone.label}
          </span>
          <span style={{ color: 'rgba(148,163,184,0.4)', marginLeft: 8 }}>— {hoveredZone.description}</span>
          <span style={{ marginLeft: 8, color: IMPACT_COLORS[impact[hoveredZone.id] || 'none'].label, textTransform: 'uppercase', fontSize: 9, letterSpacing: 1 }}>
            [{impact[hoveredZone.id] || 'none'}]
          </span>
        </div>
      )}

      {/* Critical zones callout */}
      {critZones.length > 0 && (
        <div style={{
          background: 'rgba(127,29,29,0.15)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 7.5, color: 'rgba(239,68,68,0.5)', letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>
            ☠ High-impact zones detected
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {critZones.map(z => (
              <span key={z.id} style={{ fontSize: 10.5, color: '#fca5a5' }}>
                {z.icon} {z.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseRing {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}