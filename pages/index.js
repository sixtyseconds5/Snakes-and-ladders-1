import React, { useEffect, useState, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

const JUMPS = {4:14,9:31,17:7,20:38,28:84,40:59,51:67,54:34,62:19,63:81,64:60,71:91,87:24,93:73,95:75,99:78};
const CELL = 52; const GAP=2; const BOARD_SIZE=520;

function rollDie(){ return Math.floor(Math.random()*6)+1; }
function indexToCoord(idx){ // returns {left, top} center coord in px
  const i = idx-1;
  const rowFromBottom = Math.floor(i/10);
  const row = 9 - rowFromBottom;
  const colInRow = i % 10;
  const left = ( ( (rowFromBottom%2===0) ? colInRow : (9 - colInRow) ) )*(CELL+GAP) + CELL/2 + 10; // + padding
  const top = (row)*(CELL+GAP) + CELL/2 + 10;
  return {left, top};
}

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
  const pawn1Ref = useRef(); const pawn2Ref = useRef();

  useEffect(()=>{ setR1(getRollCount(1)); setR2(getRollCount(2)); (async()=>{ try{ await sdk.actions.ready(); }catch(e){} })(); },[]);

  const animateSteps = async (steps, player)=>{
    setMoving(true);
    for(let s=0;s<steps;s++){
      await new Promise(res=>{
        setTimeout(()=>{
          if(player===1) setP1(p=>p+1); else setP2(p=>p+1);
          res();
        }, 300);
      });
    }
    setMoving(false);
  };

  const handleRoll= async ()=>{
    const player = cur;
    const rolls = player===1? r1: r2;
    if(rolls>=10){ setMsg(`❌ Player ${player} daily limit reached.`); return; }
    setRolling(true); setDie('rolling');
    // spin effect
    await new Promise(r=>setTimeout(r,900));
    const d = rollDie(); setDie(d);
    const newCount = incrementRollCount(player); if(player===1) setR1(newCount); else setR2(newCount);
    const pos = player===1? p1: p2;
    const target = pos + d;
    if(target>100){ setMsg(`Player ${player} rolled ${d}, need exact roll.`); setRolling(false); return; }
    await animateSteps(d, player);
    setMsg(`Player ${player} rolled ${d}. Reached ${target}.`);
    // check jump
    if(JUMPS[target]){
      const dest = JUMPS[target];
      const isL = dest>target;
      // visual feedback
      const tileAnim = isL? 'flash-up':'flash-down';
      // add history note
      setHist(h=>[{note:`Player ${player} ${isL? 'climbed':'slid'} from ${target} to ${dest}`}, ...h].slice(0,20));
      // small delay then animate to dest step-by-step
      await new Promise(r=>setTimeout(r,400));
      const diff = Math.abs(dest-target);
      await animateSteps(diff, player);
      setMsg(isL? `Player ${player} climbed to ${dest}` : `Player ${player} slid to ${dest}`);
    } else {
      setHist(h=>[{note:`Player ${player} rolled ${d} to ${target}`}, ...h].slice(0,20));
    }
    // check win
    const finalPos = player===1? p1: p2;
    if(finalPos===100){ setMsg(`🎉 Player ${player} wins!`); setRolling(false); return; }
    setCur(player===1? 2:1);
    setRolling(false);
  };

  const handleReset=()=>{ setP1(1); setP2(1); setDie(null); setHist([]); setMsg('Game reset. Good luck!'); setCur(1); localStorage.removeItem(getKey(1)); localStorage.removeItem(getKey(2)); setR1(0); setR2(0); };

  // board rendering - cells
  const cells = [];
  for(let r=0;r<10;r++){
    for(let c=0;c<10;c++){
      const idx = (9-r)*10 + ( ( (9-r)%2===0) ? c+1 : 10-c );
      const alt = ((r+c)%2===0);
      cells.push({idx,alt});
    }
  }

  const p1Coord = indexToCoord(p1);
  const p2Coord = indexToCoord(p2);

  return (
    <div className="container">
      <div className="board-wrap card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <div style={{fontWeight:700}}>Snakes & Ladders</div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <div className="status-badge">Turn: Player {cur}</div>
          </div>
        </div>
        <div style={{position:'relative', width:540, padding:10}}>
          <div className="board" style={{padding:0}}>
            {cells.map(cell=>(
              <div key={cell.idx} className={"cell "+(cell.alt? 'alt':'')}>
                <div className="idx">{cell.idx}</div>
                { (JUMPS[cell.idx] && JUMPS[cell.idx] > cell.idx) && <img src="/assets/ladder.png" style={{position:'absolute', right:4, bottom:4, width:28}}/> }
                { (JUMPS[cell.idx] && JUMPS[cell.idx] < cell.idx) && <img src="/assets/snake.png" style={{position:'absolute', right:4, bottom:4, width:28}}/> }
              </div>
            ))}
          </div>

          {/* Pawns absolute positioned */}
          <img src="/assets/pawn-blue.png" ref={pawn1Ref} className="pawn" style={{left: p1Coord.left, top: p1Coord.top, filter: cur===1? 'drop-shadow(0 8px 16px rgba(59,130,246,0.25))':''}} alt="p1"/>
          <img src="/assets/pawn-red.png" ref={pawn2Ref} className="pawn" style={{left: p2Coord.left, top: p2Coord.top, filter: cur===2? 'drop-shadow(0 8px 16px rgba(239,68,68,0.25))':''}} alt="p2"/>
        </div>
      </div>

      <div className="sidebar">
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize:12, color:'#64748b'}}>Status</div>
              <div style={{fontWeight:700}}> {msg} </div>
            </div>
            <div>
              <div style={{textAlign:'right', fontSize:12}}>Rolls left</div>
              <div style={{fontWeight:700}}>{10 - r1} / {10 - r2}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div className="dice" style={{width:72, height:72}}>
              {die==='rolling' ? <img src="/assets/dice-rolling.gif" width="72" alt="rolling"/> : (typeof die==='number' ? <img src={`/assets/dice-${die}.png`} width="72" alt="die"/> : <img src="/assets/dice-1.png" width="72" alt="die"/> )}
            </div>
            <div>
              <div style={{fontSize:12,color:'#64748b'}}>Current Turn</div>
              <div style={{fontWeight:800, marginTop:6}}>Player {cur} {cur===1? '🔵':'🔴'}</div>
              <div style={{marginTop:8}}>
                <button onClick={handleRoll} disabled={rolling || moving} style={{marginRight:8}}>Roll Dice</button>
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
          <div style={{marginTop:6}}>Deploy to Farcaster and share the page to let others play.</div>
        </div>
      </div>
    </div>
  );
}
