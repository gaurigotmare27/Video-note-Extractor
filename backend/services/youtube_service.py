
import os
import re
import glob
import yt_dlp

from youtube_transcript_api import YouTubeTranscriptApi


class YouTubeService:

    @staticmethod
    def extract_video_id(url: str) -> str:
        """
        Extracts the video ID from standard, share, shorts,
        live, and embed YouTube URLs.
        """
        reg = (
            r'(?:youtube\.com/(?:[^/]+/.+/|'
            r'(?:v|e(?:mbed)?|shorts|live)/|.*[?&]v=)|'
            r'youtu\.be/)([^"&?/\s]{11})'
        )

        match = re.search(reg, url)

        if match:
            return match.group(1)

        raise ValueError("Invalid YouTube URL")

    @classmethod
    def get_transcript(cls, video_id: str) -> list:
        """
        Fetches a YouTube transcript using youtube-transcript-api.
        If that fails, tries yt-dlp subtitle download.

        Returns:
            List of dictionaries containing text, start, duration,
            or None if a transcript cannot be retrieved.
        """
        raw_transcript = None

        try:
            api = YouTubeTranscriptApi()

            # Attempt 1: Fetch English captions.
            try:
                raw_transcript = api.fetch(
                    video_id,
                    languages=["en", "en-US", "en-GB"]
                )
            except Exception as english_error:
                print(
                    f"English transcript unavailable for "
                    f"{video_id}: {english_error}"
                )

                # Attempt 2: Use another available language.
                try:
                    transcript_list = api.list(video_id)
                    first_transcript = next(iter(transcript_list))

                    if first_transcript.language_code not in (
                        "en", "en-US", "en-GB"
                    ):
                        try:
                            raw_transcript = (
                                first_transcript.translate("en").fetch()
                            )
                        except Exception:
                            raw_transcript = first_transcript.fetch()
                    else:
                        raw_transcript = first_transcript.fetch()

                except Exception as fallback_error:
                    print(
                        f"Transcript fallback failed for "
                        f"{video_id}: {fallback_error}"
                    )

        except Exception as error:
            print(
                f"Transcript API failed for {video_id}: {error}"
            )

        # Normalize transcript objects into dictionaries.
        if raw_transcript:
            normalized = []

            for item in raw_transcript:
                if isinstance(item, dict):
                    normalized.append({
                        "text": item.get("text", ""),
                        "start": float(item.get("start", 0.0)),
                        "duration": float(item.get("duration", 0.0))
                    })
                else:
                    normalized.append({
                        "text": getattr(item, "text", ""),
                        "start": float(getattr(item, "start", 0.0)),
                        "duration": float(
                            getattr(item, "duration", 0.0)
                        )
                    })

            if normalized:
                return normalized

        # Attempt 3: Download subtitles with yt-dlp.
        print(
            f"No transcript from transcript API for {video_id}. "
            "Trying yt-dlp subtitles..."
        )

        return cls.get_transcript_via_ytdl(video_id)

    @classmethod
    def parse_vtt(cls, filepath: str) -> list:
        """
        Parses a WebVTT subtitle file into transcript entries.
        """
        transcript = []

        def to_seconds(timestamp: str) -> float:
            parts = timestamp.replace(",", ".").split(":")
            return sum(
                float(value) * (60 ** index)
                for index, value in enumerate(reversed(parts))
            )

        try:
            with open(filepath, "r", encoding="utf-8-sig") as file:
                content = file.read()

            blocks = re.split(r"\n\s*\n", content)

            timestamp_pattern = re.compile(
                r"(?:(\d{2,}:)?(\d{2}):(\d{2})[.,](\d{3}))"
                r"\s*-->\s*"
                r"(?:(\d{2,}:)?(\d{2}):(\d{2})[.,](\d{3}))"
            )

            for block in blocks:
                lines = block.strip().splitlines()

                if not lines:
                    continue

                timestamp_index = None
                match = None

                for index, line in enumerate(lines):
                    match = timestamp_pattern.search(line)
                    if match:
                        timestamp_index = index
                        break

                if match is None:
                    continue

                start_parts = match.groups()[:4]
                end_parts = match.groups()[4:]

                start_str = "".join(
                    part or ""
                    for part in start_parts
                )
                end_str = "".join(
                    part or ""
                    for part in end_parts
                )

                # Reconstruct standard timestamps.
                def reconstruct(parts):
                    hours, minutes, seconds, milliseconds = parts
                    if hours:
                        return (
                            f"{hours.rstrip(':')}:"
                            f"{minutes}:{seconds}.{milliseconds}"
                        )
                    return f"{minutes}:{seconds}.{milliseconds}"

                start_sec = to_seconds(reconstruct(start_parts))
                end_sec = to_seconds(reconstruct(end_parts))

                text_lines = lines[timestamp_index + 1:]

                clean_text = " ".join(
                    line.strip() for line in text_lines if line.strip()
                )

                clean_text = re.sub(r"<[^>]+>", "", clean_text)
                clean_text = re.sub(r"&amp;", "&", clean_text)
                clean_text = re.sub(r"&lt;", "<", clean_text)
                clean_text = re.sub(r"&gt;", ">", clean_text)

                if clean_text:
                    transcript.append({
                        "text": clean_text,
                        "start": start_sec,
                        "duration": max(0.0, end_sec - start_sec)
                    })

            return transcript if transcript else None

        except Exception as error:
            print(f"Error parsing VTT file {filepath}: {error}")
            return None

    @classmethod
    def get_transcript_via_ytdl(
        cls,
        video_id: str,
        output_dir: str = None
    ) -> list:
        """
        Attempts to download English subtitles using yt-dlp.
        Falls back to other languages if English subtitles fail.
        """
        if not output_dir:
            backend_dir = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))
            )
            output_dir = os.path.join(backend_dir, "uploads")

        os.makedirs(output_dir, exist_ok=True)

        temp_prefix = os.path.join(
            output_dir, f"temp_sub_{video_id}"
        )

        subtitle_files = []

        try:
            ydl_opts = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": ["en", "en-US", "en-GB"],
                "subtitlesformat": "vtt/best",
                "outtmpl": f"{temp_prefix}.%(ext)s",
                "quiet": True,
                "no_warnings": True,
                "ignoreerrors": False,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([
                    f"https://www.youtube.com/watch?v={video_id}"
                ])

            subtitle_files = glob.glob(f"{temp_prefix}.*")

            if not subtitle_files:
                print(
                    f"No English subtitles found for {video_id}; "
                    "trying available languages..."
                )

                ydl_opts["subtitleslangs"] = ["all"]

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([
                        f"https://www.youtube.com/watch?v={video_id}"
                    ])

                subtitle_files = glob.glob(f"{temp_prefix}.*")

            vtt_files = [
                path for path in subtitle_files
                if path.lower().endswith(".vtt")
            ]

            if not vtt_files:
                print(f"No VTT subtitle files found for {video_id}")
                return None

            # Prefer English subtitles.
            filepath = next(
                (
                    path for path in vtt_files
                    if re.search(r"\.en(?:[-_.]|\.|$)", path, re.I)
                ),
                vtt_files[0]
            )

            return cls.parse_vtt(filepath)

        except Exception as error:
            print(
                f"yt-dlp subtitle retrieval failed for "
                f"{video_id}: {error}"
            )
            return None

        finally:
            # Always remove temporary subtitle files.
            for path in glob.glob(f"{temp_prefix}.*"):
                try:
                    if os.path.isfile(path):
                        os.remove(path)
                except OSError as cleanup_error:
                    print(
                        f"Could not remove temporary subtitle file: "
                        f"{cleanup_error}"
                    )

    @classmethod
    def download_audio(
        cls,
        video_id: str,
        output_dir: str
    ) -> str:
        """
        Downloads YouTube audio when the server is permitted
        to access it. Returns the downloaded file path.
        """
        os.makedirs(output_dir, exist_ok=True)

        supported_extensions = [
            "m4a", "webm", "mp3", "opus",
            "ogg", "aac", "flac", "3gp"
        ]

        for ext in supported_extensions:
            existing_path = os.path.join(
                output_dir, f"{video_id}.{ext}"
            )

            if os.path.isfile(existing_path):
                return existing_path

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(
                output_dir, f"{video_id}.%(ext)s"
            ),
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={video_id}",
                    download=True
                )

                if not info:
                    raise RuntimeError(
                        "YouTube did not return video information."
                    )

                filename = ydl.prepare_filename(info)

                if os.path.isfile(filename):
                    return filename

                # Look for an output file with a different extension.
                for ext in supported_extensions:
                    candidate = os.path.join(
                        output_dir, f"{video_id}.{ext}"
                    )

                    if os.path.isfile(candidate):
                        return candidate

                raise FileNotFoundError(
                    f"Downloaded audio file not found for {video_id}"
                )

        except Exception as error:
            print(
                f"YouTube audio download failed for "
                f"{video_id}: {error}"
            )
            raise
