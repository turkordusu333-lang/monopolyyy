import React from 'react';
import { COLOR_INFO, SET_SIZES, PLAYER_COLORS } from '../constants';
import { isSetComplete, getCardTotalCount } from '../utils';

export function CardRentPanel({ previewCard, gameState }) {
  const color = previewCard.activeColor || previewCard.color;
  if (!color || color === 'all') return null;

  const owner = gameState.players.find(p => Object.values(p.properties || {}).flat().some(c => c.id === previewCard.id));
  const propsInColor = owner?.properties[color] || [];
  const count = propsInColor.length;
  const goal = SET_SIZES[color];
  const isComplete = isSetComplete(propsInColor, color);

  const colorMeta = COLOR_INFO[color];
  let currentRent = 0;
  if (colorMeta && count > 0) {
    currentRent = colorMeta.rents[Math.min(count, colorMeta.rents.length) - 1];
    const b = owner?.buildings?.[color];
    if (b && isComplete) {
      if (b.houses > 0) currentRent += 3;
      if (b.hotel) currentRent += 4;
    }
  }

  const others = gameState.players.filter(p => p.id !== owner?.id && p.properties?.[color]?.length > 0);

  return (
    <>
      <div style={{ marginTop: 4, color: isComplete ? '#2ECC71' : '#fff' }}>
        🏘️ <b>Set Durumu:</b> {count} / {goal} {isComplete ? '✓' : ''}
      </div>
      {owner && (
        <div className="preview-rent-box">
          <span>🧾 Mevcut Kira:</span>
          <b style={{ color: '#2ECC71', fontSize: 15 }}>{currentRent}M</b>
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        👥 <b style={{ color: '#aaa' }}>DİĞER SAHİPLER:</b>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {others.length > 0 ? others.map(p => (
            <span key={p.id} className="owner-tag" style={{ borderLeft: `3px solid ${PLAYER_COLORS[gameState.players.findIndex(x => x.id === p.id) % PLAYER_COLORS.length]}` }}>
              {p.name} ({p.properties?.[color]?.length || 0})
            </span>
          )) : <span style={{ color: '#555' }}>Piyasada başka yok</span>}
        </div> 
      </div>
    </>
  );
}

export function CardProbabilityPanel({ previewCard, gameState, playerId }) {
  const keyBase = (previewCard.key.startsWith('dual_') || previewCard.key.startsWith('wild_')) ? previewCard.key.split('_').slice(0, -1).join('_') : previewCard.key;
  const total = getCardTotalCount(previewCard.key);
  let visible = 0;
  gameState.players.forEach(p => {
    visible += (p.bank || []).filter(c => c.key.startsWith(keyBase)).length;
    Object.values(p.properties || {}).flat().forEach(c => { if (c.key.startsWith(keyBase)) visible++; });
    if (p.id === playerId) visible += (p.hand || []).filter(c => c.key.startsWith(keyBase)).length;
  });
  visible += (gameState.discard || []).filter(c => c.key.startsWith(keyBase)).length;
  const rem = Math.max(0, total - visible);
  const unknownCardsCount = gameState.deckCount + gameState.players.filter(p => p.id !== playerId).reduce((s, p) => s + p.handCount, 0);
  const probability = unknownCardsCount > 0 ? ((rem / unknownCardsCount) * 100).toFixed(1) : 0;
  return (
    <div style={{ marginTop: 10, fontSize: 11, color: '#ccc', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)' }}>
       <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 14 }}>🎯</span><b style={{ color: '#FFD700', letterSpacing: 0.5 }}>İHTİMAL ANALİZİ</b></div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>Destedeki Toplam Adet:</span> <b>{total}</b></div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>Kalan Tahmini:</span> <b>{rem}</b></div>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.1)' }}><span>Çekme İhtimali:</span><b style={{ color: probability >= 20 ? '#2ECC71' : probability >= 5 ? '#F39C12' : '#E74C3C', fontSize: 16, textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>%{probability}</b></div>
    </div>
  );
}