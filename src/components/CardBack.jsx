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
