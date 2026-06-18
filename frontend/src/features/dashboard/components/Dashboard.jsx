import React from 'react';
import { Eye, Compass, Frown, ShieldAlert } from 'lucide-react';
import CameraFeed from './CameraFeed';
import MetricCard from './MetricCard';
import FatigueGauge from './FatigueGauge';
import AlertBanner from '../../alerts/components/AlertBanner';

export default function Dashboard({ stateData, isBackendOnline }) {
  const {
    face_found,
    ear,
    mouth_opening_ratio,
    score,
    status,
    direction,
    is_distracted,
    distraction_duration,
    yawn_count
  } = stateData;

  // Formatting values
  const earVal = face_found ? ear.toFixed(2) : '0.00';
  const morVal = face_found ? mouth_opening_ratio.toFixed(2) : '0.00';
  const directionVal = face_found ? direction : 'NO FACE';
  
  // Decide metric statuses for visual coloring
  const earStatus = face_found ? (ear < stateData.settings?.ear_threshold ? 'WARNING' : 'NORMAL') : 'NORMAL';
  const morStatus = face_found ? (mouth_opening_ratio > stateData.settings?.yawn_threshold ? 'WARNING' : 'NORMAL') : 'NORMAL';
  const directionStatus = face_found ? (direction !== 'FORWARD' ? 'WARNING' : 'NORMAL') : 'NORMAL';

  return (
    <div style={{ width: '100%' }}>
      {/* Active High-Visibility Warning Banner */}
      <AlertBanner 
        status={status} 
        isDistracted={is_distracted} 
        distractionDuration={distraction_duration} 
      />

      <div className="dashboard-grid">
        
        {/* Left column: Feed + Stats cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Camera Feed Stream */}
          <CameraFeed isBackendOnline={isBackendOnline} />

          {/* Core metrics tracker row */}
          <div className="stats-grid">
            <MetricCard
              title="Eye Openness (EAR)"
              value={earVal}
              icon={Eye}
              status={earStatus}
              description={`Limit: ${stateData.settings?.ear_threshold || '0.22'}`}
            />
            <MetricCard
              title="Head Pose Direction"
              value={directionVal}
              icon={Compass}
              status={directionStatus}
              description={is_distracted ? 'Distraction warning active' : 'Tracking head yaw/pitch'}
            />
            <MetricCard
              title="Mouth Opening (MOR)"
              value={morVal}
              icon={Frown}
              status={morStatus}
              description={`Yawns Count: ${yawn_count}`}
            />
          </div>

        </div>

        {/* Right column: Fatigue Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Circular Fatigue Gauge Card */}
          <div className="glass-card gauge-card" style={{ flexGrow: 1, minHeight: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Fatigue Level Monitor
            </h3>
            
            <FatigueGauge score={score} status={status} />
            
            <span className={`status-badge ${status.toLowerCase()}`}>
              {status} STATE
            </span>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.5rem', maxWidth: '280px', lineHeight: 1.4 }}>
              {status === 'NORMAL' && 'Driver is awake and attentive. Keep up the focus!'}
              {status === 'WARNING' && 'Fatigue scoring increasing. Drowsiness warning is active.'}
              {status === 'FATIGUED' && 'High drowsiness level detected. Be prepared to stop.'}
              {status === 'CRITICAL' && 'CRITICAL: Driver is falling asleep! Alert sound is playing.'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
