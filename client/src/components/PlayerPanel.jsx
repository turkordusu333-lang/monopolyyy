import React from 'react';
import { isSetComplete } from '../utils';
import { COLOR_INFO, SET_SIZES } from '../constants';
import { AnimatedCounter } from '../AnimatedCounter';

const getPropTotalValue = (player) => {
  let sum = 0;
  if (player.properties) {
    Object.values(player.properties).forEach(cards => {
      cards.forEach(c => {
        sum += (c.value || 0);
      });
    });
  }
  return sum;
};

const MicroProp = ({ color, cards, buildings, onHoverCard }) => {
  const goal = SET_SIZES[color] || 1;
  const isComplete = isSetComplete(cards, color);
  const info = COLOR_INFO[color] || { hex: '#aaa', light: '#ccc', rents: [0] };
  
  // Auto Rent Preview Calculation
  const count = Math.min(cards.length, goal);
  let rentVal = (info.rents && info.rents[count - 1]) || 0;
  if (isComplete && buildings && buildings[color]) {
    if (buildings[color].houses > 0) rentVal += buildings[color].houses * 3;
    if (buildings[color].hotel) rentVal += 4;
  }

  return (
    <div className="micro-prop-tag" style={{ 
      borderColor: isComplete ? info.hex : 'rgba(255,255,255,0.1)',
      background: isComplete ? `linear-gradient(135deg, ${info.hex}33, rgba(0,0,0,0.45))` : 'rgba(0,0,0,0.25)',
      boxShadow: isComplete ? `0 0 8px ${info.hex}44` : 'none',
      padding: '4px 6px',
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: info.hex }} />
      {/* Auto Rent Preview Badge */}
      <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.4)', padding: '1px 4px', borderRadius: 4, color: '#2ecc71', fontWeight: '900', border: '1px solid rgba(46,204,113,0.15)', marginRight: 2 }} title="Güncel Kira Bedeli">
        🧾 {rentVal}M
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {cards.map(c => {
          let cardClass = '';
          if (c.isWild) cardClass = 'is-wild';
          else if (c.isDual) cardClass = 'is-dual';
          return (
            <div key={c.id} className={`micro-card-dot ${cardClass} ${isComplete ? 'is-complete' : ''}`}
                 onMouseEnter={() => onHoverCard && onHoverCard(c)}
                 onMouseLeave={() => onHoverCard && onHoverCard(null)}
                 style={{ 
                   width: 16,
                   height: 22,
                   backgroundColor: '#FFFFFF',
                   border: isComplete ? `1px solid ${info.hex}` : '1px solid rgba(0,0,0,0.15)',
                   borderRadius: 3,
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'flex-start',
                   alignItems: 'center',
                   overflow: 'hidden',
                   position: 'relative',
                   cursor: 'pointer'
                 }}>
               {/* Color stripe at top */}
               <div style={{
                 width: '100%',
                 height: 4,
                 background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : info.hex,
                 flexShrink: 0
               }} />
               {/* Value stamp inside tiny card */}
               <div style={{
                 fontSize: 8,
                 fontWeight: 900,
                 color: '#333',
                 lineHeight: 1,
                 marginTop: 2,
                 transform: 'scale(0.85)'
               }}>
                 {c.isWild ? '★' : (c.value || '')}
               </div>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, goal - cards.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="micro-card-dot is-empty" style={{ 
            width: 16,
            height: 22,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: `1.2px dashed ${info.hex}77`,
            borderRadius: 3,
            boxSizing: 'border-box'
          }} />
        ))}
      </div>
      {(buildings?.[color]?.houses > 0 || buildings?.[color]?.hotel) && (
        <div style={{ display: 'flex', marginLeft: 2, gap: 1 }}>
          {buildings?.[color]?.houses > 0 && <span style={{ fontSize: 9 }}>🏠</span>}
          {buildings?.[color]?.hotel && <span style={{ fontSize: 9 }}>🏨</span>}
        </div>
      )}
    </div>
  );
};

export const PlayerPanel = React.forwardRef(({ player, isMe, isCurrent, onSelectTarget, onHoverCard, playerColor = '#aaa', emotes = [] }, ref) => {
  const completeSets = Object.entries(player.properties || {}).filter(([color, cards]) => {
    return isSetComplete(cards, color);
  }).length;

  const propTotalValue = getPropTotalValue(player);
  const netWorth = player.bankTotal + propTotalValue;

  // Mülkleri "Tam Setler" ve "Eksik Setler" olarak ikiye ayıralım
  const completeProps = [];
  const incompleteProps = [];
  Object.entries(player.properties || {}).forEach(([color, cards]) => {
    if (cards.length === 0) return;
    if (isSetComplete(cards, color)) completeProps.push([color, cards]);
    else incompleteProps.push([color, cards]);
  });

  return (
    <div ref={ref} className={`player-panel ${isCurrent ? 'spotlight-glow' : ''}`} style={{
      background: isCurrent ? `linear-gradient(135deg, ${playerColor}22, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)',
      border: isCurrent ? `2px solid ${playerColor}` : `1px solid ${playerColor}55`,
      boxShadow: isCurrent ? `0 0 15px ${playerColor}44` : 'none',
      borderRadius: 12, padding: 12, marginBottom: 10, cursor: !isMe ? 'pointer' : 'default',
      transition: 'all 0.3s ease', position: 'relative',
      '--player-color': playerColor
    }} onClick={() => !isMe && onSelectTarget && onSelectTarget(player.id)}>
      
      {/* Emojileri Render Et */}
      {emotes.map(emote => (
        <div key={emote.id} className="floating-emote">{emote.emoji}</div>
      ))}
 
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: `1px solid ${playerColor}33`, paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCurrent && <span className="hourglass-anim" style={{ fontSize: 14 }}>⏳</span>}
          {player.isAFK && <span title="AFK / Uyuyor" style={{ fontSize: 16 }}>💤</span>}
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor, boxShadow: `0 0 8px ${playerColor}` }} />
          <span style={{ color: playerColor, fontWeight: 800, fontSize: 14, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{player.name}</span>
          {isMe && <span style={{ fontSize: 10, color: '#fff', background: playerColor, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>SEN</span>}
          {player.hasJustSayNo && isMe && <span className="shield-badge">🛡️ Kalkan Aktif</span>}
          {player.connected === false && <span style={{ fontSize: 10, color: '#f44' }}>● Çevrimdışı</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#ddd', fontWeight: 'bold', alignItems: 'center' }}>
          {/* Net Worth Tracker Badge */}
          <span title={`Toplam Servet: ${netWorth}M (Banka: ${player.bankTotal}M + Mülkler: ${propTotalValue}M)`} style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.25)', padding: '2px 6px', borderRadius: 6, color: '#FFD700', fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            💎 {netWorth}M
          </span>
          <span title="Banka" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            💰 <AnimatedCounter value={player.bankTotal} />M
          </span>
          <span title="Eldeki Kartlar">🃏 {player.handCount}</span>
          <span title="Tam Setler" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: completeSets > 0 ? '#FFD700' : '#ddd' }}>
            🏘️ {'★'.repeat(completeSets)}{'☆'.repeat(Math.max(0, 3 - completeSets))}
          </span>
        </div>
      </div>

      {!isMe ? (
        <div className="micro-prop-container">
           <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', color: '#aaa', marginBottom: 6 }}>
         <span>🏦 Bankada <b>{player.bank?.length || 0}</b> kart var</span>
           </div>
           {completeProps.length > 0 && (
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6, background: 'rgba(255,215,0,0.05)', padding: 6, borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)' }}>
               <div style={{ width: '100%', fontSize: 9, color: '#FFD700', letterSpacing: 1, marginBottom: 2 }}>TAMAMLANMIŞ SETLER</div>
               {completeProps.map(([color, cards]) => <MicroProp key={color} color={color} cards={cards} buildings={player.buildings} onHoverCard={onHoverCard} />)}
             </div>
           )}
           {incompleteProps.length > 0 && (
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
               {incompleteProps.map(([color, cards]) => <MicroProp key={color} color={color} cards={cards} buildings={player.buildings} onHoverCard={onHoverCard} />)}
             </div>
           )}
           <div style={{ fontSize: 10, color: playerColor, marginTop: 8, textAlign: 'right', opacity: 0.8, fontStyle: 'italic' }}>Tüm kartları görmek için tıkla</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Kendi arazilerini orta panelden yönetebilirsin.</div>
      )}
    </div>
  );
});