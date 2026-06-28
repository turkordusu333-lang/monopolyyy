import React from 'react';

export function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: 16,
    }}>
      <div 
        className="premium-modal-content"
        style={{
          background: 'linear-gradient(145deg, rgba(16, 24, 48, 0.95), rgba(8, 12, 28, 0.98))',
          border: '1px solid rgba(255, 215, 0, 0.25)',
          borderRadius: 16,
          padding: 28,
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 215, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Glow accent bar at the top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 3,
          background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
          opacity: 0.8,
        }} />

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12
        }}>
          <h3 style={{ 
            margin: 0, 
            color: '#FFD700', 
            fontSize: 20, 
            fontWeight: 800, 
            letterSpacing: '0.5px',
            textShadow: '0 2px 10px rgba(255, 215, 0, 0.2)'
          }}>
            {title}
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#aaa', 
              fontSize: 16, 
              width: 32,
              height: 32,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = '#E74C3C';
              e.currentTarget.style.borderColor = '#E74C3C';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#aaa';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ color: '#E2E8F0' }}>
          {children}
        </div>
      </div>
    </div>
  );
}