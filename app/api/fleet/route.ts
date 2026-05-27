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