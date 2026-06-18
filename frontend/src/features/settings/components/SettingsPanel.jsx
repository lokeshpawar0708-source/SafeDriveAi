import React, { useState, useEffect } from 'react';
import { Settings, Save, Sliders, CheckCircle } from 'lucide-react';
import { updateSettings } from '../../../services/api';

export default function SettingsPanel({ currentSettings, onSettingsUpdated }) {
  const [earThresh, setEarThresh] = useState(0.22);
  const [yawnThresh, setYawnThresh] = useState(0.50);
  const [distractThresh, setDistractThresh] = useState(3.0);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.ear_threshold !== undefined) setEarThresh(currentSettings.ear_threshold);
      if (currentSettings.yawn_threshold !== undefined) setYawnThresh(currentSettings.yawn_threshold);
      if (currentSettings.distraction_threshold_seconds !== undefined) setDistractThresh(currentSettings.distraction_threshold_seconds);
    }
  }, [currentSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateSettings({
      ear_threshold: earThresh,
      yawn_threshold: yawnThresh,
      distraction_threshold_seconds: distractThresh
    });
    setSaving(false);

    if (result && !result.error) {
      onSettingsUpdated(result.settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      alert("Failed to save settings: " + (result?.error || "Unknown error"));
    }
  };

  return (
    <div className="glass-card settings-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <Settings size={20} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>System Configuration</span>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* EAR Threshold */}
        <div className="form-group">
          <label>
            Eye Aspect Ratio (EAR) Threshold
          </label>
          <div className="form-control-row">
            <Sliders size={16} style={{ color: 'var(--status-normal)' }} />
            <input
              type="range"
              min="0.12"
              max="0.32"
              step="0.01"
              value={earThresh}
              onChange={(e) => setEarThresh(parseFloat(e.target.value))}
              className="form-control-slider"
            />
            <input
              type="number"
              value={earThresh}
              readOnly
              className="form-control-number"
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Lower values require the eyes to be closed tighter to increase the fatigue score. Standard value is 0.22.
          </p>
        </div>

        {/* Yawn Threshold */}
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label>
            Mouth Opening Ratio (MOR) Yawn Threshold
          </label>
          <div className="form-control-row">
            <Sliders size={16} style={{ color: 'var(--status-warning)' }} />
            <input
              type="range"
              min="0.30"
              max="0.75"
              step="0.01"
              value={yawnThresh}
              onChange={(e) => setYawnThresh(parseFloat(e.target.value))}
              className="form-control-slider"
            />
            <input
              type="number"
              value={yawnThresh}
              readOnly
              className="form-control-number"
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Measures lip separation vs mouth width. Detects yawning when mouth opens wider than this limit. Standard is 0.50.
          </p>
        </div>

        {/* Distraction Threshold */}
        <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <label>
            Distraction Alert Delay (Seconds)
          </label>
          <div className="form-control-row">
            <Sliders size={16} style={{ color: 'var(--status-fatigued)' }} />
            <input
              type="range"
              min="1.5"
              max="7.0"
              step="0.5"
              value={distractThresh}
              onChange={(e) => setDistractThresh(parseFloat(e.target.value))}
              className="form-control-slider"
            />
            <input
              type="number"
              value={distractThresh}
              readOnly
              className="form-control-number"
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Duration (in seconds) the driver can look away (left, right, or down) before triggering a distraction warning. Standard is 3.0s.
          </p>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {showSuccess && (
              <span style={{ color: 'var(--status-normal)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={14} /> Settings applied dynamically!
              </span>
            )}
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
          >
            <Save size={15} />
            {saving ? 'Applying...' : 'Apply Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
