import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// 7 ladders (bottom->top) and 7 snakes (head->tail)
const JUMPS = {
  4:14, 9:31, 21:42, 28:84, 51:67, 63:81, 72:91,  // ladders
  99:78, 92:54, 85:43, 70:40, 62:19, 48:26, 36:6  // snakes
};
const CELL = 52; const GAP=2;

function rollDie(){ return Math.floor(Math.random()*6)+1; }
function indexToCoord(idx){ const i = idx-1; const rowFromBottom=Math.floor(i/10); const row=9-rowFromBottom; const colInRow=i%10; const left=((rowFromBottom%2===0)? colInRow:(9-colInRow))*(CELL+GAP)+CELL/2+10; const top=(row)*(CELL+GAP)+CELL/2+10; return {left, top}; }

function getKey(player){ return `rolls-p${player}-${new Date().toISOString().slice(0,10)}`; }
function getRollCount(player){ return parseInt(localStorage.getItem(getKey(player))||'0',10); }
function incrementRollCount(player){ const c=getRollCount(player)+1; localStorage.setItem(getKey(player),c); return c; }

export default function Home(){
  const [started,setStarted]=useState(false);
  const [p1,setP1]=useState(1);
  const [p2,setP2]=useState(1);
  const [die,setDie]=useState(null);
  const [rolling,setRolling]=useState(false);
  const [moving,setMoving]=useState(false);
  const [msg,setMsg]=useState('Welcome to Snakes & Ladders!');
  const [hist,setHist]=useState([]);
  const [r1,setR1]=useState(0);
  const [r2,setR2]=useState(0);
  const [cur,setCur]=useState(1);

  useEffect(()=>{ setR1(getRollCount(1)); setR2(getRollCount(2)); (async()=>{ try{ await sdk.actions.ready(); }catch(e){} })(); },[]);

  const animateSteps = async (steps, player)=>{
    setMoving(true);
    for(let s=0;s<steps;s++){
      await new Promise(res=>setTimeout(res,300));
      if(player===1) setP1(p=>p+1); else setP2(p=>p+1);
    }
    setMoving(false);
  };

  const handleRoll= async ()=>{
    const player=cur;
    const rolls=player===1?r1:r2;
    if(rolls>=10){ setMsg(`❌ Player ${player} daily limit reached.`); return; }
    setRolling(true); setDie('rolling'); await new Promise(r=>setTimeout(r,900));
    const d=rollDie(); setDie(d);
    const newCount=incrementRollCount(player); if(player===1) setR1(newCount); else setR2(newCount);
    const pos=player===1?p1:p2; const target=pos+d;
    if(target>100){ setMsg(`Player ${player} rolled ${d}, need exact roll.`); setRolling(false); return; }
    await animateSteps(d,player);
    setMsg(`Player ${player} rolled ${d}. Reached ${target}.`);
    if(JUMPS[target]){
      const dest=JUMPS[target]; const isL=dest>target;
      setHist(h=>[{note:`Player ${player} ${isL?'climbed':'slid'} from ${target} to ${dest}`} ,...h].slice(0,20));
      if(!isL){ // snake
        setMsg(`🐍 Player ${player} got eaten by a snake! Down to ${dest}`);
      } else {
        setMsg(`🪜 Player ${player} climbs ladder to ${dest}`);
      }
      await new Promise(r=>setTimeout(r,400));
      const diff=Math.abs(dest-target); await animateSteps(diff,player);
    }
    const finalPos=player===1?p1:p2;
    if(finalPos===100){ setMsg(`🎉 Player ${player} wins!`); setRolling(false); return; }
    setCur(player===1?2:1); setRolling(false);
  };

  const handleReset=()=>{ setP1(1); setP2(1); setDie(null); setHist([]); setMsg('Game reset.'); setCur(1); localStorage.removeItem(getKey(1)); localStorage.removeItem(getKey(2)); setR1(0); setR2(0); };

  // prepare board cells
  const cells=[]; for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ const idx=(9-r)*10+(((9-r)%2===0)?c+1:10-c); const alt=((r+c)%2===0); cells.push({idx,alt}); } }

  const p1Coord=indexToCoord(p1); const p2Coord=indexToCoord(p2);

  return (
    <div className="container">
      <div className="board-wrap card">
        <div style={{fontWeight:700, marginBottom:8}}>Snakes & Ladders</div>
        <div style={{position:'relative', width:540, padding:10}}>
          <div className="board">
            {cells.map(cell=>(
              <div key={cell.idx} className={"cell "+(cell.alt? 'alt':'')}>
                <div className="idx">{cell.idx}</div>
                {(JUMPS[cell.idx] && JUMPS[cell.idx]>cell.idx)&& <img src="/assets/ladder-modern.png" style={{position:'absolute', right:4, bottom:4, width:28}}/>}
                {(JUMPS[cell.idx] && JUMPS[cell.idx]<cell.idx)&& <img src="/assets/snake-modern.png" style={{position:'absolute', right:4, bottom:4, width:28}}/>}
              </div>
            ))}
          </div>
          <img src="/assets/pawn-blue.png" className="pawn" style={{left:p1Coord.left, top:p1Coord.top, filter:cur===1?'drop-shadow(0 8px 16px rgba(59,130,246,0.25))':''}} alt="p1"/>
          <img src="/assets/pawn-red.png" className="pawn" style={{left:p2Coord.left, top:p2Coord.top, filter:cur===2?'drop-shadow(0 8px 16px rgba(239,68,68,0.25))':''}} alt="p2"/>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'#64748b'}}>Status</div>
            <div style={{fontWeight:700}}> {msg} </div>
          </div>
          <div>
            <div style={{textAlign:'right', fontSize:12}}>Rolls left</div>
            <div style={{fontWeight:700}}>P1: {10-r1} | P2: {10-r2}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div className="dice" style={{width:72, height:72}}>
            {die==='rolling'?<img src="/assets/dice-rolling.gif" width="72" alt="rolling"/>:(typeof die==='number'?<img src={`/assets/dice-${die}.png`} width="72" alt="die"/>:<img src="/assets/dice-1.png" width="72" alt="die"/>)}
          </div>
          <div>
            <div style={{fontSize:12,color:'#64748b'}}>Current Turn</div>
            <div style={{fontWeight:800, marginTop:6}}>Player {cur} {cur===1?'🔵':'🔴'}</div>
            <div style={{marginTop:8}}>
              <button onClick={handleRoll} disabled={rolling||moving} style={{marginRight:8}}>Roll Dice</button>
              <button onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:12, color:'#64748b'}}>History</div>
        <ul className="history-list">
          {hist.map((h,i)=>(<li key={i} style={{padding:'6px 0', borderBottom:'1px dashed #eef2f6'}}>{h.note}</li>))}
        </ul>
      </div>

      <div className="card footer-note">
        <div>Note: Each player has 10 rolls per day.</div>
      </div>
    </div>
  );
}
