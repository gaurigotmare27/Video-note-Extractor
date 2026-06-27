import math
from services.gemini_service import GeminiService

class RAGService:
    # Class-level in-memory database to store indexed transcripts:
    # { video_id: [ {"text": str, "start": float, "end": float, "embedding": list[float]} ] }
    _index = {}

    @staticmethod
    def _dot_product(v1: list, v2: list) -> float:
        return sum(x * y for x, y in zip(v1, v2))

    @staticmethod
    def _magnitude(v: list) -> float:
        return math.sqrt(sum(x * x for x in v))

    @classmethod
    def _cosine_similarity(cls, v1: list, v2: list) -> float:
        mag1 = cls._magnitude(v1)
        mag2 = cls._magnitude(v2)
        if not mag1 or not mag2:
            return 0.0
        return cls._dot_product(v1, v2) / (mag1 * mag2)

    @classmethod
    def index_transcript(cls, video_id: str, transcript: list, api_key: str) -> int:
        """
        Groups transcript items into larger chunks, computes their embeddings, and saves them.
        Transcript list format: [{'text': str, 'start': float, 'duration': float}]
        """
        if not transcript:
            return 0

        chunks = []
        current_chunk_text = []
        current_start = None
        current_end = 0.0
        word_count = 0

        # Group transcript sentences into chunks of approx 120 words
        for item in transcript:
            text = item['text']
            start = item['start']
            duration = item.get('duration', 0.0)
            end = start + duration

            if current_start is None:
                current_start = start

            current_chunk_text.append(text)
            current_end = end
            word_count += len(text.split())

            if word_count >= 120:
                full_text = " ".join(current_chunk_text)
                chunks.append({
                    "text": full_text,
                    "start": current_start,
                    "end": current_end,
                })
                # Reset for next chunk
                current_chunk_text = []
                current_start = None
                word_count = 0

        # Add remaining text
        if current_chunk_text:
            full_text = " ".join(current_chunk_text)
            chunks.append({
                "text": full_text,
                "start": current_start if current_start is not None else 0.0,
                "end": current_end,
            })

        # Compute embeddings for all chunks
        indexed_chunks = []
        for chunk in chunks:
            try:
                embedding = GeminiService.get_embedding(api_key, chunk["text"])
                chunk["embedding"] = embedding
                indexed_chunks.append(chunk)
            except Exception as e:
                print(f"Failed to index chunk '{chunk['text'][:30]}...': {str(e)}")
                # Continue index fallback with dummy or skip
                continue

        cls._index[video_id] = indexed_chunks
        return len(indexed_chunks)

    @classmethod
    def search(cls, video_id: str, query: str, api_key: str, top_k: int = 4) -> list:
        """
        Retrieves the top_k most relevant transcript chunks for the query.
        """
        if video_id not in cls._index or not cls._index[video_id]:
            print(f"Video {video_id} is not indexed in RAG.")
            return []

        try:
            query_embedding = GeminiService.get_embedding(api_key, query)
        except Exception as e:
            print(f"Failed to embed query: {str(e)}")
            return []

        scored_chunks = []
        for chunk in cls._index[video_id]:
            sim = cls._cosine_similarity(query_embedding, chunk["embedding"])
            scored_chunks.append((sim, chunk))

        # Sort by similarity descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # Return top_k
        return [chunk for score, chunk in scored_chunks[:top_k]]
