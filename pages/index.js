
import React, { useEffect, useState, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// helper: generate 7 non-overlapping ladders and 7 non-overlapping snakes at runtime
function generateJumps(){
  const all = new Set();
  const ladders = [];
  const snakes = [];
  // ladders: start < end, start from 2..80
  while(ladders.length < 7){
    const a = Math.floor(Math.random()*79)+2; // 2..80
    const b = Math.floor(Math.random()*(98-a))+a+1; // ensure > a
    if(a>=b) continue;
    // avoid near-1 and 100 positions and duplicates
    if(all.has(a) || all.has(b) || a===1 || b===100) continue;
    ladders.push({start:a,end:b,type:'ladder'}); all.add(a); all.add(b);
  }
  // snakes: start > end, start from 21..99
  while(snakes.length < 7){
    const a = Math.floor(Math.random()*79)+21; //21..99
    const b = Math.floor(Math.random()*(a-2))+2; //2..a-1
    if(a<=b) continue;
    if(all.has(a) || all.has(b) || a===100 || b===1) continue;
    snakes.push({start:a,end:b,type:'snake'}); all.add(a); all.add(b);
  }
  // merge to mapping
  const mapping = {};
  const visual = [...ladders,...snakes];
  visual.forEach(j=> mapping[j.start]=j.end);
  return {mapping,visual};
}

function rollDie(){ return Math.floor(Math.random()*6)+1; }
function indexToPercent(idx){
  const i = idx-1;
  const rowFromBottom = Math.floor(i/10);
  const row = 9 - rowFromBottom;
  const col = i % 10;
  const colInRow = (rowFromBottom % 2 === 0) ? col : (9 - col);
  const left = (colInRow + 0.5) * 10;
  const top = (row + 0.5) * 10;
  return {left, top};
}

// cubic bezier control points for smoother snake curves
function makeCurvePath(sx, sy, ex, ey){
  const dx = ex - sx; const dy = ey - sy;
  const cx1 = sx + dy*0.18; const cy1 = sy - dx*0.12;
  const cx2 = ex - dy*0.18; const cy2 = ey + dx*0.12;
  return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
}

// sample points along cubic bezier (t from 0..1)
function sampleBezier(sx,sy,cx1,cy1,cx2,cy2,ex,ey,steps=20){
  const pts=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const x = Math.pow(1-t,3)*sx + 3*Math.pow(1-t,2)*t*cx1 + 3*(1-t)*t*t*cx2 + Math.pow(t,3)*ex;
    const y = Math.pow(1-t,3)*sy + 3*Math.pow(1-t,2)*t*cy1 + 3*(1-t)*t*t*cy2 + Math.pow(t,3)*ey;
    pts.push({left:x, top:y});
  }
  return pts;
}

export default function Home(){
  const [mapping, setMapping] = useState({}); // start->end
  const [visual, setVisual] = useState([]); // array of jumps
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(1);
  const [cur, setCur] = useState(1);
  const [die, setDie] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState('Welcome — randomized realistic board');
  const [hist, setHist] = useState([]);
  const [r1, setR1] = useState(0);
  const [r2, setR2] = useState(0);

  useEffect(()=>{ const {mapping,visual} = generateJumps(); setMapping(mapping); setVisual(visual); setR1(parseInt(localStorage.getItem('rolls-p1-'+new Date().toISOString().slice(0,10))||'0',10)); setR2(parseInt(localStorage.getItem('rolls-p2-'+new Date().toISOString().slice(0,10))||'0',10)); (async()=>{ try{ await sdk.actions.ready(); }catch(e){} })(); },[]);

  const animateSteps = async (steps, player)=>{
    setMoving(true);
    for(let s=0;s<steps;s++){
      await new Promise(res=>setTimeout(res,300));
      if(player===1) setP1(p=>p+1); else setP2(p=>p+1);
    }
    setMoving(false);
  };

  // animate along bezier path or straight line for ladder
  const animateAlong = async (from, to, type, player) => {
    // sample path in percent coords
    const s = indexToPercent(from); const e = indexToPercent(to);
    if(type==='snake'){
      const dx = e.left - s.left; const dy = e.top - s.top;
      const cx1 = s.left + dy*0.18; const cy1 = s.top - dx*0.12;
      const cx2 = e.left - dy*0.18; const cy2 = e.top + dx*0.12;
      const pts = sampleBezier(s.left,s.top,cx1,cy1,cx2,cy2,e.left,e.top,18);
      setMoving(true);
      // small shake at head first
      if(player===1) { setP1(from); } else { setP2(from); }
      await new Promise(r=>setTimeout(r,250));
      for(const p of pts){
        if(player===1) setP1(() => { return Math.max(1, Math.round((p.top/10 - 0.5) + 1)) ; }); else setP2(() => { return Math.max(1, Math.round((p.top/10 - 0.5) + 1)) ; });
        // move visual pawn; but actual position will be set by percent coords using current numeric pos
        await new Promise(r=>setTimeout(r,140));
      }
      // ensure final numeric position
      if(player===1) setP1(to); else setP2(to);
      setMoving(false);
    } else {
      // ladder: straight sampled points
      const steps = 10;
      const pts=[];
      for(let i=0;i<=steps;i++){ const t=i/steps; pts.push({left: s.left + (e.left-s.left)*t, top: s.top + (e.top-s.top)*t}); }
      setMoving(true);
      for(const p of pts){
        if(player===1) setP1(to); else setP2(to);
        await new Promise(r=>setTimeout(r,120));
      }
      if(player===1) setP1(to); else setP2(to);
      setMoving(false);
    }
  };

  const handleRoll = async () => {
    if(moving) return;
    const player = cur;
    const rolls = player===1? r1: r2;
    if(rolls>=10){ setMsg(`❌ Player ${player} daily limit reached.`); return; }
    setRolling(true); setDie('rolling');
    await new Promise(r=>setTimeout(r,900));
    const d = rollDie(); setDie(d);
    // increment daily counter
    const key = 'rolls-p'+player+'-'+new Date().toISOString().slice(0,10);
    const newc = (parseInt(localStorage.getItem(key)||'0',10) + 1);
    localStorage.setItem(key, String(newc));
    if(player===1) setR1(newc); else setR2(newc);
    const pos = player===1? p1: p2;
    const target = pos + d;
    if(target>100){ setMsg(`Player ${player} rolled ${d}, need exact roll.`); setRolling(false); return; }
    await animateSteps(d, player);
    setMsg(`Player ${player} rolled ${d}. Reached ${target}.`);
    if(mapping[target]){
      const dest = mapping[target];
      setHist(h=>[{note:`Player ${player} ${dest>target? 'climbed':'slid'} from ${target} to ${dest}`}, ...h].slice(0,20));
      setMsg(dest>target? `🪜 Player ${player} climbs to ${dest}` : `🐍 Player ${player} bitten! Down to ${dest}`);
      await new Promise(r=>setTimeout(r,350));
      await animateAlong(target,dest, dest>target? 'ladder':'snake', player);
    } else {
      setHist(h=>[{note:`Player ${player} rolled ${d} to ${target}`}, ...h].slice(0,20));
    }
    const final = player===1? p1: p2;
    if(final===100){ setMsg(`🎉 Player ${player} wins!`); setRolling(false); return; }
    setCur(player===1?2:1);
    setRolling(false);
  };

  const handleReset = ()=>{
    setP1(1); setP2(1); setCur(1); setDie(null); setMsg('Game reset.'); setHist([]);
    localStorage.removeItem('rolls-p1-'+new Date().toISOString().slice(0,10));
    localStorage.removeItem('rolls-p2-'+new Date().toISOString().slice(0,10));
    setR1(0); setR2(0);
    const {mapping,visual} = generateJumps(); setMapping(mapping); setVisual(visual);
  };

  // prepare cells
  const cells=[];
  for(let r=0;r<10;r++){
    for(let c=0;c<10;c++){
      const idx = (9-r)*10 + (((9-r)%2===0)? c+1 : 10-c);
      const colors = ['c0','c1','c2','c3','c4','c5'];
      cells.push({idx, cls: colors[(r+c)%6]});
    }
  }

  const p1Coord = indexToPercent(p1);
  const p2Coord = indexToPercent(p2);

  return (
    <div className="page">
      <div className="title">Snakes & Ladders</div>
      <div className="board-wrap">
        <div className="board" id="board">
          {cells.map(cell=>(
            <div key={cell.idx} className={`cell ${cell.cls}`}>
              <div className="idx">{cell.idx}</div>
            </div>
          ))}


          {/* Image layer: realistic PNG snakes and ladders */}
          <div className="svg-layer" style={{position:'absolute'}}>
            {visual.map((j,i)=>{
              const s = indexToPercent(j.start); const e = indexToPercent(j.end);
              const dx = e.left - s.left; const dy = e.top - s.top;
              const angle = Math.atan2(dy,dx) * 180 / Math.PI;
              const dist = Math.sqrt(dx*dx + dy*dy);
              // width % relative to board
              const widthPercent = Math.max(8, dist);
              const left = (s.left + e.left)/2 - widthPercent/2;
              const top = (s.top + e.top)/2 - 3.5;
              const src = j.type==='snake' ? '/assets/snake-real.png' : '/assets/ladder-real.png';
              const imgStyle = { position:'absolute', left: left + '%', top: top + '%', width: widthPercent + '%', height: (j.type==='snake'? (widthPercent*2.8)+'%':'20%'), transform:`rotate(${angle}deg)`, transformOrigin:'center center', pointerEvents:'none' };
              return (<img key={'img'+i} src={src} style={imgStyle} alt={j.type}/>);
            })}
          </div>


          {/* pawns positioned by percent coords */}
          <img src="/assets/pawn-blue.png" className="pawn" style={{left: p1Coord.left + '%', top: p1Coord.top + '%'}} alt="p1" />
          <img src="/assets/pawn-red.png" className="pawn" style={{left: p2Coord.left + '%', top: p2Coord.top + '%'}} alt="p2" />
        </div>
      </div>

      <div className="controls">
        <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'center'}}>
          <div className="dice">{die==='rolling'? <img src="/assets/dice-rolling.gif" width="56" alt="rolling"/> : (typeof die==='number'? <img src={'/assets/dice-'+die+'.png'} width="56" alt="die"/> : <img src="/assets/dice-1.png" width="56" alt="die"/> )}</div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{fontSize:13, fontWeight:700}}>Player {cur} {cur===1? '🔵':'🔴'}</div>
            <div style={{marginTop:8}}>
              <button className="primary" onClick={handleRoll} disabled={rolling||moving}>Roll Dice</button>
              <button className="ghost" onClick={handleReset} style={{marginLeft:8}}>Reset</button>
            </div>
            <div style={{marginTop:6, fontSize:13}}>P1 Rolls: {r1}/10 • P2 Rolls: {r2}/10</div>
          </div>
        </div>
        <div className="status">{msg}</div>
        <div className="history"><strong>History</strong><ul style={{paddingLeft:12}}>{hist.map((h,i)=>(<li key={i} style={{marginTop:6}}>{h.note}</li>))}</ul></div>
        <div className="note">Tip: Snakes & ladders positions are randomized on each reload.</div>
      </div>
    </div>
  );
}
