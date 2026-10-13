import React, { useEffect, useRef } from 'react';

export default function MediaViewer({ source, videoId, filePath, seekTrigger }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (seekTrigger && seekTrigger.time !== undefined) {
      const timeInSeconds = seekTrigger.time;

      if (source === 'upload' && videoRef.current) {
        videoRef.current.currentTime = timeInSeconds;
        videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
      }
    }
  }, [seekTrigger, source]);

  if (!videoId && !filePath) {
    return (
      <div className="glass-panel player-container is-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="placeholder-svg">
              <defs>
                <linearGradient id="placeholder-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <polygon points="10 8 16 11 10 14 10 8" fill="url(#placeholder-grad)" />
            </svg>
          </div>
          <h3 className="placeholder-title">Ready to Extract Notes?</h3>
          <p className="placeholder-text">
            Enter a YouTube link or upload a local file above to start extracting structured notes, timeline chapters, mind maps, and interactive quizzes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel player-container">
      {source === 'youtube' ? (
        <iframe
          id="yt-player"
          className="video-frame"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1${seekTrigger?.time !== undefined ? `&start=${Math.floor(seekTrigger.time)}` : ''
            }`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      ) : (
        <video
          ref={videoRef}
          className="local-media-player"
          src={`/api/stream/${filePath}`}
          controls
          autoPlay
        ></video>
      )}
    </div>
  );
}
