import React from 'react';
import { COLOR_INFO, SET_SIZES } from '../constants';
import { isSetComplete } from '../utils';
import { CardVisual } from './CardVisual';

export function PropertySet({ color, cards, buildings, isOwn, onFlip, onHoverCard }) {
  const info = COLOR_INFO[color];
  const setSize = SET_SIZES[color] || 1;
  const isComplete = isSetComplete(cards, color);
  const b = buildings?.[color];

  return (
    <div className={isOwn && isComplete ? "complete-set-glow" : ""} style={{ background: `${info?.hex}22`, border: `2px solid ${isComplete ? info?.hex : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: 6, marginBottom: 4, minWidth: 96, flex: isOwn ? '1 1 140px' : 'none', '--glow-color': info?.hex }}>
      <div style={{ fontSize: 9, color: info?.light || '#ccc', fontWeight: 700, marginBottom: 4 }}>{info?.name || color} ({cards.length}/{setSize}){isComplete && ' ✓'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {cards.map((card, idx) => (
          <div key={card.id} className={isOwn ? "stacked-card-wrapper" : ""} style={{ position: 'relative', zIndex: idx }}>
            <CardVisual card={card} small onHover={onHoverCard} />
            {isOwn && onFlip && (card.isDual || card.isWild) && (
              <button onClick={() => onFlip(card)} title="Rengi değiştir" style={{ display: 'block', width: '100%', marginTop: 2, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 9, borderRadius: 4, cursor: 'pointer', padding: '2px 0' }}>🔄 Çevir</button>
            )}
          </div>
        ))}
      </div>
      {isComplete && b && (<div style={{ marginTop: 4, fontSize: 9, color: '#FFD700' }}>{b.hotel ? '🏨 Otel' : b.houses > 0 ? `\u{1F3E0} x${b.houses}` : ''}</div>)}
    </div>
  );
}