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
      <div className="glass-panel player-container">
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          No video loaded. Enter a source above to get started.
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
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1${
            seekTrigger?.time !== undefined ? `&start=${Math.floor(seekTrigger.time)}` : ''
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
