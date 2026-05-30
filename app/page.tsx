// Save this as: app/page.tsx
// Move your current app/page.tsx to: app/dashboard/page.tsx
// Create app/dashboard/ folder first:
//   mkdir app\dashboard
//   Move-Item app\page.tsx app\dashboard\page.tsx
// Then save this file as app/page.tsx

'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Static positions – no Math.random in render ───────────────────────────────
const STARS = [
  {x:4,y:6,s:2,d:0},{x:11,y:2,s:1,d:1},{x:18,y:9,s:2,d:2},{x:26,y:4,s:1,d:0},
  {x:33,y:14,s:2,d:3},{x:41,y:7,s:1,d:1},{x:48,y:11,s:2,d:2},{x:55,y:3,s:1,d:0},
  {x:62,y:16,s:2,d:4},{x:69,y:8,s:1,d:1},{x:77,y:5,s:2,d:2},{x:84,y:13,s:1,d:3},
  {x:91,y:9,s:2,d:0},{x:96,y:4,s:1,d:2},{x:7,y:22,s:1,d:3},{x:15,y:28,s:2,d:1},
  {x:23,y:19,s:1,d:4},{x:30,y:33,s:2,d:0},{x:37,y:25,s:1,d:2},{x:44,y:38,s:2,d:1},
  {x:52,y:21,s:1,d:3},{x:59,y:30,s:2,d:0},{x:66,y:17,s:1,d:2},{x:73,y:35,s:2,d:4},
  {x:80,y:23,s:1,d:1},{x:87,y:41,s:2,d:3},{x:93,y:28,s:1,d:0},{x:2,y:44,s:2,d:2},
  {x:10,y:51,s:1,d:1},{x:19,y:47,s:2,d:3},{x:28,y:56,s:1,d:0},{x:35,y:43,s:2,d:4},
  {x:43,y:59,s:1,d:2},{x:50,y:48,s:2,d:1},{x:57,y:53,s:1,d:3},{x:65,y:45,s:2,d:0},
  {x:72,y:61,s:1,d:4},{x:79,y:50,s:2,d:2},{x:86,y:57,s:1,d:1},{x:94,y:46,s:2,d:3},
  {x:6,y:65,s:1,d:0},{x:14,y:70,s:2,d:2},{x:22,y:68,s:1,d:4},{x:31,y:73,s:2,d:1},
  {x:40,y:66,s:1,d:3},{x:49,y:71,s:2,d:0},{x:58,y:64,s:1,d:2},{x:67,y:75,s:2,d:4},
  {x:76,y:69,s:1,d:1},{x:85,y:72,s:2,d:3},
]

const SQL_LINES = [
  { kw: 'SELECT', rest: ' pr.title, pr.changed_files,', c: '#a78bfa' },
  { kw: '',       rest: '       li.priority_label, rc.body', c: '#a78bfa' },
  { kw: 'FROM',   rest: ' github.pulls pr', c: '#a78bfa', tbl: 'github.pulls', tc: '#38bdf8' },
  { kw: 'LEFT JOIN', rest: ' linear.issues li', c: '#a78bfa', tbl: 'linear.issues', tc: '#fbbf24' },
  { kw: '  ON',   rest: " li.description ILIKE '%repo%'", c: '#a78bfa' },
  { kw: 'LEFT JOIN', rest: ' github.repo_issue_comments rc', c: '#a78bfa', tbl: 'github.repo_issue_comments', tc: '#f472b6' },
  { kw: '  ON',   rest: ' rc.issue_number = pr.number', c: '#a78bfa' },
  { kw: 'WHERE',  rest: " pr.owner = 'your-org' AND pr.number = 42", c: '#a78bfa' },
]

const FEATURES = [
  { icon:'🔍', title:'PR Analyser',      desc:'Deep risk scan of any pull request. GO or NO-GO verdict powered by Claude. Blast Radius Map shows exactly which system areas get hit.' },
  { icon:'⚓', title:'Fleet Scan',       desc:'Scan every open PR in a repo at once. Coral queries github.pulls WHERE state=open and ranks your entire fleet by deployment risk.' },
  { icon:'⚖️', title:'Repo Comparison',  desc:'Compare two repos side-by-side. Health scores, risk distribution bars, and most dangerous PR — at a glance.' },
  { icon:'💣', title:'Blast Radius Map', desc:'9-zone interactive explosion map shows which system areas — Auth, Payments, Database, CI/CD — your PR will affect.' },
  { icon:'🚢', title:'Merge Gate',       desc:'Automated 5-point pre-merge checklist. Size, risk level, linked issues, comments, overall score. BLOCKED or CLEAR TO SHIP.' },
  { icon:'🧭', title:'Reviewer Compass', desc:'Suggests the best engineers to review your PR based on commit history in the affected files.' },
]

const STATS = [
  { val:'3', label:'Coral SQL Queries' },
  { val:'0', label:'Lines of Glue Code' },
  { val:'6', label:'Dashboard Features' },
  { val:'12s', label:'Time to Risk Score' },
]

// ── Ship ──────────────────────────────────────────────────────────────────────
function Ship({ size=1, opacity=1 }: { size?: number; opacity?: number }) {
  const w = 260 * size, h = 120 * size
  return (
    <svg width={w} height={h} viewBox="0 0 260 120" fill="none" opacity={opacity}>
      <path d="M32 80 Q130 98 228 80 L238 92 Q130 114 22 92 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
      <path d="M50 80 L56 60 L204 60 L210 80 Z" fill="#0f172a" stroke="#1e3a5f" strokeWidth="1"/>
      <line x1="100" y1="60" x2="100" y2="8"  stroke="#475569" strokeWidth="2.5"/>
      <path d="M100 12 L100 56 L158 47 L148 18 Z" fill="rgba(241,245,249,0.07)" stroke="rgba(148,163,184,0.22)" strokeWidth="1"/>
      <line x1="152" y1="60" x2="152" y2="22" stroke="#475569" strokeWidth="2"/>
      <path d="M152 26 L152 56 L186 51 L182 30 Z" fill="rgba(241,245,249,0.05)" stroke="rgba(148,163,184,0.14)" strokeWidth="0.8"/>
      <line x1="72"  y1="60" x2="72"  y2="30" stroke="#475569" strokeWidth="1.5"/>
      <path d="M72 34 L72 56 L96 52 L90 36 Z"  fill="rgba(241,245,249,0.04)" stroke="rgba(148,163,184,0.12)" strokeWidth="0.8"/>
      <path d="M100 8 L100 17 L124 14 L100 8 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
      <text x="103" y="15" fontSize="7" fill="white" opacity="0.6">☠</text>
      <path d="M16 98 Q50 93 90 98 Q130 103 170 98 Q210 93 248 98" stroke="rgba(14,165,233,0.22)" strokeWidth="1.5" fill="none"/>
      <path d="M10 106 Q52 102 94 106 Q136 110 178 106 Q218 102 252 106" stroke="rgba(14,165,233,0.14)" strokeWidth="1" fill="none"/>
      <rect x="182" y="74" width="11" height="5" rx="1" fill="#0ea5e9" opacity="0.3"/>
      <rect x="68"  y="74" width="11" height="5" rx="1" fill="#0ea5e9" opacity="0.3"/>
      <line x1="100" y1="8" x2="72" y2="30" stroke="rgba(148,163,184,0.15)" strokeWidth="0.8"/>
      <line x1="100" y1="8" x2="152" y2="22" stroke="rgba(148,163,184,0.15)" strokeWidth="0.8"/>
    </svg>
  )
}

// ── Hanging Pirate ────────────────────────────────────────────────────────────
function HangingPirate() {
  return (
    <div style={{ position:'absolute', top:0, right:60, pointerEvents:'none', animation:'hangSway 4s ease-in-out infinite', transformOrigin:'top center' }}>
      <svg width="44" height="96" viewBox="0 0 44 96" fill="none">
        <line x1="22" y1="0" x2="22" y2="16" stroke="rgba(148,163,184,0.5)" strokeWidth="1.8"/>
        <ellipse cx="22" cy="23" rx="9" ry="8" fill="#1e293b" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8"/>
        <circle cx="18" cy="23" r="2.2" fill="rgba(239,68,68,0.55)"/>
        <circle cx="26" cy="23" r="2.2" fill="rgba(239,68,68,0.55)"/>
        <path d="M17 30 L18 32.5 L19.5 30 L22 32.5 L24.5 30 L26 32.5 L27 30" stroke="rgba(148,163,184,0.45)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
        <line x1="22" y1="31" x2="22" y2="58" stroke="rgba(148,163,184,0.32)" strokeWidth="1.4"/>
        <line x1="22" y1="37" x2="10" y2="50" stroke="rgba(148,163,184,0.32)" strokeWidth="1.1"/>
        <line x1="22" y1="37" x2="34" y2="50" stroke="rgba(148,163,184,0.32)" strokeWidth="1.1"/>
        <line x1="22" y1="58" x2="13" y2="76" stroke="rgba(148,163,184,0.32)" strokeWidth="1.1"/>
        <line x1="22" y1="58" x2="31" y2="76" stroke="rgba(148,163,184,0.32)" strokeWidth="1.1"/>
        <path d="M10 50 L3 64" stroke="rgba(56,189,248,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="5" y1="54" x2="9" y2="54" stroke="rgba(56,189,248,0.38)" strokeWidth="1"/>
        <path d="M16 15 Q22 10 28 15" stroke="rgba(148,163,184,0.3)" strokeWidth="1" fill="none"/>
        <rect x="14" y="9" width="16" height="4" rx="1" fill="rgba(30,41,59,0.8)" stroke="rgba(148,163,184,0.25)" strokeWidth="0.5"/>
        <text x="17" y="13.5" fontSize="4.5" fill="rgba(148,163,184,0.55)">☠☠☠</text>
      </svg>
    </div>
  )
}

// ── Parrot ────────────────────────────────────────────────────────────────────
function Parrot() {
  const [up, setUp] = useState(false)
  useEffect(() => { const t = setInterval(() => setUp(p => !p), 200); return () => clearInterval(t) }, [])
  return (
    <div style={{ position:'absolute', top:28, left:52, pointerEvents:'none', animation:'parrotBob 2.2s ease-in-out infinite' }}>
      <svg width="38" height="34" viewBox="0 0 38 34" fill="none">
        <ellipse cx="19" cy="22" rx="7" ry="10" fill="#15803d" stroke="#166534" strokeWidth="0.5"/>
        <circle cx="19" cy="10" r="6.5" fill="#16a34a" stroke="#166534" strokeWidth="0.5"/>
        <path d="M13 10 L7 12 L11 14 Z" fill="#ca8a04"/>
        <circle cx="15.5" cy="8.5" r="1.7" fill="white"/>
        <circle cx="15.5" cy="8.5" r="0.85" fill="#0f172a"/>
        {up
          ? <path d="M12 18 Q1 9 5 3 Q16 11 19 17 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>
          : <path d="M12 20 Q0 24 2 16 Q13 16 19 18 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>
        }
        <path d="M16 31 L18 41 L19 31 L20.5 41 L22 31" stroke="#15803d" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <ellipse cx="19" cy="23.5" rx="3.5" ry="5" fill="#dc2626" opacity="0.42"/>
      </svg>
    </div>
  )
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const current = texts[idx]
    if (!deleting && displayed.length < current.length) {
      const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55)
      return () => clearTimeout(t)
    }
    if (!deleting && displayed.length === current.length) {
      const t = setTimeout(() => setDeleting(true), 2200)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIdx((idx + 1) % texts.length)
    }
  }, [displayed, deleting, idx, texts])
  return (
    <span style={{ color:'#38bdf8', textShadow:'0 0 30px rgba(56,189,248,0.5)' }}>
      {displayed}<span style={{ animation:'blink 1s infinite', opacity: displayed.length === texts[idx].length ? 1 : 0 }}>|</span>
    </span>
  )
}

// ── SQL Terminal ──────────────────────────────────────────────────────────────
function SqlTerminal() {
  const [visLines, setVisLines] = useState(0)
  useEffect(() => {
    if (visLines >= SQL_LINES.length) return
    const t = setTimeout(() => setVisLines(v => v + 1), 280)
    return () => clearTimeout(t)
  }, [visLines])
  return (
    <div style={{ background:'rgba(0,0,0,0.75)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:12, overflow:'hidden', boxShadow:'0 0 60px rgba(14,165,233,0.12), 0 32px 64px rgba(0,0,0,0.6)', fontFamily:"'Share Tech Mono',monospace" }}>
      {/* Terminal bar */}
      <div style={{ background:'rgba(15,23,42,0.9)', padding:'10px 16px', borderBottom:'1px solid rgba(14,165,233,0.12)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:11, height:11, borderRadius:'50%', background:'#ef4444', opacity:0.8 }}/>
        <div style={{ width:11, height:11, borderRadius:'50%', background:'#eab308', opacity:0.8 }}/>
        <div style={{ width:11, height:11, borderRadius:'50%', background:'#22c55e', opacity:0.8 }}/>
        <span style={{ marginLeft:8, fontSize:11, color:'rgba(148,163,184,0.45)', letterSpacing:2 }}>coral.sql</span>
        <span style={{ marginLeft:'auto', fontSize:9, color:'rgba(34,197,94,0.6)', letterSpacing:2, display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block', animation:'pulse 2s infinite' }}/>
          LIVE
        </span>
      </div>
      {/* Query */}
      <div style={{ padding:'18px 20px', fontSize:13, lineHeight:2 }}>
        <div style={{ color:'rgba(14,165,233,0.5)', fontSize:9, letterSpacing:3, marginBottom:10, textTransform:'uppercase' }}>
          🪸 3 sources · 1 query · 0 glue code
        </div>
        {SQL_LINES.slice(0, visLines).map((line, i) => (
          <div key={i} style={{ opacity: i < visLines ? 1 : 0, transition:'opacity 0.3s', display:'flex', gap:0 }}>
            {line.kw && <span style={{ color:line.c, minWidth:90 }}>{line.kw} </span>}
            {!line.kw && <span style={{ minWidth:90 }}/>}
            {line.tbl
              ? <>
                  <span style={{ color:'rgba(203,213,225,0.85)' }}>{line.rest.split(line.tbl)[0]}</span>
                  <span style={{ color:line.tc, fontWeight:'bold' }}>{line.tbl}</span>
                  <span style={{ color:'rgba(203,213,225,0.85)' }}>{line.rest.split(line.tbl)[1]}</span>
                </>
              : <span style={{ color:'rgba(203,213,225,0.85)' }}>{line.rest}</span>
            }
          </div>
        ))}
        {visLines > 0 && visLines < SQL_LINES.length && (
          <span style={{ color:'#38bdf8', animation:'blink 0.8s infinite' }}>▊</span>
        )}
        {visLines >= SQL_LINES.length && (
          <div style={{ marginTop:14, borderTop:'1px solid rgba(14,165,233,0.1)', paddingTop:12 }}>
            <div style={{ color:'rgba(34,197,94,0.7)', fontSize:11, letterSpacing:1, marginBottom:6 }}>✓ 3 sources joined · 0.43 sec</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['github.pulls','linear.issues','github.repo_issue_comments'].map((s,i)=>(
                <span key={i} style={{ padding:'3px 10px', background:'rgba(14,165,233,0.07)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:4, fontSize:10, color:'rgba(56,189,248,0.8)' }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useVisible(ref: React.RefObject<HTMLDivElement | null>) {
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold:0.15 })
    obs.observe(el); return () => obs.disconnect()
  }, [ref])
  return vis
}

function FeatureCard({ f, delay }: { f: typeof FEATURES[0]; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useVisible(ref)
  return (
    <div ref={ref} style={{ background:'rgba(6,14,26,0.85)', border:'1px solid rgba(14,165,233,0.12)', borderRadius:12, padding:'22px 24px', opacity: vis?1:0, transform: vis?'translateY(0)':'translateY(24px)', transition:`all 0.55s ease ${delay}ms`, backdropFilter:'blur(8px)' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
      <div style={{ fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700, color:'#f1f5f9', letterSpacing:2, marginBottom:8, textTransform:'uppercase' }}>{f.title}</div>
      <p style={{ color:'rgba(148,163,184,0.68)', fontSize:11.5, lineHeight:1.8 }}>{f.desc}</p>
    </div>
  )
}

// ── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  const router = useRouter()
  const featRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const statsVis = useVisible(statsRef)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#020a14;overflow-x:hidden;font-family:'Share Tech Mono',monospace}
        ::placeholder{color:rgba(148,163,184,0.25)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(14,165,233,0.2);border-radius:2px}
        @keyframes sailMain{0%{transform:translateX(-310px) translateY(0)}100%{transform:translateX(calc(100vw + 310px)) translateY(0)}}
        @keyframes sailBg{0%{transform:translateX(-220px)}100%{transform:translateX(calc(100vw + 220px))}}
        @keyframes hangSway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
        @keyframes parrotBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes waveScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes twinkle{0%,100%{opacity:0.15}50%{opacity:0.75}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 20px rgba(56,189,248,0.3)}50%{text-shadow:0 0 50px rgba(56,189,248,0.7)}}
        @keyframes rotateSlow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .hero-headline{animation:fadeUp 1s ease 0.2s both}
        .hero-sub{animation:fadeUp 1s ease 0.5s both}
        .hero-cta{animation:fadeUp 1s ease 0.8s both}
        .hero-sql{animation:fadeUp 1s ease 0.4s both}
        .nav-blur{background:rgba(1,6,12,${scrolled?'0.95':'0.6'})!important;backdropFilter:blur(20px)!important}
        .cta-main:hover{transform:scale(1.04);box-shadow:0 0 50px rgba(56,189,248,0.5)!important}
        .cta-main:active{transform:scale(0.98)}
      `}</style>

      {/* ── Background ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', background:'radial-gradient(ellipse at 20% 30%, #081828 0%, #030c16 45%, #010407 100%)' }}>
        {/* Stars */}
        {STARS.map((s,i) => (
          <div key={i} style={{ position:'absolute', width:s.s===2?2:1, height:s.s===2?2:1, background:'white', borderRadius:'50%', top:`${s.y}%`, left:`${s.x}%`, animation:`twinkle ${2+s.d*0.6}s ease-in-out infinite`, animationDelay:`${s.d*0.5}s`, opacity:0.25 }}/>
        ))}
        {/* Moon */}
        <div style={{ position:'absolute', top:60, right:120, width:70, height:70, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, rgba(241,245,249,0.06), transparent)', border:'1px solid rgba(241,245,249,0.06)', boxShadow:'0 0 60px rgba(241,245,249,0.03)' }}/>
        {/* Horizon gradient */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:160, background:'linear-gradient(to top, rgba(14,165,233,0.07) 0%, transparent 100%)' }}/>
        {/* Waves */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, overflow:'hidden', opacity:0.2 }}>
          <svg width="200%" height="60" viewBox="0 0 1400 60" preserveAspectRatio="none" style={{ animation:'waveScroll 20s linear infinite' }}>
            <path d="M0 28 Q70 14 140 28 Q210 42 280 28 Q350 14 420 28 Q490 42 560 28 Q630 14 700 28 Q770 42 840 28 Q910 14 980 28 Q1050 42 1120 28 Q1190 14 1260 28 Q1330 42 1400 28 L1400 60 L0 60 Z" fill="#0ea5e9"/>
          </svg>
        </div>
      </div>

      {/* Background ship (faint) */}
      <div style={{ position:'fixed', bottom:10, left:0, zIndex:1, pointerEvents:'none', opacity:0.6, animation:'sailBg 70s linear infinite' }}>
        <Ship size={0.85} opacity={0.7}/>
      </div>
      {/* Scanlines */}
      <div style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none', background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.016) 2px,rgba(0,0,0,0.016) 4px)' }}/>

      <div style={{ position:'relative', zIndex:2 }}>

        {/* ── NAV ── */}
        <nav className="nav-blur" style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, padding:'0 32px', height:60, display:'flex', alignItems:'center', borderBottom:'1px solid rgba(14,165,233,0.1)', transition:'background 0.3s, backdropFilter 0.3s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22, animation:'float 3s ease-in-out infinite' }}>💣</span>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:900, color:'#f1f5f9', letterSpacing:4, textTransform:'uppercase' }}>BLAST RADIUS</span>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:12, alignItems:'center' }}>
            <span onClick={() => featRef.current?.scrollIntoView({behavior:'smooth'})}
              style={{ fontSize:10, color:'rgba(148,163,184,0.5)', letterSpacing:2, cursor:'pointer', textTransform:'uppercase' }}>Features</span>
            <button onClick={() => router.push('/dashboard')}
              className="cta-main"
              style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', border:'none', borderRadius:6, padding:'8px 20px', color:'#fff', fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, letterSpacing:2, cursor:'pointer', textTransform:'uppercase', transition:'all 0.2s', boxShadow:'0 0 20px rgba(14,165,233,0.25)' }}>
              Launch Dashboard →
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px 60px', position:'relative', overflow:'hidden' }}>

          {/* Big ship in hero */}
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', pointerEvents:'none', opacity:0.18, animation:'sailMain 80s linear infinite' }}>
            <Ship size={2.2}/>
          </div>

          {/* Hanging pirate + parrot on a fake mast */}
          <div style={{ position:'absolute', top:60, right:80, pointerEvents:'none' }}>
            <div style={{ position:'relative', width:120, height:160 }}>
              {/* Mast */}
              <div style={{ position:'absolute', left:40, top:0, width:2, height:120, background:'rgba(71,85,105,0.4)', borderRadius:1 }}/>
              {/* Yardarm */}
              <div style={{ position:'absolute', left:10, top:30, width:60, height:1.5, background:'rgba(71,85,105,0.3)', borderRadius:1 }}/>
              <HangingPirate/>
              <Parrot/>
            </div>
          </div>

          {/* Subtitle badge */}
          <div className="hero-headline" style={{ display:'inline-block', fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:7, color:'rgba(14,165,233,0.55)', textTransform:'uppercase', marginBottom:20, border:'1px solid rgba(14,165,233,0.15)', padding:'6px 18px', borderRadius:20 }}>
            ☠ Pirates of the Coral-bean · Enterprise Intelligence ☠
          </div>

          {/* Main headline */}
          <h1 className="hero-headline" style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(36px,7vw,82px)', fontWeight:900, textTransform:'uppercase', letterSpacing:4, lineHeight:1.05, textAlign:'center', marginBottom:16, color:'#f1f5f9', textShadow:'0 0 80px rgba(14,165,233,0.15)', maxWidth:900 }}>
            Before Ye Merge—<br/>
            <Typewriter texts={['Know What Sinks.','Know Your Risk.','Know the Blast Radius.']}/>
          </h1>

          {/* Sub */}
          <p className="hero-sub" style={{ fontSize:14, color:'rgba(148,163,184,0.65)', letterSpacing:1, lineHeight:1.9, textAlign:'center', maxWidth:560, marginBottom:36 }}>
            One Coral SQL query across GitHub, Linear &amp; PR comments.<br/>
            Claude reads the JOIN. GO or NO-GO in 12 seconds.
          </p>

          {/* CTA buttons */}
          <div className="hero-cta" style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center', marginBottom:64 }}>
            <button onClick={() => router.push('/dashboard')} className="cta-main"
              style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', border:'none', borderRadius:8, padding:'16px 36px', color:'#fff', fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700, letterSpacing:3, cursor:'pointer', textTransform:'uppercase', transition:'all 0.2s', boxShadow:'0 0 30px rgba(14,165,233,0.35)' }}>
              ⚓ Launch Dashboard
            </button>
            <button onClick={() => featRef.current?.scrollIntoView({behavior:'smooth'})}
              style={{ background:'transparent', border:'1px solid rgba(14,165,233,0.3)', borderRadius:8, padding:'16px 32px', color:'rgba(148,163,184,0.75)', fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, letterSpacing:3, cursor:'pointer', textTransform:'uppercase', transition:'all 0.2s' }}>
              See How It Works ↓
            </button>
          </div>

          {/* SQL Terminal */}
          <div className="hero-sql" style={{ width:'100%', maxWidth:620 }}>
            <SqlTerminal/>
          </div>

          {/* Source pills */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginTop:22 }}>
            {[
              { label:'github.pulls',               color:'#38bdf8' },
              { label:'linear.issues',              color:'#fbbf24' },
              { label:'github.repo_issue_comments', color:'#f472b6' },
            ].map((s,i) => (
              <div key={i} style={{ padding:'4px 13px', background:`${s.color}0d`, border:`1px solid ${s.color}30`, borderRadius:20, fontSize:10, color:s.color, letterSpacing:1 }}>
                {s.label}
              </div>
            ))}
            <div style={{ padding:'4px 13px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:20, fontSize:10, color:'#c4b5fd', letterSpacing:1 }}>
              🪸 coral sql
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section ref={statsRef} style={{ padding:'60px 24px', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {STATS.map((s,i) => (
              <div key={i} style={{ background:'rgba(6,14,26,0.8)', border:'1px solid rgba(14,165,233,0.1)', borderRadius:12, padding:'24px 20px', textAlign:'center', opacity:statsVis?1:0, transform:statsVis?'translateY(0)':'translateY(20px)', transition:`all 0.5s ease ${i*100}ms` }}>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:42, fontWeight:900, color:'#38bdf8', lineHeight:1, textShadow:'0 0 20px rgba(56,189,248,0.35)', marginBottom:8 }}>{s.val}</div>
                <div style={{ fontSize:9, color:'rgba(148,163,184,0.5)', letterSpacing:2.5, textTransform:'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding:'40px 24px 60px', maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:44 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:7, color:'rgba(14,165,233,0.45)', textTransform:'uppercase', marginBottom:14 }}>THE CORAL ADVANTAGE</div>
            <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,4vw,38px)', fontWeight:900, color:'#f1f5f9', letterSpacing:3, textTransform:'uppercase', textShadow:'0 0 30px rgba(14,165,233,0.15)' }}>
              3 Sources. 1 Query. <span style={{ color:'#38bdf8' }}>12 Seconds.</span>
            </h2>
          </div>

          {/* Flow diagram */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, flexWrap:'wrap', marginBottom:44 }}>
            {[
              { icon:'📋', label:'GitHub PR', sub:'changed files', c:'#38bdf8' },
              { icon:'→', label:'', sub:'', c:'rgba(148,163,184,0.25)', isArrow:true },
              { icon:'🪸', label:'Coral SQL', sub:'cross-source JOIN', c:'#a78bfa' },
              { icon:'→', label:'', sub:'', c:'rgba(148,163,184,0.25)', isArrow:true },
              { icon:'🤖', label:'Claude AI', sub:'risk analysis', c:'#f472b6' },
              { icon:'→', label:'', sub:'', c:'rgba(148,163,184,0.25)', isArrow:true },
              { icon:'💣', label:'Blast Radius', sub:'GO / NO-GO', c:'#ef4444' },
            ].map((step,i) => step.isArrow
              ? <div key={i} style={{ fontSize:22, color:step.c, margin:'0 4px' }}>→</div>
              : (
                <div key={i} style={{ background:'rgba(6,14,26,0.85)', border:`1px solid ${step.c}22`, borderRadius:12, padding:'16px 18px', textAlign:'center', minWidth:110 }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{step.icon}</div>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:step.c, letterSpacing:1, fontWeight:700 }}>{step.label}</div>
                  <div style={{ fontSize:8.5, color:'rgba(148,163,184,0.45)', marginTop:3, letterSpacing:1 }}>{step.sub}</div>
                </div>
              )
            )}
          </div>

          {/* Comparison table */}
          <div style={{ background:'rgba(6,14,26,0.8)', border:'1px solid rgba(14,165,233,0.1)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid rgba(14,165,233,0.1)' }}>
              {['', 'Without Coral', 'With Blast Radius'].map((h,i) => (
                <div key={i} style={{ padding:'13px 18px', fontSize:9, color:i===2?'#38bdf8':'rgba(148,163,184,0.45)', letterSpacing:2, textTransform:'uppercase', fontFamily:"'Cinzel',serif", background:i===2?'rgba(14,165,233,0.05)':'transparent', borderRight:i<2?'1px solid rgba(14,165,233,0.08)':'none' }}>{h}</div>
              ))}
            </div>
            {[
              ['API integrations needed', '6 separate integrations', '1 Coral source'],
              ['Lines of glue code',      '200+ lines',             '0 lines'],
              ['Time to risk score',      '20–30 minutes',          '12 seconds'],
              ['Context switching',       'PagerDuty → GitHub → Datadog → Slack', 'One dashboard'],
              ['Pre-merge intelligence',  '❌ Not possible',        '✅ Merge Gate verdict'],
            ].map((row,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid rgba(14,165,233,0.06)' }}>
                <div style={{ padding:'12px 18px', fontSize:11, color:'rgba(148,163,184,0.7)', borderRight:'1px solid rgba(14,165,233,0.08)' }}>{row[0]}</div>
                <div style={{ padding:'12px 18px', fontSize:11, color:'rgba(239,68,68,0.65)', borderRight:'1px solid rgba(14,165,233,0.08)' }}>{row[1]}</div>
                <div style={{ padding:'12px 18px', fontSize:11, color:'rgba(34,197,94,0.75)', background:'rgba(14,165,233,0.03)' }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section ref={featRef} style={{ padding:'40px 24px 80px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:44 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:7, color:'rgba(14,165,233,0.45)', textTransform:'uppercase', marginBottom:14 }}>THE ARSENAL</div>
            <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,4vw,38px)', fontWeight:900, color:'#f1f5f9', letterSpacing:3, textTransform:'uppercase' }}>
              Every Weapon a Pirate <span style={{ color:'#38bdf8' }}>Engineer Needs</span>
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {FEATURES.map((f,i) => <FeatureCard key={i} f={f} delay={i*80}/>)}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding:'60px 24px 100px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, rgba(14,165,233,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:7, color:'rgba(14,165,233,0.45)', textTransform:'uppercase', marginBottom:18 }}>SET SAIL</div>
          <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(26px,5vw,56px)', fontWeight:900, color:'#f1f5f9', letterSpacing:3, textTransform:'uppercase', marginBottom:14, lineHeight:1.1 }}>
            Ready to Know<br/><span style={{ color:'#38bdf8', animation:'glow 3s ease-in-out infinite' }}>Your Blast Radius?</span>
          </h2>
          <p style={{ fontSize:13, color:'rgba(148,163,184,0.55)', letterSpacing:1, lineHeight:1.9, maxWidth:440, margin:'0 auto 36px' }}>
            Enter any GitHub repo and PR number.<br/>Get a GO/NO-GO verdict in 12 seconds.
          </p>
          <button onClick={() => router.push('/dashboard')} className="cta-main"
            style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', border:'none', borderRadius:10, padding:'18px 48px', color:'#fff', fontFamily:"'Cinzel',serif", fontSize:14, fontWeight:900, letterSpacing:4, cursor:'pointer', textTransform:'uppercase', transition:'all 0.25s', boxShadow:'0 0 50px rgba(14,165,233,0.4)', display:'inline-flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20, animation:'float 2s ease-in-out infinite' }}>💣</span>
            LAUNCH BLAST RADIUS
          </button>
          <div style={{ marginTop:20, fontSize:10, color:'rgba(148,163,184,0.25)', letterSpacing:2 }}>
          
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop:'1px solid rgba(14,165,233,0.07)', padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>💣</span>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:'rgba(148,163,184,0.4)', letterSpacing:3, textTransform:'uppercase' }}>Blast Radius</span>
          </div>
          <div style={{ fontSize:9, color:'rgba(148,163,184,0.2)', letterSpacing:2 }}>
           
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {['github.pulls','linear.issues','PR comments'].map((s,i)=>(
              <span key={i} style={{ fontSize:8.5, color:'rgba(14,165,233,0.3)', letterSpacing:1 }}>{s}{i<2?' ·':''}</span>
            ))}
          </div>
        </footer>
      </div>
    </>
  )
}