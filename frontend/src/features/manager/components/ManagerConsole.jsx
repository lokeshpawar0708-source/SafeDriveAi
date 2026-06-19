import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Send, Bot, User, Trash2, Database, ShieldCheck, RefreshCw, Sparkles, HelpCircle, Lock, UserPlus, LogOut } from 'lucide-react';
import { getDbLogs, clearDbLogs, queryRag, loginManager, signupManager } from '../../../services/api';

export default function ManagerConsole({ stateData }) {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("manager_token"));
  const [managerUser, setManagerUser] = useState(localStorage.getItem("manager_username") || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Console states
  const [dbLogs, setDbLogs] = useState([]);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your SafeDrive AI Safety Assistant. I can search our MongoDB cluster logs to tell you which driver slept, when they yawned, or if their camera was disconnected. Ask me anything!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load MongoDB logs (only if logged in)
  const loadLogs = async () => {
    if (!isLoggedIn) return;
    setRefreshing(true);
    const data = await getDbLogs();
    if (data) {
      setDbLogs(data);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadLogs();
    }
  }, [isLoggedIn]);

  // Handle Auth submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }
    
    setAuthLoading(true);
    if (authMode === 'login') {
      const res = await loginManager(usernameInput, passwordInput);
      setAuthLoading(false);
      
      if (res && res.success) {
        localStorage.setItem("manager_token", res.token);
        localStorage.setItem("manager_username", res.username);
        setManagerUser(res.username);
        setIsLoggedIn(true);
        // Clear forms
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setAuthError(res?.error || 'Authentication failed. Please check credentials.');
      }
    } else {
      const res = await signupManager(usernameInput, passwordInput);
      setAuthLoading(false);
      
      if (res && res.success) {
        setAuthSuccessMsg('Account created successfully! Please login with your password.');
        setAuthMode('login');
        setPasswordInput('');
      } else {
        setAuthError(res?.error || 'Registration failed. Username may be taken.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("manager_token");
    localStorage.removeItem("manager_username");
    setIsLoggedIn(false);
    setManagerUser('');
    setMessages([
      {
        sender: 'assistant',
        text: "Hello! I am your SafeDrive AI Safety Assistant. I can search our MongoDB cluster logs to tell you which driver slept, when they yawned, or if their camera was disconnected. Ask me anything!"
      }
    ]);
  };

  const handleSend = async (textToSend) => {
    const queryText = textToSend || chatInput;
    if (!queryText.trim()) return;

    // Add user message to chat
    setMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setChatInput('');
    setLoading(true);

    // Call RAG API
    const res = await queryRag(queryText);
    setLoading(false);

    if (res && !res.error) {
      setMessages(prev => [...prev, { sender: 'assistant', text: res.response }]);
      // Refresh DB logs
      loadLogs();
    } else {
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: "Error: Failed to fetch RAG response. Check if backend is active." 
      }]);
    }
  };

  const handleClearDb = async () => {
    if (window.confirm("Are you sure you want to delete all historical logs in the MongoDB Cluster?")) {
      const res = await clearDbLogs();
      if (res && !res.error) {
        setDbLogs([]);
        setMessages(prev => [...prev, { 
          sender: 'assistant', 
          text: "Database cleared! All historical records in MongoDB have been deleted." 
        }]);
      } else {
        alert("Failed to clear database logs: " + (res?.error || "Unknown error"));
      }
    }
  };

  const handleExportCsv = () => {
    if (dbLogs.length === 0) return;
    
    // Define headers
    const headers = ["Timestamp", "Driver ID", "Event Type", "Event Details"];
    
    // Construct CSV rows
    const rows = dbLogs.map(log => [
      `"${log.time}"`,
      `"${log.driver_id}"`,
      `"${log.event}"`,
      `"${log.details.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `safedrive_fleet_session_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const suggestQuery = (query) => {
    handleSend(query);
  };

  const getBadgeClass = (event) => {
    const ev = event.toLowerCase();
    if (ev.includes('drowsiness')) return 'log-event-badge drowsiness';
    if (ev.includes('distraction')) return 'log-event-badge distraction';
    if (ev.includes('camera')) return 'log-event-badge drowsiness'; 
    return 'log-event-badge yawning';
  };

  // Calculate dynamic driver safety score based on MongoDB logs
  const getSafetyScore = () => {
    let score = 100;
    let counts = { drowsiness: 0, distraction: 0, yawning: 0, camera: 0 };
    
    dbLogs.forEach(log => {
      const ev = log.event.toLowerCase();
      if (ev.includes('drowsiness') || ev.includes('sleep')) {
        score -= 15;
        counts.drowsiness += 1;
      } else if (ev.includes('distraction') || ev.includes('look')) {
        score -= 5;
        counts.distraction += 1;
      } else if (ev.includes('yawn')) {
        score -= 3;
        counts.yawning += 1;
      } else if (ev.includes('camera') || ev.includes('offline') || ev.includes('absent') || ev.includes('disconnect')) {
        score -= 10;
        counts.camera += 1;
      }
    });
    
    return {
      score: Math.max(0, score),
      counts
    };
  };

  const { score: safetyScore, counts: eventCounts } = getSafetyScore();

  const getGazeDistractions = () => {
    let left = 0;
    let right = 0;
    let down = 0;
    dbLogs.forEach(log => {
      if (log.event.toLowerCase().includes('distraction')) {
        const details = log.details.toLowerCase();
        if (details.includes('left')) left++;
        else if (details.includes('right')) right++;
        else if (details.includes('down')) down++;
      }
    });
    const total = left + right + down || 1;
    return {
      left,
      right,
      down,
      pctLeft: (left / total) * 100,
      pctRight: (right / total) * 100,
      pctDown: (down / total) * 100
    };
  };

  const gazeStats = getGazeDistractions();

  // Simulated fleet leaderboard
  const leaderboardData = [
    { name: "Driver_03 (Truck-88)", score: 98, status: "Excellent" },
    { name: "Driver_02 (Truck-12)", score: 92, status: "Excellent" },
    { name: "Driver_01 (You / active)", score: safetyScore, status: safetyScore >= 80 ? "Excellent" : safetyScore >= 60 ? "Caution" : "Risk" },
    { name: "Driver_04 (Truck-05)", score: 78, status: "Caution" },
  ].sort((a, b) => b.score - a.score);

  // --- Auth screen UI ---
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Manager Verification</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Access to fleet safety history and RAG chat requires credentials.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            
            {authError && (
              <div style={{ 
                background: 'rgba(244, 63, 94, 0.15)', 
                border: '1px solid var(--status-critical)', 
                color: 'var(--status-critical)', 
                borderRadius: '8px', 
                padding: '0.6rem 1rem', 
                fontSize: '0.85rem',
                marginBottom: '1.25rem' 
              }}>
                {authError}
              </div>
            )}

            {authSuccessMsg && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid var(--status-normal)', 
                color: 'var(--status-normal)', 
                borderRadius: '8px', 
                padding: '0.6rem 1rem', 
                fontSize: '0.85rem',
                marginBottom: '1.25rem' 
              }}>
                {authSuccessMsg}
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <div className="form-control-row" style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Enter manager username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '0.6rem 1rem',
                    fontFamily: 'var(--font-family)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: '2rem' }}>
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '0.6rem 1rem',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={authLoading}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem', 
                padding: '0.75rem',
                fontSize: '0.95rem' 
              }}
            >
              {authMode === 'login' ? <Lock size={16} /> : <UserPlus size={16} />}
              {authLoading ? 'Verifying...' : authMode === 'login' ? 'Verify & Login' : 'Register Manager'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {authMode === 'login' ? "Need a manager account?" : "Already have an account?"}
            </span>{' '}
            <button 
              className="btn" 
              style={{ background: 'none', border: 'none', color: 'var(--status-warning)', padding: 0, fontWeight: 700, textDecoration: 'underline' }}
              onClick={() => {
                setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
                setAuthError('');
                setAuthSuccessMsg('');
              }}
            >
              {authMode === 'login' ? 'Register here' : 'Login here'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Authenticated Manager Dashboard ---
  return (
    <div className="manager-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Fleet Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Active Driver Card */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-normal)', borderRadius: '12px', padding: '1rem' }}>
            🚗
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Fleet Drivers</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.15rem' }}>Driver_01</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--status-normal)', fontWeight: 600 }}>🟢 ACTIVE MONITORING</span>
          </div>
        </div>

        {/* Alarm State Tracker */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            background: stateData.status === 'CRITICAL' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
            color: stateData.status === 'CRITICAL' ? 'var(--status-critical)' : 'var(--text-muted)', 
            borderRadius: '12px', padding: '1rem' 
          }}>
            🔊
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Safety Alarm</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.15rem' }}>
              {stateData.status === 'CRITICAL' ? 'BUZZER ACTIVE' : 'MUTED / STANDBY'}
            </h3>
            <span style={{ 
              fontSize: '0.75rem', 
              color: stateData.status === 'CRITICAL' ? 'var(--status-critical)' : 'var(--text-muted)', 
              fontWeight: 600 
            }}>
              {stateData.status === 'CRITICAL' ? '🚨 DRIVER DROWSINESS ALERT!' : '🛡️ ROAD SAFETY GUARANTEED'}
            </span>
          </div>
        </div>

        {/* Database Stats & Logout */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)', borderRadius: '12px', padding: '1rem' }}>
              📁
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manager Active Session</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.15rem', textTransform: 'capitalize' }}>
                {managerUser}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connected to MongoDB</span>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Dynamic Safety Score Card */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            background: safetyScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : safetyScore >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.2)', 
            color: safetyScore >= 80 ? 'var(--status-normal)' : safetyScore >= 60 ? 'var(--status-warning)' : 'var(--status-critical)', 
            borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>🛡️</span>
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session Safety Score</div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.15rem', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              {safetyScore}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
            </h3>
            <span style={{ 
              fontSize: '0.7rem', 
              color: safetyScore >= 80 ? 'var(--status-normal)' : safetyScore >= 60 ? 'var(--status-warning)' : 'var(--status-critical)', 
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {safetyScore >= 80 ? '🟢 EXCELLENT' : safetyScore >= 60 ? '🟡 CAUTION' : '🚨 CRITICAL RISK'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Row: Remote Live Feed & Logs (Left) + RAG Chat Assistant (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '1.5rem' }}>
        
        {/* Left Side: Remote Live Feed + MongoDB Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '520px' }}>
          
          {/* Live Video Feed Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '220px', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>📹</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Remote Driver Live Feed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 1.2s infinite' }} />
                REMOTE LIVE
              </div>
            </div>
            <div style={{ flexGrow: 1, position: 'relative', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              <img 
                src={`http://${window.location.hostname}:5000/api/stream`} 
                alt="Remote driver monitoring stream" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.querySelector('.stream-offline-placeholder').style.display = 'flex';
                }}
              />
              <div className="stream-offline-placeholder" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>⚠️ Remote Camera Stream Offline</span>
              </div>
              
              {/* Scanline overlay for scifi/futuristic effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)',
                backgroundSize: '100% 4px',
                pointerEvents: 'none'
              }} />
            </div>
          </div>

          {/* MongoDB Logs Table Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '285px', overflow: 'hidden' }}>
            
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={16} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>MongoDB Fleet Logs ({dbLogs.length})</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={loadLogs} 
                  disabled={refreshing}
                  style={{ padding: '0.25rem 0.4rem', display: 'flex', alignItems: 'center' }}
                  title="Refresh Database Logs"
                >
                  <RefreshCw size={12} className={refreshing ? 'spin-icon' : ''} style={{ animation: refreshing ? 'pulse-spin 1s infinite linear' : 'none' }} />
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={handleExportCsv} 
                  disabled={dbLogs.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Export Session Logs to CSV"
                >
                  📥 Export CSV
                </button>
                
                <button 
                  className="btn btn-danger" 
                  onClick={handleClearDb} 
                  disabled={dbLogs.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Clear Historical Logs in MongoDB"
                >
                  <Trash2 size={12} /> Clear DB
                </button>
              </div>
            </div>

            {/* Event counter bar */}
            {dbLogs.length > 0 && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '0.3rem', 
                padding: '0.4rem 0.6rem', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderBottom: '1px solid var(--glass-border)',
                fontSize: '0.75rem',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ color: 'var(--status-critical)', fontWeight: 800 }}>{eventCounts.drowsiness}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> Drowsy</span>
                </div>
                <div>
                  <span style={{ color: 'var(--status-warning)', fontWeight: 800 }}>{eventCounts.distraction}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> Distracted</span>
                </div>
                <div>
                  <span style={{ color: '#f59e0b', fontWeight: 800 }}>{eventCounts.yawning}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> Yawns</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{eventCounts.camera}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> Offline</span>
                </div>
              </div>
            )}

            <div className="table-container" style={{ flexGrow: 1, padding: '0.5rem', maxHeight: 'none', overflowY: 'auto' }}>
              {dbLogs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <ShieldCheck size={36} style={{ color: 'var(--status-normal)' }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>No database logs found</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Webcam alerts will sync to MongoDB in real time.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="logs-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbLogs.map((log, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{log.time}</td>
                        <td>
                          <span className={getBadgeClass(log.event)} style={{ padding: '0.1rem 0.3rem', fontSize: '0.7rem' }}>{log.event}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>

        {/* Right Side: RAG Chat Assistant */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '520px', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--status-warning)' }} />
              <span style={{ fontWeight: 700 }}>AI Safety Assistant (Groq Llama 3 MultiQuery RAG)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              LangGraph Agent
            </span>
          </div>

          {/* Messages Logs Area */}
          <div style={{ flexGrow: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                {msg.sender === 'assistant' && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)', borderRadius: '50%', padding: '0.4rem' }}>
                    <Bot size={16} />
                  </div>
                )}
                
                <div style={{ 
                  maxWidth: '75%', 
                  background: msg.sender === 'user' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)', 
                  border: '1px solid',
                  borderColor: msg.sender === 'user' ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)',
                  color: '#ffffff',
                  padding: '0.75rem 1rem', 
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '2px 14px 14px 14px',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.text}
                </div>

                {msg.sender === 'user' && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-normal)', borderRadius: '50%', padding: '0.4rem' }}>
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)', borderRadius: '50%', padding: '0.4rem' }}>
                  <Bot size={16} />
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--glass-border)', padding: '0.6rem 1rem', borderRadius: '2px 14px 14px 14px' }}>
                  <span className="dot-pulse" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 1.2s infinite 0s' }} />
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 1.2s infinite 0.2s' }} />
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 1.2s infinite 0.4s' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Query Helpers */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', alignSelf: 'center' }}>
              <HelpCircle size={12} /> Suggest:
            </span>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => suggestQuery("Driver_01 soya tha kya?")}>
              Driver soya tha kya?
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => suggestQuery("Was camera disconnected?")}>
              Camera status block/off?
            </button>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => suggestQuery("Summarize driving safety")}>
              Summarize driving safety
            </button>
          </div>

          {/* Chat Inputs */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask: 'Soya tha kya driver?' or 'Was the camera turned off?'..."
              disabled={loading}
              style={{
                flexGrow: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: '#ffffff',
                padding: '0.6rem 1rem',
                fontFamily: 'var(--font-family)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !chatInput.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}
            >
              <Send size={15} /> Send
            </button>
          </form>

        </div>

      </div>

      {/* Bottom Row: Fleet Leaderboard & Gaze Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        
        {/* Fleet Leaderboard */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏆 Fleet Safety Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {leaderboardData.map((d, index) => {
              const isActive = d.name.includes("You");
              return (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.5rem 0.75rem', 
                    background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontWeight: 800, 
                      color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-muted)' 
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? '#ffffff' : 'var(--text-muted)' }}>
                      {d.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: d.status === 'Excellent' ? 'rgba(16,185,129,0.15)' : d.status === 'Caution' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)',
                      color: d.status === 'Excellent' ? 'var(--status-normal)' : d.status === 'Caution' ? 'var(--status-warning)' : 'var(--status-critical)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {d.status}
                    </span>
                    <span style={{ fontWeight: 800, color: '#ffffff' }}>{d.score} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Gaze Analytics */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Distraction Gaze Analytics
          </h3>
          
          {dbLogs.filter(l => l.event.toLowerCase().includes('distraction')).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👁️</span>
              <p style={{ fontSize: '0.85rem' }}>No distraction events logged yet.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>Driver gaze patterns will appear here once distraction is detected.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              
              {/* Left gaze bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Looking Left (Side Mirror / Phone)</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{gazeStats.left} times ({Math.round(gazeStats.pctLeft)}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${gazeStats.pctLeft}%`, height: '100%', background: 'var(--status-warning)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Right gaze bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Looking Right (Passenger Side)</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{gazeStats.right} times ({Math.round(gazeStats.pctRight)}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${gazeStats.pctRight}%`, height: '100%', background: '#f59e0b', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Down gaze bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Looking Down (Gear / Mobile / Lap)</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{gazeStats.down} times ({Math.round(gazeStats.pctDown)}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${gazeStats.pctDown}%`, height: '100%', background: 'var(--status-critical)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
// Touch to force HMR recompile

