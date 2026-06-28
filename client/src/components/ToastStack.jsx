import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      pointerEvents: 'none', width: '90%', maxWidth: 400,
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const isTurn = t.kind === 'turn';
          const isErr = t.kind === 'error';
          const isSucc = t.kind === 'success';
          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              style={{
                background: isTurn ? 'linear-gradient(135deg, rgba(255,215,0,0.95), rgba(243,156,18,0.95))'
                  : isErr ? 'linear-gradient(135deg, rgba(231,76,60,0.95), rgba(192,57,43,0.95))'
                  : isSucc ? 'linear-gradient(135deg, rgba(39,174,96,0.95), rgba(30,132,73,0.95))'
                  : 'rgba(30,30,50,0.9)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isTurn ? '#FFEAA7' : isErr ? '#F1948A' : isSucc ? '#A9DFBF' : 'rgba(255,255,255,0.2)'}`,
                color: isTurn ? '#000' : '#fff',
                padding: '12px 20px', borderRadius: 14, fontWeight: 800, fontSize: 14,
                textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box'
              }}
            >
              {isTurn && <span style={{ fontSize: 18 }}>🎲</span>}
              {isErr && <span style={{ fontSize: 18 }}>⚠️</span>}
              {isSucc && <span style={{ fontSize: 18 }}>✅</span>}
              <span style={{ flex: 1 }}>{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}