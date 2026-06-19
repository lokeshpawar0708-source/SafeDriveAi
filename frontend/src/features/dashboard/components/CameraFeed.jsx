import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

export default function CameraFeed({ isBackendOnline }) {
  const [streamUrl, setStreamUrl] = useState(`http://${window.location.hostname}:5000/api/stream`);
  const [connectionError, setConnectionError] = useState(false);
  const [key, setKey] = useState(0); // Key helper to force re-render/re-fetch img stream

  const handleImageError = () => {
    setConnectionError(true);
  };

  const handleRetry = () => {
    setConnectionError(false);
    setKey(prev => prev + 1); // Refresh image element
  };

  useEffect(() => {
    if (isBackendOnline) {
      setConnectionError(false);
    } else {
      setConnectionError(true);
    }
  }, [isBackendOnline]);

  return (
    <div className="glass-card video-card">
      <div className="video-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Driver Monitoring Feed</span>
        </div>
        <div className="live-indicator">
          {!connectionError && <div className="live-dot" />}
          <span style={{ color: connectionError ? 'var(--status-critical)' : 'inherit' }}>
            {connectionError ? 'OFFLINE' : 'LIVE'}
          </span>
        </div>
      </div>
      
      <div className="video-container">
        {connectionError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <CameraOff size={48} style={{ color: 'var(--status-critical)' }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>Camera Stream Disconnected</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Ensure Flask backend is running on port 5000 and the camera is not in use by another app.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleRetry} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} /> Retry Feed Connection
            </button>
          </div>
        ) : (
          <img
            key={key}
            className="video-stream"
            src={`${streamUrl}?t=${key}`}
            alt="SafeDrive AI Feed"
            onError={handleImageError}
          />
        )}
        
        {/* Futuristic scanline effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
          backgroundSize: '100% 4px, 6px 100%',
          pointerEvents: 'none'
        }} />
      </div>
    </div>
  );
}
