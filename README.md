# ⚡ Video Note Extractor

An AI-powered web application that extracts structured notes, timelines, actionable tasks, concept maps (mind maps), and study materials (quizzes and flashcards) from YouTube videos or uploaded video/audio files. It also provides a RAG-based chat interface to query the video content with clickable timestamp citations.

---

## 🛠️ Project Structure

The project is split into two parts:
1. **Backend (`/backend`)**: A Python FastAPI server that handles YouTube transcript fetching, audio downloading fallback via `yt-dlp`, RAG vector indexing, and AI structured analysis using Gemini 1.5 Flash.
2. **Frontend (`/frontend`)**: A React + Vite web application styled with modern glassmorphic aesthetics, featuring interactive timelines, mind maps, quizzes, flashcards, and a chat interface.

---

## 🚀 Getting Started

To run the application locally, you must start **both** the backend and the frontend servers.

### 1. Start the Backend Server

First, install the Python dependencies and launch the FastAPI server.

1. Open a terminal in the project root directory.
2. Activate the virtual environment:
   * **Windows (PowerShell)**: 
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```
3. Install required packages (if not already installed):
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python backend/main.py
   ```
The backend server will run at `http://127.0.0.1:8000`.

---

### 2. Start the Frontend Server

Next, start the React Vite server, which will proxy requests to the backend.

1. Open a new terminal window in the project root directory.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install node packages (if not already installed):
   ```bash
   npm install
   ```
4. Start the Vite dev server:
   ```bash
   npm run dev
   ```
The frontend server will run at `http://localhost:5173/`. Open this URL in your web browser.

---

## 🔑 How to Use

1. **Enter Gemini API Key**: Get a free API Key from [Google AI Studio](https://aistudio.google.com/) and paste it into the **Gemini API Key** input field in the top-right header of the web page.
2. **Provide Video Source**:
   * **YouTube Link**: Paste any YouTube link (supports standard watch links, mobile links, Shorts, and Live streams) and click **Extract**.
   * **Local File**: Drag and drop any video or audio file (MP4, WEBM, MP3, M4A, etc.) into the upload zone on the left.
3. **Explore Extracted Insights**:
   * **Dashboard**: High-level video details, tags, and reading stats.
   * **Notes**: Rich educational markdown notes.
   * **Timeline**: Interactive video chapters; click on any timestamp to jump directly to that point in the YouTube video!
   * **Tasks**: A priority-organized checklist of actionable tasks from the video.
   * **Concept Map**: Interactive 2D graph mapping out key terms and concepts.
   * **Study Zone**: Test your knowledge with interactive multiple-choice quizzes and flip flashcards.
   * **Export**: Print or download the notes as structured Markdown.
4. **Chat with Video**: Ask questions in the chat interface on the left. The AI uses semantic search to fetch context segments from the transcript and provides clickable timestamp citations (e.g., `[02:15]`) to jump back to the exact video segment.
