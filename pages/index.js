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

export default function Home() {
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(1);
  const [die, setDie] = useState(null);
  const [message, setMessage] = useState('Welcome to Snakes & Ladders!');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try { await sdk.actions.ready(); } catch (err) { console.warn(err); }
    })();
  }, []);

  const handleRoll = () => {
    const d = rollDie(); setDie(d);
    let next = position + d; let moveDesc = `You rolled ${d}. `;
    if (next > 100) { moveDesc += `Need exact roll to reach 100.`; setMessage(moveDesc); return; }
    if (JUMPS[next]) {
      const dest = JUMPS[next]; const isLadder = dest > next;
      moveDesc += isLadder ? `Ladder! Up to ${dest}.` : `Snake! Down to ${dest}.`; next = dest;
    } else { moveDesc += `Move to ${next}.`; }
    setPosition(next); setMessage(moveDesc);
    setHistory(h => [{ note: moveDesc }, ...h].slice(0,10));
    if (next === 100) setMessage('🎉 You reached 100. You win!');
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
      <button onClick={handleRoll}>Roll Dice</button>
      <button onClick={handleReset} style={{ marginLeft: 10 }}>Reset</button>
      <div style={{marginTop:10}}>Current: {position} | Last roll: {die ?? '-'}</div>
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
          return (
            <div key={`${row}-${c}`} style={{
              border: '1px solid #ddd',
              background: isHere ? '#fffae6' : '#fff',
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontSize: 12
            }}>
              <div style={{ position: 'absolute', left: 6, top: 6 }}>{idx}</div>
              <div>{isHere ? '🐍🟢' : ''}</div>
              {jump && (
                <div style={{ position: 'absolute', right: 6, bottom: 6, fontSize: 11 }}>{jump > idx ? `↑ ${jump}` : `↓ ${jump}`}</div>
              )}
            </div>
          );
        })
      ))}
    </div>
  );
}