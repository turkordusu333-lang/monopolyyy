import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      pointerEvents: 'none', width: '90%', maxWidth: 360,
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const isTurn = t.kind === 'turn';
          const isErr = t.kind === 'error';
          const isSucc = t.kind === 'success';
          
          const accentColor = isTurn ? '#fbbf24' : isErr ? '#f87171' : isSucc ? '#34d399' : '#60a5fa';
          const glowColor = isTurn ? 'rgba(251,191,36,0.15)' : isErr ? 'rgba(248,113,113,0.15)' : isSucc ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.1)';

          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }}
              style={{
                background: 'rgba(22, 30, 49, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: `4px solid ${accentColor}`,
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: 13,
                boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 15px ${glowColor}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {isTurn && <span style={{ fontSize: 16 }}>🎲</span>}
              {isErr && <span style={{ fontSize: 16 }}>⚠️</span>}
              {isSucc && <span style={{ fontSize: 16 }}>✅</span>}
              <span style={{ flex: 1, letterSpacing: '0.2px' }}>{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}