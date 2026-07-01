import React, { useState, useEffect, useRef } from 'react';
import { sfxWin } from '../sounds';
import { isSetComplete } from '../utils';
import { COLOR_INFO, PLAYER_COLORS } from '../constants';
import { CardVisual } from './CardVisual';

function Fireworks() {
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const FW_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FF9F43', '#1DD1A1', '#FF6FB5', '#54A0FF'];
    const spawn = () => {
      const id = idRef.current++;
      const x = 10 + Math.random() * 80;
      const y = 20 + Math.random() * 40;
      const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
      const particles = Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 50 + Math.random() * 70;
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
      });
      setBursts(prev => [...prev, { id, x, y, color, particles }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1300);
    };

    spawn();
    const interval = setInterval(spawn, 550);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {bursts.map(b => (
        <div key={b.id} style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, color: b.color }}>
          <div className="fw-rocket" style={{ background: b.color, '--riseY': '-40px' }} />
          {b.particles.map((p, i) => (
            <div key={i} className="fw-particle" style={{ background: b.color, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Confetti() {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    const colors = ['#FFD700', '#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#5352ED', '#FFFFFF'];
    const interval = setInterval(() => {
      setPieces(prev => [...prev.slice(-40), {
        id: Math.random(),
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 10,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2
      }]);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return pieces.map(p => (
    <div key={p.id} className="confetti" style={{
      left: `${p.left}%`, backgroundColor: p.color, width: p.size, height: p.size / 2,
      animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`, zIndex: 1
    }} />
  ));
}

export function VictoryOverlay({ winnerName, myPlayerId, isHost, players, onReturnToLobby, onNewGame, onExit, history = [] }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const winner = players.find(p => p.name === winnerName);
  const winnerCompleteSets = winner ? Object.entries(winner.properties || {}).filter(([color, cards]) => isSetComplete(cards, color)) : [];

  const me = players.find(p => p.id === myPlayerId);
  const isMeWinner = me && me.name === winnerName;

  useEffect(() => { sfxWin(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) onReturnToLobby();
  }, [timeLeft, onReturnToLobby]);

  // En iyileri hesapla
  const maxRent = Math.max(...players.map(x => x.stats?.rentCollected || 0));
  const maxSteals = Math.max(...players.map(x => x.stats?.stealsPerformed || 0));
  const maxActions = Math.max(...players.map(x => x.stats?.actionsPlayed || 0));
  const maxCards = Math.max(...players.map(x => x.stats?.cardsDrawn || 0));

  const getPlayerBadges = (p) => {
    let badges = [];
    if (p.stats?.rentCollected > 0 && p.stats?.rentCollected === maxRent) {
      badges.push({ text: '💰 KİRA BARONU', bg: 'rgba(46, 204, 113, 0.15)', border: 'rgba(46, 204, 113, 0.3)', color: '#2ECC71' });
    }
    if (p.stats?.stealsPerformed > 0 && p.stats?.stealsPerformed === maxSteals) {
      badges.push({ text: '🥷 SİNSİ HIRSIZ', bg: 'rgba(155, 89, 182, 0.15)', border: 'rgba(155, 89, 182, 0.3)', color: '#9B59B6' });
    }
    if (p.stats?.actionsPlayed > 0 && p.stats?.actionsPlayed === maxActions) {
      badges.push({ text: '⚡ AKSİYON CANAVARI', bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.3)', color: '#E74C3C' });
    }
    if (p.stats?.cardsDrawn > 0 && p.stats?.cardsDrawn === maxCards) {
      badges.push({ text: '🃏 KART KOLİK', bg: 'rgba(52, 152, 219, 0.15)', border: 'rgba(52, 152, 219, 0.3)', color: '#3498DB' });
    }
    if (badges.length === 0) {
      badges.push({ text: '👏 SAYGIDEĞER OYUNCU', bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.15)', color: '#aaa' });
    }
    return badges;
  };

  const progressPercent = (timeLeft / 15) * 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: isMeWinner 
        ? 'radial-gradient(circle at center, rgba(30,15,55,0.96), rgba(8,4,16,0.99))'
        : 'radial-gradient(circle at center, rgba(40,12,12,0.96), rgba(8,4,8,0.99))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fw-fade-in 0.4s ease-out',
      overflowY: 'auto',
      padding: '20px 10px',
      boxSizing: 'border-box'
    }}>
      {isMeWinner ? (
        <>
          <Confetti />
          <Fireworks />
        </>
      ) : (
        <div className="defeat-shatter-lines" />
      )}

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '1080px',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '24px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), inset 0 0 20px rgba(255, 255, 255, 0.02)',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent'
      }}>
        {/* Banner Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px' }}>
          {isMeWinner ? (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)', padding: '6px 16px', borderRadius: '20px', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>👑</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#FFD700', letterSpacing: '2px', textTransform: 'uppercase' }}>Oyun Sonuçlandı</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 950, background: 'linear-gradient(135deg, #FFF 30%, #FFD700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 20px rgba(255,215,0,0.2)' }}>
                ZAFER {winnerName.toUpperCase()}'İN!
              </h1>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 16px', borderRadius: '20px', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>💀</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#f87171', letterSpacing: '2px', textTransform: 'uppercase' }}>BOZGUN</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 950, background: 'linear-gradient(135deg, #FFF 30%, #f87171 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 20px rgba(239,68,68,0.2)' }}>
                MAĞLUBİYET!
              </h1>
            </>
          )}
        </div>

        {/* İki Sütunlu İçerik */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Sol Kolon: Şampiyon Paneli */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '20px',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Parlayan Ring ve Kupa Simgesi */}
              <div style={{
                position: 'absolute', inset: '-12px', borderRadius: '50%',
                border: '3px dashed #FFD700',
                animation: 'spin 20s linear infinite',
                opacity: 0.6
              }} />
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winnerName}`} 
                alt="Winner Avatar" 
                style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', border: '4px solid #FFD700',
                  boxShadow: '0 0 35px rgba(255,215,0,0.5)', display: 'block'
                }} 
              />
              <div style={{
                position: 'absolute', bottom: '-8px', right: '-8px',
                background: '#FFD700', borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid #1a0f30',
                fontSize: '18px'
              }}>🏆</div>
            </div>

            <div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 900, color: '#FFD700' }}>{winnerName}</h2>
              <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #FFD700, #FFA502)', color: '#000', fontWeight: 900, fontSize: '10px', padding: '2px 8px', borderRadius: '6px', letterSpacing: '1px' }}>
                🥇 BİRİNCİ
              </div>
            </div>

            {winnerCompleteSets.length > 0 && (
              <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  🏆 Tamamlanmış Setler
                </h3>
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {winnerCompleteSets.map(([color, cards]) => (
                    <div key={color} style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1px solid ${COLOR_INFO[color]?.hex}aa`,
                      boxShadow: `0 4px 12px ${COLOR_INFO[color]?.hex}22`,
                      textAlign: 'center',
                      minWidth: '120px'
                    }}>
                      <div style={{ fontSize: '10px', color: COLOR_INFO[color]?.light || '#fff', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase' }}>
                        {COLOR_INFO[color]?.name || color}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {cards.map((c, i) => (
                          <div key={c.id} style={{
                            marginLeft: i > 0 ? -24 : 0,
                            zIndex: i,
                            position: 'relative',
                            transform: `rotate(${(i - (cards.length - 1) / 2) * 6}deg)`,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                          }}>
                            <CardVisual card={c} small />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sağ Kolon: Leaderboard & Detaylı İstatistikler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#aaa', letterSpacing: '1px' }}>LİDERLİK TABLOSU</span>
              <span style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>Detaylar için kaydırın</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {players.map((p, idx) => {
                const isWinner = p.name === winnerName;
                const playerCompleteSets = Object.entries(p.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length;
                const badges = getPlayerBadges(p);

                return (
                  <div key={p.id} style={{
                    background: isWinner ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isWinner ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: isWinner ? '0 4px 15px rgba(255,215,0,0.05)' : 'none'
                  }}>
                    {/* Oyuncu Üst Bilgi Satırı */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                          alt="avatar" 
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.3)', border: `2px solid ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}`
                          }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length], fontWeight: 900, fontSize: '15px' }}>
                            {p.name} {isWinner && '👑'}
                          </span>
                          {/* Rozetlerin Gösterimi */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                            {badges.map((b, bIdx) => (
                              <span key={bIdx} style={{
                                fontSize: '8px', fontWeight: 950, color: b.color,
                                background: b.bg, border: `1px solid ${b.border}`,
                                padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.5px'
                              }}>
                                {b.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.08)', color: '#FFD700', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '12px', fontWeight: 900 }}>
                          🏆 {playerCompleteSets} TAM SET
                        </span>
                      </div>
                    </div>

                    {/* İstatistikler Grid (Kompakt ve Şık Kartlar) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      background: 'rgba(0, 0, 0, 0.15)',
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Kira</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#2ECC71' }}>{p.stats?.rentCollected || 0}M</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Kasa</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#E2E8F0' }}>{p.stats?.totalMoneyBanked || 0}M</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Çekilen</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#3498DB' }}>{p.stats?.cardsDrawn || 0}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Oynanan</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#9B59B6' }}>{p.stats?.cardsPlayed || 0}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Aks.</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#E74C3C' }}>{p.stats?.actionsPlayed || 0}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Reddet</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#16A085' }}>{p.stats?.justSayNoCount || 0}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '8.5px', color: '#718096', marginBottom: '2px' }}>Çalma</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#F39C12' }}>{p.stats?.stealsPerformed || 0}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Match Analytics: Net Worth History SVG Chart */}
        {history && history.length > 1 && (() => {
          // Process history
          const turnsCount = history.length;
          let maxNW = 5;
          history.forEach(h => {
            h.players.forEach(p => {
              if (p.netWorth > maxNW) maxNW = p.netWorth;
            });
          });
          maxNW = Math.ceil(maxNW * 1.15); // Add a 15% top buffer

          const width = 600;
          const height = 240;
          const padding = { top: 25, right: 35, bottom: 35, left: 45 };
          const chartW = width - padding.left - padding.right;
          const chartH = height - padding.top - padding.bottom;

          // Render helper grids
          const gridRulers = [];
          const numGridLines = 5;
          for (let i = 0; i <= numGridLines; i++) {
            const val = Math.round((maxNW / numGridLines) * i);
            const y = padding.top + (1 - (val / maxNW)) * chartH;
            gridRulers.push({ val, y });
          }

          return (
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              padding: '20px 24px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, color: '#FFD700', fontSize: '15px', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 SERVET GELİŞİM GRAFİĞİ (MATCH ANALYTICS)
                </h3>
                <span style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>Her tur sonundaki toplam servet (Banka + Arazi)</span>
              </div>

              {/* Chart SVG */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block', overflow: 'visible' }}>
                  {/* Definition for glows */}
                  <defs>
                    <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {gridRulers.map((r, i) => (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={r.y}
                        x2={width - padding.right}
                        y2={r.y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padding.left - 10}
                        y={r.y + 4}
                        fill="rgba(255,255,255,0.4)"
                        fontSize="9.5"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        {r.val}M
                      </text>
                    </g>
                  ))}

                  {/* X-Axis Labels (Turns) */}
                  {history.map((h, idx) => {
                    const x = padding.left + (idx / (turnsCount - 1 || 1)) * chartW;
                    return (
                      <g key={idx}>
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={height - padding.bottom}
                          stroke="rgba(255,255,255,0.03)"
                        />
                        <text
                          x={x}
                          y={height - padding.bottom + 16}
                          fill="rgba(255,255,255,0.4)"
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          T{h.turn}
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Lines and Data Points for each player */}
                  {players.map((player, pIdx) => {
                    const playerColor = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
                    
                    // Filter history points for this specific player ID
                    const playerPts = history.map((h, turnIdx) => {
                      const found = h.players.find(hp => hp.id === player.id || hp.name === player.name);
                      const nwVal = found ? found.netWorth : 0;
                      const x = padding.left + (turnIdx / (turnsCount - 1 || 1)) * chartW;
                      const y = padding.top + (1 - (nwVal / maxNW)) * chartH;
                      return { x, y, val: nwVal, turn: h.turn };
                    });

                    // Build line points attribute
                    const polyPoints = playerPts.map(pt => `${pt.x},${pt.y}`).join(' ');

                    return (
                      <g key={player.id}>
                        {/* Shadow/Glow Line */}
                        <polyline
                          points={polyPoints}
                          fill="none"
                          stroke={playerColor}
                          strokeWidth="5"
                          opacity="0.15"
                          filter="url(#glow-effect)"
                        />
                        {/* Main Line */}
                        <polyline
                          points={polyPoints}
                          fill="none"
                          stroke={playerColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Data Point Circles */}
                        {playerPts.map((pt, ptIdx) => (
                          <g key={ptIdx} className="chart-dot-group">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="4.5"
                              fill="#160e29"
                              stroke={playerColor}
                              strokeWidth="2.5"
                              style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                            />
                            <title>{`${player.name} - Tur ${pt.turn}: ${pt.val}M`}</title>
                          </g>
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                {players.map((player, pIdx) => (
                  <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: PLAYER_COLORS[pIdx % PLAYER_COLORS.length], borderRadius: '2px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ccc' }}>{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer Butonlar ve Sayaç */}
        <div style={{
          marginTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Aksiyon Butonları */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <button 
              onClick={onReturnToLobby} 
              style={{
                padding: '12px 24px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '13px',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              🚪 Lobiye Dön
            </button>

            {isHost && (
              <button 
                onClick={onNewGame} 
                style={{
                  padding: '12px 24px', background: 'linear-gradient(135deg, #27AE60, #2ECC71)',
                  border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer',
                  fontWeight: 900, fontSize: '13px', boxShadow: '0 4px 15px rgba(46,204,113,0.3)',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(46,204,113,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(46,204,113,0.3)'; }}
              >
                🔄 Yeni Oyun Başlat
              </button>
            )}

            <button 
              onClick={onExit} 
              style={{
                padding: '12px 24px', background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)', color: '#E74C3C',
                borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '13px',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)'; }}
            >
              ❌ Çık
            </button>
          </div>

          {/* İlerleme Çubuğu ve Geri Sayım */}
          <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#718096', fontWeight: 800, letterSpacing: '1px', marginBottom: '8px' }}>
              ⏳ LOBİYE GERİ DÖNÜLÜYOR: {timeLeft} SANİYE
            </div>
            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`, height: '100%',
                background: 'linear-gradient(90deg, #FFD700, #FF7675)',
                transition: 'width 1s linear'
              }} />
            </div>
            {!isHost && (
              <div style={{ color: '#4a4a5a', fontSize: '10px', marginTop: '8px', fontWeight: 600 }}>
                Host yeni oyunu başlatabilir veya lobiye yönlendirilmesini bekleyebilirsiniz.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dönebilen çerçeve için spin CSS animasyonu */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}