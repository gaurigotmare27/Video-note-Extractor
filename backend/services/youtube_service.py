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
        reg = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})'
        match = re.search(reg, url)
        if match:
            return match.group(1)
        raise ValueError("Invalid YouTube URL")

    @classmethod
    def get_transcript(cls, video_id: str) -> list:
        """
        Fetches the transcript for a YouTube video.
        Uses youtube-transcript-api first, then falls back to yt-dlp subtitle download.
        Returns a list of dicts: [{'text': str, 'start': float, 'duration': float}]
        """
        raw_transcript = None
        try:
            api = YouTubeTranscriptApi()
            try:
                # 1. Try to fetch English transcript (manual or auto-generated)
                raw_transcript = api.fetch(video_id, languages=('en', 'en-US', 'en-GB'))
            except Exception:
                try:
                    # 2. Fallback: Find any available transcript and translate to English
                    transcript_list = api.list(video_id)
                    first_transcript = next(iter(transcript_list))
                    if first_transcript.language_code not in ('en', 'en-US', 'en-GB'):
                        try:
                            raw_transcript = first_transcript.translate('en').fetch()
                        except Exception:
                            raw_transcript = first_transcript.fetch()
                    else:
                        raw_transcript = first_transcript.fetch()
                except Exception:
                    raw_transcript = None
        except Exception as e:
            print(f"Error fetching transcript via youtube-transcript-api for {video_id}: {str(e)}")

        if raw_transcript:
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

        # 3. If youtube-transcript-api failed, try yt-dlp subtitle download
        print(f"youtube-transcript-api failed for {video_id}. Trying yt-dlp subtitle fallback...")
        yt_transcript = cls.get_transcript_via_ytdl(video_id)
        if yt_transcript:
            return yt_transcript

        return None

    @classmethod
    def parse_vtt(cls, filepath: str) -> list:
        """
        Parses a WebVTT file and returns a structured transcript list.
        """
        import re
        transcript = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            blocks = re.split(r'\n\s*\n', content)
            timestamp_pattern = re.compile(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})')
            
            to_secs = lambda t: sum(float(x) * 60**i for i, x in enumerate(reversed(t.split(':'))))
            
            for block in blocks:
                lines = block.strip().split('\n')
                if not lines:
                    continue
                
                match = timestamp_pattern.search(lines[0])
                text_lines = lines[1:]
                if not match and len(lines) > 1:
                    match = timestamp_pattern.search(lines[1])
                    text_lines = lines[2:]
                    
                if match:
                    start_str, end_str = match.groups()
                    start_sec = to_secs(start_str)
                    end_sec = to_secs(end_str)
                    
                    clean_text = " ".join(line.strip() for line in text_lines if line.strip())
                    clean_text = re.sub(r'<[^>]+>', '', clean_text)
                    
                    if clean_text:
                        transcript.append({
                            'text': clean_text,
                            'start': start_sec,
                            'duration': end_sec - start_sec
                        })
            return transcript if transcript else None
        except Exception as e:
            print(f"Error parsing VTT file {filepath}: {str(e)}")
            return None

    @classmethod
    def get_transcript_via_ytdl(cls, video_id: str, output_dir: str = None) -> list:
        """
        Fetches the transcript for a YouTube video using yt-dlp to download subtitles.
        """
        import glob
        
        if not output_dir:
            # Save in the backend uploads folder
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Use a unique prefix to avoid naming collisions
        temp_prefix = os.path.join(output_dir, f"temp_sub_{video_id}")
        
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'outtmpl': f"{temp_prefix}.%(ext)s",
            'quiet': True,
            'no_warnings': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
                
            sub_files = glob.glob(f"{temp_prefix}.*")
            if not sub_files:
                # If English was unavailable, try downloading any language
                ydl_opts['subtitleslangs'] = ['all']
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
                sub_files = glob.glob(f"{temp_prefix}.*")
                
            if not sub_files:
                return None
                
            # Choose the first subtitle file found (prefer English if multiple)
            filepath = sub_files[0]
            for f in sub_files:
                if '.en.' in f:
                    filepath = f
                    break
                    
            transcript = cls.parse_vtt(filepath)
            
            # Clean up all downloaded temp files
            for f in sub_files:
                try:
                    os.remove(f)
                except Exception:
                    pass
                    
            return transcript
            
        except Exception as e:
            print(f"Error downloading/parsing transcript via yt-dlp: {str(e)}")
            for f in glob.glob(f"{temp_prefix}.*"):
                try:
                    os.remove(f)
                except Exception:
                    pass
            return None

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
