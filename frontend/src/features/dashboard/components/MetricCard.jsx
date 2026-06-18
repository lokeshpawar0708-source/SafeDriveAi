import React from 'react';

export default function MetricCard({ title, value, icon: Icon, description, status }) {
  // Map status to border color overlays
  let borderColor = 'rgba(255, 255, 255, 0.08)';
  let iconColor = 'var(--text-muted)';
  
  if (status === 'NORMAL') {
    borderColor = 'rgba(16, 185, 129, 0.2)';
    iconColor = 'var(--status-normal)';
  } else if (status === 'WARNING') {
    borderColor = 'rgba(245, 158, 11, 0.3)';
    iconColor = 'var(--status-warning)';
  } else if (status === 'FATIGUED') {
    borderColor = 'rgba(249, 115, 22, 0.4)';
    iconColor = 'var(--status-fatigued)';
  } else if (status === 'CRITICAL') {
    borderColor = 'rgba(244, 63, 94, 0.5)';
    iconColor = 'var(--status-critical)';
  }

  return (
    <div className="glass-card metric-card" style={{ borderColor }}>
      <div className="metric-header">
        <span>{title}</span>
        {Icon && <Icon size={18} style={{ color: iconColor }} />}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        {description && <div className="metric-footer">{description}</div>}
      </div>
    </div>
  );
}
