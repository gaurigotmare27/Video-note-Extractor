import React, { useState } from 'react';

export default function NotesTab({ notes }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Built-in lightweight markdown parser to avoid external library installation errors
  const renderMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeContent = [];
    let codeLang = '';
    let inList = false;
    let listItems = [];

    const flushList = (key) => {
      if (listItems.length > 0) {
        elements.push(<ul key={`list-${key}`}>{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      // Handle Code Blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close code block
          elements.push(
            <pre key={`code-${index}`}>
              <code className={codeLang}>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          // Open code block
          flushList(index);
          inCodeBlock = true;
          codeLang = line.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Handle Headers
      if (line.startsWith('### ')) {
        flushList(index);
        elements.push(<h3 key={index}>{line.replace('### ', '')}</h3>);
        return;
      }
      if (line.startsWith('## ')) {
        flushList(index);
        elements.push(<h2 key={index}>{line.replace('## ', '')}</h2>);
        return;
      }
      if (line.startsWith('# ')) {
        flushList(index);
        elements.push(<h1 key={index}>{line.replace('# ', '')}</h1>);
        return;
      }

      // Handle Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        inList = true;
        const itemText = line.replace(/^[\s*-]+/, '').trim();
        listItems.push(<li key={`li-${index}`}>{parseInlineFormatting(itemText)}</li>);
        return;
      }

      // Empty Line
      if (!line.trim()) {
        flushList(index);
        return;
      }

      // Standard Paragraph
      flushList(index);
      elements.push(<p key={index}>{parseInlineFormatting(line)}</p>);
    });

    flushList('final');
    return elements;
  };

  // Helper to parse bold, code, and links in a line
  const parseInlineFormatting = (text) => {
    // Bold matching **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    // Inline code matching `code`
    const codeRegex = /`([^`]+)`/g;
    
    let parts = [text];
    
    // We do simple string replacement for display
    // To make it React friendly, we can do it via a quick HTML replacement or simple text splitting
    // For safety, let's just do a simple replacement of bold and inline code.
    // We can return a React element with bold and code tags.
    // Let's implement a simple inline parser:
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const tokens = text.split(regex);
    
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={i}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return <code key={i}>{token.slice(1, -1)}</code>;
      }
      return token;
    });
  };

  return (
    <div className="notes-container">
      <div className="notes-header">
        <button className="btn-secondary" onClick={handleCopy} style={{ padding: '6px 12px', fontSize: '13px' }}>
          {copied ? '✓ Copied!' : '📋 Copy Notes'}
        </button>
      </div>
      <div className="markdown-body">
        {renderMarkdown(notes)}
      </div>
    </div>
  );
}
