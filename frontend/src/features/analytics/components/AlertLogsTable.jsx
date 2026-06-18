import React, { useState } from 'react';
import { Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { clearLogs } from '../../../services/api';

export default function AlertLogsTable({ logs, onLogsCleared }) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear the logs? This will reset the history.")) {
      setClearing(true);
      const res = await clearLogs();
      setClearing(false);
      if (res && !res.error) {
        onLogsCleared();
      } else {
        alert("Failed to clear logs: " + (res?.error || "Unknown error"));
      }
    }
  };

  const getEventBadgeClass = (event) => {
    const ev = event.toLowerCase();
    if (ev.includes('drowsiness')) return 'log-event-badge drowsiness';
    if (ev.includes('distraction')) return 'log-event-badge distraction';
    return 'log-event-badge yawning';
  };

  return (
    <div className="glass-card logs-card">
      <div className="logs-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>Active Alert Logs</span>
        </div>
        <button 
          className="btn btn-danger" 
          onClick={handleClear} 
          disabled={logs.length === 0 || clearing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Trash2 size={14} />
          {clearing ? 'Clearing...' : 'Clear Logs'}
        </button>
      </div>

      <div className="table-container">
        {logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
            <ShieldCheck size={40} style={{ color: 'var(--status-normal)' }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No incidents logged</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Safe drive! No fatigue or distraction warnings recorded yet.
              </p>
            </div>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', width: '90px' }}>{log.time}</td>
                  <td style={{ width: '120px' }}>
                    <span className={getEventBadgeClass(log.event)}>{log.event}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
