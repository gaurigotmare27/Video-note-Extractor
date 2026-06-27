import React from 'react';

export default function Header({ apiKey, setApiKey }) {
  const handleKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  return (
    <header className="app-header">
      <div className="logo-container">
        <div className="logo-icon">⚡</div>
        <div className="logo-title">Video Note Extractor</div>
      </div>
      
      <div className="api-key-container">
        <label htmlFor="api-key-input" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Gemini API Key:
        </label>
        <input
          id="api-key-input"
          type="password"
          className="api-key-input"
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={handleKeyChange}
        />
      </div>
    </header>
  );
}
