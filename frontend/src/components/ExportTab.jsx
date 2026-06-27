import React from 'react';

export default function ExportTab({ notes, summary, title }) {
  const handleDownloadMarkdown = () => {
    if (!notes) return;
    
    const markdownContent = `# ${title || 'Video Study Notes'}\n\n## Summary\n${summary || ''}\n\n${notes}`;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Clean filename
    const filename = (title || 'video-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '.md';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    if (!notes) return;

    const printWindow = window.open('', '_blank');
    
    // Convert basic markdown elements to HTML for print window
    const formattedNotesHTML = notes
      .split('\n')
      .map(line => {
        if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
        if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return `<li>${line.replace(/^[\s*-]+/, '').trim()}</li>`;
        }
        if (!line.trim()) return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title || 'Video Notes'} - Export</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              line-height: 1.6; 
              padding: 40px; 
              color: #111; 
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 28px; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; margin-bottom: 20px; color: #1e1b4b; }
            h2 { font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; color: #312e81; }
            h3 { font-size: 16px; margin-top: 20px; color: #4338ca; }
            p { margin-bottom: 15px; text-align: justify; }
            li { margin-bottom: 8px; }
            pre { background: #f3f4f6; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 13px; }
            code { font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 13px; }
            .meta { font-size: 13px; color: #666; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>${title || 'Video Note Extract'}</h1>
          <div class="meta">Exported from Video Note Extractor on ${new Date().toLocaleDateString()}</div>
          <h2>Executive Summary</h2>
          <p>${summary || 'No summary available.'}</p>
          <h2>Notes</h2>
          <div>${formattedNotesHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    // Delay slightly to ensure browser loaded content before print popup
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="export-panel">
      <h4 style={{ margin: 0, fontSize: '15px' }}>Export Assets</h4>
      
      <div className="export-grid">
        <div className="export-card">
          <div className="export-title">
            <span>📝</span> Markdown Document
          </div>
          <div className="export-desc">
            Download your notes as a clean Markdown (.md) file. Perfect for imports into Notion, Obsidian, or GitHub.
          </div>
          <button className="btn-primary" onClick={handleDownloadMarkdown} disabled={!notes}>
            Download .md
          </button>
        </div>

        <div className="export-card">
          <div className="export-title">
            <span>📄</span> PDF / Print Template
          </div>
          <div className="export-desc">
            Generate a clean, high-contrast print layout to print notes directly or save as a PDF file.
          </div>
          <button className="btn-primary" onClick={handlePrintPdf} disabled={!notes}>
            Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
