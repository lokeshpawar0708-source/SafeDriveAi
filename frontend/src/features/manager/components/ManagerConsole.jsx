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

      </div>

      {/* Main Row: RAG Assistant + MongoDB Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.12fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Side: RAG Chat Assistant */}
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
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => suggestQuery("Summarize driving logs")}>
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

        {/* Right Side: MongoDB Logs Table */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
          
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontWeight: 700 }}>MongoDB Cluster Logs ({dbLogs.length})</span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={loadLogs} 
                disabled={refreshing}
                style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} style={{ animation: refreshing ? 'pulse-spin 1s infinite linear' : 'none' }} />
              </button>
              
              <button 
                className="btn btn-danger" 
                onClick={handleClearDb} 
                disabled={dbLogs.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}
              >
                <Trash2 size={14} /> Clear DB
              </button>
            </div>
          </div>

          <div className="table-container" style={{ flexGrow: 1, padding: '1rem', maxHeight: 'none', overflowY: 'auto' }}>
            {dbLogs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 2rem', textAlign: 'center' }}>
                <ShieldCheck size={48} style={{ color: 'var(--status-normal)' }} />
                <div>
                  <p style={{ fontWeight: 700 }}>No database logs found</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Webcam alerts will sync to MongoDB in real time.
                  </p>
                </div>
              </div>
            ) : (
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Driver</th>
                    <th>Event</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {dbLogs.map((log, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>{log.time}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.driver_id}</td>
                      <td>
                        <span className={getBadgeClass(log.event)}>{log.event}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
