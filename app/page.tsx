'use client'
import { useState, useEffect, useRef } from 'react'

type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type Tab = 'analyze' | 'fleet' | 'log' | 'compare'

interface AnalysisResult {
  score: RiskScore
  scoreReason: string
  summary: string
  recommendations: string[]
  riskFactors: string[]
  pr: { title: string; number: number; changedFiles: number; additions: number; deletions: number }
  sources: {
    linearIssues: number; slackMessages: number
    linearItems: Array<{ title: string; priority: number; state_id: string }>
    slackItems: Array<{ username: string; text: string }>
  }
  reviewerSuggestions?: Array<{ author_login: string; commit_count: number }>
}

interface LogEntry { pr: { title: string; number: number }; score: RiskScore; repo: string; time: string }

const SCORE = {
  LOW:      { label:'SAFE WATERS',   color:'#22c55e', glow:'rgba(34,197,94,0.14)',  border:'rgba(34,197,94,0.35)',  cannon:1 },
  MEDIUM:   { label:'ROUGH SEAS',    color:'#eab308', glow:'rgba(234,179,8,0.14)',  border:'rgba(234,179,8,0.35)',  cannon:2 },
  HIGH:     { label:'STORM WARNING', color:'#f97316', glow:'rgba(249,115,22,0.14)', border:'rgba(249,115,22,0.35)', cannon:3 },
  CRITICAL: { label:'ABANDON SHIP',  color:'#ef4444', glow:'rgba(239,68,68,0.14)',  border:'rgba(239,68,68,0.35)',  cannon:4 },
}

// ── Static star positions (no Math.random in render — fixes hydration & build) ──
const STARS = [
  {x:5,y:8,s:1},{x:12,y:3,s:2},{x:18,y:12,s:1},{x:25,y:5,s:1},{x:31,y:18,s:2},
  {x:38,y:7,s:1},{x:44,y:14,s:1},{x:51,y:4,s:2},{x:57,y:11,s:1},{x:63,y:19,s:1},
  {x:70,y:6,s:2},{x:76,y:13,s:1},{x:83,y:8,s:1},{x:89,y:17,s:2},{x:94,y:3,s:1},
  {x:8,y:25,s:1},{x:16,y:30,s:2},{x:23,y:22,s:1},{x:29,y:35,s:1},{x:36,y:28,s:1},
  {x:43,y:33,s:2},{x:49,y:21,s:1},{x:55,y:38,s:1},{x:62,y:26,s:2},{x:68,y:42,s:1},
  {x:74,y:31,s:1},{x:80,y:24,s:2},{x:87,y:39,s:1},{x:92,y:29,s:1},{x:97,y:15,s:2},
  {x:3,y:45,s:1},{x:11,y:50,s:2},{x:19,y:43,s:1},{x:27,y:55,s:1},{x:34,y:48,s:2},
  {x:42,y:52,s:1},{x:48,y:46,s:1},{x:56,y:58,s:2},{x:64,y:51,s:1},{x:71,y:56,s:1},
  {x:78,y:47,s:2},{x:85,y:53,s:1},{x:91,y:44,s:1},{x:96,y:59,s:2},{x:2,y:60,s:1},
  {x:15,y:62,s:1},{x:33,y:65,s:2},{x:52,y:61,s:1},{x:73,y:64,s:1},{x:90,y:63,s:2},
]

// ── Hanging Pirate Skeleton ──────────────────────────────────────────────────
function HangingPirate() {
  return (
    <div style={{ position:'fixed', top:58, right:20, zIndex:3, pointerEvents:'none', animation:'hangSway 4s ease-in-out infinite' }}>
      <svg width="36" height="80" viewBox="0 0 36 80" fill="none">
        {/* Rope */}
        <line x1="18" y1="0" x2="18" y2="14" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5"/>
        {/* Skull */}
        <ellipse cx="18" cy="20" rx="8" ry="7" fill="#1e293b" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8"/>
        <circle cx="14.5" cy="20" r="2" fill="rgba(239,68,68,0.5)"/>
        <circle cx="21.5" cy="20" r="2" fill="rgba(239,68,68,0.5)"/>
        <path d="M14 25 L15 27 L16 25 L18 27 L20 25 L21 27 L22 25" stroke="rgba(148,163,184,0.4)" strokeWidth="0.7" fill="none" strokeLinecap="round"/>
        {/* Body */}
        <line x1="18" y1="27" x2="18" y2="50" stroke="rgba(148,163,184,0.3)" strokeWidth="1.2"/>
        {/* Arms */}
        <line x1="18" y1="32" x2="8"  y2="42" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
        <line x1="18" y1="32" x2="28" y2="42" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
        {/* Legs */}
        <line x1="18" y1="50" x2="10" y2="65" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
        <line x1="18" y1="50" x2="26" y2="65" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
        {/* Sword */}
        <line x1="8" y1="42" x2="2" y2="55" stroke="rgba(14,165,233,0.4)" strokeWidth="1.2"/>
        <line x1="4" y1="45" x2="7" y2="45" stroke="rgba(14,165,233,0.3)" strokeWidth="1"/>
      </svg>
    </div>
  )
}

// ── Sailing Ship ─────────────────────────────────────────────────────────────
function SailingShip() {
  return (
    <div style={{ position:'fixed', bottom:14, left:0, zIndex:1, pointerEvents:'none', animation:'sailShip 60s linear infinite' }}>
      <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
        <path d="M28 68 Q100 84 178 68 L186 78 Q100 96 18 78 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
        <path d="M42 68 L46 52 L158 52 L162 68 Z" fill="#0f172a" stroke="#1e3a5f" strokeWidth="0.8"/>
        <line x1="84" y1="52" x2="84" y2="8" stroke="#475569" strokeWidth="2"/>
        <path d="M84 12 L84 48 L130 40 L122 16 Z" fill="rgba(241,245,249,0.06)" stroke="rgba(148,163,184,0.2)" strokeWidth="0.8"/>
        <line x1="122" y1="52" x2="122" y2="18" stroke="#475569" strokeWidth="1.5"/>
        <path d="M122 22 L122 48 L150 43 L146 24 Z" fill="rgba(241,245,249,0.04)" stroke="rgba(148,163,184,0.15)" strokeWidth="0.8"/>
        <path d="M84 8 L84 16 L106 13 L84 8 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="87" y="14" fontSize="5.5" fill="white" opacity="0.55">☠</text>
        <path d="M14 84 Q38 80 62 84 Q86 88 110 84 Q134 80 158 84 Q178 87 196 84" stroke="rgba(14,165,233,0.22)" strokeWidth="1.2" fill="none"/>
        <rect x="146" y="63" width="9" height="4" rx="1" fill="#0ea5e9" opacity="0.3"/>
        <rect x="58" y="63" width="9" height="4" rx="1" fill="#0ea5e9" opacity="0.3"/>
      </svg>
    </div>
  )
}

// ── Parrot with curved flight path ───────────────────────────────────────────
function FlyingParrot() {
  const [wingUp, setWingUp] = useState(false)
  useEffect(() => { const t = setInterval(() => setWingUp(p => !p), 210); return () => clearInterval(t) }, [])
  return (
    <div style={{ position:'fixed', top:130, right:0, zIndex:3, pointerEvents:'none', animation:'flyParrotCurved 32s linear infinite', animationDelay:'15s' }}>
      <svg width="48" height="40" viewBox="0 0 48 40" fill="none">
        <ellipse cx="24" cy="26" rx="8.5" ry="11" fill="#15803d" stroke="#166534" strokeWidth="0.5"/>
        <circle cx="24" cy="12" r="7" fill="#16a34a" stroke="#166534" strokeWidth="0.5"/>
        <path d="M18 12 L12 14 L16 16 Z" fill="#ca8a04"/>
        <circle cx="20" cy="10" r="1.8" fill="white"/><circle cx="20" cy="10" r="0.9" fill="#0f172a"/>
        {wingUp
          ? <path d="M15 22 Q3 12 7 6 Q18 14 24 20 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>
          : <path d="M15 24 Q2 28 4 20 Q16 20 24 22 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>}
        <path d="M20 37 L22 48 L24 37 L26 48 L28 37" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <ellipse cx="24" cy="28" rx="4" ry="5.5" fill="#dc2626" opacity="0.4"/>
      </svg>
    </div>
  )
}

// ── Risk Gauge ────────────────────────────────────────────────────────────────
function RiskGauge({ score }: { score: RiskScore }) {
  const cfg = SCORE[score]
  const a = { LOW:-120, MEDIUM:-65, HIGH:-20, CRITICAL:10 }[score]
  const r=68, cx=88, cy=88, rad=(d:number)=>d*Math.PI/180
  const nx=cx+r*0.82*Math.cos(rad(a)), ny=cy+r*0.82*Math.sin(rad(a))
  const arcs=[{c:'#22c55e',s:-180,e:-120},{c:'#eab308',s:-120,e:-60},{c:'#f97316',s:-60,e:-20},{c:'#ef4444',s:-20,e:0}]
  return (
    <svg width="176" height="105" viewBox="0 0 176 105">
      {arcs.map((arc,i)=>{
        const x1=cx+r*Math.cos(rad(arc.s)),y1=cy+r*Math.sin(rad(arc.s))
        const x2=cx+r*Math.cos(rad(arc.e)),y2=cy+r*Math.sin(rad(arc.e))
        return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={arc.c} strokeWidth="9" strokeLinecap="round" opacity="0.9"/>
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={cfg.color} strokeWidth="3" strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${cfg.color})`}}/>
      <circle cx={cx} cy={cy} r="5.5" fill={cfg.color} style={{filter:`drop-shadow(0 0 8px ${cfg.color})`}}/>
      <text x={cx} y={cy+19} textAnchor="middle" fill={cfg.color} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">{cfg.label}</text>
    </svg>
  )
}

// ── Blast Radius Zone Map ─────────────────────────────────────────────────────
const ZONES = [
  { id:'auth',     label:'Auth',       icon:'🔐', x:6,  y:6,  w:28, h:22, kw:['auth','login','token','oauth','session','password','security','jwt','permission'] },
  { id:'frontend', label:'Frontend',   icon:'🖥️', x:38, y:6,  w:26, h:22, kw:['ui','component','page','view','style','css','frontend','modal','button','form'] },
  { id:'api',      label:'API',        icon:'🔌', x:68, y:6,  w:26, h:22, kw:['api','endpoint','route','handler','rest','graphql','request','middleware'] },
  { id:'payments', label:'Payments',   icon:'💳', x:6,  y:34, w:28, h:22, kw:['payment','billing','stripe','invoice','charge','subscription','gateway','refund'] },
  { id:'backend',  label:'Backend',    icon:'⚙️', x:38, y:34, w:26, h:22, kw:['service','worker','job','queue','logic','backend','process','refactor','task'] },
  { id:'database', label:'Database',   icon:'🗄️', x:68, y:34, w:26, h:22, kw:['database','migration','schema','query','db','sql','table','model','orm','mongo'] },
  { id:'infra',    label:'Infra',      icon:'🏗️', x:6,  y:62, w:28, h:22, kw:['docker','k8s','deploy','infra','cloud','aws','terraform','network','config'] },
  { id:'cicd',     label:'CI/CD',      icon:'🚀', x:38, y:62, w:26, h:22, kw:['ci','cd','pipeline','build','release','workflow','test','lint','action'] },
  { id:'monitor',  label:'Monitoring', icon:'📊', x:68, y:62, w:26, h:22, kw:['log','metric','monitor','alert','trace','sentry','datadog','grafana','error'] },
]
function getImpact(title:string, files:number, score:RiskScore) {
  const t = (title||'').toLowerCase()
  const boost = {LOW:0.6,MEDIUM:1,HIGH:1.4,CRITICAL:1.8}[score]
  const size = files>10?1.5:files>5?1.2:1
  const spill = files>15?0.55:files>8?0.28:0
  return ZONES.reduce((acc,z) => {
    const hit = z.kw.some(k=>t.includes(k))
    const s = (hit?1.8:0)*size*boost + spill
    acc[z.id] = s>=2.5?'critical':s>=1.6?'high':s>=0.9?'medium':s>=0.4?'low':'none'
    return acc
  }, {} as Record<string,string>)
}
const IMP_COLORS: Record<string,{fill:string,border:string,text:string,pulse:boolean}> = {
  none:    {fill:'rgba(15,23,42,0.65)',border:'rgba(30,41,59,0.7)',text:'rgba(222, 225, 230, 0.7)',pulse:false},
  low:     {fill:'rgba(20,83,45,0.35)',border:'rgba(34,197,94,0.3)',text:'#4ade80',pulse:false},
  medium:  {fill:'rgba(92,57,5,0.38)',border:'rgba(234,179,8,0.4)',text:'#facc15',pulse:false},
  high:    {fill:'rgba(124,45,18,0.42)',border:'rgba(249,115,22,0.5)',text:'#fb923c',pulse:true},
  critical:{fill:'rgba(127,29,29,0.52)',border:'rgba(239,68,68,0.6)',text:'#f87171',pulse:true},
}

function BlastViz({ pr, score }: { pr: any; score: RiskScore }) {
  const impact = getImpact(pr?.title||'', pr?.changedFiles||0, score)
  const hit = ZONES.filter(z=>impact[z.id]!=='none')
  const crit = ZONES.filter(z=>impact[z.id]==='critical'||impact[z.id]==='high')
  return (
    <div style={{background:'rgba(6,14,26,0.85)',border:'1px solid rgba(14,165,233,0.1)',borderRadius:10,padding:'18px 22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <div style={{fontSize:7.5,color:'rgba(239,68,68,0.6)',letterSpacing:3,textTransform:'uppercase',marginBottom:3}}>💣 Blast Radius Map</div>
          <div style={{fontSize:11,color:'rgba(148,163,184,0.65)'}}>System areas affected by this PR</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:7.5,color:'rgba(148,163,184,0.35)',letterSpacing:2,marginBottom:2}}>ZONES HIT</div>
          <div style={{fontSize:24,fontFamily:"'Cinzel',serif",fontWeight:700,color:hit.length>5?'#ef4444':hit.length>3?'#f97316':'#eab308',lineHeight:1}}>{hit.length}/{ZONES.length}</div>
        </div>
      </div>
      <div style={{position:'relative',width:'100%',paddingBottom:'34%',marginBottom:12}}>
        <svg viewBox="0 0 100 88" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="44" r="1.4" fill="rgba(239,68,68,0.5)"/>
          <circle cx="50" cy="44" r="3" fill="none" stroke="rgba(239,68,68,0.12)" strokeWidth="0.4"/>
          <circle cx="50" cy="44" r="5.5" fill="none" stroke="rgba(239,68,68,0.07)" strokeWidth="0.3"/>
          {ZONES.map(z=>{
            const lvl=impact[z.id]||'none', c=IMP_COLORS[lvl]
            const zx=z.x+z.w/2, zy=z.y+z.h/2
            return (
              <g key={z.id}>
                {c.pulse&&<rect x={z.x-0.8} y={z.y-0.8} width={z.w+1.6} height={z.h+1.6} rx="2" fill="none" stroke={c.border} strokeWidth="0.5" opacity="0.5" style={{animation:'pulseRing 2s ease-in-out infinite'}}/>}
                {lvl!=='none'&&<line x1="50" y1="44" x2={zx} y2={zy} stroke={lvl==='critical'?'rgba(239,68,68,0.2)':lvl==='high'?'rgba(249,115,22,0.15)':'rgba(234,179,8,0.08)'} strokeWidth="0.25" strokeDasharray="1 1"/>}
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="1.5" fill={c.fill} stroke={c.border} strokeWidth={lvl!=='none'?'0.65':'0.35'} style={{transition:'all 0.4s'}}/>
                <text x={zx} y={z.y+6.5} textAnchor="middle" fontSize="5">{z.icon}</text>
                <text x={zx} y={z.y+12.5} textAnchor="middle" fontSize="2.6" fill={c.text} fontFamily="'Cinzel',serif" fontWeight={lvl!=='none'?'bold':'normal'}>{z.label}</text>
                {lvl!=='none'&&<text x={zx} y={z.y+17.5} textAnchor="middle" fontSize="2" fill={c.text} opacity="0.7" fontFamily="monospace">{lvl.toUpperCase()}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:crit.length>0?12:0}}>
        {(['none','low','medium','high','critical'] as const).map(l=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:9,height:9,borderRadius:2,background:IMP_COLORS[l].fill,border:`1px solid ${IMP_COLORS[l].border}`}}/>
            <span style={{fontSize:8.5,color:IMP_COLORS[l].text,letterSpacing:1}}>{l.toUpperCase()}</span>
          </div>
        ))}
      </div>
      {crit.length>0&&(
        <div style={{background:'rgba(127,29,29,0.12)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:6,padding:'9px 13px'}}>
          <div style={{fontSize:7.5,color:'rgba(239,68,68,0.6)',letterSpacing:3,marginBottom:5,textTransform:'uppercase'}}>☠ High-impact zones</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {crit.map(z=><span key={z.id} style={{fontSize:11,color:'#fca5a5'}}>{z.icon} {z.label}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Merge Gate ────────────────────────────────────────────────────────────────
function MergeGate({ result }: { result: AnalysisResult }) {
  const { score, pr, sources, riskFactors } = result
  const totalLines = (pr.additions||0)+(pr.deletions||0)
  const checks = [
    { label:'PR size acceptable',        pass: totalLines===0||totalLines<500, detail: totalLines>0?`${totalLines} lines changed`:'size data unavailable' },
    { label:'No critical risk factors',  pass: score!=='CRITICAL',             detail: score==='CRITICAL'?`${riskFactors.length} critical factors found`:'risk within acceptable range' },
    { label:'Linear issues resolved',    pass: sources.linearIssues===0,       detail: sources.linearIssues>0?`${sources.linearIssues} linked open issues`:'no linked issues' },
    { label:'No blocking PR comments',   pass: sources.slackMessages<5,        detail: `${sources.slackMessages} comments on this PR` },
    { label:'Risk level acceptable',     pass: score==='LOW'||score==='MEDIUM', detail: `current risk: ${score}` },
  ]
  const passCount = checks.filter(c=>c.pass).length
  const blocked = score==='CRITICAL'||score==='HIGH'||(sources.linearIssues>1)
  const color = blocked?'#ef4444':'#22c55e'
  const verdict = blocked?'BLOCKED':'CLEAR TO SHIP'
  const verdictIcon = blocked?'🚫':'✅'
  return (
    <div style={{background:blocked?'rgba(127,29,29,0.14)':'rgba(20,83,45,0.12)',border:`1px solid ${color}44`,borderRadius:10,padding:'20px 24px',boxShadow:`0 0 30px ${color}0d`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:18}}>
        <div>
          <div style={{fontSize:7.5,color:`${color}88`,letterSpacing:3,textTransform:'uppercase',marginBottom:5}}>🚢 Merge Gate</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:28,fontFamily:"'Cinzel',serif",fontWeight:900,color,letterSpacing:2,textShadow:`0 0 20px ${color}44`}}>{verdictIcon} {verdict}</span>
          </div>
          <div style={{fontSize:11,color:'rgba(148,163,184,0.65)',marginTop:4}}>{passCount}/{checks.length} checks passed</div>
        </div>
        {/* Pass/fail bar */}
        <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:200}}>
          <div style={{height:8,borderRadius:4,overflow:'hidden',background:'rgba(0,0,0,0.4)',display:'flex'}}>
            <div style={{width:`${(passCount/checks.length)*100}%`,background:color,transition:'width 0.6s ease'}}/>
          </div>
          <div style={{fontSize:8.5,color:'rgba(148,163,184,0.45)',letterSpacing:1}}>{Math.round((passCount/checks.length)*100)}% READY TO MERGE</div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {checks.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(0,0,0,0.2)',borderRadius:6,border:`1px solid ${c.pass?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.15)'}`}}>
            <span style={{fontSize:14,flexShrink:0}}>{c.pass?'✅':'❌'}</span>
            <span style={{fontSize:11.5,color:c.pass?'rgba(241,245,249,0.8)':'rgba(241,245,249,0.7)',flex:1}}>{c.label}</span>
            <span style={{fontSize:9.5,color:c.pass?'rgba(74,222,128,0.6)':'rgba(252,165,165,0.6)',letterSpacing:1}}>{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Fleet Command Header ──────────────────────────────────────────────────────
function FleetCommand({ data, repo, onSelect }: { data:any; repo:string; onSelect:(n:number)=>void }) {
  const { prs } = data
  const counts = prs.reduce((a:any,p:any)=>{a[p.score]=(a[p.score]||0)+1;return a},{CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0})
  const danger = prs[0]
  const health = Math.max(0,Math.round(100-(counts.CRITICAL*25+counts.HIGH*12+counts.MEDIUM*5)/Math.max(prs.length,1)*3))
  const hc = health>=80?'#22c55e':health>=50?'#eab308':health>=25?'#f97316':'#ef4444'
  return (
    <div style={{background:'rgba(6,14,26,0.9)',border:'1px solid rgba(14,165,233,0.16)',borderRadius:12,padding:'18px 22px',marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:7.5,color:'rgba(14,165,233,0.5)',letterSpacing:3,textTransform:'uppercase',marginBottom:3}}>⚓ Fleet Command</div>
          <div style={{fontSize:11,color:'rgba(148,163,184,0.55)'}}>{repo}</div>
        </div>
        <div style={{background:`${hc}11`,border:`1px solid ${hc}40`,borderRadius:8,padding:'9px 16px',textAlign:'center'}}>
          <div style={{fontSize:7,color:`${hc}80`,letterSpacing:3,marginBottom:2,textTransform:'uppercase'}}>REPO HEALTH</div>
          <div style={{fontSize:26,fontFamily:"'Cinzel',serif",fontWeight:900,color:hc,lineHeight:1}}>{health}</div>
          <div style={{fontSize:7.5,color:`${hc}90`,letterSpacing:2,marginTop:2}}>{health>=80?'HEALTHY':health>=50?'CAUTION':health>=25?'AT RISK':'CRITICAL'}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9,marginBottom:14}}>
        {(['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[]).map(s=>{
          const c=SCORE[s]
          return (
            <div key={s} style={{background:`${c.color}08`,border:`1px solid ${c.color}25`,borderRadius:8,padding:'10px 13px'}}>
              <div style={{fontSize:7,color:`${c.color}70`,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>{c.label}</div>
              <div style={{fontSize:28,fontFamily:"'Cinzel',serif",fontWeight:700,color:c.color,lineHeight:1}}>{counts[s]||0}</div>
            </div>
          )
        })}
      </div>
      <div style={{height:8,borderRadius:4,overflow:'hidden',background:'rgba(0,0,0,0.4)',display:'flex',marginBottom:14}}>
        {(['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[]).filter(s=>counts[s]>0).map(s=>(
          <div key={s} style={{width:`${(counts[s]/prs.length)*100}%`,background:SCORE[s].color,opacity:0.8,transition:'width 0.5s'}}/>
        ))}
      </div>
      {danger&&danger.score!=='LOW'&&(
        <div style={{background:`${SCORE[danger.score as RiskScore].color}09`,border:`1px solid ${SCORE[danger.score as RiskScore].color}28`,borderRadius:8,padding:'11px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>onSelect(danger.number)}>
          <div style={{flex:1}}>
            <div style={{fontSize:7.5,color:`${SCORE[danger.score as RiskScore].color}70`,letterSpacing:3,textTransform:'uppercase',marginBottom:3}}>☠ Most Dangerous</div>
            <div style={{fontSize:12,color:'#f1f5f9'}}>#{danger.number} — {danger.title}</div>
          </div>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,color:SCORE[danger.score as RiskScore].color,letterSpacing:2,flexShrink:0}}>→ DEEP SCAN</span>
        </div>
      )}
    </div>
  )
}

// ── SQL Block ─────────────────────────────────────────────────────────────────
function SqlBlock({ repo, prNumber }: { repo:string; prNumber:string }) {
  const [owner,repoName]=(repo||'/').split('/')
  return (
    <div style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(14,165,233,0.13)',borderRadius:8,padding:'11px 15px',marginTop:13,fontFamily:"'Share Tech Mono',monospace",fontSize:11,lineHeight:1.9}}>
      <div style={{color:'rgba(14,165,233,0.5)',fontSize:8.5,letterSpacing:2,marginBottom:5,textTransform:'uppercase'}}>🪸 coral sql — live query</div>
      <div><span style={{color:'#a78bfa'}}>SELECT </span><span style={{color:'#cbd5e1'}}>pr.title, pr.changed_files, li.priority_label, rc.body</span></div>
      <div><span style={{color:'#a78bfa'}}>FROM </span><span style={{color:'#38bdf8'}}>github.pulls</span><span style={{color:'#cbd5e1'}}> pr</span></div>
      <div><span style={{color:'#a78bfa'}}>LEFT JOIN </span><span style={{color:'#fbbf24'}}>linear.issues</span><span style={{color:'#cbd5e1'}}> li ON li.description ILIKE </span><span style={{color:'#4ade80'}}>'%{repoName||'repo'}%'</span></div>
      <div><span style={{color:'#a78bfa'}}>LEFT JOIN </span><span style={{color:'#f472b6'}}>github.repo_issue_comments</span><span style={{color:'#cbd5e1'}}> rc ON rc.issue_number = pr.number</span></div>
      <div><span style={{color:'#a78bfa'}}>WHERE </span><span style={{color:'#cbd5e1'}}>pr.owner = </span><span style={{color:'#4ade80'}}>'{owner||'owner'}'</span><span style={{color:'#cbd5e1'}}> AND pr.number = </span><span style={{color:'#4ade80'}}>{prNumber||'?'}</span></div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function BlastRadius() {
  const [tab,setTab]         = useState<Tab>('analyze')
  const [repo,setRepo]       = useState('')
  const [prNum,setPrNum]     = useState('')
  const [loading,setLoading] = useState(false)
  const [result,setResult]   = useState<AnalysisResult|null>(null)
  const [error,setError]     = useState('')
  const [loadMsg,setLoadMsg] = useState('')
  const [fleetRepo,setFleetRepo] = useState('')
  const [fleetData,setFleetData] = useState<any>(null)
  const [fleetLoad,setFleetLoad] = useState(false)
  const [fleetErr,setFleetErr]   = useState('')
  const [log,setLog]         = useState<LogEntry[]>([])
  const [cmpRepos,setCmpRepos]   = useState(['',''])
  const [cmpData,setCmpData]     = useState<any[]>([null,null])
  const [cmpLoad,setCmpLoad]     = useState([false,false])
  const msgRef = useRef(0)
  const msgs = ['⚓ Dropping anchor into GitHub...','🗺️  Charting Linear currents...','💬 Scanning crow\'s nest for comments...','🦜 Claude is reading the bones...','☠️  Calculating blast radius...']

  useEffect(()=>{
    if(!loading)return
    msgRef.current=0; setLoadMsg(msgs[0])
    const t=setInterval(()=>{msgRef.current=(msgRef.current+1)%msgs.length; setLoadMsg(msgs[msgRef.current])},1800)
    return ()=>clearInterval(t)
  },[loading])

  const analyze = async (repoOverride?:string, prOverride?:number) => {
    const r = repoOverride||repo, p = prOverride||parseInt(prNum)
    if(!r.includes('/')||!p){setError('Enter repo as owner/repo and a PR number');return}
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:r,prNumber:p})})
      const data = await res.json()
      if(!res.ok)throw new Error(data.error||'Analysis failed')
      setResult(data)
      setLog(prev=>[{pr:data.pr,score:data.score,repo:r,time:new Date().toLocaleTimeString()},...prev].slice(0,30))
    } catch(e:any){setError(e.message||'The seas are rough. Try again.')}
    finally{setLoading(false)}
  }

  const fleetScan = async () => {
    if(!fleetRepo.includes('/')){setFleetErr('Enter repo as owner/repo-name');return}
    setFleetLoad(true); setFleetErr(''); setFleetData(null)
    try {
      const res = await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:fleetRepo})})
      const data = await res.json()
      if(!res.ok)throw new Error(data.error||'Failed')
      setFleetData(data)
    } catch(e:any){setFleetErr(e.message)}
    finally{setFleetLoad(false)}
  }

  const cmpScan = async (idx:number) => {
    const r = cmpRepos[idx]; if(!r.includes('/'))return
    setCmpLoad(p=>{const n=[...p];n[idx]=true;return n})
    try {
      const res = await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:r})})
      const data = await res.json()
      setCmpData(p=>{const n=[...p];n[idx]=data;return n})
    } catch{}
    finally{setCmpLoad(p=>{const n=[...p];n[idx]=false;return n})}
  }

  const cfg = result?.score ? SCORE[result.score] : null
  const inp:React.CSSProperties = {background:'rgba(0,0,0,0.5)',border:'1px solid rgba(14,165,233,0.22)',borderRadius:6,padding:'11px 15px',color:'#f1f5f9',fontFamily:"'Share Tech Mono',monospace",fontSize:13,width:'100%'}
  const primaryBtn = (active?:boolean):React.CSSProperties => ({background:active?'linear-gradient(135deg,#0ea5e9,#0284c7)':'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.28)',borderRadius:6,padding:'11px 26px',color:active?'#fff':'rgba(14,165,233,0.65)',fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,letterSpacing:2,cursor:'pointer',textTransform:'uppercase' as const,whiteSpace:'nowrap' as const,transition:'all 0.2s',boxShadow:active?'0 0 18px rgba(14,165,233,0.22)':'none'})

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#020a14;overflow-x:hidden}
        ::placeholder{color:rgba(148,163,184,0.28)!important}
        input:focus{outline:none;border-color:rgba(14,165,233,0.5)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(14,165,233,0.2);border-radius:2px}
        @keyframes sailShip{0%{transform:translateX(-220px)}100%{transform:translateX(calc(100vw + 220px))}}
        @keyframes flyParrotCurved{
          0%  {transform:translate(0px,0px);opacity:0}
          4%  {opacity:1}
          20% {transform:translate(-20vw,18px)}
          40% {transform:translate(-40vw,-8px)}
          60% {transform:translate(-60vw,22px)}
          80% {transform:translate(-80vw,-5px)}
          96% {opacity:1}
          100%{transform:translate(-105vw,8px);opacity:0}
        }
        @keyframes hangSway{0%,100%{transform:rotate(-4deg) translateX(0)}50%{transform:rotate(4deg) translateX(2px)}}
        @keyframes twinkle{0%,100%{opacity:0.18}50%{opacity:0.7}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes waveScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes pulseRing{0%,100%{opacity:0.3}50%{opacity:0.85}}
        .card{animation:fadeUp 0.42s ease forwards;opacity:0}
        .c1{animation-delay:0s}.c2{animation-delay:0.07s}.c3{animation-delay:0.14s}.c4{animation-delay:0.21s}.c5{animation-delay:0.28s}.c6{animation-delay:0.35s}.c7{animation-delay:0.42s}
        .frow:hover{border-color:rgba(14,165,233,0.28)!important;background:rgba(14,165,233,0.04)!important}
        .tab-btn:hover{color:rgba(241,245,249,0.8)!important}
      `}</style>

      {/* ── Ocean Background ── */}
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse at 15% 40%,#071422 0%,#030810 55%,#010305 100%)'}}>
        {STARS.map((s,i)=>(
          <div key={i} style={{position:'absolute',width:s.s===2?2:1,height:s.s===2?2:1,background:'white',borderRadius:'50%',top:`${s.y}%`,left:`${s.x}%`,animation:`twinkle ${2+i%4}s ease-in-out infinite`,animationDelay:`${i%5*0.7}s`,opacity:0.25}}/>
        ))}
        <div style={{position:'absolute',top:34,right:70,width:50,height:50,borderRadius:'50%',background:'rgba(241,245,249,0.025)',border:'1px solid rgba(241,245,249,0.055)'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:90,background:'linear-gradient(to top,rgba(14,165,233,0.05),transparent)'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:50,overflow:'hidden',opacity:0.18}}>
          <svg width="200%" height="50" viewBox="0 0 1400 50" preserveAspectRatio="none" style={{animation:'waveScroll 22s linear infinite'}}>
            <path d="M0 25 Q70 12 140 25 Q210 38 280 25 Q350 12 420 25 Q490 38 560 25 Q630 12 700 25 Q770 38 840 25 Q910 12 980 25 Q1050 38 1120 25 Q1190 12 1260 25 Q1330 38 1400 25 L1400 50 L0 50 Z" fill="#0ea5e9"/>
          </svg>
        </div>
      </div>
      <SailingShip/>
      <FlyingParrot/>
      <HangingPirate/>
      <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.018) 2px,rgba(0,0,0,0.018) 4px)'}}/>

      {/* ── App Shell ── */}
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',fontFamily:"'Share Tech Mono',monospace"}}>

        {/* Header */}
        <header style={{borderBottom:'1px solid rgba(14,165,233,0.1)',background:'rgba(1,6,12,0.9)',backdropFilter:'blur(20px)',padding:'0 28px',display:'flex',alignItems:'center',height:58,position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:11}}>
            <span style={{fontSize:22,animation:'float 3s ease-in-out infinite'}}>💣</span>
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:900,color:'#f1f5f9',letterSpacing:4,textTransform:'uppercase',lineHeight:1}}>BLAST RADIUS</div>
              <div style={{fontSize:7.5,color:'rgba(14,165,233,0.55)',letterSpacing:2.5,marginTop:2}}>DEPLOY RISK INTELLIGENCE · PIRATES OF THE CORAL-BEAN</div>
            </div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:7,alignItems:'center'}}>
            {['GitHub','Linear','Comments'].map((s,i)=>(
              <div key={s} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 9px',background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:4,fontSize:8.5,color:'#4ade80',letterSpacing:1}}>
                <div style={{width:4,height:4,borderRadius:'50%',background:'#22c55e',animation:`pulse 2s infinite`,animationDelay:`${i*0.3}s`}}/>
                {s}
              </div>
            ))}
            <div style={{padding:'3px 10px',background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:4,fontSize:8.5,color:'#c4b5fd',letterSpacing:1}}>🪸 CORAL SQL</div>
          </div>
        </header>

        <main style={{maxWidth:920,margin:'0 auto',padding:'32px 22px 110px'}}>

          {/* Hero */}
          <div style={{textAlign:'center',marginBottom:30}}>
            <div style={{display:'inline-block',fontFamily:"'Cinzel',serif",fontSize:9.5,letterSpacing:6,color:'rgba(14,165,233,0.45)',textTransform:'uppercase',marginBottom:13,borderBottom:'1px solid rgba(14,165,233,0.1)',paddingBottom:6}}>
              ☠ Pirates of the Coral-bean · Enterprise Risk Intelligence ☠
            </div>
            <h1 style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(24px,5vw,44px)',fontWeight:900,color:'#f1f5f9',letterSpacing:4,textTransform:'uppercase',lineHeight:1.12,textShadow:'0 0 50px rgba(14,165,233,0.2)',marginBottom:10}}>
              Know Your<br/><span style={{color:'#38bdf8',textShadow:'0 0 25px rgba(56,189,248,0.4)'}}>Blast Radius</span>
            </h1>
            <p style={{color:'rgba(148,163,184,0.6)',fontSize:12,letterSpacing:1,lineHeight:1.9,maxWidth:480,margin:'0 auto'}}>
              Before ye merge — know what sinks. One Coral SQL query across GitHub, Linear &amp; PR comments. Analysed by Claude. GO or NO-GO in seconds.
            </p>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'1px solid rgba(14,165,233,0.08)',marginBottom:24}}>
            {([
              {id:'analyze', label:'🔍 PR Analyser'},
              {id:'fleet',   label:'⚓ Fleet Scan'},
              {id:'compare', label:'⚖️ Compare Repos'},
              {id:'log',     label:`📜 Log ${log.length>0?'('+log.length+')':''}`},
            ] as const).map(t=>(
              <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
                style={{padding:'9px 18px',background:'transparent',border:'none',borderBottom:tab===t.id?'2px solid #38bdf8':'2px solid transparent',color:tab===t.id?'#f1f5f9':'rgba(148,163,184,0.45)',fontFamily:"'Cinzel',serif",fontSize:9.5,letterSpacing:2,cursor:'pointer',transition:'all 0.2s',textTransform:'uppercase'}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══════════ ANALYSE ══════════ */}
          {tab==='analyze'&&(
            <div>
              <div style={{background:'rgba(6,14,26,0.88)',border:'1px solid rgba(14,165,233,0.14)',borderRadius:12,padding:22,marginBottom:22,backdropFilter:'blur(10px)'}}>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div style={{flex:1,minWidth:180}}>
                    <label style={{display:'block',fontSize:8,color:'rgba(14,165,233,0.55)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>Repository</label>
                    <input type="text" placeholder="owner/repo-name" value={repo} onChange={e=>setRepo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} style={inp}/>
                  </div>
                  <div style={{width:126}}>
                    <label style={{display:'block',fontSize:8,color:'rgba(14,165,233,0.55)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>PR Number</label>
                    <input type="number" placeholder="42" value={prNum} onChange={e=>setPrNum(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} style={inp}/>
                  </div>
                  <button onClick={()=>analyze()} disabled={loading} style={primaryBtn(!loading)}>{loading?'⚡ SCANNING...':'🔍 ANALYSE'}</button>
                </div>
                {(repo||prNum)&&<SqlBlock repo={repo} prNumber={prNum}/>}
                {error&&<div style={{marginTop:9,padding:'8px 12px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:6,color:'#fca5a5',fontSize:11.5}}>⚠️ {error}</div>}
              </div>

              {loading&&(
                <div style={{textAlign:'center',padding:'48px 24px',background:'rgba(6,14,26,0.6)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:12}}>
                  <div style={{fontSize:40,marginBottom:16,animation:'float 1.8s ease-in-out infinite'}}>🪸</div>
                  <p style={{color:'#38bdf8',fontSize:11.5,letterSpacing:2,animation:'pulse 1.4s infinite'}}>{loadMsg}</p>
                  <p style={{color:'rgba(148,163,184,0.3)',fontSize:9,letterSpacing:2,marginTop:6}}>CROSS-SOURCE JOIN IN PROGRESS</p>
                </div>
              )}

              {!result&&!loading&&(
                <div style={{textAlign:'center',padding:'50px 24px',opacity:0.35}}>
                  <div style={{fontSize:52,marginBottom:12}}>🏴‍☠️</div>
                  <p style={{color:'#64748b',fontSize:11,letterSpacing:2}}>ENTER A REPO AND PR NUMBER TO BEGIN YOUR VOYAGE</p>
                  <p style={{color:'#374151',fontSize:9,letterSpacing:1,marginTop:6}}>Try: demo/demo · PR #42</p>
                </div>
              )}

              {result&&cfg&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>

                  {/* ① Merge Gate — most prominent */}
                  <div className="card c1"><MergeGate result={result}/></div>

                  {/* ② Risk Banner */}
                  <div className="card c2" style={{background:cfg.glow,border:`1px solid ${cfg.border}`,borderRadius:12,padding:'20px 26px',display:'flex',alignItems:'center',gap:22,flexWrap:'wrap',boxShadow:`0 0 32px ${cfg.glow}`,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',fontSize:96,opacity:0.04,pointerEvents:'none'}}>☠</div>
                    <RiskGauge score={result.score}/>
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(16px,3vw,24px)',fontWeight:900,color:cfg.color,letterSpacing:3,textShadow:`0 0 16px ${cfg.color}44`}}>{cfg.label}</span>
                        <div style={{display:'flex',gap:4}}>{[1,2,3,4].map(i=><div key={i} style={{width:11,height:11,borderRadius:'50%',background:i<=cfg.cannon?'#ef4444':'rgba(255,255,255,0.08)',boxShadow:i<=cfg.cannon?'0 0 6px #ef444466':'none'}}/>)}</div>
                      </div>
                      <p style={{color:'rgba(241,245,249,0.75)',fontSize:11.5,lineHeight:1.7,maxWidth:420}}>{result.scoreReason}</p>
                    </div>
                    <div style={{textAlign:'right',borderLeft:`1px solid ${cfg.border}`,paddingLeft:20}}>
                      <div style={{color:'rgba(148,163,184,0.4)',fontSize:8,letterSpacing:3,marginBottom:3}}>PULL REQUEST</div>
                      <div style={{color:cfg.color,fontSize:18,fontFamily:"'Cinzel',serif",fontWeight:700}}>#{result.pr.number}</div>
                      <div style={{color:'rgba(241,245,249,0.65)',fontSize:10.5,marginTop:3,maxWidth:155}}>{result.pr.title}</div>
                    </div>
                  </div>

                  {/* ③ Stats */}
                  <div className="card c3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                    {[
                      {label:'Files Changed',val:result.pr.changedFiles??'—',sub:result.pr.additions!=null?`+${result.pr.additions} / -${result.pr.deletions} lines`:'stats unavailable',color:'#f1f5f9',icon:'📁'},
                      {label:'Linear Issues', val:result.sources.linearIssues,sub:'linked work items',color:'#fbbf24',icon:'📋'},
                      {label:'PR Comments',   val:result.sources.slackMessages,sub:'review discussions',color:'#38bdf8',icon:'💬'},
                    ].map((s,i)=>(
                      <div key={i} style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.09)',borderRadius:10,padding:'15px 20px'}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontSize:8,color:'rgba(148,163,184,0.45)',letterSpacing:3,textTransform:'uppercase',marginBottom:6}}>{s.label}</div>
                            <div style={{fontSize:30,fontFamily:"'Cinzel',serif",fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                            <div style={{fontSize:9,color:'rgba(148,163,184,0.45)',marginTop:4}}>{s.sub}</div>
                          </div>
                          <span style={{fontSize:18,opacity:0.28}}>{s.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ④ Blast Radius Map */}
                  <div className="card c4"><BlastViz pr={result.pr} score={result.score}/></div>

                  {/* ⑤ Summary */}
                  <div className="card c4" style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.09)',borderRadius:10,padding:'18px 22px'}}>
                    <div style={{fontSize:8,color:'rgba(14,165,233,0.5)',letterSpacing:3,marginBottom:10,textTransform:'uppercase'}}>⚓ Captain's Assessment</div>
                    <p style={{color:'rgba(241,245,249,0.85)',fontSize:12,lineHeight:1.85}}>{result.summary}</p>
                  </div>

                  {/* ⑥ Orders + Hazards */}
                  <div className="card c5" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(34,197,94,0.12)',borderRadius:10,padding:'18px 22px'}}>
                      <div style={{fontSize:8,color:'rgba(34,197,94,0.55)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🗺️ Navigator's Orders</div>
                      {result.recommendations.map((r,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
                          <span style={{color:'#22c55e',fontSize:11,flexShrink:0,marginTop:1}}>→</span>
                          <span style={{color:'rgba(241,245,249,0.78)',fontSize:11.5,lineHeight:1.65}}>{r}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(239,68,68,0.12)',borderRadius:10,padding:'18px 22px'}}>
                      <div style={{fontSize:8,color:'rgba(239,68,68,0.55)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>☠ Hazards Spotted</div>
                      {result.riskFactors.map((r,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
                          <span style={{color:'#ef4444',fontSize:11,flexShrink:0,marginTop:1}}>⚠</span>
                          <span style={{color:'rgba(241,245,249,0.78)',fontSize:11.5,lineHeight:1.65}}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ⑦ Reviewer Compass */}
                  {result.reviewerSuggestions&&result.reviewerSuggestions.length>0&&(
                    <div className="card c6" style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(124,58,237,0.14)',borderRadius:10,padding:'18px 22px'}}>
                      <div style={{fontSize:8,color:'rgba(124,58,237,0.55)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🧭 Reviewer Compass — Best crew for this PR</div>
                      <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
                        {result.reviewerSuggestions.map((r,i)=>(
                          <div key={i} style={{padding:'7px 14px',background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.18)',borderRadius:6,fontSize:11.5,color:'#c4b5fd'}}>
                            @{r.author_login} · {r.commit_count} commits
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ⑧ Evidence */}
                  {(result.sources.linearItems?.length>0||result.sources.slackItems?.length>0)&&(
                    <div className="card c7" style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.09)',borderRadius:10,padding:'18px 22px'}}>
                      <div style={{fontSize:8,color:'rgba(14,165,233,0.5)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🔭 Intelligence Gathered — via Coral SQL</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                        {result.sources.linearItems?.length>0&&(
                          <div>
                            <div style={{fontSize:8.5,color:'#fbbf24',letterSpacing:2,marginBottom:6}}>📋 LINEAR WORK ITEMS</div>
                            {result.sources.linearItems.map((item,i)=>(
                              <div key={i} style={{background:'rgba(0,0,0,0.28)',borderRadius:5,padding:'6px 10px',marginBottom:4,fontSize:10.5,color:'rgba(241,245,249,0.62)',lineHeight:1.5}}>
                                <span style={{color:'#fbbf24'}}>P{item.priority}</span> · {item.title}
                              </div>
                            ))}
                          </div>
                        )}
                        {result.sources.slackItems?.length>0&&(
                          <div>
                            <div style={{fontSize:8.5,color:'#38bdf8',letterSpacing:2,marginBottom:6}}>💬 PR COMMENTS</div>
                            {result.sources.slackItems.map((item,i)=>(
                              <div key={i} style={{background:'rgba(0,0,0,0.28)',borderRadius:5,padding:'6px 10px',marginBottom:4,fontSize:10.5,color:'rgba(241,245,249,0.62)',lineHeight:1.5}}>
                                <span style={{color:'#38bdf8'}}>@{item.username}</span>: {item.text?.substring(0,85)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{textAlign:'center',fontSize:8.5,color:'rgba(148,163,184,0.2)',letterSpacing:2,paddingTop:5,borderTop:'1px solid rgba(14,165,233,0.05)'}}>
                    ☠ 3 SOURCES · 1 CORAL SQL QUERY · 0 GLUE CODE · POWERED BY CLAUDE ☠
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ FLEET ══════════ */}
          {tab==='fleet'&&(
            <div>
              <div style={{background:'rgba(6,14,26,0.88)',border:'1px solid rgba(14,165,233,0.14)',borderRadius:12,padding:22,marginBottom:20,backdropFilter:'blur(10px)'}}>
                <p style={{fontSize:11.5,color:'rgba(148,163,184,0.6)',marginBottom:13,lineHeight:1.75}}>Scan every open PR at once. Coral queries <code style={{color:'#38bdf8',fontSize:10.5}}>github.pulls WHERE state='open'</code> and ranks your entire fleet by deployment risk.</p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div style={{flex:1,minWidth:200}}>
                    <label style={{display:'block',fontSize:8,color:'rgba(14,165,233,0.55)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>Repository</label>
                    <input type="text" placeholder="owner/repo-name" value={fleetRepo} onChange={e=>setFleetRepo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fleetScan()} style={inp}/>
                  </div>
                  <button onClick={fleetScan} disabled={fleetLoad} style={primaryBtn(!fleetLoad)}>{fleetLoad?'⚡ SCANNING...':'⚓ SCAN ALL PRs'}</button>
                </div>
                {fleetErr&&<div style={{marginTop:9,padding:'8px 12px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:6,color:'#fca5a5',fontSize:11.5}}>⚠️ {fleetErr}</div>}
              </div>
              {fleetLoad&&<div style={{textAlign:'center',padding:48,color:'#38bdf8',fontSize:11.5,letterSpacing:2,animation:'pulse 1.4s infinite'}}>🪸 QUERYING ALL OPEN PULL REQUESTS...</div>}
              {!fleetData&&!fleetLoad&&<div style={{textAlign:'center',padding:48,opacity:0.3}}><div style={{fontSize:44,marginBottom:10}}>⚓</div><p style={{color:'#475569',fontSize:11,letterSpacing:2}}>ENTER A REPO TO SCAN YOUR ENTIRE FLEET</p></div>}
              {fleetData?.prs&&(
                <div>
                  <FleetCommand data={fleetData} repo={fleetRepo} onSelect={(n)=>{setRepo(fleetRepo);setPrNum(String(n));setTab('analyze');analyze(fleetRepo,n)}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:9.5,color:'rgba(14,165,233,0.55)',letterSpacing:3}}>{fleetData.total} OPEN PRs · RANKED BY RISK</span>
                    <span style={{fontSize:8,color:'rgba(148,163,184,0.2)',letterSpacing:2}}>github.pulls WHERE state='open'</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {fleetData.prs.map((pr:any)=>{
                      const c=SCORE[pr.score as RiskScore]
                      return(
                        <div key={pr.number} className="frow" onClick={()=>{setRepo(fleetRepo);setPrNum(String(pr.number));setTab('analyze');analyze(fleetRepo,pr.number)}}
                          style={{display:'flex',alignItems:'center',gap:13,padding:'12px 17px',background:'rgba(6,14,26,0.8)',border:`1px solid ${c.border}2a`,borderRadius:8,transition:'all 0.2s',cursor:'pointer'}}>
                          <span style={{color:c.color,fontFamily:"'Cinzel',serif",fontSize:9.5,fontWeight:700,letterSpacing:2,minWidth:128}}>{c.label}</span>
                          <span style={{color:'rgba(56,189,248,0.5)',fontSize:10.5,minWidth:36}}>#{pr.number}</span>
                          <span style={{color:'#f1f5f9',fontSize:11.5,flex:1}}>{pr.title}</span>
                          <span style={{color:'rgba(148,163,184,0.38)',fontSize:9.5}}>{pr.changed_files} files</span>
                          <span style={{color:'rgba(56,189,248,0.35)',fontSize:9,letterSpacing:1}}>→ DEEP SCAN</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ COMPARE ══════════ */}
          {tab==='compare'&&(
            <div>
              <div style={{background:'rgba(6,14,26,0.88)',border:'1px solid rgba(14,165,233,0.14)',borderRadius:12,padding:22,marginBottom:22}}>
                <div style={{fontSize:8,color:'rgba(14,165,233,0.55)',letterSpacing:3,marginBottom:10,textTransform:'uppercase'}}>⚖️ Side-by-side Fleet Comparison</div>
                <p style={{fontSize:11.5,color:'rgba(148,163,184,0.6)',marginBottom:14,lineHeight:1.7}}>Compare the deployment health of two repositories side by side. Useful for mono-repo branches, staging vs production, or evaluating team velocity.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[0,1].map(i=>(
                    <div key={i}>
                      <label style={{display:'block',fontSize:8,color:'rgba(14,165,233,0.55)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>Repo {i+1}</label>
                      <div style={{display:'flex',gap:8}}>
                        <input type="text" placeholder="owner/repo-name" value={cmpRepos[i]} onChange={e=>{const n=[...cmpRepos];n[i]=e.target.value;setCmpRepos(n)}} style={{...inp,flex:1}} onKeyDown={e=>e.key==='Enter'&&cmpScan(i)}/>
                        <button onClick={()=>cmpScan(i)} disabled={cmpLoad[i]} style={{...primaryBtn(!cmpLoad[i]),padding:'11px 16px'}}>{cmpLoad[i]?'...':'⚓'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {(cmpData[0]||cmpData[1])&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[0,1].map(i=>{
                    const d=cmpData[i]; if(!d)return<div key={i} style={{background:'rgba(6,14,26,0.7)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:12,padding:20,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(148,163,184,0.3)',fontSize:11}}>{cmpLoad[i]?'Scanning...':'Enter repo and scan'}</div>
                    const prs=d.prs||[], counts=prs.reduce((a:any,p:any)=>{a[p.score]=(a[p.score]||0)+1;return a},{CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0})
                    const health=Math.max(0,Math.round(100-(counts.CRITICAL*25+counts.HIGH*12+counts.MEDIUM*5)/Math.max(prs.length,1)*3))
                    const hc=health>=80?'#22c55e':health>=50?'#eab308':health>=25?'#f97316':'#ef4444'
                    return(
                      <div key={i} style={{background:'rgba(6,14,26,0.85)',border:'1px solid rgba(14,165,233,0.12)',borderRadius:12,padding:18}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:'#f1f5f9',marginBottom:4,letterSpacing:1}}>{cmpRepos[i]}</div>
                        <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:14}}>
                          <span style={{fontSize:34,fontFamily:"'Cinzel',serif",fontWeight:900,color:hc}}>{health}</span>
                          <span style={{fontSize:9,color:`${hc}80`,letterSpacing:2}}>HEALTH SCORE</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                          {(['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[]).map(s=>(
                            <div key={s} style={{background:`${SCORE[s].color}08`,border:`1px solid ${SCORE[s].color}20`,borderRadius:6,padding:'8px 10px'}}>
                              <div style={{fontSize:7,color:`${SCORE[s].color}70`,letterSpacing:2,marginBottom:3}}>{SCORE[s].label}</div>
                              <div style={{fontSize:22,fontFamily:"'Cinzel',serif",fontWeight:700,color:SCORE[s].color}}>{counts[s]||0}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop:12,height:6,borderRadius:3,overflow:'hidden',background:'rgba(0,0,0,0.4)',display:'flex'}}>
                          {(['CRITICAL','HIGH','MEDIUM','LOW'] as RiskScore[]).filter(s=>counts[s]>0).map(s=>(
                            <div key={s} style={{width:`${(counts[s]/Math.max(prs.length,1))*100}%`,background:SCORE[s].color,opacity:0.8}}/>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {!cmpData[0]&&!cmpData[1]&&(
                <div style={{textAlign:'center',padding:48,opacity:0.3}}>
                  <div style={{fontSize:44,marginBottom:10}}>⚖️</div>
                  <p style={{color:'#475569',fontSize:11,letterSpacing:2}}>ENTER TWO REPOS ABOVE TO COMPARE THEIR FLEET RISK</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════ LOG ══════════ */}
          {tab==='log'&&(
            <div>
              {log.length===0?(
                <div style={{textAlign:'center',padding:56,opacity:0.3}}>
                  <div style={{fontSize:44,marginBottom:10}}>📜</div>
                  <p style={{color:'#475569',fontSize:11,letterSpacing:2}}>NO VOYAGES YET — ANALYSE A PR TO BEGIN YOUR LOG</p>
                </div>
              ):(
                <div>
                  <div style={{fontSize:8.5,color:'rgba(14,165,233,0.45)',letterSpacing:3,marginBottom:13}}>{log.length} VOYAGE{log.length>1?'S':''} RECORDED THIS SESSION</div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {log.map((entry,i)=>{
                      const c=SCORE[entry.score]
                      return(
                        <div key={i} className="frow" onClick={()=>{setRepo(entry.repo);setPrNum(String(entry.pr.number));setTab('analyze')}}
                          style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.07)',borderRadius:8,transition:'all 0.2s',cursor:'pointer'}}>
                          <span style={{color:'rgba(148,163,184,0.3)',fontSize:9,minWidth:52}}>{entry.time}</span>
                          <span style={{color:c.color,fontSize:12}}>●</span>
                          <span style={{color:'rgba(56,189,248,0.5)',fontSize:10.5,minWidth:18}}>#{entry.pr.number}</span>
                          <span style={{color:'#f1f5f9',fontSize:11.5,flex:1}}>{entry.pr.title}</span>
                          <span style={{color:'rgba(148,163,184,0.35)',fontSize:9.5}}>{entry.repo}</span>
                          <span style={{color:c.color,fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2}}>{entry.score}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}