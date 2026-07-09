import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const renderFormattedText = (text) => {
  if (!text) return text;
  
  const colorsMap = {
    brown: '#e5a93b', kahverengi: '#e5a93b',
    lightblue: '#4FA8D5', 'açık mavi': '#4FA8D5', 'light blue': '#4FA8D5',
    pink: '#ff7ebb', pembe: '#ff7ebb',
    orange: '#E67E22', turuncu: '#E67E22',
    red: '#E74C3C', kırmızı: '#E74C3C',
    yellow: '#F1C40F', sarı: '#F1C40F',
    green: '#2ECC71', yeşil: '#2ECC71',
    blue: '#3498DB', lacivert: '#3498DB',
    railroad: '#95A5A6', demiryolu: '#95A5A6', 'demir yolları': '#95A5A6',
    utility: '#BDC3C7', 'kamu hizmetleri': '#BDC3C7'
  };

  const regex = /(\d+M|Kahverengi|Açık Mavi|Pembe|Turuncu|Kırmızı|Sarı|Yeşil|Lacivert|Demir Yolları|Kamu Hizmetleri|Brown|Light Blue|Pink|Orange|Red|Yellow|Green|Blue|Railroad|Utility)/gi;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    
    // 1. Para Değerleri (Örn: 5M)
    if (/^\d+m$/i.test(lowerPart)) {
      return (
        <strong key={i} style={{ color: '#2ECC71', fontWeight: 900, textShadow: '0 0 4px rgba(46,204,113,0.3)' }}>
          {part}
        </strong>
      );
    }
    
    // 2. Mülk Renk Grupları
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

export function ToastStack({ toasts, actionOverlay }) {
  const items = [...toasts];
  if (actionOverlay) {
    items.push({
      id: 'action-overlay',
      text: actionOverlay.text,
      subtext: actionOverlay.subtext,
      icon: actionOverlay.icon,
      kind: actionOverlay.type || 'info'
    });
  }

  if (!items.length) return null;
  return (
    <div className="game-toast-container">
      <AnimatePresence>
        {items.map(t => {
          const isTurn = t.kind === 'turn';
          const isErr = t.kind === 'error' || t.kind === 'danger';
          const isSucc = t.kind === 'success';
          const isWarn = t.kind === 'warning';
          
          const accentColor = isTurn ? '#fbbf24' : isErr ? '#ef4444' : isSucc ? '#10b981' : isWarn ? '#f59e0b' : '#3b82f6';
          const icon = t.icon || (isTurn ? '🎲' : isErr ? '⚠️' : isSucc ? '✅' : 'ℹ️');

          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }}
              className={`game-toast-item toast-type-${t.kind || 'info'}`}
              style={{
                border: '2px solid',
                borderColor: accentColor,
                boxShadow: `0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px ${accentColor}1c`
              }}
            >
              {/* Inner glow backdrop */}
              <div className="game-toast-glow" style={{
                background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`
              }} />
              
              <div className="game-toast-icon">{icon}</div>
              
              <div className="game-toast-content">
                <div className="game-toast-text">{t.text}</div>
                {t.subtext && (
                  <div className="game-toast-subtext">
                    {renderFormattedText(t.subtext)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}