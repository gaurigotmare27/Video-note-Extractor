import React, { useState, useRef } from 'react';

export default function MediaInput({ onProcessStart, onProcessSuccess, onProcessError, apiKey, isProcessing }) {
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      alert("Please enter a Gemini API Key in the header first.");
      return;
    }
    const isDummy = apiKey.toLowerCase().includes('dummy') || apiKey.toLowerCase().includes('placeholder') || apiKey === 'AIzaSyDummyKey12345' || apiKey.toLowerCase().includes('your_api_key');
    if (isDummy) {
      alert("You are using a placeholder/dummy API Key. Please enter a valid Gemini API Key in the top-right header input field.");
      return;
    }
    if (!url.trim()) return;

    onProcessStart("Fetching YouTube transcript and running AI extraction...");
    
    try {
      const response = await fetch('/api/process-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), api_key: apiKey }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to process YouTube video");
      }

      const data = await response.json();
      onProcessSuccess(data, url.trim(), 'youtube');
    } catch (err) {
      onProcessError(err.message);
    }
  };

  const handleFileUpload = async (file) => {
    if (!apiKey) {
      alert("Please enter a Gemini API Key in the header first.");
      return;
    }
    const isDummy = apiKey.toLowerCase().includes('dummy') || apiKey.toLowerCase().includes('placeholder') || apiKey === 'AIzaSyDummyKey12345' || apiKey.toLowerCase().includes('your_api_key');
    if (isDummy) {
      alert("You are using a placeholder/dummy API Key. Please enter a valid Gemini API Key in the top-right header input field.");
      return;
    }
    if (!file) return;

    onProcessStart(`Uploading "${file.name}" and transcribing via Gemini Multimodal...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);

    try {
      const response = await fetch('/api/process-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to process uploaded file");
      }

      const data = await response.json();
      onProcessSuccess(data, file.name, 'upload');
    } catch (err) {
      onProcessError(err.message);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="glass-panel input-card">
      <div className="input-label">Select Source</div>
      
      <form onSubmit={handleYoutubeSubmit} className="input-row">
        <input
          type="text"
          className="url-input"
          placeholder="Paste YouTube Video URL (e.g., https://youtu.be/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isProcessing || !url.trim()}
        >
          {isProcessing ? 'Analyzing...' : 'Extract'}
        </button>
      </form>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>— OR —</div>

      <div 
        className={`upload-zone ${dragActive ? 'dragging' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          style={{ display: 'none' }} 
          accept="audio/*,video/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <div className="upload-icon">📁</div>
        <div className="upload-text">Drag & drop video/audio file here or <span style={{ color: 'var(--accent-purple)', fontWeight: '600' }}>browse</span></div>
        <div className="upload-subtext">Supports MP4, WEBM, MP3, M4A, etc. (Max 100MB recommended)</div>
      </div>
    </div>
  );
}
