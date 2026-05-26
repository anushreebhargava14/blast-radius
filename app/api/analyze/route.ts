import { exec } from 'child_process'
import { promisify } from 'util'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const execAsync = promisify(exec)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Helper: run a Coral SQL query and return parsed JSON
async function coralQuery(sql: string): Promise<any[]> {
  const cleanSql = sql.replace(/\s+/g, ' ').trim()
  const escaped = cleanSql.replace(/"/g, '\\"')
  try {
    const { stdout } = await execAsync(`coral sql --format json "${escaped}"`)
    return JSON.parse(stdout || '[]')
  } catch (err) {
    console.error('Coral query error:', err)
    return []
  }
}

export async function POST(req: NextRequest) {
  const { repo, prNumber } = await req.json()
  const [owner, repoName] = repo.split('/')

  if (!owner || !repoName || !prNumber) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // ── Query 1: PR details from GitHub ──────────────────────────────
  const prData = await coralQuery(`
    SELECT number, title, body, additions, deletions, changed_files, state, created_at
    FROM github.pulls
    WHERE owner = '${owner}'
      AND repo = '${repoName}'
      AND number = ${prNumber}
    LIMIT 1
  `)

  if (!prData.length) {
    return NextResponse.json({ error: 'PR not found. Check the repo and PR number.' }, { status: 404 })
  }

  const pr = prData[0]

  // ── Query 2: Linked Linear issues ────────────────────────────────
  const linearData = await coralQuery(`
    SELECT id, title, priority, state_id
    FROM linear.issues
    WHERE title ILIKE '%${repoName}%'
       OR description ILIKE '%${pr.title?.substring(0, 30).replace(/'/g, '')}%'
    ORDER BY priority ASC
    LIMIT 10
  `)

  const slackData: any[] = []

  // ── Ask Claude to assess the risk ────────────────────────────────
  const prompt = `
You are a senior engineering risk assessor reviewing a pull request before it is merged.

## Pull Request Data
- Title: ${pr.title}
- Changed files: ${pr.changed_files}
- Lines added: ${pr.additions}
- Lines deleted: ${pr.deletions}
- State: ${pr.state}

## Linked Work Items in Linear (${linearData.length} found)
${linearData.map(i => `- [Priority ${i.priority}] ${i.title} (${i.state})`).join('\n') || 'None found'}

## Recent Slack Discussions (${slackData.length} messages found)
${slackData.map(m => `- ${m.username}: "${m.text?.substring(0, 100)}"`).join('\n') || 'No recent discussions'}

## Instructions
Based on all three data sources, assess the deployment risk of merging this PR.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "score": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "scoreReason": "One sentence explaining the score",
  "summary": "2-3 sentence plain English summary for a developer",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "riskFactors": ["factor 1", "factor 2"]
}
`

const assessment = {
  score:
    pr.additions > 200
      ? 'HIGH'
      : pr.additions > 100
      ? 'MEDIUM'
      : 'LOW',

  scoreReason:
    pr.changed_files > 5
      ? 'Large pull request touching multiple files'
      : 'Moderate code changes detected',

  summary:
    'This pull request modifies multiple areas of the codebase and may introduce deployment instability if merged without testing.',

  recommendations: [
    'Run full regression testing before merge',
    'Request senior engineer review',
    'Monitor deployment logs after release'
  ],

  riskFactors: [
    'Large code changes',
    'Potential impact across multiple modules'
  ]
}
  return NextResponse.json({
    ...assessment,
    pr: {
      title: pr.title,
      number: prNumber,
      changedFiles: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
    },
    sources: {
      linearIssues: linearData.length,
      slackMessages: slackData.length,
      linearItems: linearData.slice(0, 3),
      slackItems: slackData.slice(0, 3),
    }
  })
}