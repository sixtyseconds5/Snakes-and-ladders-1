
import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

const JUMPS = { 4:14, 9:31, 28:84, 70:40, 62:19, 99:78 };
const VISUAL_JUMPS = [
  {start:4,end:14,type:'ladder'}, {start:9,end:31,type:'ladder'}, {start:28,end:84,type:'ladder'},
  {start:70,end:40,type:'snake'}, {start:62,end:19,type:'snake'}, {start:99,end:78,type:'snake'}
];

function rollDie(){ return Math.floor(Math.random()*6)+1; }
function indexToPercent(idx){ const i=idx-1; const rowFromBottom=Math.floor(i/10); const row=9-rowFromBottom; const col=i%10; const colInRow=(rowFromBottom%2===0)?col:(9-col); return {left:(colInRow+0.5)*10, top:(row+0.5)*10}; }
function makeCurvePoints(s,e,steps=12){ let pts=[]; const dx=e.left-s.left, dy=e.top-s.top; for(let t=0;t<=1;t+=1/steps){ let x=(1-t)*(1-t)*s.left+2*(1-t)*t*((s.left+e.left)/2+dy*0.15)+t*t*e.left; let y=(1-t)*(1-t)*s.top+2*(1-t)*t*((s.top+e.top)/2-dx*0.15)+t*t*e.top; pts.push({left:x,top:y}); } return pts; }

export default function Home(){
  const [p1,setP1]=useState(1), [p2,setP2]=useState(1);
  const [cur,setCur]=useState(1), [die,setDie]=useState(null);
  const [msg,setMsg]=useState('Welcome!'), [hist,setHist]=useState([]);
  const [moving,setMoving]=useState(false), [rolling,setRolling]=useState(false);

  useEffect(()=>{ (async()=>{ try{ await sdk.actions.ready(); }catch(e){} })(); },[]);

  const animateSteps = async (steps, player)=>{ setMoving(true); for(let s=0;s<steps;s++){ await new Promise(r=>setTimeout(r,300)); if(player===1) setP1(p=>p+1); else setP2(p=>p+1);} setMoving(false); };
  const animateJump = async (from,to,type,player)=>{ const s=indexToPercent(from), e=indexToPercent(to); const pts = type==='snake'? makeCurvePoints(s,e,15):[s,e]; setMoving(true); for(let i=0;i<pts.length;i++){ await new Promise(r=>setTimeout(r,200)); if(player===1) setP1(to); else setP2(to);} setMoving(false); };

  const handleRoll = async ()=>{ if(moving) return; setRolling(true); await new Promise(r=>setTimeout(r,500)); const d=rollDie(); setDie(d); const pos=cur===1?p1:p2; let target=pos+d; if(target>100){ setMsg('Need exact roll'); setRolling(false); return;} await animateSteps(d,cur); if(JUMPS[target]){ const dest=JUMPS[target]; await animateJump(target,dest,dest>target?'ladder':'snake',cur); setMsg(dest>target?'🪜 climbed':'🐍 bitten'); setHist([{note:`Player ${cur} ${dest>target?'up':'down'} to ${dest}`},...hist]); if(cur===1) setP1(dest); else setP2(dest);} if((cur===1?p1:p2)===100) setMsg(`🎉 Player ${cur} wins!`); setCur(cur===1?2:1); setRolling(false); };

  const p1coord=indexToPercent(p1), p2coord=indexToPercent(p2);
  const cells=[]; for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ const idx=(9-r)*10+(((9-r)%2===0)?c+1:10-c); cells.push({idx,cls:['c0','c1','c2','c3','c4','c5'][(r+c)%6]}); } }

  return <div className="page"><div className="title">Snakes & Ladders</div><div className="board-wrap"><div className="board">{cells.map(cell=><div key={cell.idx} className={`cell ${cell.cls}`}><div className="idx">{cell.idx}</div></div>)}<svg className="svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">{VISUAL_JUMPS.map((j,i)=>{const s=indexToPercent(j.start), e=indexToPercent(j.end); if(j.type==='snake'){const path=`M${s.left},${s.top} Q${(s.left+e.left)/2+10},${(s.top+e.top)/2-10} ${e.left},${e.top}`; return <path key={i} d={path} className="snake-path"/>;} else {return <g key={i}><line x1={s.left} y1={s.top-1} x2={e.left} y2={e.top-1} className="ladder-rail"/><line x1={s.left} y1={s.top+1} x2={e.left} y2={e.top+1} className="ladder-rail"/>{Array.from({length:5}).map((_,k)=><line key={k} x1={s.left+(e.left-s.left)*(k/6)} y1={s.top+(e.top-s.top)*(k/6)} x2={s.left+(e.left-s.left)*(k/6)} y2={s.top+(e.top-s.top)*(k/6)} className="ladder-rung"/> )}</g>;}})}</svg><img src="/assets/pawn-blue.png" className="pawn" style={{left:p1coord.left+'%',top:p1coord.top+'%'}}/><img src="/assets/pawn-red.png" className="pawn" style={{left:p2coord.left+'%',top:p2coord.top+'%'}}/></div></div><div className="controls"><div className="dice">{die?<img src={`/assets/dice-${die}.png`} width="48"/>:'🎲'}</div><button onClick={handleRoll} disabled={rolling}>Roll Dice</button><div className="status">{msg}</div><div className="history">{hist.map((h,i)=><div key={i}>{h.note}</div>)}</div></div></div>;
}
