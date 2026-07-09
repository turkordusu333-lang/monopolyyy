import React, { useState, useEffect, useContext } from 'react';
import { COLOR_INFO, ACTION_STYLE } from '../constants';
import { getCardImageSrc } from '../utils';
import { ThemeContext } from '../ThemeContext';
import { CardBack } from './CardBack';

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
  hotel: '#1E8449',
  thief_squirrel: '#8B4513'
};


const renderColorizedDescription = (text) => {
  if (!text) return text;

  const colorsMap = {
    brown: '#783f04', kahverengi: '#783f04',
    lightblue: '#0c5a80', 'açık mavi': '#0c5a80', 'light blue': '#0c5a80',
    pink: '#b0125a', pembe: '#b0125a',
    orange: '#b45f06', turuncu: '#b45f06',
    red: '#990000', kırmızı: '#990000',
    yellow: '#8f7300', sarı: '#8f7300',
    green: '#0f5132', yeşil: '#0f5132',
    blue: '#0a365c', lacivert: '#0a365c',
    railroad: '#444444', demiryolu: '#444444', 'demiryolları': '#444444', 'demir yolları': '#444444',
    utility: '#495057', 'kamu hizmetleri': '#495057', 'kamu hizmeti': '#495057'
  };

  const regex = /(\d+M|Kahverengi|Açık Mavi|Pembe|Turuncu|Kırmızı|Sarı|Yeşil|Lacivert|Demir Yolları|Demiryolu|Kamu Hizmetleri|Kamu Hizmeti|Brown|Light Blue|Pink|Orange|Red|Yellow|Green|Blue|Railroad|Utility)/gi;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    
    if (/^\d+m$/i.test(lowerPart)) {
      return (
        <strong key={i} style={{ color: '#198754', fontWeight: 900 }}>
          {part}
        </strong>
      );
    }
    
    if (colorsMap[lowerPart] != null) {
      return (
        <strong key={i} style={{ color: colorsMap[lowerPart], fontWeight: 900 }}>
          {part}
        </strong>
      );
    }
    
    return part;
  });
};

export function CardVisual({ card, selected, onClick, small, dimmed, onHover, usable, comboClass, lang, showBack, cardBackTheme }) {
  const { themeId, manifest } = useContext(ThemeContext);
  const imgSrc = getCardImageSrc(themeId, card?.key);
  const [imgFailed, setImgFailed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevColor, setPrevColor] = useState(card?.activeColor);

  useEffect(() => { setImgFailed(false); }, [imgSrc]);

  useEffect(() => {
    if (card?.activeColor && card.activeColor !== prevColor) {
      setIsFlipping(true);
      setPrevColor(card.activeColor);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
  }, [card?.activeColor, prevColor]);

  const handleClick = () => {
    if (!onClick) return;
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    onClick();
  };

  if (!card) return null;

  const activeLang = lang || localStorage.getItem('md_lang') || 'tr';

  const translateCardLocal = (c, lg) => {
    if (!c) return { name: '', description: '' };
    if (lg !== 'en') {
      return { name: c.name, description: c.description || '' };
    }

    let name = c.name;
    let description = c.description || '';

    if (c.type === 'money') {
      name = `${c.value}M`;
      description = `Bank value: ${c.value}M`;
    } else if (c.type === 'property') {
      if (c.isWild) {
        name = 'WILD CARD';
        description = 'Can be used as any property color group. Cannot be put in bank vault.';
      } else if (c.isDual) {
        const colorsTranslated = c.colors.map(col => {
          const names = { brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue', railroad: 'Railroad', utility: 'Utility' };
          return names[col] || col;
        });
        name = colorsTranslated.join(' / ');
        description = `Dual property card. Tap/Click to flip active color between: ${colorsTranslated.join(', ')}`;
      } else {
        const propertyEnNames = {
          'KASIMPAŞA': 'KASIMPASA', 'DOLAPDERE': 'DOLAPDERE', 'SULTANAHMET': 'SULTANAHMET',
          'KARAKÖY': 'KARAKOY', 'SİRKECİ': 'SIRKECI', 'BEY OĞLU': 'BEYOGLU', 'TAKSİM': 'TAKSIM',
          'BEŞİKTAŞ': 'BESIKTAS', 'HARBİYE': 'HARBIYE', 'MECİDİYEKÖY': 'MECIDIYEKOY', 'ŞİŞLİ': 'SISLI',
          'ERENKÖY': 'ERENKOY', 'CADDEBOSTAN': 'CADDEBOSTAN', 'BOSTANCI': 'BOSTANCI',
          'TEŞVİKİYE': 'TESVIKIYE', 'MAÇKA': 'MACKA', 'NİŞANTAŞI': 'NISANTASI', 'BEBEK': 'BEBEK',
          'LEVENT': 'LEVENT', 'ETİLER': 'ETILER', 'YENİKÖY': 'YENIKOY', 'TARABYA': 'TARABYA',
          'KADIKÖY VAPUR İSKELESİ': 'KADIKOY FERRY TERMINAL', 'KABATAŞ VAPUR İSKELESİ': 'KABATAS FERRY TERMINAL',
          'HAYDARPAŞA TREN İSTASYONU': 'HAYDARPASA TRAIN STATION', 'SİRKECİ TREN İSTASYONU': 'SIRKECI TRAIN STATION',
          'ELEKTRİK İDARESİ': 'ELECTRIC COMPANY', 'SU İDARESİ': 'WATER WORKS'
        };
        name = propertyEnNames[c.name] || c.name;
        description = `Property Card. Rent for full set: ${COLOR_INFO[c.color]?.rents?.map(r => r + 'M').join(', ') || ''}`;
      }
    } else if (c.type === 'action') {
      switch (c.action) {
        case 'passgo': name = 'PASS GO'; description = 'Draw 2 extra cards from the deck.'; break;
        case 'dealbreaker': name = 'DEAL BREAKER'; description = 'Steal a completed property set from an opponent, including any House/Hotel on it.'; break;
        case 'justsayno': name = 'JUST SAY NO'; description = 'Block any action card played against you.'; break;
        case 'slydeal': name = 'SLY DEAL'; description = 'Steal a single property card from an opponent (cannot be part of a completed set).'; break;
        case 'forceddeal': name = 'FORCED DEAL'; description = 'Swap one of your properties with an opponent\'s property (cannot be part of a completed set).'; break;
        case 'debtcollector': name = 'DEBT COLLECTOR'; description = 'Demand 5M from any player.'; break;
        case 'birthday': name = 'ITS MY BIRTHDAY'; description = 'Demand 2M from every player.'; break;
        case 'house': name = 'HOUSE'; description = 'Add to any completed property set (except Railroads & Utilities) to increase rent by 3M.'; break;
        case 'hotel': name = 'HOTEL'; description = 'Add to a property set that already has a House to increase rent by 4M. House stays.'; break;
        case 'doublerent': name = 'DOUBLE RENT'; description = 'Double the rent amount. Must be played together with a Rent card.'; break;
        case 'thief_squirrel': name = 'THIEF SQUIRREL'; description = 'Steal a random card from an opponent\'s hand.'; break;
        case 'rent':
          name = 'RENT';
          if (c.colors && Array.isArray(c.colors)) {
            const colorNames = c.colors.map(col => {
              const names = { brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue', railroad: 'Railroad', utility: 'Utility' };
              return names[col] || col;
            });
            description = `Collect rent for ${colorNames.join('/')} from all players.`;
          } else {
            description = 'Collect rent for active colors from all players.';
          }
          break;
        case 'rent_all': name = 'ANY RENT'; description = 'Collect rent for a color of your choice from any single player.'; break;
      }
    }
    return { name, description };
  };

  const cardTranslated = {
    ...card,
    name: translateCardLocal(card, activeLang).name,
    description: translateCardLocal(card, activeLang).description
  };

  const isAction = cardTranslated.type === 'action';
  const isMoney = cardTranslated.type === 'money';
  const isProp = cardTranslated.type === 'property';

  const displayName = manifest?.names?.[cardTranslated.key] || cardTranslated.name;

  const activeColor = isProp && cardTranslated.activeColor ? COLOR_INFO[cardTranslated.activeColor] : null;
  const baseColor = isProp && cardTranslated.color ? COLOR_INFO[cardTranslated.color] : null;

  const dualColors = isProp && cardTranslated.isDual ? cardTranslated.colors.map(c => {
    const info = COLOR_INFO[c];
    if (!info) return null;
    return {
      ...info,
      name: activeLang === 'en' ? {
        brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange',
        red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue',
        railroad: 'Railroad', utility: 'Utility'
      }[c] || info.name : info.name
    };
  }).filter(Boolean) : null;

  const isFullWild = isProp && cardTranslated.isWild;

  const isRare = isFullWild || (isAction && cardTranslated.action === 'dealbreaker');
  const actionStyle = isAction ? (ACTION_STYLE[cardTranslated.action] || { icon: '⚡', bg: 'linear-gradient(135deg, #F39C12, #D68910)' }) : null;

  const scale = window.innerWidth < 768 ? 0.85 : 1.5;
  const w = (small ? 68 : 132) * scale;
  const h = (small ? 96 : 192) * scale;

  let typeBadge = null;
  if (isMoney) typeBadge = { icon: '💵', label: activeLang === 'en' ? 'MONEY' : 'PARA', bg: 'rgba(0,0,0,0.35)' };
  else if (isAction) typeBadge = { icon: actionStyle.icon, label: activeLang === 'en' ? 'ACTION' : 'AKSİYON', bg: 'rgba(0,0,0,0.35)' };
  else if (isFullWild) typeBadge = { icon: '🃏', label: activeLang === 'en' ? 'WILD CARD' : 'TAM JOKER', bg: 'rgba(0,0,0,0.5)' };
  else if (dualColors) typeBadge = { icon: '🔀', label: activeLang === 'en' ? 'DUAL COLOR' : 'ÇİFT RENK', bg: 'rgba(0,0,0,0.35)' };
  else if (isProp) typeBadge = { icon: '🏠', label: activeLang === 'en' ? 'PROPERTY' : 'ARAZİ', bg: 'rgba(0,0,0,0.35)' };

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

  if (showBack) {
    return (
      <div
        onClick={handleClick}
        style={{
          width: w, height: h,
          borderRadius: 12,
          cursor: onClick ? 'pointer' : 'default',
          opacity: dimmed ? 0.5 : 1,
          flexShrink: 0,
          position: 'relative',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <CardBack theme={cardBackTheme || 'default'} small={small} />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(card)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`card-visual ${card.type}-card ${selected ? "selected-card" : ""} ${shaking ? "card-shake" : ""} ${usable ? "usable-card" : ""} ${isRare ? "holo-wrapper" : ""} ${comboClass || ""} ${isFlipping ? "card-flip-3d" : ""}`}
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
      {/* Dynamic Metalic Shimmer Swipe Layer */}
      <div className="card-shimmer" />

      {showImage ? (
        <>
          <img src={imgSrc} alt={displayName} onError={() => setImgFailed(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {dualColors && dualColors.length === 2 && (
            <>
              {/* Sol Kalın Şerit */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: small ? '50%' : 0, width: small ? 14 : 20, background: dualColors[0].hex, borderTopLeftRadius: 10, borderBottomLeftRadius: small ? 0 : 10, opacity: 0.95, zIndex: 1 }} />
              {small && <div style={{ position: 'absolute', top: '50%', left: 0, bottom: 0, width: 14, background: dualColors[1].hex, borderBottomLeftRadius: 10, opacity: 0.95, zIndex: 1 }} />}
              
              {/* Sağ Kalın Şerit */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: small ? '50%' : 0, width: small ? 14 : 20, background: small ? dualColors[0].hex : dualColors[1].hex, borderTopRightRadius: 10, borderBottomRightRadius: small ? 0 : 10, opacity: 0.95, zIndex: 1 }} />
              {small && <div style={{ position: 'absolute', top: '50%', right: 0, bottom: 0, width: 14, background: dualColors[1].hex, borderBottomRightRadius: 10, opacity: 0.95, zIndex: 1 }} />}
            </>
          )}
          {typeBadge && (
            <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(0,0,0,0.55)', borderRadius: 5, width: small ? 20 : 26, height: small ? 20 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 11 : 15, lineHeight: 1, zIndex: 2 }}>
              {typeBadge.icon}
            </div>
          )}
          {(isMoney || isProp || isAction) && (
            <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.65)', color: '#FFD700', fontWeight: 900, fontSize: small ? 12 : 16, padding: '2px 6px', borderRadius: 5, lineHeight: 1.2, zIndex: 2 }}>
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
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 3
              }}>
                {comboClass && (
                  <span style={{ fontSize: small ? 8 : 10, animation: 'active-player-pulse 1.2s infinite ease-in-out' }} title="Combo Active">🔗</span>
                )}
                <span>{isAction ? (activeLang === 'en' ? 'ACTION' : 'AKSİYON') : displayName}</span>
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
                            <span>{i + 1} {lang === 'en' ? 'Cards:' : 'Kart:'}</span>
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
                        <div style={{ fontSize: 7.5, color: '#7F8C8D', fontWeight: 'bold', borderBottom: '1px solid #BDC3C7', paddingBottom: 2, marginBottom: 2 }}>{lang === 'en' ? 'RENT TABLE' : 'KİRA TABLOSU'}</div>
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
                              <span>{i + 1} {lang === 'en' ? 'Cards:' : 'Kart:'}</span>
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
                        {lang === 'en' ? 'WILD FOR ALL COLORS' : 'TÜM RENKLER İÇİN JOKER'}
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
                      {renderColorizedDescription(cardTranslated.description)}
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
                      {renderColorizedDescription(cardTranslated.description)}
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