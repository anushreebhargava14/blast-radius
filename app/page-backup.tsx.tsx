'use client'
import { useState } from 'react'

type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface AnalysisResult {
  score: RiskScore
  scoreReason: string
  summary: string
  recommendations: string[]
  riskFactors: string[]
  pr: {
    title: string
    number: number
    changedFiles: number
    additions: number
    deletions: number
  }
  sources: {
    linearIssues: number
    slackMessages: number
    linearItems: Array<{ title: string; priority: number; state: string }>
    slackItems: Array<{ username: string; text: string }>
  }
}

const SCORE_CONFIG: Record<RiskScore, { color: string; bg: string; border: string; emoji: string }> = {
  LOW:      { color: 'text-green-400',  bg: 'bg-green-950',  border: 'border-green-500',  emoji: '🟢' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-500', emoji: '🟡' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-500', emoji: '🟠' },
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-950',    border: 'border-red-500',    emoji: '🔴' },
}

export default function Home() {
  const [repo, setRepo] = useState('')
  const [prNumber, setPrNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!repo.includes('/') || !prNumber) {
      setError('Enter repo as owner/repo-name and a PR number')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, prNumber: parseInt(prNumber) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const score = result?.score
  const config = score ? SCORE_CONFIG[score] : null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">💣</span>
        <div>
          <h1 className="text-lg font-bold text-white">Blast Radius</h1>
          <p className="text-xs text-gray-500"> AI-powered pre-merge deployment risk intelligence</p>
        </div>
        <div className="ml-auto flex gap-2 text-xs text-gray-600">
          <span className="border border-gray-700 rounded px-2 py-1">Powered by Coral SQL</span>
          <span className="border border-gray-700 rounded px-2 py-1">Claude AI</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Input Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <p className="text-sm text-gray-400 mb-4">
            Enter a GitHub PR to analyse its deployment risk across 3 data sources simultaneously.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">GitHub Repo</label>
              <input
                type="text"
                placeholder="owner/repo-name"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="w-36">
              <label className="text-xs text-gray-500 block mb-1">PR Number</label>
              <input
                type="number"
                placeholder="42"
                value={prNumber}
                onChange={e => setPrNumber(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={analyze}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 text-sm font-bold transition-colors"
              >
                {loading ? '⚡ Scanning...' : '🔍 Analyse Risk'}
              </button>
            </div>
          </div>

          {/* Live Query Preview */}
          {repo && prNumber && (
            <div className="mt-4 bg-gray-950 rounded-lg p-3 border border-gray-800">
              <p className="text-xs text-gray-600 mb-1">Coral SQL that will run:</p>
              <code className="text-xs text-green-400 leading-relaxed">
                {`SELECT pr.title, pr.changed_files, li.priority, sm.text`}<br/>
                {`FROM github.pulls pr`}<br/>
                {`LEFT JOIN linear.issues li ON li.description ILIKE '%${repo.split('/')[1] || 'repo'}%'`}<br/>
                {`LEFT JOIN slack.messages sm ON sm.text ILIKE '%${prNumber}%'`}<br/>
                {`WHERE pr.owner = '${repo.split('/')[0] || 'owner'}' AND pr.number = ${prNumber}`}
              </code>
            </div>
          )}

          {error && (
            <div className="mt-3 text-red-400 text-sm bg-red-950 border border-red-900 rounded-lg px-4 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🪸</div>
            <p className="text-gray-400 text-sm">Querying GitHub, Linear, and Slack simultaneously...</p>
            <p className="text-gray-600 text-xs mt-1">Cross-source JOIN in progress</p>
          </div>
        )}

        {/* Results */}
        {result && config && (
          <div className="space-y-6">

            {/* Risk Score Banner */}
            <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
              <div className="flex items-center gap-4">
                <div className="text-5xl">{config.emoji}</div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-bold ${config.color}`}>{score}</span>
                    <span className="text-gray-400 text-sm">DEPLOYMENT RISK</span>
                  </div>
                  <p className={`${config.color} text-sm mt-1 opacity-80`}>{result.scoreReason}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-gray-500 text-xs">PR #{result.pr.number}</p>
                  <p className="text-white text-sm font-medium mt-1">{result.pr.title}</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Files changed</p>
                <p className="text-2xl font-bold text-white">{result.pr.changedFiles}</p>
                <p className="text-xs text-gray-600 mt-1">+{result.pr.additions} / -{result.pr.deletions} lines</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Linear issues linked</p>
                <p className="text-2xl font-bold text-yellow-400">{result.sources.linearIssues}</p>
                <p className="text-xs text-gray-600 mt-1">via Coral cross-source JOIN</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">PR review comments</p>
                <p className="text-2xl font-bold text-blue-400">{result.sources.slackMessages}</p>
                <p className="text-xs text-gray-600 mt-1">GitHub review activity</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">AI Assessment</h3>
              <p className="text-gray-200 text-sm leading-relaxed">{result.summary}</p>
            </div>

            {/* Two columns: Recommendations + Risk Factors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Recommendations</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Risk Factors</h3>
                <ul className="space-y-2">
                  {result.riskFactors.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-red-400 mt-0.5">⚠</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Source Evidence */}
            {(result.sources.linearItems.length > 0 || result.sources.slackItems.length > 0) && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">
                  Source Evidence — Queried via Coral SQL
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {result.sources.linearItems.length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-400 font-bold mb-2">📋 LINEAR ISSUES</p>
                      {result.sources.linearItems.map((item, i) => (
                        <div key={i} className="text-xs text-gray-400 bg-gray-950 rounded p-2 mb-1">
                          <span className="text-yellow-600">P{item.priority}</span> {item.title} · <span className="text-gray-600">{item.state}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.sources.slackItems.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-400 font-bold mb-2">💬 SLACK MESSAGES</p>
                      {result.sources.slackItems.map((item, i) => (
                        <div key={i} className="text-xs text-gray-400 bg-gray-950 rounded p-2 mb-1">
                          <span className="text-blue-600">@{item.username}</span>: {item.text?.substring(0, 80)}...
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coral SQL Badge */}
            <div className="text-center text-xs text-gray-700 border-t border-gray-800 pt-4">
              3 sources joined in a single Coral SQL query · No ETL · No glue code · 100% local
            </div>
          </div>
        )}
      </div>
    </div>
  )
}