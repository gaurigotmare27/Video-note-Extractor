import React from 'react';

export default function DashboardTab({ data }) {
  if (!data) return null;

  const { summary, tags, speaker, notes, timestamps, tasks } = data;

  // Calculate some fun quick stats
  const wordCount = notes ? notes.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.round(wordCount / 200)); // 200 words per minute average reading speed
  const chapterCount = timestamps ? timestamps.length : 0;
  const taskCount = tasks ? tasks.length : 0;

  return (
    <div className="db-container">
      <div>
        <h3 className="db-title">Video Analysis Summary</h3>
        <div className="db-speaker" style={{ marginTop: '6px' }}>
          👤 Speaker/Host: <strong>{speaker || 'Unknown'}</strong>
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="tag-list">
          {tags.map((tag, index) => (
            <span key={index} className="tag">#{tag}</span>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{readingTime} min</div>
          <div className="stat-lbl">Reading Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{chapterCount}</div>
          <div className="stat-lbl">Chapters</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{taskCount}</div>
          <div className="stat-lbl">Action Tasks</div>
        </div>
      </div>

      <div className="summary-box">
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '15px' }}>Executive Summary</h4>
        {summary}
      </div>
    </div>
  );
}
