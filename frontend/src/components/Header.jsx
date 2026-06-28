import React, { useState } from 'react';

export default function Header({ apiKey, setApiKey }) {
  const [showKey, setShowKey] = useState(false);

  const handleKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const isDummy = apiKey.toLowerCase().includes('dummy') || apiKey.toLowerCase().includes('placeholder') || apiKey === 'AIzaSyDummyKey12345' || apiKey.toLowerCase().includes('your_api_key');

  return (
    <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="logo-container">
        <div className="logo-icon">⚡</div>
        <div className="logo-title">Video Note Extractor</div>
      </div>
      
      <div className="api-key-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <div className="api-key-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="api-key-input" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Gemini API Key:
          </label>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              id="api-key-input"
              type={showKey ? "text" : "password"}
              className={`api-key-input ${isDummy ? 'error-border' : ''}`}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={handleKeyChange}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
                color: 'var(--text-muted)'
              }}
              title={showKey ? "Hide API Key" : "Show API Key"}
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
        {isDummy && (
          <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '700' }}>
            ⚠️ Dummy/placeholder key detected! Enter a valid API Key.
          </span>
        )}
      </div>
    </header>
  );
}
