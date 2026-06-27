import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MediaInput from './components/MediaInput';
import MediaViewer from './components/MediaViewer';
import ChatInterface from './components/ChatInterface';
import DashboardTab from './components/DashboardTab';
import NotesTab from './components/NotesTab';
import TimestampsTab from './components/TimestampsTab';
import TasksTab from './components/TasksTab';
import MindMapTab from './components/MindMapTab';
import StudyZoneTab from './components/StudyZoneTab';
import ExportTab from './components/ExportTab';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  
  // Media source state
  const [source, setSource] = useState(null); // 'youtube' or 'upload'
  const [videoId, setVideoId] = useState('');
  const [filePath, setFilePath] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');

  // Analysis result state
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Seek trigger: { time: seconds, trigger: Date.now() }
  const [seekTrigger, setSeekTrigger] = useState(null);

  // Load API Key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleProcessStart = (text) => {
    setIsProcessing(true);
    setStatusText(text);
    setErrorText('');
    setAnalysisData(null);
  };

  const handleProcessSuccess = (data, title, mediaSource) => {
    setIsProcessing(false);
    setAnalysisData(data);
    setSource(mediaSource);
    setMediaTitle(title);
    
    if (mediaSource === 'youtube') {
      setVideoId(data.video_id);
      setFilePath('');
    } else {
      setVideoId('');
      setFilePath(data.file_path);
    }
    setActiveTab('dashboard');
  };

  const handleProcessError = (errMessage) => {
    setIsProcessing(false);
    setErrorText(errMessage);
  };

  const handleSeek = (seconds) => {
    setSeekTrigger({ time: seconds, trigger: Date.now() });
  };

  const handleMindMapNodeClick = (nodeLabel) => {
    // Locate the chat input and fill it with a research query, or alert user how to ask
    const chatInput = document.querySelector('.chat-input');
    if (chatInput) {
      chatInput.value = `Explain the concept of "${nodeLabel}" in more detail.`;
      // Dispatch input event to update React state inside ChatInterface
      const event = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(event);
      chatInput.focus();
    }
  };

  return (
    <div className="app-container">
      <Header apiKey={apiKey} setApiKey={setApiKey} />

      <main className="dashboard-grid">
        {/* Left Column: Media input, player, and chat */}
        <div className="left-panel">
          <MediaInput 
            onProcessStart={handleProcessStart}
            onProcessSuccess={handleProcessSuccess}
            onProcessError={handleProcessError}
            apiKey={apiKey}
            isProcessing={isProcessing}
          />

          <MediaViewer 
            source={source} 
            videoId={videoId} 
            filePath={filePath}
            seekTrigger={seekTrigger}
          />

          <ChatInterface 
            videoId={videoId || filePath}
            apiKey={apiKey}
            onSeek={handleSeek}
          />
        </div>

        {/* Right Column: Tabbed Dashboard */}
        <div className="glass-panel right-panel">
          {isProcessing ? (
            /* Processing/Loading State */
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Extracting Video Intelligence</div>
              <div className="loading-subtext">{statusText}</div>
            </div>
          ) : errorText ? (
            /* Error State */
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--danger)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
              <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>Processing Failed</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                {errorText}
              </p>
              <button className="btn-secondary" onClick={() => setErrorText('')} style={{ marginTop: '20px' }}>
                Dismiss
              </button>
            </div>
          ) : !analysisData ? (
            /* Empty State */
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-text">No Notes Extracted Yet</div>
              <div className="empty-subtext">
                Paste a YouTube URL or upload a video file on the left to extract structured notes, timestamps, mind maps, quizzes, and chat with the content!
              </div>
            </div>
          ) : (
            /* Main Tabs Panel */
            <>
              <div className="tabs-header">
                <button 
                  className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Notes
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'timestamps' ? 'active' : ''}`}
                  onClick={() => setActiveTab('timestamps')}
                >
                  Timeline
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tasks')}
                >
                  Tasks
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mindmap')}
                >
                  Concept Map
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'study' ? 'active' : ''}`}
                  onClick={() => setActiveTab('study')}
                >
                  Study Zone
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                  onClick={() => setActiveTab('export')}
                >
                  Export
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'dashboard' && <DashboardTab data={analysisData} />}
                {activeTab === 'notes' && <NotesTab notes={analysisData.notes} />}
                {activeTab === 'timestamps' && (
                  <TimestampsTab 
                    timestamps={analysisData.timestamps} 
                    onSeek={handleSeek} 
                  />
                )}
                {activeTab === 'tasks' && <TasksTab initialTasks={analysisData.tasks} />}
                {activeTab === 'mindmap' && (
                  <MindMapTab 
                    mindMap={analysisData.mind_map} 
                    onNodeClick={handleMindMapNodeClick}
                  />
                )}
                {activeTab === 'study' && (
                  <StudyZoneTab 
                    quiz={analysisData.quiz} 
                    flashcards={analysisData.flashcards} 
                  />
                )}
                {activeTab === 'export' && (
                  <ExportTab 
                    notes={analysisData.notes} 
                    summary={analysisData.summary}
                    title={mediaTitle} 
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
