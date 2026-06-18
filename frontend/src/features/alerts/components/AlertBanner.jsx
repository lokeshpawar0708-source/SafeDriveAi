import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AlertBanner({ status, isDistracted, distractionDuration }) {
  const isCritical = status === 'CRITICAL';
  
  if (!isCritical && !isDistracted) {
    return null;
  }

  return (
    <>
      {isCritical && (
        <div className="alert-banner" style={{ background: 'rgba(244, 63, 94, 0.2)', borderColor: 'var(--status-critical)' }}>
          <ShieldAlert className="alert-banner-icon" style={{ animation: 'pulse-icon 0.5s infinite alternate' }} />
          <div className="alert-banner-text">
            <h3>CRITICAL DROWSINESS ALERT!</h3>
            <p>Microsleep or prolonged eye closure detected. Please stop driving and rest immediately!</p>
          </div>
        </div>
      )}

      {isDistracted && (
        <div className="alert-banner" style={{ background: 'rgba(249, 115, 22, 0.2)', borderColor: 'var(--status-fatigued)', marginTop: isCritical ? '0.75rem' : '0' }}>
          <AlertTriangle className="alert-banner-icon" style={{ color: 'var(--status-fatigued)', animation: 'pulse-icon 0.6s infinite alternate' }} />
          <div className="alert-banner-text">
            <h3>DISTRACTION WARNING!</h3>
            <p>Driver looking away from the road for {distractionDuration.toFixed(1)} seconds. Keep eyes on the road!</p>
          </div>
        </div>
      )}
    </>
  );
}
