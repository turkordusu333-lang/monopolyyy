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
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
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
      animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`
    }} />
  ));
}

function StatRow({ label, value, icon, color = "#fff" }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ color: '#aaa', fontSize: 13 }}>{icon} {label}</div>
      <div style={{ color, fontWeight: 800, fontSize: 14 }}>{value}</div>
    </div>
  );
}

export function VictoryOverlay({ winnerName, isHost, players, onReturnToLobby, onNewGame, onExit }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const winner = players.find(p => p.name === winnerName);
  const winnerCompleteSets = winner ? Object.entries(winner.properties || {}).filter(([color, cards]) => isSetComplete(cards, color)) : [];

  useEffect(() => { sfxWin(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) onReturnToLobby();
  }, [timeLeft, onReturnToLobby]);

  // En iyileri hesapla (Başarımlar/Unvanlar için)
  const maxRent = Math.max(...players.map(x => x.stats?.rentCollected || 0));
  const maxSteals = Math.max(...players.map(x => x.stats?.stealsPerformed || 0));
  const maxActions = Math.max(...players.map(x => x.stats?.actionsPlayed || 0));
  const maxCards = Math.max(...players.map(x => x.stats?.cardsDrawn || 0));

  const getPlayerTitles = (p) => {
    let titles = [];
    if (p.stats?.rentCollected > 0 && p.stats?.rentCollected === maxRent) titles.push('💰 Kira Baronu');
    if (p.stats?.stealsPerformed > 0 && p.stats?.stealsPerformed === maxSteals) titles.push('🥷 Sinsi Hırsız');
    if (p.stats?.actionsPlayed > 0 && p.stats?.actionsPlayed === maxActions) titles.push('⚡ Aksiyon Canavarı');
    if (p.stats?.cardsDrawn > 0 && p.stats?.cardsDrawn === maxCards) titles.push('🃏 Kart Kolik');
    return titles.length > 0 ? titles.join(' • ') : '👏 Saygıdeğer Oyuncu';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'radial-gradient(ellipse at center, rgba(40,20,60,0.92), rgba(10,5,20,0.97))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      animation: 'fw-fade-in 0.4s ease-out',
    }}>
      <Confetti />
      <Fireworks />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
        
        {/* Kazananın Avatarı */}
        <img 
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winnerName}`} 
          alt="Winner Avatar" 
          style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: '4px solid #FFD700', boxShadow: '0 0 25px rgba(255,215,0,0.6)', marginBottom: 16 }} 
        />
        
        <div style={{ fontSize: 16, color: '#aaa', marginBottom: 4, letterSpacing: 2 }}>OYUN BİTTİ</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#FFD700', marginBottom: 24, textShadow: '0 2px 12px rgba(255,215,0,0.5)' }}>
          {winnerName} KAZANDI!
        </div>

        {winnerCompleteSets.length > 0 && (
          <div style={{ marginBottom: 24, animation: 'fw-fade-in 1s ease-out' }}>
            <div style={{ color: '#FFD700', fontWeight: 900, marginBottom: 16, letterSpacing: 2, fontSize: 16, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>ŞAMPİYONUN SETLERİ</div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {winnerCompleteSets.map(([color, cards]) => (
                <div key={color} className="champion-set-wrapper" style={{ background: 'rgba(0,0,0,0.4)', padding: '16px 20px', borderRadius: 16, border: `2px solid ${COLOR_INFO[color]?.hex || '#fff'}`, boxShadow: `0 0 25px ${COLOR_INFO[color]?.hex}88`, '--glow-color': `${COLOR_INFO[color]?.hex}CC` }}>
                  <div style={{ fontSize: 13, color: COLOR_INFO[color]?.light || '#fff', fontWeight: 900, marginBottom: 12, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {COLOR_INFO[color]?.name || color}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '0 10px' }}>
                    {cards.map((c, i) => (
                      <div key={c.id} style={{ marginLeft: i > 0 ? -40 : 0, zIndex: i, position: 'relative', transform: `rotate(${(i - (cards.length - 1) / 2) * 8}deg)`, transition: 'transform 0.2s', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' }}>
                        <CardVisual card={c} small />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#aaa', marginBottom: 12, textAlign: 'center', letterSpacing: 2 }}>OYUN ÖZETİ</div>
          {players.map((p, idx) => (
            <div key={p.id} style={{ marginBottom: 20 }}>
              <div style={{ color: PLAYER_COLORS[idx % PLAYER_COLORS.length], fontWeight: 900, fontSize: 15, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Oyuncunun Mini Avatarı */}
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                    alt="avatar" 
                    style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: `2px solid ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}` }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{p.name} {p.name === winnerName && '🏆'}</span>
                    <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>{getPlayerTitles(p)}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                  {Object.entries(p.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length} SET
                </span>
              </div>
              <div style={{ paddingLeft: 10 }}>
                <StatRow icon="💰" label="Toplam Tahsilat" value={`${p.stats?.rentCollected || 0}M`} color="#2ECC71" />
                <StatRow icon="🏦" label="Kasaya Koyulan" value={`${p.stats?.totalMoneyBanked || 0}M`} />
                <StatRow icon="🎴" label="Çekilen Kart" value={p.stats?.cardsDrawn || 0} />
                <StatRow icon="⚡" label="Oynanan Aksiyon" value={p.stats?.actionsPlayed || 0} color="#E74C3C" />
                <StatRow icon="🫳" label="Çalınan Arazi" value={p.stats?.stealsPerformed || 0} color="#F39C12" />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onReturnToLobby} style={{ padding: '12px 22px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🚪 Lobiye Dön</button>
          {isHost && <button onClick={onNewGame} style={{ padding: '12px 22px', background: '#27AE60', border: 'none', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🔄 Yeni Oyun Başlat</button>}
          <button onClick={onExit} style={{ padding: '12px 22px', background: '#E74C3C', border: 'none', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>❌ Çık</button>
        </div>
        <div style={{ color: '#aaa', fontSize: 13, marginTop: 16, fontWeight: 'bold' }}>⏳ {timeLeft} saniye içinde lobiye dönülecek...</div>
        {!isHost && <div style={{ color: '#666', fontSize: 11, marginTop: 12 }}>Host yeni oyunu başlatabilir</div>}
      </div>
    </div>
  );
}