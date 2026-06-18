import React from 'react';
import { Shield, ShieldAlert, ShieldAlert as WarningIcon } from 'lucide-react';

export default function RiskPredictionCard({ riskLevel, yawnCount, drowsinessCount, distractionCount }) {
  let riskClass = 'low';
  let advice = '';
  let Icon = Shield;
  
  if (riskLevel === 'MEDIUM') {
    riskClass = 'medium';
    advice = 'Moderate fatigue or look-away signs detected. Consider playing upbeat music, opening the window, or drinking water to stay alert.';
    Icon = WarningIcon;
  } else if (riskLevel === 'HIGH') {
    riskClass = 'high';
    advice = 'DANGER: Critical fatigue or active distraction detected! Pull over at the nearest safe spot immediately. Continuous driving is highly dangerous.';
    Icon = ShieldAlert;
  } else {
    advice = 'Driving conditions are optimal. Driver appears focused and rested. Continue safe driving practices.';
  }

  return (
    <div className="glass-card risk-card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        AI Risk Prediction Engine
      </h3>
      
      <div className="risk-display-container">
        <div className={`risk-indicator-glow ${riskClass}`}>
          <Icon size={28} />
        </div>
        <div className="risk-info">
          <p>Assessed Safety Risk</p>
          <h2 style={{ 
            color: riskLevel === 'HIGH' ? 'var(--status-critical)' : 
                   riskLevel === 'MEDIUM' ? 'var(--status-warning)' : 'var(--status-normal)'
          }}>
            {riskLevel} RISK
          </h2>
        </div>
      </div>

      <div className="risk-metrics-summary">
        <div className="summary-item">
          <div className="label">Yawns</div>
          <div className="val" style={{ color: yawnCount > 0 ? 'var(--status-warning)' : 'inherit' }}>
            {yawnCount}
          </div>
        </div>
        <div className="summary-item">
          <div className="label">Drowsiness</div>
          <div className="val" style={{ color: drowsinessCount > 0 ? 'var(--status-critical)' : 'inherit' }}>
            {drowsinessCount}
          </div>
        </div>
        <div className="summary-item">
          <div className="label">Distractions</div>
          <div className="val" style={{ color: distractionCount > 0 ? 'var(--status-fatigued)' : 'inherit' }}>
            {distractionCount}
          </div>
        </div>
      </div>

      <div className={`risk-advice ${riskClass}`}>
        <strong>Recommendation:</strong> {advice}
      </div>
    </div>
  );
}
