import React, { useState, useEffect } from 'react';
import { Eye, Compass, Frown, ShieldAlert, AlertTriangle } from 'lucide-react';
import CameraFeed from './CameraFeed';
import MetricCard from './MetricCard';
import FatigueGauge from './FatigueGauge';
import AlertBanner from '../../alerts/components/AlertBanner';
import { searchPlaces } from '../../../services/api';

export default function Dashboard({ stateData, isBackendOnline, onNavigateToStops }) {
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

  const [closestStops, setClosestStops] = useState([]);
  const showRecommendation = status !== "NORMAL";

  // Fetch closest stops when driver shows signs of fatigue
  useEffect(() => {
    if (showRecommendation) {
      const loadClosest = async () => {
        // Query rest stops within 25km of the default expressway center
        const data = await searchPlaces({ lat: 18.7480, lng: 73.4070, radius: 25 });
        if (data && data.length > 0) {
          // Sort is already done by backend. Slice the closest 2.
          setClosestStops(data.slice(0, 2));
        }
      };
      loadClosest();
    }
  }, [showRecommendation]);

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

          {/* Recommendations Card (visible when fatigued) */}
          {showRecommendation && closestStops.length > 0 && (
            <div className="glass-card recommendation-card pulse-border" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <AlertTriangle size={14} /> Fatigue Rest Stops
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Take a break! We found matching rest stops near you:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {closestStops.map(stop => (
                  <div key={stop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>{stop.name}</h5>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>★ {stop.rating} • {stop.price_text}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-normal)' }}>
                      {stop.distance_km} km
                    </span>
                  </div>
                ))}
              </div>
              <button 
                onClick={onNavigateToStops}
                className="btn btn-primary" 
                style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.25rem' }}
              >
                <Compass size={12} /> View Details & Navigate
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
