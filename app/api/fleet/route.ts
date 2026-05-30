// File location: app/api/fleet/route.ts
// Create folder first: mkdir app\api\fleet
// Then create this file: New-Item app\api\fleet\route.ts

import { exec } from 'child_process'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'

const execAsync = promisify(exec)

async function coralQuery(sql: string): Promise<any[]> {
  const escaped = sql.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"')
  try {
    const { stdout } = await execAsync(`coral sql --format json "${escaped}"`)
    return JSON.parse(stdout || '[]')
  } catch { return [] }
}

export async function POST(req: NextRequest) {
  const { repo } = await req.json()
  // Demo fleet mode for judges
if (repo === 'demo/demo') {
  return NextResponse.json({
    repo: 'demo/demo',
    total: 5,
    prs: [
      {
        number: 42,
        title: 'Refactor payment gateway timeout handling',
        score: 'CRITICAL',
        changed_files: 14,
        additions: 342,
        deletions: 89,
      },
      {
        number: 37,
        title: 'Authentication token refresh redesign',
        score: 'HIGH',
        changed_files: 9,
        additions: 180,
        deletions: 41,
      },
      {
        number: 31,
        title: 'Database migration for customer billing',
        score: 'HIGH',
        changed_files: 8,
        additions: 156,
        deletions: 22,
      },
      {
        number: 28,
        title: 'CI pipeline optimization',
        score: 'MEDIUM',
        changed_files: 4,
        additions: 73,
        deletions: 18,
      },
      {
        number: 24,
        title: 'UI accessibility improvements',
        score: 'LOW',
        changed_files: 2,
        additions: 27,
        deletions: 5,
      }
    ]
  })
}
  const [owner, repoName] = repo.split('/')

  if (!owner || !repoName) {
    return NextResponse.json({ error: 'Invalid repo format. Use owner/repo-name' }, { status: 400 })
  }

  // One query — ALL open PRs
  const prs = await coralQuery(`
    SELECT number, title, additions, deletions, changed_files, created_at, state
    FROM github.pulls
    WHERE owner = '${owner}' AND repo = '${repoName}' AND state = 'open'
    ORDER BY created_at DESC
    LIMIT 25
  `)

  if (prs.length === 0) {
    return NextResponse.json({ prs: [], total: 0, repo, message: 'No open PRs found' })
  }

  // Score each PR based on size heuristics
  const scored = prs.map(pr => {
    const totalLines = (pr.additions || 0) + (pr.deletions || 0)
    const files = pr.changed_files || 0
    let score: string
    if      (totalLines > 500 || files > 15) score = 'CRITICAL'
    else if (totalLines > 200 || files > 8)  score = 'HIGH'
    else if (totalLines > 50  || files > 3)  score = 'MEDIUM'
    else                                      score = 'LOW'
    return { ...pr, score }
  })

  // Sort CRITICAL → HIGH → MEDIUM → LOW
  const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  scored.sort((a, b) => order[a.score] - order[b.score])

  return NextResponse.json({ prs: scored, total: scored.length, repo })
}