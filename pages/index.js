import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

const JUMPS = {
  4: 14, 9: 31, 17: 7, 20: 38, 28: 84,
  40: 59, 51: 67, 54: 34, 62: 19, 63: 81,
  64: 60, 71: 91, 87: 24, 93: 73, 95: 75, 99: 78
};

function rollDie() { return Math.floor(Math.random() * 6) + 1; }
function coordToIndex(row, col) {
  const rowFromBottom = 9 - row;
  const leftToRight = (rowFromBottom % 2 === 0);
  const base = rowFromBottom * 10;
  return leftToRight ? base + col + 1 : base + (10 - col);
}

const todayKey = `rolls-${new Date().toISOString().slice(0,10)}`;
function getRollCount() { return parseInt(localStorage.getItem(todayKey) || "0", 10); }
function incrementRollCount() { const c = getRollCount() + 1; localStorage.setItem(todayKey, c); return c; }

export default function Home() {
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(1);
  const [die, setDie] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState('Welcome to Snakes & Ladders!');
  const [history, setHistory] = useState([]);
  const [rollCount, setRollCount] = useState(0);

  useEffect(() => {
    setRollCount(getRollCount());
    (async () => { try { await sdk.actions.ready(); } catch (e) {} })();
  }, []);

  const handleRoll = () => {
    if (rollCount >= 10) {
      setMessage("❌ Daily limit reached. You can only roll 10 times per day.");
      return;
    }
    setRolling(true);
    setDie("rolling");
    setTimeout(() => {
      const d = rollDie();
      setDie(d);
      const newCount = incrementRollCount();
      setRollCount(newCount);
      let next = position + d; let moveDesc = `You rolled ${d}. `;
      if (next > 100) { moveDesc += `Need exact roll to reach 100.`; setMessage(moveDesc); setRolling(false); return; }
      if (JUMPS[next]) {
        const dest = JUMPS[next]; const isLadder = dest > next;
        moveDesc += isLadder ? `Ladder! Up to ${dest}.` : `Snake! Down to ${dest}.`; next = dest;
      } else { moveDesc += `Move to ${next}.`; }
      setPosition(next); setMessage(moveDesc);
      setHistory(h => [{ note: moveDesc }, ...h].slice(0,10));
      if (next === 100) setMessage('🎉 You reached 100. You win!');
      setRolling(false);
    }, 1000);
  };

  const handleReset = () => {
    setPosition(1); setDie(null); setHistory([]);
    setMessage('Game reset. Good luck!');
  };

  if (!started) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', padding: 40, textAlign: 'center' }}>
        <img src="/splash.png" alt="Splash" style={{ maxWidth: '80%', marginBottom: 20 }} />
        <h1>Snakes & Ladders</h1>
        <p>Classic board game inside Farcaster</p>
        <button onClick={() => setStarted(true)} style={{ fontSize: 18, padding: '12px 24px', borderRadius: 8 }}>▶ Play</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 20 }}>
      <h1>Snakes & Ladders</h1>
      <p>{message}</p>
      <button onClick={handleRoll} disabled={rollCount>=10 || rolling}>
        Roll Dice ({Math.max(0,10-rollCount)} left today)
      </button>
      <button onClick={handleReset} style={{ marginLeft: 10 }}>Reset</button>

      <div style={{marginTop:10}}>Current: {position} | Last roll: {die ?? '-'}</div>
      <div style={{marginTop:10}}>
        {die==="rolling" && <img src="/assets/dice-rolling.gif" alt="Rolling..." width="64"/>}
        {typeof die==="number" && <img src={`/assets/dice-${die}.png`} alt={`Dice ${die}`} width="64"/>}
      </div>

      <h3>Last moves</h3>
      <ul>{history.map((h,i)=><li key={i}>{h.note}</li>)}</ul>
      <Board position={position}/>
    </div>
  );
}

function Board({ position }) {
  const rows = Array.from({ length: 10 }, (_, r) => r);
  return (
    <div style={{ width: 520, height: 520, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, marginTop: 20 }}>
      {rows.map(row => (
        Array.from({ length: 10 }, (_, c) => {
          const idx = coordToIndex(row, c);
          const isHere = idx === position;
          const jump = JUMPS[idx];
          const isLadder = jump && jump > idx;
          const isSnake = jump && jump < idx;
          const bg = (row+c)%2===0 ? '#cdeac0' : '#fff';
          return (
            <div key={`${row}-${c}`} style={{
              border: '1px solid #ddd',
              background: bg,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontSize: 12
            }}>
              <div style={{ position: 'absolute', left: 4, top: 2, fontSize: 10 }}>{idx}</div>
              {isHere && <div style={{ fontSize: 18 }}>🔵</div>}
              {isSnake && <img src="/assets/snake.png" alt="snake" style={{position:'absolute', width:20, bottom:2, right:2}}/>}
              {isLadder && <img src="/assets/ladder.png" alt="ladder" style={{position:'absolute', width:20, bottom:2, right:2}}/>}
            </div>
          );
        })
      ))}
    </div>
  );
}