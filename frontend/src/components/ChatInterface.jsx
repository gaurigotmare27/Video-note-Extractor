import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface({ videoId, apiKey, onSeek }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! Ask me anything about the video content. I can reference parts of the video with clickable timestamps!" }
  ]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || isSending) return;
    if (!videoId) {
      alert("Please upload or process a video first.");
      return;
    }
    if (!apiKey) {
      alert("Please configure your Gemini API Key first.");
      return;
    }
    const isDummy = (apiKey || '').toLowerCase().includes('dummy') || (apiKey || '').toLowerCase().includes('placeholder') || apiKey === 'AIzaSyDummyKey12345' || (apiKey || '').toLowerCase().includes('your_api_key');
    if (isDummy) {
      alert("You are using a placeholder/dummy API Key. Please enter a valid Gemini API Key in the top-right header input field.");
      return;
    }

    const userMessage = { role: 'user', content: query.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsSending(true);

    try {
      // Keep only last 10 messages for context window efficiency
      const historyToSend = messages
        .filter(m => m.role === 'user' || m.role === 'model')
        .slice(-10);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          query: userMessage.content,
          api_key: apiKey,
          history: historyToSend
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Chat request failed");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'model', content: data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', content: `Error: ${err.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  // Parses timestamps like [02:15] or [1:02:15] into clickable spans
  const parseMessageContent = (text) => {
    if (!text) return '';
    
    const timestampRegex = /(\[\d{1,2}:\d{2}(?::\d{2})?\])/g;
    const parts = text.split(timestampRegex);
    
    return parts.map((part, index) => {
      const match = part.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
      if (match) {
        let seconds = 0;
        const val1 = parseInt(match[1], 10);
        const val2 = parseInt(match[2], 10);
        const val3 = match[3] !== undefined ? parseInt(match[3], 10) : null;
        
        if (val3 !== null) {
          // Format is [HH:MM:SS]
          seconds = val1 * 3600 + val2 * 60 + val3;
        } else {
          // Format is [MM:SS]
          seconds = val1 * 60 + val2;
        }
        
        return (
          <span 
            key={index} 
            className="timestamp-citation" 
            onClick={() => onSeek(seconds)}
            title={`Seek to ${part}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-pulse"></div>
        <span>AI Video Study Assistant</span>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'user' ? msg.content : parseMessageContent(msg.content)}
          </div>
        ))}
        {isSending && (
          <div className="chat-message model" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question about this video..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isSending || !videoId}
        />
        <button 
          type="submit" 
          className="chat-send-btn" 
          disabled={!query.trim() || isSending || !videoId}
        >
          ➔
        </button>
      </form>
    </div>
  );
}
