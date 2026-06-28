import re
import os
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi

class YouTubeService:
    @staticmethod
    def extract_video_id(url: str) -> str:
        """
        Extracts the video ID from a YouTube URL.
        Supports standard, share, shorts, and embed formats.
        """
        reg = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})'
        match = re.search(reg, url)
        if match:
            return match.group(1)
        raise ValueError("Invalid YouTube URL")

    @staticmethod
    def get_transcript(video_id: str) -> list:
        """
        Fetches the transcript for a YouTube video using youtube-transcript-api.
        Returns a list of dicts: [{'text': str, 'start': float, 'duration': float}]
        """
        raw_transcript = None
        try:
            api = YouTubeTranscriptApi()
            try:
                # Try fetching English first
                raw_transcript = api.fetch(video_id)
            except Exception:
                # Fallback to the first available transcript (e.g. auto-generated or other language)
                transcript_list = api.list(video_id)
                for transcript in transcript_list:
                    raw_transcript = transcript.fetch()
                    break
        except Exception as e:
            print(f"Error fetching transcript for {video_id}: {str(e)}")
            return None

        if not raw_transcript:
            return None

        normalized = []
        for item in raw_transcript:
            if isinstance(item, dict):
                normalized.append(item)
            else:
                normalized.append({
                    'text': getattr(item, 'text', ''),
                    'start': getattr(item, 'start', 0.0),
                    'duration': getattr(item, 'duration', 0.0)
                })
        return normalized

    @classmethod
    def download_audio(cls, video_id: str, output_dir: str) -> str:
        """
        Downloads audio from a YouTube video using yt-dlp.
        Returns the absolute path of the downloaded audio file.
        Saves as raw format (m4a, webm) to avoid ffmpeg dependency.
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Check if file already exists in output_dir (any extension)
        for ext in ['m4a', 'webm', 'mp3', 'opus']:
            existing_path = os.path.join(output_dir, f"{video_id}.{ext}")
            if os.path.exists(existing_path):
                return existing_path

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_dir, f'{video_id}.%(ext)s'),
            # No post-processing to avoid dependency on ffmpeg
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
            filename = ydl.prepare_filename(info)
            # The prepared filename might have a slightly different extension depending on what was downloaded
            # Verify the actual file exists
            if os.path.exists(filename):
                return filename
            
            # Fallback search if extension mismatch
            base_path = os.path.join(output_dir, video_id)
            for ext in ['m4a', 'webm', 'mp3', 'opus', '3gp', 'aac', 'flac', 'ogg']:
                test_path = f"{base_path}.{ext}"
                if os.path.exists(test_path):
                    return test_path
            
            raise FileNotFoundError(f"Downloaded audio file not found for video ID: {video_id}")
