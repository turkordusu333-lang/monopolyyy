import React from 'react';
import { isSetComplete } from '../utils';
import { COLOR_INFO, SET_SIZES } from '../constants';
import { AnimatedCounter } from '../AnimatedCounter';

const MicroProp = ({ color, cards, buildings, onHoverCard }) => {
  const goal = SET_SIZES[color] || 1;
  const isComplete = isSetComplete(cards, color);
  const info = COLOR_INFO[color];
  return (
    <div className="micro-prop-tag" style={{ 
      borderColor: isComplete ? info.hex : 'rgba(255,255,255,0.1)',
      background: isComplete ? `linear-gradient(135deg, ${info.hex}44, rgba(0,0,0,0.4))` : 'rgba(0,0,0,0.2)',
      boxShadow: isComplete ? `0 0 8px ${info.hex}66` : 'none',
      padding: '4px 6px'
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.hex }} />
      <div style={{ display: 'flex', gap: 1 }}>
        {cards.map(c => {
          let cardClass = '';
          if (c.isWild) cardClass = 'is-wild';
          else if (c.isDual) cardClass = 'is-dual';
          return (
            <div key={c.id} className={`micro-card-dot ${cardClass} ${isComplete ? 'is-complete' : ''}`}
                 onMouseEnter={() => onHoverCard && onHoverCard(c)}
                 onMouseLeave={() => onHoverCard && onHoverCard(null)}
                 style={{ backgroundColor: isComplete ? info.hex : 'rgba(255,255,255,0.15)', borderColor: isComplete ? info.light : info.hex, color: info.hex }}>
               {c.isWild && '🌟'}
               {c.isDual && '🌗'}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, goal - cards.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="micro-card-dot is-empty" style={{ borderColor: `${info.hex}88` }} />
        ))}
      </div>
      {(buildings?.[color]?.houses > 0 || buildings?.[color]?.hotel) && (
        <div style={{ display: 'flex', marginLeft: 2 }}>
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

  // Mülkleri "Tam Setler" ve "Eksik Setler" olarak ikiye ayıralım
  const completeProps = [];
  const incompleteProps = [];
  Object.entries(player.properties || {}).forEach(([color, cards]) => {
    if (cards.length === 0) return;
    if (isSetComplete(cards, color)) completeProps.push([color, cards]);
    else incompleteProps.push([color, cards]);
  });

  return (
    <div ref={ref} className="player-panel" style={{
      background: isCurrent ? `linear-gradient(135deg, ${playerColor}22, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)',
      border: isCurrent ? `2px solid ${playerColor}` : `1px solid ${playerColor}55`,
      boxShadow: isCurrent ? `0 0 15px ${playerColor}44` : 'none',
      borderRadius: 12, padding: 12, marginBottom: 10, cursor: !isMe ? 'pointer' : 'default',
      transition: 'all 0.3s ease', position: 'relative'
    }} onClick={() => !isMe && onSelectTarget && onSelectTarget(player.id)}>
      
      {/* Emojileri Render Et */}
      {emotes.map(emote => (
        <div key={emote.id} className="emote-bubble">{emote.emoji}</div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: `1px solid ${playerColor}33`, paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCurrent && <span className="hourglass-anim" style={{ fontSize: 14 }}>⏳</span>}
          {player.isAFK && <span title="AFK / Uyuyor" style={{ fontSize: 16 }}>💤</span>}
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor, boxShadow: `0 0 8px ${playerColor}` }} />
          <span style={{ color: playerColor, fontWeight: 800, fontSize: 14, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{player.name}</span>
          {isMe && <span style={{ fontSize: 10, color: '#fff', background: playerColor, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>SEN</span>}
          {player.connected === false && <span style={{ fontSize: 10, color: '#f44' }}>● Çevrimdışı</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#ddd', fontWeight: 'bold' }}>
          <span title="Banka" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            💰 <AnimatedCounter value={player.bankTotal} />M
          </span>
          <span title="Eldeki Kartlar">🃏 {player.handCount}</span>
          <span title="Tam Setler" style={{ color: completeSets > 0 ? '#2ECC71' : '#ddd' }}>🏘️ {completeSets}/3</span>
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