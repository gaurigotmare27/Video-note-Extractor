import os
import shutil
import uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

# Import services
from services.youtube_service import YouTubeService
from services.gemini_service import GeminiService
from services.rag_service import RAGService

app = FastAPI(title="Video Note Extractor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class YouTubeRequest(BaseModel):
    url: str
    api_key: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    video_id: str
    query: str
    api_key: str
    history: List[ChatMessage]

@app.post("/api/process-youtube")
async def process_youtube(req: YouTubeRequest):
    try:
        video_id = YouTubeService.extract_video_id(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Try to fetch transcript
    transcript = YouTubeService.get_transcript(video_id)
    
    if transcript:
        print(f"Transcript found for video {video_id}. Analyzing text...")
        # Format transcript text for Gemini prompt
        formatted_lines = []
        for item in transcript:
            start_sec = item['start']
            minutes = int(start_sec // 60)
            seconds = int(start_sec % 60)
            timestamp_str = f"[{minutes:02d}:{seconds:02d}]"
            formatted_lines.append(f"{timestamp_str} {item['text']}")
        transcript_text = "\n".join(formatted_lines)
        
        try:
            # Send text transcript to Gemini for analysis
            analysis = GeminiService.analyze_content(api_key=req.api_key, transcript_text=transcript_text)
            
            # Index transcript in RAG
            chunks_indexed = RAGService.index_transcript(video_id, transcript, req.api_key)
            print(f"Indexed {chunks_indexed} RAG chunks from transcript for {video_id}")
            
            # Add video metadata to response
            analysis["video_id"] = video_id
            analysis["source"] = "youtube"
            analysis["has_player"] = True
            return analysis
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {str(e)}")
            
    else:
        # 2. If no transcript, download audio and analyze multimodal
        print(f"No transcript found for video {video_id}. Downloading audio...")
        try:
            audio_path = YouTubeService.download_audio(video_id, UPLOAD_DIR)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download YouTube audio: {str(e)}")
            
        print(f"Audio downloaded to {audio_path}. Uploading to Gemini Files API...")
        try:
            analysis = GeminiService.analyze_content(api_key=req.api_key, media_file_path=audio_path)
            
            # Index RAG from Gemini generated chunks
            chunks = analysis.get("transcript_chunks", [])
            rag_transcript = []
            for item in chunks:
                start = item.get("start", 0.0)
                end = item.get("end", start + 30.0)
                rag_transcript.append({
                    "text": item.get("text", ""),
                    "start": start,
                    "duration": end - start
                })
            
            chunks_indexed = RAGService.index_transcript(video_id, rag_transcript, req.api_key)
            print(f"Indexed {chunks_indexed} RAG chunks from Gemini audio transcription for {video_id}")
            
            # Keep audio file in storage so player can play it or just delete it to save space?
            # Actually, yt-dlp downloaded audio is useful if we want to play it, but Youtube embed works anyway for video play!
            # Since it's Youtube, the YouTube IFrame player plays the video directly, so we don't need the local audio file after analysis.
            try:
                os.remove(audio_path)
                print(f"Cleaned up audio file: {audio_path}")
            except Exception as cleanup_err:
                print(f"Failed to delete audio file: {str(cleanup_err)}")
                
            analysis["video_id"] = video_id
            analysis["source"] = "youtube"
            analysis["has_player"] = True
            return analysis
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini multimodal analysis failed: {str(e)}")


@app.post("/api/process-upload")
async def process_upload(
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    # Generate unique ID for this upload
    video_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    saved_filename = f"{video_id}.{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)
    
    print(f"Processing local upload: {file.filename} -> {saved_filename}")
    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload file: {str(e)}")
        
    try:
        # Analyze file using Gemini Files API
        analysis = GeminiService.analyze_content(api_key=api_key, media_file_path=saved_path)
        
        # Index RAG from Gemini generated chunks
        chunks = analysis.get("transcript_chunks", [])
        rag_transcript = []
        for item in chunks:
            start = item.get("start", 0.0)
            end = item.get("end", start + 30.0)
            rag_transcript.append({
                "text": item.get("text", ""),
                "start": start,
                "duration": end - start
            })
            
        chunks_indexed = RAGService.index_transcript(video_id, rag_transcript, api_key)
        print(f"Indexed {chunks_indexed} RAG chunks from uploaded file transcription for {video_id}")
        
        analysis["video_id"] = video_id
        analysis["source"] = "upload"
        analysis["file_path"] = saved_filename  # Return the filename so the frontend can stream it
        analysis["has_player"] = True
        return analysis
    except Exception as e:
        # Clean up file on failure
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Gemini multimodal analysis failed: {str(e)}")


@app.post("/api/chat")
async def chat(req: ChatRequest):
    # Retrieve relevant transcript chunks
    relevant_chunks = RAGService.search(req.video_id, req.query, req.api_key, top_k=5)
    
    if not relevant_chunks:
        # Try a fallback of searching the transcript in memory without embeddings if indexing failed
        # Actually RAGService.search already returns empty if not found.
        context = "No direct transcript segments found. Answer using general knowledge."
    else:
        context_parts = []
        for chunk in relevant_chunks:
            start_sec = chunk["start"]
            minutes = int(start_sec // 60)
            seconds = int(start_sec % 60)
            timestamp_str = f"[{minutes:02d}:{seconds:02d}]"
            context_parts.append(f"Timestamp {timestamp_str}:\n{chunk['text']}")
        context = "\n\n".join(context_parts)
        
    try:
        # Convert history
        history_list = [{"role": m.role, "content": m.content} for m in req.history]
        
        answer = GeminiService.generate_chat_answer(
            api_key=req.api_key,
            query=req.query,
            context=context,
            history=history_list
        )
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")

# Optional endpoint to stream uploaded files locally
from fastapi.responses import FileResponse
@app.get("/api/stream/{filename}")
async def stream_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
