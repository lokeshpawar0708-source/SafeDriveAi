import React from 'react';
import RiskPredictionCard from './RiskPredictionCard';
import AlertLogsTable from './AlertLogsTable';
import { BarChart2 } from 'lucide-react';

export default function AnalyticsPanel({ stateData, logs, onLogsCleared }) {
  const { yawn_count, drowsiness_alerts_count, distraction_alerts_count, risk_level } = stateData;
  const totalAlerts = logs.length;

  // Calculate percentages for incident breakdown progress bars
  const totalCounts = drowsiness_alerts_count + distraction_alerts_count + yawn_count;
  const drowsinessPercent = totalCounts > 0 ? (drowsiness_alerts_count / totalCounts) * 100 : 0;
  const distractionPercent = totalCounts > 0 ? (distraction_alerts_count / totalCounts) * 100 : 0;
  const yawnPercent = totalCounts > 0 ? (yawn_count / totalCounts) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top row: Risk Prediction + Alert distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Risk Prediction Card */}
        <RiskPredictionCard
          riskLevel={risk_level}
          yawnCount={yawn_count}
          drowsinessCount={drowsiness_alerts_count}
          distractionCount={distraction_alerts_count}
        />

        {/* Dynamic breakdown card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyToContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart2 size={18} style={{ color: 'var(--text-muted)' }} /> Incident Distribution
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, justifyContent: 'center' }}>
            {/* Drowsiness Incident Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Drowsiness Warnings</span>
                <span style={{ fontWeight: 600, color: 'var(--status-critical)' }}>{drowsiness_alerts_count} ({drowsinessPercent.toFixed(0)}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${drowsinessPercent}%`, height: '100%', background: 'var(--status-critical)', boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Distraction Incident Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Distraction Alerts</span>
                <span style={{ fontWeight: 600, color: 'var(--status-fatigued)' }}>{distraction_alerts_count} ({distractionPercent.toFixed(0)}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${distractionPercent}%`, height: '100%', background: 'var(--status-fatigued)', boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Yawning Incident Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Yawning Episodes</span>
                <span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{yawn_count} ({yawnPercent.toFixed(0)}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${yawnPercent}%`, height: '100%', background: 'var(--status-warning)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Logs Table */}
      <AlertLogsTable logs={logs} onLogsCleared={onLogsCleared} />
      
    </div>
  );
}
