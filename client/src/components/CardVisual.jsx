import React, { useState, useEffect, useContext } from 'react';
import { COLOR_INFO, ACTION_STYLE } from '../constants';
import { getCardImageSrc } from '../utils';
import { ThemeContext } from '../ThemeContext';

const MONEY_COLORS = {
  1: { bg: '#EAFAF1', border: '#2ECC71', text: '#1E8449' },
  2: { bg: '#FEF9E7', border: '#F4D03F', text: '#B7950B' },
  3: { bg: '#EBF5FB', border: '#5DADE2', text: '#21618C' },
  4: { bg: '#E8F8F5', border: '#48C9B0', text: '#117864' },
  5: { bg: '#F5EEF8', border: '#AF7AC5', text: '#6C3483' },
  10: { bg: '#FDEDEC', border: '#EC7063', text: '#922B21' }
};

const ACTION_COLORS = {
  passgo: '#3498DB',
  dealbreaker: '#8E44AD',
  justsayno: '#E74C3C',
  birthday: '#E91E8C',
  rent: '#16A085',
  doublerent: '#D35400',
  slydeal: '#F39C12',
  forceddeal: '#F39C12',
  debtcollector: '#F39C12',
  house: '#27AE60',
  hotel: '#1E8449'
};

export function CardVisual({ card, selected, onClick, small, dimmed, onHover, usable, comboClass }) {
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

  const isRare = isFullWild || (isAction && card.action === 'dealbreaker');
  const actionStyle = isAction ? (ACTION_STYLE[card.action] || { icon: '⚡', bg: 'linear-gradient(135deg, #F39C12, #D68910)' }) : null;

  const scale = window.innerWidth < 768 ? 0.85 : 1.5;
  const w = (small ? 68 : 132) * scale;
  const h = (small ? 96 : 192) * scale;

  let typeBadge = null;
  if (isMoney) typeBadge = { icon: '💵', label: 'PARA', bg: 'rgba(0,0,0,0.35)' };
  else if (isAction) typeBadge = { icon: actionStyle.icon, label: 'AKSİYON', bg: 'rgba(0,0,0,0.35)' };
  else if (isFullWild) typeBadge = { icon: '🃏', label: 'TAM JOKER', bg: 'rgba(0,0,0,0.5)' };
  else if (dualColors) typeBadge = { icon: '🔀', label: 'ÇİFT RENK', bg: 'rgba(0,0,0,0.35)' };
  else if (isProp) typeBadge = { icon: '🏠', label: 'ARAZİ', bg: 'rgba(0,0,0,0.35)' };

  const showImage = !!imgSrc && !imgFailed;

  const getCardBg = () => {
    if (showImage) return '#222';
    if (isMoney) return MONEY_COLORS[card.value]?.bg || '#F8F9F9';
    return '#FFFFFF';
  };

  const getHeaderBg = () => {
    if (isFullWild) return 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB, #8E44AD)';
    if (dualColors && dualColors.length === 2) {
      return `linear-gradient(90deg, ${dualColors[0].hex} 0%, ${dualColors[0].hex} 50%, ${dualColors[1].hex} 50%, ${dualColors[1].hex} 100%)`;
    }
    if (activeColor) return activeColor.hex;
    if (baseColor) return baseColor.hex;
    if (isAction) return ACTION_COLORS[card.action] || '#F39C12';
    return '#95A5A6';
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(card)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`${shaking ? "card-shake" : ""} ${usable ? "usable-card" : ""} ${isRare ? "holo-wrapper" : ""} ${comboClass || ""}`}
      style={{
        width: w, height: h,
        background: getCardBg(),
        borderRadius: 12,
        border: selected ? '3px solid #FFD700' : (isFullWild ? '2px solid #FFD700' : '1px solid rgba(0,0,0,0.12)'),
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: 0,
        opacity: dimmed ? 0.5 : 1,
        transform: selected ? 'translateY(-12px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: selected ? '0 12px 25px rgba(255,215,0,0.6)' : '0 4px 12px rgba(0,0,0,0.18)',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {showImage ? (
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
      ) : (
        <>
          {/* Card Header */}
          {(isProp || isAction) && (
            <div style={{
              width: '100%',
              height: small ? 22 : 36,
              background: getHeaderBg(),
              display: 'flex',
              alignItems: 'center',
              padding: small ? '0 4px' : '0 8px',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              justifyContent: 'space-between'
            }}>
              {/* Value Badge inside Header */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '50%',
                width: small ? 14 : 22,
                height: small ? 14 : 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: small ? 8 : 11,
                color: isFullWild ? '#333' : (activeColor?.hex || baseColor?.hex || ACTION_COLORS[card.action] || '#333'),
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flexShrink: 0
              }}>
                {card.value}
              </div>
              <div style={{
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: small ? 8 : 11,
                textAlign: 'right',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginLeft: 4,
                flex: 1,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                textTransform: 'uppercase'
              }}>
                {isAction ? 'AKSİYON' : displayName}
              </div>
            </div>
          )}

          {/* Card Body */}
          <div style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: small ? '4px' : '8px',
            boxSizing: 'border-box',
            color: '#333'
          }}>
            {isMoney && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                position: 'relative'
              }}>
                {/* Value at top-left */}
                <div style={{
                  position: 'absolute',
                  top: small ? 0 : 2,
                  left: small ? 0 : 2,
                  fontWeight: 900,
                  fontSize: small ? 12 : 18,
                  color: MONEY_COLORS[card.value]?.text || '#333'
                }}>
                  {card.value}M
                </div>
                {/* Center Circle */}
                <div style={{
                  width: small ? 42 : 72,
                  height: small ? 42 : 72,
                  borderRadius: '50%',
                  border: `4px double ${MONEY_COLORS[card.value]?.border || '#333'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: small ? 20 : 36,
                  color: MONEY_COLORS[card.value]?.text || '#333',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)'
                }}>
                  {card.value}
                </div>
                {/* Value at bottom-right */}
                {!small && (
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    fontWeight: 900,
                    fontSize: 18,
                    color: MONEY_COLORS[card.value]?.text || '#333',
                    opacity: 0.8
                  }}>
                    {card.value}M
                  </div>
                )}
              </div>
            )}

            {isProp && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%'
              }}>
                {small ? (
                  <>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#444',
                      textAlign: 'center',
                      lineHeight: 1.1,
                      marginTop: 2
                    }}>
                      {displayName.split(' ').slice(0, 2).join(' ')}
                    </div>
                    {/* Kira tablosu (Kart büyüdüğünde gösterilir) */}
                    {!isFullWild && baseColor?.rents && (
                      <div className="card-details-hoverable" style={{
                        width: '100%',
                        display: 'none',
                        flexDirection: 'column',
                        gap: 1.5,
                        margin: '4px 0',
                        background: '#F8F9F9',
                        borderRadius: 4,
                        padding: '3px 4px',
                        border: '1px solid #E5E7E9'
                      }}>
                        {baseColor.rents.map((r, i) => (
                          <div key={i} style={{ fontSize: 8.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', color: '#000000' }}>
                            <span>{i + 1} Kart:</span>
                            <span style={{ color: '#000000' }}>{r}M</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Full Name in body */}
                    <div style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#444',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      borderBottom: '1px solid #eee',
                      paddingBottom: 4,
                      width: '100%'
                    }}>
                      {displayName}
                    </div>

                    {/* Rent table */}
                    {!isFullWild && baseColor?.rents && (
                      <div style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        margin: '6px 0',
                        background: '#F8F9F9',
                        borderRadius: 6,
                        padding: '4px 6px',
                        border: '1px solid #E5E7E9'
                      }}>
                        <div style={{ fontSize: 7.5, color: '#7F8C8D', fontWeight: 'bold', borderBottom: '1px solid #BDC3C7', paddingBottom: 2, marginBottom: 2 }}>KİRA TABLOSU</div>
                        {baseColor.rents.map((r, i) => (
                          <div key={i} style={{ fontSize: 10.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', color: '#000000' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{
                                width: 9,
                                height: 12,
                                borderRadius: 1.5,
                                background: baseColor.hex,
                                display: 'inline-block',
                                border: '0.5px solid rgba(0,0,0,0.15)'
                              }} />
                              <span>{i + 1} Kart:</span>
                            </div>
                            <span style={{ color: '#000000' }}>{r}M</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dual color labels */}
                    {dualColors && (
                      <div style={{ display: 'flex', gap: 4, margin: '2px 0', alignItems: 'center' }}>
                        {dualColors.map((c, i) => (
                          <React.Fragment key={i}>
                            <span style={{
                              fontSize: 7.5,
                              fontWeight: 800,
                              color: '#fff',
                              background: c.hex,
                              padding: '2px 5px',
                              borderRadius: 4,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>{c.name.substring(0, 3)}</span>
                            {i === 0 && <span style={{ color: '#888', fontSize: 8 }}>/</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {isFullWild && (
                      <div style={{
                        fontSize: 8.5,
                        color: '#D35400',
                        fontWeight: 900,
                        textAlign: 'center',
                        background: '#FEF5E7',
                        padding: '4px 6px',
                        borderRadius: 6,
                        border: '1px dashed #F5CBA7',
                        lineHeight: 1.2,
                        margin: 'auto 0'
                      }}>
                        TÜM RENKLER İÇİN JOKER
                      </div>
                    )}
                  </>
                )}

                {/* Bottom Value Stamp */}
                <div style={{
                  fontSize: small ? 11 : 14,
                  fontWeight: 900,
                  color: baseColor?.hex || '#555',
                  marginTop: 'auto',
                  lineHeight: 1
                }}>
                  {isFullWild ? '🌟' : `${card.value}M`}
                </div>
              </div>
            )}

            {isAction && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%'
              }}>
                {small ? (
                  <>
                    <div style={{ fontSize: 24, lineHeight: 1 }}>{actionStyle.icon}</div>
                    {/* Aksiyon açıklaması (Kart büyüdüğünde gösterilir) */}
                    <div className="card-details-hoverable" style={{
                      display: 'none',
                      fontSize: 9.5,
                      color: '#000000',
                      fontWeight: '800',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      marginTop: 4,
                      padding: '0 2px'
                    }}>
                      {card.description}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Name */}
                    <div style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: ACTION_COLORS[card.action] || '#F39C12',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      {displayName}
                    </div>

                    {/* Circle design in center */}
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#F8F9F9',
                      border: `2px solid ${ACTION_COLORS[card.action] || '#F39C12'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                      margin: '4px 0'
                    }}>
                      {actionStyle.icon}
                    </div>

                    {/* Description (Geliştirilmiş Okunabilirlik) */}
                    <div style={{
                      fontSize: 11,
                      color: '#000000',
                      fontWeight: '700',
                      textAlign: 'center',
                      lineHeight: 1.4,
                      overflowY: 'auto',
                      maxHeight: '60px',
                      padding: '0 4px',
                      boxSizing: 'border-box'
                    }}>
                      {card.description}
                    </div>
                  </>
                )}

                {/* Bottom Value Stamp */}
                <div style={{
                  fontSize: small ? 11 : 14,
                  fontWeight: 900,
                  color: ACTION_COLORS[card.action] || '#F39C12',
                  marginTop: 'auto',
                  lineHeight: 1
                }}>
                  {card.value}M
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {isRare && <div className="holo-foil" />}
    </div>
  );
}