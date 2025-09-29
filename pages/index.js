
import React, {useEffect,useState} from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// mapping: 3 ladders and 3 snakes (as in image-style)
const JUMPS = {
  4:14, 9:31, 28:84,   // ladders (example positions)
  70:40, 62:19, 99:78  // snakes (example positions)
};

// visual jump list for long images (start->end)
const VISUAL_JUMPS = [
  {start:4, end:14, type:'ladder'},
  {start:9, end:31, type:'ladder'},
  {start:28, end:84, type:'ladder'},
  {start:70, end:40, type:'snake'},
  {start:62, end:19, type:'snake'},
  {start:99, end:78, type:'snake'}
];

function rollDie(){ return Math.floor(Math.random()*6)+1; }

// return percent center coordinates (left%, top%)
function indexToPercent(idx){
  const i = idx-1;
  const rowFromBottom = Math.floor(i/10);
  const row = 9 - rowFromBottom;
  const col = i % 10;
  const colInRow = (rowFromBottom % 2 === 0) ? col : (9 - col);
  const left = (colInRow + 0.5) * 10; // percent
  const top = (row + 0.5) * 10;
  return {left, top};
}

function getKey(p){ return `rolls-p${p}-${new Date().toISOString().slice(0,10)}`; }
function getRollCount(p){ return parseInt(localStorage.getItem(getKey(p))||'0',10); }
function incrementRollCount(p){ const c=getRollCount(p)+1; localStorage.setItem(getKey(p),c); return c; }

export default function Home(){
  const [started,setStarted]=useState(false);
  const [p1,setP1]=useState(1);
  const [p2,setP2]=useState(1);
  const [die,setDie]=useState(null);
  const [rolling,setRolling]=useState(false);
  const [moving,setMoving]=useState(false);
  const [msg,setMsg]=useState('Welcome — mobile-ready Snakes & Ladders!');
  const [hist,setHist]=useState([]);
  const [r1,setR1]=useState(0);
  const [r2,setR2]=useState(0);
  const [cur,setCur]=useState(1);

  useEffect(()=>{
    setR1(getRollCount(1)); setR2(getRollCount(2));
    (async()=>{ try{ await sdk.actions.ready(); }catch(e){} })();
  },[]);

  const animateSteps = async (steps, player)=>{
    setMoving(true);
    for(let s=0;s<steps;s++){
      await new Promise(res=>setTimeout(res,300));
      if(player===1) setP1(p=>p+1); else setP2(p=>p+1);
    }
    setMoving(false);
  };

  const handleRoll = async ()=>{
    const player = cur;
    const rolls = player===1? r1: r2;
    if(rolls>=10){ setMsg(`❌ Player ${player} daily limit reached.`); return; }
    setRolling(true); setDie('rolling');
    await new Promise(r=>setTimeout(r,900));
    const d = rollDie(); setDie(d);
    const newCount = incrementRollCount(player); if(player===1) setR1(newCount); else setR2(newCount);
    const pos = player===1? p1: p2;
    const target = pos + d;
    if(target>100){ setMsg(`Player ${player} rolled ${d}, need exact roll.`); setRolling(false); return; }
    await animateSteps(d, player);
    setMsg(`Player ${player} rolled ${d}. Reached ${target}.`);
    if(JUMPS[target]){
      const dest = JUMPS[target]; const isL = dest > target;
      setHist(h=>[{note:`Player ${player} ${isL? 'climbed':'slid'} from ${target} to ${dest}`}, ...h].slice(0,20));
      if(isL){ setMsg(`🪜 Player ${player} climbs to ${dest}`); }
      else { setMsg(`🐍 Player ${player} got bitten! Down to ${dest}`); }
      await new Promise(r=>setTimeout(r,400));
      const diff = Math.abs(dest - target);
      await animateSteps(diff, player);
    } else {
      setHist(h=>[{note:`Player ${player} rolled ${d} to ${target}`}, ...h].slice(0,20));
    }
    const finalPos = player===1? p1: p2;
    if(finalPos===100){ setMsg(`🎉 Player ${player} wins!`); setRolling(false); return; }
    setCur(player===1?2:1); setRolling(false);
  };

  const handleReset = ()=>{
    setP1(1); setP2(1); setDie(null); setHist([]); setMsg('Game reset.'); setCur(1);
    localStorage.removeItem(getKey(1)); localStorage.removeItem(getKey(2)); setR1(0); setR2(0);
  };

  // prepare cells array - left-to-right top-to-bottom visually
  const cells = [];
  for(let r=0;r<10;r++){
    for(let c=0;c<10;c++){
      const idx = (9-r)*10 + (((9-r)%2===0)? c+1 : 10-c);
      // color pattern: choose color classes to create the look
      const colors = ['c0','c1','c2','c3','c4','c5'];
      const cls = colors[(r+c)%colors.length];
      cells.push({idx, cls});
    }
  }

  const p1coord = indexToPercent(p1);
  const p2coord = indexToPercent(p2);

  return (
    <div className="page">
      <div className="title">Snakes & Ladders</div>
      <div className="board-wrap">
        <div className="board">
          {cells.map(cell=>(
            <div key={cell.idx} className={`cell ${cell.cls}`}>
              <div className="idx">{cell.idx}</div>
              {/* little markers for jumps in corner */}
              { (JUMPS[cell.idx] && JUMPS[cell.idx] > cell.idx) && <div style={{position:'absolute', right:6, bottom:6, fontSize:10}}>🪜</div> }
              { (JUMPS[cell.idx] && JUMPS[cell.idx] < cell.idx) && <div style={{position:'absolute', right:6, bottom:6, fontSize:10}}>🐍</div> }
            </div>
          ))}
          {/* render long snake/ladder images positioned between start and end using percent coords */}
          {VISUAL_JUMPS.map((j,i)=>{
            const s = indexToPercent(j.start);
            const e = indexToPercent(j.end);
            const dx = e.left - s.left;
            const dy = e.top - s.top;
            const angle = Math.atan2(dy,dx) * 180 / Math.PI;
            const distancePercent = Math.sqrt(dx*dx + dy*dy); // in percent units
            const widthPercent = Math.max(12, distancePercent); // ensure visible
            const left = (s.left + e.left)/2 - widthPercent/2;
            const top = (s.top + e.top)/2 - 3;
            const src = j.type==='snake' ? '/assets/snake-curve.png' : '/assets/ladder-long.png';
            return (<img key={'v'+i} src={src} className={j.type==='snake'?'snake-img':'ladder-img'} style={{left: left+'%', top: top+'%', width: widthPercent+'%', height:'6%',
            transform:`rotate(${angle}deg)`, transformOrigin:'center center'}}/>)
          })}

          {/* pawns positioned by percent coordinates */}
          <img src="/assets/pawn-blue.png" className="pawn" style={{left: p1coord.left+'%', top: p1coord.top+'%'}} alt="p1"/>
          <img src="/assets/pawn-red.png" className="pawn" style={{left: p2coord.left+'%', top: p2coord.top+'%'}} alt="p2"/>
        </div>
      </div>

      <div className="controls">
        <div className="row">
          <div className="dice">{die==='rolling'? <img src="/assets/dice-rolling.gif" width="56" alt="rolling"/> : (typeof die==='number'? <img src={'/assets/dice-'+die+'.png'} width="56" alt="die"/> : <img src="/assets/dice-1.png" width="56" alt="die"/> )}</div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
            <div style={{fontSize:13, fontWeight:700}}>Player {cur} {cur===1? '🔵':'🔴'}</div>
            <div>
              <button onClick={handleRoll} disabled={rolling||moving}>Roll Dice</button>
              <button className="secondary" onClick={handleReset} style={{marginLeft:8}}>Reset</button>
            </div>
            <div style={{marginTop:6, fontSize:13}}>P1 Rolls: {r1}/10 • P2 Rolls: {r2}/10</div>
          </div>
        </div>
        <div className="status">{msg}</div>
        <div className="history"><strong>History</strong><ul style={{paddingLeft:12}}>{hist.map((h,i)=>(<li key={i} style={{marginTop:6}}>{h.note}</li>))}</ul></div>
        <div className="note">Tip: This version is mobile-first — board will fit your phone screen.</div>
      </div>
    </div>
  );
}
