'use client'
import { useState, useEffect, useRef } from 'react'
import BlastRadiusViz from '@/components/BlastRadiusViz'
import FleetCommandDashboard from '@/components/FleetCommandDashboard'

type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type Tab = 'analyze' | 'fleet' | 'log'

interface AnalysisResult {
  score: RiskScore
  scoreReason: string
  summary: string
  recommendations: string[]
  riskFactors: string[]
  pr: { title: string; number: number; changedFiles: number; additions: number; deletions: number }
  sources: {
    linearIssues: number
    slackMessages: number
    linearItems: Array<{ title: string; priority: number; state_id: string }>
    slackItems: Array<{ username: string; text: string }>
  }
  reviewerSuggestions?: Array<{ author_login: string; commit_count: number }>
}

interface LogEntry {
  pr: { title: string; number: number }
  score: RiskScore
  repo: string
  time: string
}

const SCORE = {
  LOW:      { label: 'SAFE WATERS',   color: '#22c55e', glow: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   cannon: 1 },
  MEDIUM:   { label: 'ROUGH SEAS',    color: '#eab308', glow: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   cannon: 2 },
  HIGH:     { label: 'STORM WARNING', color: '#f97316', glow: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  cannon: 3 },
  CRITICAL: { label: 'ABANDON SHIP',  color: '#ef4444', glow: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   cannon: 4 },
}

function SailingShip() {
  return (
    <div style={{ position:'fixed', bottom:18, left:0, zIndex:1, pointerEvents:'none', animation:'sailShip 55s linear infinite' }}>
      <svg width="220" height="110" viewBox="0 0 220 110" fill="none">
        <path d="M30 72 Q110 88 190 72 L200 82 Q110 102 20 82 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
        <path d="M45 72 L50 56 L170 56 L175 72 Z" fill="#0f172a" stroke="#1e3a5f" strokeWidth="1"/>
        <line x1="90" y1="56" x2="90" y2="10" stroke="#64748b" strokeWidth="2.5"/>
        <path d="M90 14 L90 52 L140 44 L130 18 Z" fill="rgba(241,245,249,0.07)" stroke="rgba(148,163,184,0.25)" strokeWidth="1"/>
        <line x1="130" y1="56" x2="130" y2="20" stroke="#64748b" strokeWidth="2"/>
        <path d="M130 24 L130 52 L160 47 L155 26 Z" fill="rgba(241,245,249,0.05)" stroke="rgba(148,163,184,0.15)" strokeWidth="1"/>
        <path d="M90 10 L90 18 L112 15 L90 10 Z" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="93" y="16" fontSize="6" fill="white" opacity="0.6">☠</text>
        <path d="M15 88 Q40 84 65 88 Q90 92 115 88 Q140 84 165 88 Q190 92 210 88" stroke="rgba(14,165,233,0.25)" strokeWidth="1.5" fill="none"/>
        <path d="M10 94 Q38 90 66 94 Q94 98 122 94 Q150 90 178 94 Q200 97 215 94" stroke="rgba(14,165,233,0.15)" strokeWidth="1" fill="none"/>
        <rect x="155" y="67" width="10" height="5" rx="1" fill="#0ea5e9" opacity="0.35"/>
        <rect x="60" y="67" width="10" height="5" rx="1" fill="#0ea5e9" opacity="0.35"/>
      </svg>
    </div>
  )
}

function FlyingParrot() {
  const [wingUp, setWingUp] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setWingUp(p => !p), 200)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ position:'fixed', top:110, right:0, zIndex:3, pointerEvents:'none', animation:'flyParrot 26s linear infinite', animationDelay:'12s' }}>
      <svg width="50" height="42" viewBox="0 0 50 42" fill="none">
        <ellipse cx="25" cy="27" rx="9" ry="12" fill="#15803d" stroke="#166534" strokeWidth="0.5"/>
        <circle cx="25" cy="13" r="7.5" fill="#16a34a" stroke="#166534" strokeWidth="0.5"/>
        <path d="M19 13 L13 15 L17 17 Z" fill="#ca8a04"/>
        <circle cx="21" cy="11" r="2" fill="white"/>
        <circle cx="21" cy="11" r="1" fill="#0f172a"/>
        {wingUp
          ? <path d="M16 23 Q4 13 8 7 Q19 15 25 21 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>
          : <path d="M16 25 Q3 29 5 21 Q17 21 25 23 Z" fill="#22c55e" stroke="#166534" strokeWidth="0.5"/>
        }
        <path d="M21 38 L23 50 L25 38 L27 50 L29 38" stroke="#15803d" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <ellipse cx="25" cy="29" rx="4.5" ry="6" fill="#dc2626" opacity="0.45"/>
      </svg>
    </div>
  )
}

function RiskGauge({ score }: { score: RiskScore }) {
  const cfg = SCORE[score]
  const angles = { LOW: -120, MEDIUM: -65, HIGH: -20, CRITICAL: 10 }
  const needleAngle = angles[score]
  const r = 68, cx = 88, cy = 88
  const toRad = (d: number) => d * Math.PI / 180
  const nx = cx + r * 0.82 * Math.cos(toRad(needleAngle))
  const ny = cy + r * 0.82 * Math.sin(toRad(needleAngle))
  const arcs = [
    { c:'#22c55e', s:-180, e:-120 },{ c:'#eab308', s:-120, e:-60 },
    { c:'#f97316', s:-60,  e:-20  },{ c:'#ef4444', s:-20,  e:0   },
  ]
  return (
    <svg width="176" height="108" viewBox="0 0 176 108">
      {arcs.map((a,i)=>{
        const x1=cx+r*Math.cos(toRad(a.s)),y1=cy+r*Math.sin(toRad(a.s))
        const x2=cx+r*Math.cos(toRad(a.e)),y2=cy+r*Math.sin(toRad(a.e))
        return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={a.c} strokeWidth="9" strokeLinecap="round" opacity="0.9"/>
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={cfg.color} strokeWidth="3" strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${cfg.color})`}}/>
      <circle cx={cx} cy={cy} r="5.5" fill={cfg.color} style={{filter:`drop-shadow(0 0 8px ${cfg.color})`}}/>
      <text x={cx} y={cy+19} textAnchor="middle" fill={cfg.color} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">{cfg.label}</text>
    </svg>
  )
}

function SqlBlock({ repo, prNumber }: { repo:string; prNumber:string }) {
  const [owner,repoName]=(repo||'/').split('/')
  return (
    <div style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(14,165,233,0.12)',borderRadius:8,padding:'11px 15px',marginTop:13,fontFamily:"'Share Tech Mono',monospace",fontSize:11,lineHeight:1.9}}>
      <div style={{color:'rgba(14,165,233,0.35)',fontSize:8,letterSpacing:2,marginBottom:5,textTransform:'uppercase'}}>🪸 coral sql — live query</div>
      <div><span style={{color:'#7c3aed'}}>SELECT </span><span style={{color:'#94a3b8'}}>pr.title, pr.changed_files, li.priority_label, rc.body</span></div>
      <div><span style={{color:'#7c3aed'}}>FROM </span><span style={{color:'#0ea5e9'}}>github.pulls</span><span style={{color:'#94a3b8'}}> pr</span></div>
      <div><span style={{color:'#7c3aed'}}>LEFT JOIN </span><span style={{color:'#f59e0b'}}>linear.issues</span><span style={{color:'#94a3b8'}}> li ON li.description ILIKE </span><span style={{color:'#22c55e'}}>'{repoName||'repo'}%'</span></div>
      <div><span style={{color:'#7c3aed'}}>LEFT JOIN </span><span style={{color:'#ec4899'}}>github.pull_request_comments</span><span style={{color:'#94a3b8'}}> rc ON rc.pull_number = pr.number</span></div>
      <div><span style={{color:'#7c3aed'}}>WHERE </span><span style={{color:'#94a3b8'}}>pr.owner = </span><span style={{color:'#22c55e'}}>'{owner||'owner'}'</span><span style={{color:'#94a3b8'}}> AND pr.number = </span><span style={{color:'#22c55e'}}>{prNumber||'?'}</span></div>
    </div>
  )
}

export default function BlastRadius() {
  const [tab,setTab]=useState<Tab>('analyze')
  const [repo,setRepo]=useState('')
  const [prNum,setPrNum]=useState('')
  const [loading,setLoading]=useState(false)
  const [result,setResult]=useState<AnalysisResult|null>(null)
  const [error,setError]=useState('')
  const [loadMsg,setLoadMsg]=useState('')
  const [fleetRepo,setFleetRepo]=useState('')
  const [fleetData,setFleetData]=useState<any>(null)
  const [fleetLoad,setFleetLoad]=useState(false)
  const [fleetErr,setFleetErr]=useState('')
  const [log,setLog]=useState<LogEntry[]>([])
  const msgRef=useRef(0)
  const msgs=['⚓ Dropping anchor into GitHub waters...','🗺️  Charting Linear currents...','💬 Scanning crow\'s nest for PR comments...','🦜 Claude is reading the bones...','☠️  Calculating blast radius...']

  useEffect(()=>{
    if(!loading)return
    msgRef.current=0;setLoadMsg(msgs[0])
    const t=setInterval(()=>{msgRef.current=(msgRef.current+1)%msgs.length;setLoadMsg(msgs[msgRef.current])},1800)
    return()=>clearInterval(t)
  },[loading])

  const analyze=async()=>{
    if(!repo.includes('/')||!prNum){setError('Enter repo as owner/repo and a PR number');return}
    setLoading(true);setError('');setResult(null)
    try{
      const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo,prNumber:parseInt(prNum)})})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Analysis failed')
      setResult(data)
      setLog(prev=>[{pr:data.pr,score:data.score,repo,time:new Date().toLocaleTimeString()},...prev].slice(0,30))
    }catch(e:any){setError(e.message||'The seas are rough. Try again.')}
    finally{setLoading(false)}
  }

  const fleetScan=async()=>{
    if(!fleetRepo.includes('/')){setFleetErr('Enter repo as owner/repo-name');return}
    setFleetLoad(true);setFleetErr('');setFleetData(null)
    try{
      const res=await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repo:fleetRepo})})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||'Fleet scan failed')
      setFleetData(data)
    }catch(e:any){setFleetErr(e.message)}
    finally{setFleetLoad(false)}
  }

  const cfg=result?.score?SCORE[result.score]:null
  const inp:React.CSSProperties={background:'rgba(0,0,0,0.5)',border:'1px solid rgba(14,165,233,0.2)',borderRadius:6,padding:'11px 15px',color:'#f1f5f9',fontFamily:"'Share Tech Mono',monospace",fontSize:13,width:'100%'}
  const btn=(active?:boolean):React.CSSProperties=>({background:active?'linear-gradient(135deg,#0ea5e9,#0284c7)':'rgba(14,165,233,0.07)',border:'1px solid rgba(14,165,233,0.25)',borderRadius:6,padding:'11px 26px',color:active?'#fff':'rgba(14,165,233,0.55)',fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,letterSpacing:2,cursor:'pointer',textTransform:'uppercase' as const,whiteSpace:'nowrap' as const,transition:'all 0.2s',boxShadow:active?'0 0 18px rgba(14,165,233,0.2)':'none'})

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#020a14;overflow-x:hidden}
        ::placeholder{color:rgba(148,163,184,0.22)!important}
        input:focus{outline:none;border-color:rgba(14,165,233,0.45)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(14,165,233,0.18);border-radius:2px}
        @keyframes sailShip{0%{transform:translateX(-280px)}100%{transform:translateX(calc(100vw + 280px))}}
        @keyframes flyParrot{0%{transform:translateX(180px) scaleX(1);opacity:0}4%{opacity:1}96%{opacity:1}100%{transform:translateX(calc(-100vw - 180px)) scaleX(1);opacity:0}}
        @keyframes twinkle{0%,100%{opacity:0.12}50%{opacity:0.65}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes waveScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .card{animation:fadeUp 0.45s ease forwards;opacity:0}
        .c1{animation-delay:0s}.c2{animation-delay:0.08s}.c3{animation-delay:0.16s}.c4{animation-delay:0.24s}.c5{animation-delay:0.32s}.c6{animation-delay:0.4s}
        .frow:hover{border-color:rgba(14,165,233,0.25)!important;background:rgba(14,165,233,0.03)!important;cursor:pointer}
        .tab-btn:hover{color:rgba(241,245,249,0.7)!important}
      `}</style>

      {/* Ocean BG */}
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse at 15% 40%,#071422 0%,#030810 55%,#010305 100%)'}}>
        
        <div style={{position:'absolute',top:36,right:72,width:52,height:52,borderRadius:'50%',background:'rgba(241,245,249,0.03)',border:'1px solid rgba(241,245,249,0.06)'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:100,background:'linear-gradient(to top,rgba(14,165,233,0.05),transparent)'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:55,overflow:'hidden',opacity:0.2}}>
          <svg width="200%" height="55" viewBox="0 0 1400 55" preserveAspectRatio="none" style={{animation:'waveScroll 20s linear infinite'}}>
            <path d="M0 28 Q70 14 140 28 Q210 42 280 28 Q350 14 420 28 Q490 42 560 28 Q630 14 700 28 Q770 42 840 28 Q910 14 980 28 Q1050 42 1120 28 Q1190 14 1260 28 Q1330 42 1400 28 L1400 55 L0 55 Z" fill="#0ea5e9"/>
          </svg>
        </div>
      </div>

      <SailingShip/>
      <FlyingParrot/>
      <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)'}}/>

      <div style={{position:'relative',zIndex:2,minHeight:'100vh',fontFamily:"'Share Tech Mono',monospace"}}>

        {/* Header */}
        <header style={{borderBottom:'1px solid rgba(14,165,233,0.1)',background:'rgba(1,6,12,0.88)',backdropFilter:'blur(20px)',padding:'0 32px',display:'flex',alignItems:'center',height:60,position:'sticky',top:0,zIndex:50}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:24,animation:'float 3s ease-in-out infinite'}}>💣</span>
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:900,color:'#f1f5f9',letterSpacing:4,textTransform:'uppercase',lineHeight:1}}>BLAST RADIUS</div>
              <div style={{fontSize:7.5,color:'rgba(14,165,233,0.45)',letterSpacing:3,marginTop:2}}>DEPLOY RISK INTELLIGENCE · PIRATES OF THE CORAL-BEAN</div>
            </div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:7,alignItems:'center'}}>
            {['GitHub','Linear','PR Comments'].map((s,i)=>(
              <div key={s} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 9px',background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.15)',borderRadius:4,fontSize:8.5,color:'#22c55e',letterSpacing:1}}>
                <div style={{width:4,height:4,borderRadius:'50%',background:'#22c55e',animation:`pulse 2s infinite`,animationDelay:`${i*0.3}s`}}/>
                {s}
              </div>
            ))}
            <div style={{padding:'3px 10px',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.22)',borderRadius:4,fontSize:8.5,color:'#a78bfa',letterSpacing:1}}>🪸 CORAL SQL</div>
          </div>
        </header>

        <main style={{maxWidth:900,margin:'0 auto',padding:'34px 24px 110px'}}>
          {/* Hero */}
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{display:'inline-block',fontFamily:"'Cinzel',serif",fontSize:9.5,letterSpacing:6,color:'rgba(14,165,233,0.35)',textTransform:'uppercase',marginBottom:13,borderBottom:'1px solid rgba(14,165,233,0.08)',paddingBottom:6}}>
              ☠ Pirates of the Coral-bean — Enterprise Risk Intelligence ☠
            </div>
            <h1 style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(26px,5vw,46px)',fontWeight:900,color:'#f1f5f9',letterSpacing:4,textTransform:'uppercase',lineHeight:1.1,textShadow:'0 0 50px rgba(14,165,233,0.2)',marginBottom:11}}>
              Know Your<br/><span style={{color:'#0ea5e9',textShadow:'0 0 28px rgba(14,165,233,0.45)'}}>Blast Radius</span>
            </h1>
            <p style={{color:'rgba(148,163,184,0.5)',fontSize:11.5,letterSpacing:1,lineHeight:1.9,maxWidth:480,margin:'0 auto'}}>
              Before ye merge — know what sinks. One Coral SQL query across GitHub, Linear &amp; PR comments. Analysed by Claude.
            </p>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'1px solid rgba(14,165,233,0.08)',marginBottom:26}}>
            {([{id:'analyze',label:'🔍 PR Analyser'},{id:'fleet',label:'⚓ Fleet Scan'},{id:'log',label:`📜 Mission Log ${log.length>0?'('+log.length+')':''}`}] as const).map(t=>(
              <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)} style={{padding:'10px 20px',background:'transparent',border:'none',borderBottom:tab===t.id?'2px solid #0ea5e9':'2px solid transparent',color:tab===t.id?'#f1f5f9':'rgba(148,163,184,0.35)',fontFamily:"'Cinzel',serif",fontSize:9.5,letterSpacing:2,cursor:'pointer',transition:'all 0.2s',textTransform:'uppercase'}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── ANALYSE TAB ── */}
          {tab==='analyze'&&(
            <div>
              <div style={{background:'rgba(6,14,26,0.85)',border:'1px solid rgba(14,165,233,0.13)',borderRadius:12,padding:22,marginBottom:22,backdropFilter:'blur(10px)'}}>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div style={{flex:1,minWidth:180}}>
                    <label style={{display:'block',fontSize:7.5,color:'rgba(14,165,233,0.4)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>Repository</label>
                    <input type="text" placeholder="owner/repo-name" value={repo} onChange={e=>setRepo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} style={inp}/>
                  </div>
                  <div style={{width:128}}>
                    <label style={{display:'block',fontSize:7.5,color:'rgba(14,165,233,0.4)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>PR Number</label>
                    <input type="number" placeholder="42" value={prNum} onChange={e=>setPrNum(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} style={inp}/>
                  </div>
                  <button onClick={analyze} disabled={loading} style={btn(!loading)}>{loading?'⚡ SCANNING...':'🔍 ANALYSE'}</button>
                </div>
                {(repo||prNum)&&<SqlBlock repo={repo} prNumber={prNum}/>}
                {error&&<div style={{marginTop:9,padding:'8px 12px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:6,color:'#fca5a5',fontSize:11}}>⚠️ {error}</div>}
              </div>

              {loading&&(
                <div style={{textAlign:'center',padding:'48px 24px',background:'rgba(6,14,26,0.6)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:12}}>
                  <div style={{fontSize:42,marginBottom:18,animation:'float 1.8s ease-in-out infinite'}}>🪸</div>
                  <p style={{color:'#0ea5e9',fontSize:11,letterSpacing:2,animation:'pulse 1.4s infinite'}}>{loadMsg}</p>
                  <p style={{color:'rgba(148,163,184,0.18)',fontSize:8.5,letterSpacing:2,marginTop:6}}>CROSS-SOURCE JOIN IN PROGRESS</p>
                </div>
              )}

              {!result&&!loading&&(
                <div style={{textAlign:'center',padding:'50px 24px',opacity:0.3}}>
                  <div style={{fontSize:54,marginBottom:12}}>🏴‍☠️</div>
                  <p style={{color:'#475569',fontSize:10.5,letterSpacing:2}}>ENTER A REPO AND PR NUMBER TO BEGIN YOUR VOYAGE</p>
                  <p style={{color:'#2d3748',fontSize:9,letterSpacing:1,marginTop:6}}>Try: demo/demo · PR #42</p>
                </div>
              )}

              {result&&cfg&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>

                  {/* CARD 1 — Risk score hero */}
                  <div className="card c1" style={{background:cfg.glow,border:`1px solid ${cfg.border}`,borderRadius:12,padding:'22px 26px',display:'flex',alignItems:'center',gap:24,flexWrap:'wrap',boxShadow:`0 0 35px ${cfg.glow}`,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',right:18,top:'50%',transform:'translateY(-50%)',fontSize:100,opacity:0.04,pointerEvents:'none'}}>☠</div>
                    <RiskGauge score={result.score}/>
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(17px,3vw,26px)',fontWeight:900,color:cfg.color,letterSpacing:3,textShadow:`0 0 16px ${cfg.color}44`}}>{cfg.label}</span>
                        <div style={{display:'flex',gap:4}}>{[1,2,3,4].map(i=><div key={i} style={{width:11,height:11,borderRadius:'50%',background:i<=cfg.cannon?'#ef4444':'rgba(255,255,255,0.07)',boxShadow:i<=cfg.cannon?'0 0 6px #ef444466':'none'}}/>)}</div>
                      </div>
                      <p style={{color:'rgba(241,245,249,0.6)',fontSize:11,lineHeight:1.7,maxWidth:420}}>{result.scoreReason}</p>
                    </div>
                    <div style={{textAlign:'right',borderLeft:`1px solid ${cfg.border}`,paddingLeft:20}}>
                      <div style={{color:'rgba(148,163,184,0.3)',fontSize:7.5,letterSpacing:3,marginBottom:3}}>PULL REQUEST</div>
                      <div style={{color:cfg.color,fontSize:19,fontFamily:"'Cinzel',serif",fontWeight:700}}>#{result.pr.number}</div>
                      <div style={{color:'rgba(241,245,249,0.55)',fontSize:10,marginTop:3,maxWidth:155}}>{result.pr.title}</div>
                    </div>
                  </div>

                  {/* CARD 2 — Stats row */}
                  <div className="card c2" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                    {[
                      {label:'Files Changed',val:result.pr.changedFiles,sub: result.pr.additions != null ? `+${result.pr.additions} / -${result.pr.deletions}` : 'stats unavailable',color:'#f1f5f9',icon:'📁'},
                      {label:'Linear Issues',val:result.sources.linearIssues,sub:'linked work items',color:'#f59e0b',icon:'📋'},
                      {label:'PR Comments',val:result.sources.slackMessages,sub:'review discussions',color:'#0ea5e9',icon:'💬'},
                    ].map((s,i)=>(
                      <div key={i} style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:10,padding:'16px 20px'}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontSize:7.5,color:'rgba(148,163,184,0.3)',letterSpacing:3,textTransform:'uppercase',marginBottom:6}}>{s.label}</div>
                            <div style={{fontSize:32,fontFamily:"'Cinzel',serif",fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                            <div style={{fontSize:8.5,color:'rgba(148,163,184,0.3)',marginTop:4}}>{s.sub}</div>
                          </div>
                          <span style={{fontSize:18,opacity:0.25}}>{s.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CARD — Suggested Reviewers (right after stats) */}
                  {result.reviewerSuggestions && result.reviewerSuggestions.length > 0 && (
                    <div className="card c3" style={{ background:'rgba(10,22,40,0.7)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:10, padding:'20px 28px' }}>
                      <div style={{ fontSize:9, color:'rgba(124,58,237,0.5)', letterSpacing:3, marginBottom:12, textTransform:'uppercase' }}>🧭 Suggested Reviewers</div>
                      <div style={{ display:'flex', gap:12 }}>
                        {result.reviewerSuggestions.map((r: any, i: number) => (
                          <div key={i} style={{ padding:'8px 16px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:6, fontSize:12, color:'#a78bfa' }}>
                            @{r.author_login} · {r.commit_count} commits
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

<div className="card c3">
  <BlastRadiusViz pr={result.pr} score={result.score} />
</div>

                  {/* CARD — Captain's Assessment */}
                  <div className="card c4" style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:10,padding:'20px 24px'}}>
                    <div style={{fontSize:7.5,color:'rgba(14,165,233,0.32)',letterSpacing:3,marginBottom:10,textTransform:'uppercase'}}>⚓ Captain's Assessment</div>
                    <p style={{color:'rgba(241,245,249,0.78)',fontSize:11.5,lineHeight:1.85}}>{result.summary}</p>
                  </div>

                  {/* CARD — Navigator's Orders + Hazards */}
                  <div className="card c5" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(34,197,94,0.1)',borderRadius:10,padding:'20px 24px'}}>
                      <div style={{fontSize:7.5,color:'rgba(34,197,94,0.4)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🗺️ Navigator's Orders</div>
                      {result.recommendations.map((r,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
                          <span style={{color:'#22c55e',fontSize:10.5,flexShrink:0,marginTop:1}}>→</span>
                          <span style={{color:'rgba(241,245,249,0.65)',fontSize:11,lineHeight:1.65}}>{r}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(239,68,68,0.1)',borderRadius:10,padding:'20px 24px'}}>
                      <div style={{fontSize:7.5,color:'rgba(239,68,68,0.4)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>☠ Hazards Spotted</div>
                      {result.riskFactors.map((r,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
                          <span style={{color:'#ef4444',fontSize:10.5,flexShrink:0,marginTop:1}}>⚠</span>
                          <span style={{color:'rgba(241,245,249,0.65)',fontSize:11,lineHeight:1.65}}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CARD — Intelligence Gathered */}
                  {(result.sources.linearItems?.length>0||result.sources.slackItems?.length>0)&&(
                    <div className="card c6" style={{background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.08)',borderRadius:10,padding:'20px 24px'}}>
                      <div style={{fontSize:7.5,color:'rgba(14,165,233,0.32)',letterSpacing:3,marginBottom:12,textTransform:'uppercase'}}>🔭 Intelligence Gathered — via Coral SQL</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                        {result.sources.linearItems?.length>0&&(
                          <div>
                            <div style={{fontSize:8,color:'#f59e0b',letterSpacing:2,marginBottom:6}}>📋 LINEAR WORK ITEMS</div>
                            {result.sources.linearItems.map((item,i)=>(
                              <div key={i} style={{background:'rgba(0,0,0,0.28)',borderRadius:5,padding:'6px 10px',marginBottom:4,fontSize:10,color:'rgba(241,245,249,0.5)',lineHeight:1.5}}>
                                <span style={{color:'#f59e0b'}}>P{item.priority}</span> · {item.title}
                              </div>
                            ))}
                          </div>
                        )}
                        {result.sources.slackItems?.length>0&&(
                          <div>
                            <div style={{fontSize:8,color:'#0ea5e9',letterSpacing:2,marginBottom:6}}>💬 PR REVIEW COMMENTS</div>
                            {result.sources.slackItems.map((item,i)=>(
                              <div key={i} style={{background:'rgba(0,0,0,0.28)',borderRadius:5,padding:'6px 10px',marginBottom:4,fontSize:10,color:'rgba(241,245,249,0.5)',lineHeight:1.5}}>
                                <span style={{color:'#0ea5e9'}}>@{item.username}</span>: {item.text?.substring(0,80)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{textAlign:'center',fontSize:8.5,color:'rgba(148,163,184,0.13)',letterSpacing:2,paddingTop:5,borderTop:'1px solid rgba(14,165,233,0.04)'}}>
                    ☠ 3 SOURCES · 1 CORAL SQL QUERY · 0 GLUE CODE · POWERED BY CLAUDE ☠
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FLEET TAB ── */}
          {tab==='fleet'&&(
            <div>
              <div style={{background:'rgba(6,14,26,0.85)',border:'1px solid rgba(14,165,233,0.13)',borderRadius:12,padding:22,marginBottom:22,backdropFilter:'blur(10px)'}}>
                <p style={{fontSize:11,color:'rgba(148,163,184,0.45)',marginBottom:13,lineHeight:1.75}}>
                  Scan every open PR at once. Coral queries <code style={{color:'#0ea5e9',fontSize:10}}>github.pulls WHERE state='open'</code> and ranks your entire fleet by deployment risk.
                </p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div style={{flex:1,minWidth:200}}>
                    <label style={{display:'block',fontSize:7.5,color:'rgba(14,165,233,0.4)',letterSpacing:3,marginBottom:6,textTransform:'uppercase'}}>Repository</label>
                    <input type="text" placeholder="owner/repo-name" value={fleetRepo} onChange={e=>setFleetRepo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fleetScan()} style={inp}/>
                  </div>
                  <button onClick={fleetScan} disabled={fleetLoad} style={btn(!fleetLoad)}>{fleetLoad?'⚡ SCANNING...':'⚓ SCAN ALL PRs'}</button>
                </div>
                {fleetErr&&<div style={{marginTop:9,padding:'8px 12px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:6,color:'#fca5a5',fontSize:11}}>⚠️ {fleetErr}</div>}
              </div>
              {fleetLoad&&<div style={{textAlign:'center',padding:50,color:'#0ea5e9',fontSize:11,letterSpacing:2,animation:'pulse 1.4s infinite'}}>🪸 QUERYING ALL OPEN PULL REQUESTS...</div>}
              {!fleetData&&!fleetLoad&&(
                <div style={{textAlign:'center',padding:50,opacity:0.28}}>
                  <div style={{fontSize:48,marginBottom:11}}>⚓</div>
                  <p style={{color:'#475569',fontSize:10.5,letterSpacing:2}}>ENTER A REPO TO SCAN YOUR ENTIRE FLEET</p>
                </div>
              )}
              {fleetData?.prs&&(
                <div>

<FleetCommandDashboard
  data={fleetData}
  repo={fleetRepo}
/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:9.5,color:'rgba(14,165,233,0.45)',letterSpacing:3}}>{fleetData.total} OPEN PRs · RANKED BY RISK</span>
                    <span style={{fontSize:7.5,color:'rgba(148,163,184,0.18)',letterSpacing:2}}>github.pulls WHERE state='open'</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {fleetData.prs.map((pr:any)=>{
                      const c=SCORE[pr.score as RiskScore]
                      return(
                        <div key={pr.number} className="frow" onClick={()=>{setRepo(fleetRepo);setPrNum(String(pr.number));setTab('analyze')}}
                          style={{display:'flex',alignItems:'center',gap:13,padding:'12px 17px',background:'rgba(6,14,26,0.8)',border:`1px solid ${c.border}2a`,borderRadius:8,transition:'all 0.2s'}}>
                          <span style={{color:c.color,fontFamily:"'Cinzel',serif",fontSize:9.5,fontWeight:700,letterSpacing:2,minWidth:125}}>{c.label}</span>
                          <span style={{color:'rgba(14,165,233,0.38)',fontSize:10,minWidth:34}}>#{pr.number}</span>
                          <span style={{color:'#f1f5f9',fontSize:11,flex:1}}>{pr.title}</span>
                          <span style={{color:'rgba(148,163,184,0.28)',fontSize:9}}>{pr.changed_files} files · +{pr.additions}/-{pr.deletions}</span>
                          <span style={{color:'rgba(14,165,233,0.28)',fontSize:8.5,letterSpacing:1}}>→ DEEP SCAN</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LOG TAB ── */}
          {tab==='log'&&(
            <div>
              {log.length===0?(
                <div style={{textAlign:'center',padding:58,opacity:0.28}}>
                  <div style={{fontSize:48,marginBottom:11}}>📜</div>
                  <p style={{color:'#475569',fontSize:10.5,letterSpacing:2}}>NO VOYAGES YET — ANALYSE A PR TO BEGIN YOUR LOG</p>
                </div>
              ):(
                <div>
                  <div style={{fontSize:8,color:'rgba(14,165,233,0.35)',letterSpacing:3,marginBottom:13}}>{log.length} VOYAGE{log.length>1?'S':''} RECORDED THIS SESSION</div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {log.map((entry,i)=>{
                      const c=SCORE[entry.score]
                      return(
                        <div key={i} className="frow" onClick={()=>{setRepo(entry.repo);setPrNum(String(entry.pr.number));setTab('analyze')}}
                          style={{display:'flex',alignItems:'center',gap:13,padding:'11px 17px',background:'rgba(6,14,26,0.8)',border:'1px solid rgba(14,165,233,0.06)',borderRadius:8,transition:'all 0.2s'}}>
                          <span style={{color:'rgba(148,163,184,0.22)',fontSize:9,minWidth:52}}>{entry.time}</span>
                          <span style={{color:c.color,fontSize:13}}>●</span>
                          <span style={{color:'rgba(14,165,233,0.38)',fontSize:10,minWidth:18}}>#{entry.pr.number}</span>
                          <span style={{color:'#f1f5f9',fontSize:11,flex:1}}>{entry.pr.title}</span>
                          <span style={{color:c.color,fontFamily:"'Cinzel',serif",fontSize:8.5,letterSpacing:2}}>{entry.score}</span>
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