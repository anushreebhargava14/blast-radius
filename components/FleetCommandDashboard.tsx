// ─────────────────────────────────────────────────────────────────────────────
// DROP THIS FILE AT: components/FleetCommandDashboard.tsx
// Then import it in page.tsx:
//   import FleetCommandDashboard from '@/components/FleetCommandDashboard'
// And use it at the TOP of your Fleet tab results:
//   {fleetData?.prs && <FleetCommandDashboard data={fleetData} repo={fleetRepo} />}
// ─────────────────────────────────────────────────────────────────────────────

'use client'

type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface PR {
  number: number
  title: string
  score: RiskScore
  changed_files: number
  additions: number
  deletions: number
}

interface FleetData {
  prs: PR[]
  total: number
  repo: string
}

const SCORE_COLOR: Record<RiskScore, string> = {
  LOW:      '#22c55e',
  MEDIUM:   '#eab308',
  HIGH:     '#f97316',
  CRITICAL: '#ef4444',
}

const SCORE_LABEL: Record<RiskScore, string> = {
  LOW: 'SAFE WATERS', MEDIUM: 'ROUGH SEAS', HIGH: 'STORM WARNING', CRITICAL: 'ABANDON SHIP',
}

export default function FleetCommandDashboard({ data, repo }: { data: FleetData; repo: string }) {
  const { prs } = data

  // Counts per risk level
  const counts: Record<RiskScore, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  for (const pr of prs) counts[pr.score] = (counts[pr.score] || 0) + 1

  // Most dangerous PR
  const danger = prs[0] // already sorted CRITICAL first

  // Repo health score: 100 = all low risk, 0 = all critical
  const healthScore = Math.max(0, Math.round(
    100 - (counts.CRITICAL * 25 + counts.HIGH * 12 + counts.MEDIUM * 5) / Math.max(prs.length, 1) * 3
  ))
  const healthColor = healthScore >= 80 ? '#22c55e' : healthScore >= 50 ? '#eab308' : healthScore >= 25 ? '#f97316' : '#ef4444'
  const healthLabel = healthScore >= 80 ? 'HEALTHY' : healthScore >= 50 ? 'CAUTION' : healthScore >= 25 ? 'AT RISK' : 'CRITICAL'

  // Distribution bar (as % widths)
  const total = prs.length || 1
  const barSegments: { score: RiskScore; pct: number }[] = (['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[])
    .filter(s => counts[s] > 0)
    .map(s => ({ score: s, pct: (counts[s] / total) * 100 }))

  return (
    <div style={{
      background: 'rgba(6,14,26,0.9)',
      border: '1px solid rgba(14,165,233,0.18)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 18,
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 7.5, color: 'rgba(14,165,233,0.4)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>
            ⚓ Fleet Command Dashboard
          </div>
          <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)' }}>{repo}</div>
        </div>
        {/* Health score */}
        <div style={{
          background: `${healthColor}11`,
          border: `1px solid ${healthColor}44`,
          borderRadius: 8, padding: '10px 18px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 7.5, color: `${healthColor}88`, letterSpacing: 3, marginBottom: 3, textTransform: 'uppercase' }}>REPO HEALTH</div>
          <div style={{ fontSize: 28, fontFamily: "'Cinzel', serif", fontWeight: 900, color: healthColor, lineHeight: 1 }}>{healthScore}</div>
          <div style={{ fontSize: 8, color: `${healthColor}99`, letterSpacing: 2, marginTop: 2 }}>{healthLabel}</div>
        </div>
      </div>

      {/* Four stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {(['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[]).map(score => (
          <div key={score} style={{
            background: `${SCORE_COLOR[score]}09`,
            border: `1px solid ${SCORE_COLOR[score]}28`,
            borderRadius: 8, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 7, color: `${SCORE_COLOR[score]}77`, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>
              {SCORE_LABEL[score]}
            </div>
            <div style={{ fontSize: 30, fontFamily: "'Cinzel', serif", fontWeight: 700, color: SCORE_COLOR[score], lineHeight: 1 }}>
              {counts[score]}
            </div>
            <div style={{ fontSize: 8.5, color: 'rgba(148,163,184,0.3)', marginTop: 4 }}>
              {counts[score] === 1 ? 'PR' : 'PRs'}
            </div>
          </div>
        ))}
      </div>

      {/* Risk distribution bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 7.5, color: 'rgba(148,163,184,0.3)', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
          Risk Distribution — {total} open PRs
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(0,0,0,0.4)' }}>
          {barSegments.map(seg => (
            <div key={seg.score} style={{
              width: `${seg.pct}%`, height: '100%',
              background: SCORE_COLOR[seg.score],
              opacity: 0.8,
              transition: 'width 0.6s ease',
            }}/>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {barSegments.map(seg => (
            <div key={seg.score} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: SCORE_COLOR[seg.score] }}/>
              <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.45)', letterSpacing: 1 }}>
                {counts[seg.score]} {seg.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Most dangerous PR */}
      {danger && danger.score !== 'LOW' && (
        <div style={{
          background: `${SCORE_COLOR[danger.score]}09`,
          border: `1px solid ${SCORE_COLOR[danger.score]}30`,
          borderRadius: 8, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 7.5, color: `${SCORE_COLOR[danger.score]}77`, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              ☠ Most Dangerous PR
            </div>
            <div style={{ fontSize: 12, color: '#f1f5f9' }}>#{danger.number} — {danger.title}</div>
            <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.35)', marginTop: 3 }}>
              {danger.changed_files} files · +{danger.additions} / -{danger.deletions} lines
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: SCORE_COLOR[danger.score], letterSpacing: 2 }}>
              {SCORE_LABEL[danger.score]}
            </div>
          </div>
        </div>
      )}

      {/* All clear */}
      {(counts.CRITICAL === 0 && counts.HIGH === 0) && (
        <div style={{
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '12px 14px', textAlign: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#4ade80' }}>✅ Clear skies ahead — no HIGH or CRITICAL PRs in your fleet</span>
        </div>
      )}
    </div>
  )
}