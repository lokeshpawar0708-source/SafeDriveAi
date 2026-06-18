import React from 'react';

export default function FatigueGauge({ score, status }) {
  // SVG Arc configuration
  const radius = 70;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color matching status
  let statusClass = 'normal';
  let gradientId = 'grad-normal';

  if (status === 'WARNING') {
    statusClass = 'warning';
    gradientId = 'grad-warning';
  } else if (status === 'FATIGUED') {
    statusClass = 'fatigued';
    gradientId = 'grad-fatigued';
  } else if (status === 'CRITICAL') {
    statusClass = 'critical';
    gradientId = 'grad-critical';
  }

  return (
    <div className="gauge-svg-container">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          {/* Gradients for different statuses */}
          <linearGradient id="grad-normal" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="grad-warning" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="grad-fatigued" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="grad-critical" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          
          {/* Drop shadow filter for glow effect */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track Circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Active Progress Circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          filter="url(#glow)"
        />
      </svg>

      {/* Numerical Fatigue Score Overlay */}
      <div className="gauge-center-text">
        <span className={`gauge-score status-badge ${statusClass}`} style={{ background: 'none', border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
          {score}
        </span>
        <span className="gauge-label">Fatigue</span>
      </div>
    </div>
  );
}
