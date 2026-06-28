import os
import json
import time
import google.generativeai as genai
from google.generativeai.types import RequestOptions

class GeminiService:
    @staticmethod
    def _set_api_key(api_key: str):
        if not api_key:
            raise ValueError("Gemini API key is required")
        genai.configure(api_key=api_key)

    @classmethod
    def analyze_content(cls, api_key: str, transcript_text: str = None, media_file_path: str = None) -> dict:
        """
        Runs a comprehensive analysis on the transcript or media file using Gemini 1.5 Flash.
        Returns a structured JSON containing summary, tags, notes, timestamps, tasks, mind map, quiz, and flashcards.
        """
        cls._set_api_key(api_key)
        
        system_instruction = (
            "You are an expert video content analyst and learning assistant. Your task is to process the input "
            "(which is either a text transcript with timestamps or an audio/video file) and extract rich, structured educational assets.\n"
            "You must return your response STRICTLY as a single JSON object. Do not wrap the JSON in ```json markdown code blocks. "
            "Ensure the JSON matches this structure exactly:\n"
            "{\n"
            "  \"summary\": \"A concise, engaging high-level summary of the video content.\",\n"
            "  \"tags\": [\"3-5 relevant keyword tags for the video content\"],\n"
            "  \"speaker\": \"Name of the speaker if identifiable, else 'Unknown'\",\n"
            "  \"notes\": \"Detailed, structured notes of the video in Markdown format, with headers, bullet points, and code snippets if code is taught.\",\n"
            "  \"timestamps\": [\n"
            "     { \"start\": 0.0, \"end\": 45.0, \"label\": \"Introduction\", \"summary\": \"Brief summary of this segment\" }\n"
            "  ],\n"
            "  \"transcript_chunks\": [\n"
            "     { \"start\": 0.0, \"end\": 30.0, \"text\": \"Transcribed text for this short segment (30-60 seconds)\" }\n"
            "  ],\n"
            "  \"tasks\": [\n"
            "     { \"text\": \"Actionable task or follow-up item derived from the video\", \"priority\": \"high\" | \"medium\" | \"low\" }\n"
            "  ],\n"
            "  \"mind_map\": {\n"
            "     \"nodes\": [\n"
            "        { \"id\": \"unique-node-id\", \"label\": \"Concept or Key Term Name\", \"val\": 10 }\n"
            "     ],\n"
            "     \"links\": [\n"
            "        { \"source\": \"source-node-id\", \"target\": \"target-node-id\", \"label\": \"relationship description\" }\n"
            "     ]\n"
            "  },\n"
            "  \"quiz\": [\n"
            "     { \"question\": \"Conceptual multiple-choice question\", \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], \"answer_index\": 0, \"explanation\": \"Detailed explanation of why this answer is correct\" }\n"
            "  ],\n"
            "  \"flashcards\": [\n"
            "     { \"front\": \"Flashcard question or key term\", \"back\": \"Flashcard answer or definition\" }\n"
            "  ]\n"
            "}\n"
            "If the input is a text transcript, you can populate 'transcript_chunks' with a simplified version of it or leave it empty if the backend has access to the transcript. "
            "If the input is a media file, you MUST transcribe it into 'transcript_chunks' (segment by segment with correct timestamps) so we can run search queries against it.\n"
            "Make sure the mind_map nodes contain 'val' (integer between 5 and 20 representing the visual size/importance of the concept). "
            "Ensure there is a central node representing the main topic, with links connecting it to subtopics, and subtopics connecting to details.\n"
            "Ensure the quiz has at least 3 high-quality conceptual questions, and flashcards have at least 5 key items."
        )

        # Configure model
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )

        prompt = "Analyze the following content and generate the structured JSON assets:"

        contents = []
        
        if media_file_path:
            print(f"Uploading media file to Gemini: {media_file_path}")
            uploaded_file = genai.upload_file(path=media_file_path)
            
            # Wait for file processing if needed
            while uploaded_file.state.name == "PROCESSING":
                print("Waiting for file to be processed by Gemini...")
                time.sleep(2)
                uploaded_file = genai.get_file(uploaded_file.name)
            
            if uploaded_file.state.name == "FAILED":
                raise Exception("Gemini file processing failed")
                
            print("File upload to Gemini complete.")
            contents.append(uploaded_file)
            contents.append(prompt)
        elif transcript_text:
            contents.append(f"{prompt}\n\nTRANSCRIPT:\n{transcript_text}")
        else:
            raise ValueError("Either transcript_text or media_file_path must be provided")

        # Generate content with JSON output mime-type
        try:
            response = model.generate_content(
                contents,
                generation_config={"response_mime_type": "application/json"},
                safety_settings=None,
                request_options=RequestOptions(timeout=600.0) # 10 minute timeout for long files
            )
        except Exception as e:
            print(f"Failed to generate content: {str(e)}")
            try:
                models = [m.name for m in genai.list_models()]
                print(f"Available models for this API key: {models}")
            except Exception as list_err:
                print(f"Failed to list models: {str(list_err)}")
            raise e
        
        # Clean up Gemini uploaded file if it was uploaded
        if media_file_path and 'uploaded_file' in locals():
            try:
                genai.delete_file(uploaded_file.name)
                print("Deleted uploaded file from Gemini storage.")
            except Exception as e:
                print(f"Failed to delete uploaded file: {str(e)}")

        # Parse JSON response
        try:
            return json.loads(response.text)
        except Exception as e:
            print(f"Failed to parse JSON response: {response.text}")
            raise Exception("Gemini returned invalid JSON structure. Please retry.")

    @classmethod
    def get_embedding(cls, api_key: str, text: str) -> list:
        """
        Generates an embedding vector using text-embedding-004.
        """
        cls._set_api_key(api_key)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']

    @classmethod
    def generate_chat_answer(cls, api_key: str, query: str, context: str, history: list) -> str:
        """
        Answers a user query using the retrieved transcript segments as context.
        Instructs the model to use clickable citations like [MM:SS] or [HH:MM:SS] where relevant.
        """
        cls._set_api_key(api_key)
        
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

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )

        formatted_history = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg["content"]]})

        # Add the context and current query to the conversation
        prompt = f"CONTEXT SEGMENTS:\n{context}\n\nUSER QUESTION: {query}"
        formatted_history.append({"role": "user", "parts": [prompt]})

        response = model.generate_content(
            contents=formatted_history
        )
        return response.text
