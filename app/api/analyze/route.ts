import { exec } from 'child_process'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'

const execAsync = promisify(exec)

async function coralQuery(sql: string): Promise<any[]> {
  const cleanSql = sql.replace(/\s+/g, ' ').trim()
  const escaped = cleanSql.replace(/"/g, '\\"')

  try {
    const { stdout } = await execAsync(
      `coral sql --format json "${escaped}"`
    )

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
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    )
  }

  // ── Query 1: PR details ─────────────────────────────────────
  const prData = await coralQuery(`
    SELECT number, title, body, additions, deletions, changed_files, state, created_at
    FROM github.pulls
    WHERE owner = '${owner}'
      AND repo = '${repoName}'
      AND number = ${prNumber}
    LIMIT 1
  `)

  if (!prData.length) {
    return NextResponse.json(
      { error: 'PR not found. Check repo and PR number.' },
      { status: 404 }
    )
  }

  const pr = prData[0]

  // ── Reviewer suggestions ────────────────────────────────────
  const commitData = await coralQuery(`
    SELECT author__login, COUNT(*) as commit_count 
FROM github.commits
    WHERE owner = '${owner}'
      AND repo = '${repoName}'
    GROUP BY author__login
    ORDER BY commit_count DESC
    LIMIT 5
  `)

  // ── Linear issues ───────────────────────────────────────────
  const linearData = await coralQuery(`
    SELECT id, title, priority, state_id
    FROM linear.issues
    WHERE title ILIKE '%${repoName}%'
       OR description ILIKE '%${pr.title?.substring(0, 30).replace(/'/g, '')}%'
    ORDER BY priority ASC
    LIMIT 10
  `)

  // ── Placeholder comments source ─────────────────────────────
 const commentsData = await coralQuery(`
  SELECT body
  FROM github.pull_request_comments
  WHERE owner = '${owner}'
    AND repo = '${repoName}'
    AND pull_number = ${prNumber}
  LIMIT 10
`)

  // ── Demo AI assessment ──────────────────────────────────────
  const assessment = {
    score:
  (pr.changed_files ?? 0) > 10
    ? 'CRITICAL'
    : (pr.changed_files ?? 0) > 5
      ? 'HIGH'
      : (pr.changed_files ?? 0) > 2
        ? 'MEDIUM'
        : 'LOW',

scoreReason:
  (pr.changed_files ?? 0) > 5
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

reviewerSuggestions: commitData.slice(0, 3).map((r: any) => ({
  author_login: r.author__login,
  commit_count: r.commit_count,
})),

    sources: {
      linearIssues: linearData.length,
      slackMessages: commentsData.length,
      linearItems: linearData.slice(0, 3),
      slackItems: commentsData.slice(0, 3),
    }
  })
}