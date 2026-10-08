import React, { useEffect, useState } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 300);
          return 100;
        }
        return p + 25;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 100,
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 70%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        marginBottom: '24px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #fde68a, #f59e0b, #d97706)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '40px',
        boxShadow: '0 12px 30px rgba(245, 158, 11, 0.4)'
      }}>
        🎲
      </div>
      <div style={{ fontSize: '32px', fontWeight: 900, color: '#fde047', letterSpacing: '2px' }}>
        BLOCKBOUND
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '4px', marginTop: '4px', marginBottom: '32px' }}>
        DICE DISTRICTS
      </div>

      <div style={{ width: '240px', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Carving 3D voxel foundation blocks...</div>
    </div>
  );
}
