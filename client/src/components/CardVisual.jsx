import React, { useState, useEffect, useContext } from 'react';
import { COLOR_INFO, ACTION_STYLE } from '../constants';
import { getCardImageSrc } from '../utils';
import { ThemeContext } from '../ThemeContext';

export function CardVisual({ card, selected, onClick, small, dimmed, onHover, isRentPlayable, comboClass }) {
  const { themeId, manifest } = useContext(ThemeContext);
  const imgSrc = getCardImageSrc(themeId, card?.key);
  const [imgFailed, setImgFailed] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => { setImgFailed(false); }, [imgSrc]);

  const handleClick = () => {
    if (!onClick) return;
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    onClick();
  };

  if (!card) return null;
  const isAction = card.type === 'action';
  const isMoney = card.type === 'money';
  const isProp = card.type === 'property';

  const displayName = manifest?.names?.[card.key] || card.name;

  const activeColor = isProp && card.activeColor ? COLOR_INFO[card.activeColor] : null;
  const baseColor = isProp && card.color ? COLOR_INFO[card.color] : null;

  const dualColors = isProp && card.isDual ? card.colors.map(c => COLOR_INFO[c]).filter(Boolean) : null;
  const isFullWild = isProp && card.isWild;

  // Kartın "Nadir" (Holografik) olup olmadığını belirle
  const isRare = isFullWild || (isAction && card.action === 'dealbreaker');

  const actionStyle = isAction ? (ACTION_STYLE[card.action] || { icon: '⚡', bg: 'linear-gradient(135deg, #F39C12, #D68910)' }) : null;

  const getBg = () => {
    if (isMoney) return 'linear-gradient(135deg, #2ECC71, #196F3D)';
    if (isAction) return actionStyle.bg;
    if (isFullWild) return 'linear-gradient(135deg, #8E44AD 0%, #E74C3C 25%, #F39C12 50%, #16A085 75%, #2980B9 100%)';
    if (dualColors && dualColors.length === 2) {
      return `linear-gradient(135deg, ${dualColors[0].hex} 0%, ${dualColors[0].hex} 45%, ${dualColors[1].hex} 55%, ${dualColors[1].hex} 100%)`;
    }
    if (activeColor) return `linear-gradient(135deg, ${activeColor.hex}, ${activeColor.light})`;
    if (baseColor) return `linear-gradient(135deg, ${baseColor.hex}, ${baseColor.light})`;
    return 'linear-gradient(135deg, #95A5A6, #7F8C8D)';
  };
  
  const scale = window.innerWidth < 768 ? 1.25 : 1.5;

  const w = (small ? 68 : 132) * scale;
  const h = (small ? 96 : 192) * scale;

  let typeBadge = null;
  if (isMoney) typeBadge = { icon: '💵', label: 'PARA', bg: 'rgba(0,0,0,0.35)' };
  else if (isAction) typeBadge = { icon: actionStyle.icon, label: 'AKSİYON', bg: 'rgba(0,0,0,0.35)' };
  else if (isFullWild) typeBadge = { icon: '🃏', label: 'TAM JOKER', bg: 'rgba(0,0,0,0.5)' };
  else if (dualColors) typeBadge = { icon: '🔀', label: 'ÇİFT RENK', bg: 'rgba(0,0,0,0.35)' };
  else if (isProp) typeBadge = { icon: '🏠', label: 'ARAZİ', bg: 'rgba(0,0,0,0.35)' };

  const showImage = !!imgSrc && !imgFailed;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(card)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`${shaking ? "card-shake" : ""} ${isRentPlayable ? "rent-glow" : ""} ${isRare ? "holo-wrapper" : ""} ${comboClass || ""}`}
      style={{
        width: w, height: h,
        background: showImage ? '#222' : getBg(),
        borderRadius: 8,
        border: selected ? '3px solid #FFD700' : (isFullWild ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.35)'),
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: 0,
        opacity: dimmed ? 0.5 : 1,
        transform: selected ? 'translateY(-12px)' : 'none',
        transition: 'all 0.2s',
        boxShadow: selected ? '0 8px 20px rgba(255,215,0,0.6)' : '0 3px 8px rgba(0,0,0,0.4)',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {showImage && (
        <>
          <img src={imgSrc} alt={displayName} onError={() => setImgFailed(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {typeBadge && (
            <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(0,0,0,0.55)', borderRadius: 5, width: small ? 20 : 26, height: small ? 20 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 11 : 15, lineHeight: 1 }}>
              {typeBadge.icon}
            </div>
          )}
          {(isMoney || isProp || isAction) && (
            <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.65)', color: '#FFD700', fontWeight: 900, fontSize: small ? 12 : 16, padding: '2px 6px', borderRadius: 5, lineHeight: 1.2 }}>
              {card.value}M
            </div>
          )}
          {!small && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', color: '#fff', fontSize: 10.5, fontWeight: 700, textAlign: 'center', padding: '16px 4px 5px', lineHeight: 1.2 }}>
              {displayName}
            </div>
          )}
        </>
      )}
      {!showImage && (
      <>
      {typeBadge && (
        <div style={{ width: '100%', background: typeBadge.bg, color: '#fff', fontSize: small ? 8 : 9.5, fontWeight: 900, letterSpacing: 0.5, padding: '2px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <span style={{ fontSize: small ? 11 : 13 }}>{typeBadge.icon}</span>
          {!small && <span>{typeBadge.label}</span>}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 4px', width: '100%' }}>
        {isMoney && (<div style={{ fontSize: small ? 26 : 36, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{card.value}M</div>)}
        {isProp && (
          <>
            <div style={{ fontSize: small ? 10 : 13.5, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1, textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginBottom: 2, width: '100%', wordBreak: 'break-word' }}>{displayName}</div>
            {!isFullWild && baseColor?.rents && (
              <div style={{ marginTop: small ? 2 : 4, width: '95%', background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: small ? '2px 4px' : '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {baseColor.rents.map((r, i) => (<div key={i} style={{ fontSize: small ? 8.5 : 11, display: 'flex', justifyContent: 'space-between', color: manifest?.colors?.rentText || baseColor.light || 'rgba(255,255,255,0.9)' }}><span>{i + 1}{small ? '' : ' Kart'}:</span> <span>{r}M</span></div>))}
              </div>
            )}
            {dualColors && (
              <div style={{ display: 'flex', gap: 3, marginTop: 4, alignItems: 'center' }}>
                {dualColors.map((c, i) => (<React.Fragment key={i}><span style={{ fontSize: small ? 7 : 8.5, fontWeight: 800, color: '#fff', background: c.hex, padding: '1px 4px', borderRadius: 3, border: card.activeColor === card.colors[i] ? '1px solid #FFD700' : 'none' }}>{c.name}</span>{i === 0 && <span style={{ color: '#fff', fontSize: 9 }}>/</span>}</React.Fragment>))}
              </div>
            )}
            {isFullWild && (<div style={{ fontSize: small ? 8 : 9.5, color: '#FFD700', fontWeight: 900, marginTop: 4, textAlign: 'center' }}>TÜM RENKLER İÇİN<br/>KULLANILABİLİR</div>)}
            <div style={{ fontSize: small ? 15 : 20, fontWeight: 900, color: '#fff', marginTop: 'auto', paddingTop: 4, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{isFullWild ? '' : `${card.value}M`}</div>
          </>
        )}
        {isAction && (
          <>
            <div style={{ fontSize: small ? 30 : 42, lineHeight: 1, marginBottom: 2 }}>{actionStyle.icon}</div>
            <div style={{ fontSize: small ? 11.5 : 16, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{displayName}</div>
            {!small && (<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.95)', textAlign: 'center', marginTop: 6, lineHeight: 1.3, padding: '0 8px', overflowY: 'auto', maxHeight: '65px' }}>{card.description}</div>)}
            <div style={{ fontSize: small ? 16 : 22, fontWeight: 900, color: '#FFD700', marginTop: 'auto', paddingTop: 4, textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{card.value}M</div>
          </>
        )}
      </div>
      </>
      )}
      {isRare && <div className="holo-foil" />}
    </div>
  );
}