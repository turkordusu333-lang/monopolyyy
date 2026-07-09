import React from 'react';

export function CardBack({ theme, small }) {
  const getThemeStyles = () => {
    switch (theme) {
      case 'naruto':
        return {
          background: 'radial-gradient(circle, #ff5722 30%, #e64a19 90%)',
          border: '2px solid #ffeb3b',
          boxShadow: '0 0 10px rgba(255, 87, 34, 0.4), inset 0 0 8px rgba(0,0,0,0.5)',
          centerSymbol: '🍥',
          symbolColor: '#fff',
          title: 'NARUTO'
        };
      case 'onepiece':
        return {
          background: 'radial-gradient(circle, #2a2a2a 40%, #0d0d0d 100%)',
          border: '2px solid #f1c40f',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(255,255,255,0.1)',
          centerSymbol: '☠️',
          symbolColor: '#f1c40f',
          title: 'ONE PIECE'
        };
      case 'cyberpunk':
        return {
          background: 'radial-gradient(circle, #0f0f1b 30%, #f7df1e 100%)',
          border: '2px solid #39ff14',
          boxShadow: '0 0 10px rgba(57, 255, 20, 0.4), inset 0 0 8px rgba(0,255,255,0.3)',
          centerSymbol: '⚡',
          symbolColor: '#00ffff',
          title: 'CYBERPUNK'
        };
      case 'holo':
        return {
          background: 'linear-gradient(135deg, #00f0ff 0%, #ff007f 50%, #7f00ff 100%)',
          border: '2px solid #fff',
          boxShadow: '0 0 12px rgba(0, 240, 255, 0.5), inset 0 0 10px rgba(255,255,255,0.4)',
          centerSymbol: '💎',
          symbolColor: '#fff',
          title: 'PRISM HOLO'
        };
      case 'carbon':
        return {
          background: 'repeating-linear-gradient(45deg, #111 0px, #111 2px, #222 2px, #222 4px)',
          border: '2px solid #ff4757',
          boxShadow: '0 0 10px rgba(255, 71, 87, 0.4), inset 0 0 8px rgba(0,0,0,0.8)',
          centerSymbol: '🏁',
          symbolColor: '#ff4757',
          title: 'STEALTH'
        };
      case 'scroll':
        return {
          background: 'radial-gradient(circle, #f3e5ab 30%, #c19a6b 100%)',
          border: '2px solid #8b5a2b',
          boxShadow: '0 0 8px rgba(139, 90, 43, 0.4), inset 0 0 10px rgba(0,0,0,0.3)',
          centerSymbol: '📜',
          symbolColor: '#8b5a2b',
          title: 'SCROLL'
        };
      case 'galaxy':
        return {
          background: 'radial-gradient(circle, #2d1b4e 20%, #0c081e 80%, #020107 100%)',
          border: '2px solid #a8a5e6',
          boxShadow: '0 0 15px rgba(168, 165, 230, 0.4), inset 0 0 12px rgba(168, 165, 230, 0.2)',
          centerSymbol: '🌌',
          symbolColor: '#a8a5e6',
          title: 'GALAXY'
        };
      case 'retro_arcade':
        return {
          background: 'radial-gradient(circle, #ff007f 10%, #7f00ff 70%, #010008 100%)',
          border: '2px solid #00f0ff',
          boxShadow: '0 0 10px rgba(0, 240, 255, 0.5), inset 0 0 8px rgba(255,0,127,0.3)',
          centerSymbol: '👾',
          symbolColor: '#00f0ff',
          title: 'ARCADE'
        };
      case 'gilded_deco':
        return {
          background: 'radial-gradient(circle, #1a1a1a 40%, #0a0a0a 100%)',
          border: '2px solid #d4af37',
          boxShadow: '0 0 12px rgba(212, 175, 55, 0.5), inset 0 0 6px rgba(212, 175, 55, 0.3)',
          centerSymbol: '⚜️',
          symbolColor: '#d4af37',
          title: 'GILDED DECO'
        };
      default: // classic/red
        return {
          background: 'radial-gradient(circle, #c0392b 40%, #78281f 100%)',
          border: '2px solid #f1c40f',
          boxShadow: '0 0 10px rgba(192, 57, 43, 0.4), inset 0 0 8px rgba(0,0,0,0.4)',
          centerSymbol: '🎲',
          symbolColor: '#fff',
          title: 'MONOPOLY'
        };
    }
  };

  const s = getThemeStyles();

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: s.background,
      border: s.border,
      boxShadow: s.boxShadow,
      borderRadius: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      padding: small ? 2 : 6
    }}>
      {/* Decorative inner border */}
      <div style={{
        position: 'absolute',
        inset: small ? 2 : 4,
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: 'inherit',
        pointerEvents: 'none'
      }} />

      {/* Decorative corner dots */}
      <div style={{ position: 'absolute', top: small ? 3 : 6, left: small ? 3 : 6, width: 2, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', top: small ? 3 : 6, right: small ? 3 : 6, width: 2, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: small ? 3 : 6, left: small ? 3 : 6, width: 2, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: small ? 3 : 6, right: small ? 3 : 6, width: 2, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: '50%' }} />

      <div style={{
        fontSize: small ? 14 : 28,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        zIndex: 2,
        color: s.symbolColor
      }}>
        {s.centerSymbol}
      </div>

      {!small && (
        <div style={{
          fontSize: 8,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: 1.5,
          marginTop: 6,
          zIndex: 2,
          textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {s.title}
        </div>
      )}
    </div>
  );
}
