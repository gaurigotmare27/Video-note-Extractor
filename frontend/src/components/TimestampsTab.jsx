import React from 'react';

export default function TimestampsTab({ timestamps, onSeek }) {
  if (!timestamps || timestamps.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
        No timestamps extracted for this video.
      </div>
    );
  }

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timestamps-list">
      {timestamps.map((item, index) => (
        <div 
          key={index} 
          className="timestamp-item"
          onClick={() => onSeek(item.start)}
          title={`Seek to ${formatTime(item.start)}`}
        >
          <div className="timestamp-badge">
            {formatTime(item.start)}
          </div>
          <div className="timestamp-details">
            <div className="timestamp-label">{item.label}</div>
            {item.summary && <div className="timestamp-summary">{item.summary}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
