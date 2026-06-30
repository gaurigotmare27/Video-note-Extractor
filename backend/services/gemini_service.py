import os
import json
import time
from typing import List
from google import genai
from google.genai import types
from pydantic import BaseModel

# =====================================================================
# Pydantic Schemas for Gemini Structured JSON Outputs
# =====================================================================

class TimestampSegment(BaseModel):
    start: float
    end: float
    label: str
    summary: str

class TranscriptChunk(BaseModel):
    start: float
    end: float
    text: str

class TaskItem(BaseModel):
    text: str
    priority: str  # Must be 'high' | 'medium' | 'low'

class MindMapNode(BaseModel):
    id: str
    label: str
    val: int

class MindMapLink(BaseModel):
    source: str
    target: str
    label: str

class MindMapData(BaseModel):
    nodes: List[MindMapNode]
    links: List[MindMapLink]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer_index: int
    explanation: str

class FlashcardItem(BaseModel):
    front: str
    back: str

class VideoAnalysisResult(BaseModel):
    summary: str
    tags: List[str]
    speaker: str
    notes: str
    timestamps: List[TimestampSegment]
    transcript_chunks: List[TranscriptChunk]
    tasks: List[TaskItem]
    mind_map: MindMapData
    quiz: List[QuizQuestion]
    flashcards: List[FlashcardItem]

# =====================================================================
# Gemini Service Implementation
# =====================================================================

class GeminiService:
    @staticmethod
    def _get_client(api_key: str) -> genai.Client:
        if not api_key:
            raise ValueError("Gemini API key is required")
        # Increase client timeout to 10 minutes (600,000 ms) for processing large transcripts/files
        return genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=600000)
        )

    @classmethod
    def analyze_content(cls, api_key: str, transcript_text: str = None, media_file_path: str = None) -> dict:
        """
        Runs a comprehensive analysis on the transcript or media file using Gemini.
        Returns a structured JSON containing summary, tags, notes, timestamps, tasks, mind map, quiz, and flashcards.
        """
        client = cls._get_client(api_key)
        
        system_instruction = (
            "You are an expert video content analyst and learning assistant. Your task is to process the input "
            "(which is either a text transcript with timestamps or an audio/video file) and extract rich, structured educational assets.\n"
            "You must return your response matching the structured schema exactly.\n"
            "Specifically:\n"
            "- 'notes' should contain detailed structured notes of the video in Markdown format, with headers, bullet points, and code snippets if code is taught.\n"
            "- 'timestamps' should divide the video into logical segments or chapters.\n"
            "- 'tasks' should contain actionable checklist follow-up items.\n"
            "- 'mind_map' should map the key terms and concepts with unique alphanumeric node IDs and descriptions on the linking relationship edges. Ensure nodes contain a size 'val' integer between 5 and 20 representing concept importance.\n"
            "- 'quiz' should have at least 3 conceptual multiple-choice questions (options must have exactly 4 choices).\n"
            "- 'flashcards' should have at least 5 key term flashcard definitions."
        )

        prompt = "Analyze the following content and generate the structured analysis according to the schema:"
        contents = []
        
        if media_file_path:
            print(f"Uploading media file to Gemini: {media_file_path}")
            uploaded_file = client.files.upload(file=media_file_path)
            
            # Wait for file processing if needed
            while str(uploaded_file.state) == "PROCESSING" or getattr(uploaded_file.state, 'name', '') == "PROCESSING":
                print("Waiting for file to be processed by Gemini...")
                time.sleep(2)
                uploaded_file = client.files.get(name=uploaded_file.name)
            
            if str(uploaded_file.state) == "FAILED" or getattr(uploaded_file.state, 'name', '') == "FAILED":
                raise Exception("Gemini file processing failed")
                
            print("File upload to Gemini complete.")
            contents.append(uploaded_file)
            contents.append(prompt)
        elif transcript_text:
            # Optimize output tokens by instructing the model to set transcript_chunks to [] since we already have the raw transcript
            contents.append(f"{prompt}\n\nTRANSCRIPT:\n{transcript_text}\n\nNOTE: Since the text transcript is already provided, set the 'transcript_chunks' field in the schema to an empty list [] to save output tokens and prevent response truncation.")
        else:
            raise ValueError("Either transcript_text or media_file_path must be provided")

        # Generate content with Pydantic output schema (resilient fallback model selection)
        response = None
        last_err = None
        for model_name in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]:
            try:
                print(f"Calling Gemini generate_content using model: {model_name}...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=VideoAnalysisResult
                    )
                )
                break
            except Exception as e:
                print(f"Failed to generate content with model {model_name}: {str(e)}")
                last_err = e
                continue
                
        if not response:
            try:
                models = [m.name for m in client.models.list()]
                print(f"Available models for this API key: {models}")
            except Exception as list_err:
                print(f"Failed to list models: {str(list_err)}")
            raise last_err
        
        # Clean up Gemini uploaded file if it was uploaded
        if media_file_path and 'uploaded_file' in locals():
            try:
                client.files.delete(name=uploaded_file.name)
                print("Deleted uploaded file from Gemini storage.")
            except Exception as e:
                print(f"Failed to delete uploaded file: {str(e)}")

        # Retrieve parsed schema dictionary
        try:
            if response.parsed:
                return response.parsed.model_dump()
            else:
                return json.loads(response.text)
        except Exception as e:
            print(f"Failed to parse response: {response.text}")
            raise Exception("Gemini returned invalid structured output. Please retry.")

    @classmethod
    def get_embedding(cls, api_key: str, text: str) -> list:
        """
        Generates an embedding vector using text-embedding-004.
        """
        client = cls._get_client(api_key)
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT"
            )
        )
        return response.embeddings[0].values

    @classmethod
    def generate_chat_answer(cls, api_key: str, query: str, context: str, history: list) -> str:
        """
        Answers a user query using the retrieved transcript segments as context.
        Instructs the model to use clickable citations like [MM:SS] or [HH:MM:SS] where relevant.
        """
        client = cls._get_client(api_key)
        
        system_instruction = (
            "You are an assistant helping a user study a video content transcript.\n"
            "You are provided with relevant segments of the transcript as context, including their start timestamps. "
            "Answer the user's question accurately using ONLY the provided context. If the answer cannot be found in the context, "
            "use your general knowledge but note that it was not explicitly in the video.\n"
            "CRITICAL: When referencing specific facts, quotes, or segments from the video, you MUST include a clickable timestamp citation "
            "in the format [MM:SS] (or [H:MM:SS] if the video is longer than an hour) matching the start time of the context segment. "
            "For example: 'The speaker mentions that python is dynamic [02:15]'.\n"
            "Do not make up timestamps; only use the timestamps provided in the context segments."
        )

        formatted_history = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg["content"]]})

        # Add the context and current query to the conversation
        prompt = f"CONTEXT SEGMENTS:\n{context}\n\nUSER QUESTION: {query}"
        formatted_history.append({"role": "user", "parts": [prompt]})

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=formatted_history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        return response.text
