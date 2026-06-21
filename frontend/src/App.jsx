import React, { useState, useEffect, useRef } from 'react';
import { Activity, BarChart3, Settings, ShieldAlert, Cpu, Heart, CheckCircle2, AlertTriangle, Users, MapPin } from 'lucide-react';
import { getStatus, getLogs } from './services/api';
import Dashboard from './features/dashboard/components/Dashboard';
import AnalyticsPanel from './features/analytics/components/AnalyticsPanel';
import SettingsPanel from './features/settings/components/SettingsPanel';
import ManagerConsole from './features/manager/components/ManagerConsole';
import RestStopsPanel from './features/places/components/RestStopsPanel';

const DEFAULT_STATE = {
  face_found: false,
  ear: 0.0,
  mouth_opening_ratio: 0.0,
  score: 0,
  status: "NORMAL",
  direction: "FORWARD",
  is_distracted: false,
  distraction_duration: 0.0,
  yawn_count: 0,
  drowsiness_alerts_count: 0,
  distraction_alerts_count: 0,
  risk_level: "LOW",
  settings: {
    ear_threshold: 0.22,
    yawn_threshold: 0.50,
    distraction_threshold_seconds: 3.0
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [stateData, setStateData] = useState(DEFAULT_STATE);
  const [logs, setLogs] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [connRetries, setConnRetries] = useState(0);

  // References for intervals to clear on unmount
  const statusInterval = useRef(null);
  const logsInterval = useRef(null);

  // Polling Status API (100ms for fast feedback)
  useEffect(() => {
    const fetchStatus = async () => {
      const data = await getStatus();
      if (data) {
        setStateData(data);
        setIsBackendOnline(true);
        setConnRetries(0);
      } else {
        setConnRetries(prev => {
          if (prev >= 3) {
            setIsBackendOnline(false);
          }
          return prev + 1;
        });
      }
    };

    fetchStatus(); // immediate execution
    statusInterval.current = setInterval(fetchStatus, 150);

    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
    };
  }, []);

  // Polling Logs API (1000ms is fine)
  const fetchLogs = async () => {
    const data = await getLogs();
    if (data) {
      setLogs(data);
    }
  };

  useEffect(() => {
    fetchLogs(); // immediate execution
    logsInterval.current = setInterval(fetchLogs, 1500);

    return () => {
      if (logsInterval.current) clearInterval(logsInterval.current);
    };
  }, []);

  const handleSettingsUpdated = (newSettings) => {
    setStateData(prev => ({
      ...prev,
      settings: newSettings
    }));
  };

  const handleLogsCleared = () => {
    setLogs([]);
    fetchLogs();
  };

  return (
    <div>
      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">🚗</div>
          <div className="logo-text">
            <h1>SafeDrive AI</h1>
            <span>Driver Safety Shield</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            <Activity size={16} /> Live Monitor
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} /> Safety Analytics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'places' ? 'active' : ''}`}
            onClick={() => setActiveTab('places')}
          >
            <MapPin size={16} /> Nearby Rest Stops
          </button>
          <button 
            className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`}
            onClick={() => setActiveTab('manager')}
          >
            <Users size={16} /> Manager Console
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> System Settings
          </button>
        </div>

        {/* System Online Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>System Status:</span>
          {isBackendOnline ? (
            <span style={{ color: 'var(--status-normal)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Cpu size={14} /> ONLINE
            </span>
          ) : (
            <span style={{ color: 'var(--status-critical)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldAlert size={14} style={{ animation: 'pulse-icon 0.5s infinite alternate' }} /> OFFLINE
            </span>
          )}
        </div>
      </header>

      {/* Main Panel Content switching */}
      <main>
        {activeTab === 'monitor' && (
          <Dashboard 
            stateData={stateData} 
            isBackendOnline={isBackendOnline} 
            onNavigateToStops={() => setActiveTab('places')}
          />
        )}
        
        {activeTab === 'places' && (
          <div style={{ padding: '0 2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <RestStopsPanel stateData={stateData} />
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div style={{ padding: '0 2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <AnalyticsPanel 
              stateData={stateData} 
              logs={logs} 
              onLogsCleared={handleLogsCleared} 
            />
          </div>
        )}

        {activeTab === 'manager' && (
          <div style={{ padding: '0 2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <ManagerConsole stateData={stateData} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ padding: '0 2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <SettingsPanel 
              currentSettings={stateData.settings} 
              onSettingsUpdated={handleSettingsUpdated} 
            />
          </div>
        )}
      </main>

      {/* Futuristic footer credit */}
      <footer style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>SafeDrive AI Driver Monitoring System • Edge CV & Mediapipe Engine v1.0.0</p>
      </footer>
    </div>
  );
}
