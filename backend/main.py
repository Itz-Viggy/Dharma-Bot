import os, re, json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum
import numpy as np
import requests

# ─── Load env & data ────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# load precomputed embeddings + metadata
EMBS = np.load(os.path.join(os.path.dirname(__file__), "data/embeddings.npy"))
with open(os.path.join(os.path.dirname(__file__), "data/metadata.json"), "r", encoding="utf-8") as f:
    META = json.load(f)

# fast similarity search helper
def top_k(q_emb: np.ndarray, k=3):
    # cosine similarity:
    norms = np.linalg.norm(EMBS, axis=1) * np.linalg.norm(q_emb)
    sims = EMBS.dot(q_emb) / norms
    idx = np.argsort(-sims)[:k]
    return [META[i] for i in idx]

# Alternative: Simple text-based similarity using keyword matching
def simple_text_search(query_text: str, k=3):
    """Fallback search using simple text matching"""
    query_words = set(query_text.lower().split())
    scores = []
    
    for i, meta in enumerate(META):
        text = meta.get('translation', '').lower()
        text_words = set(text.split())
        
        # Simple word overlap score
        overlap = len(query_words.intersection(text_words))
        score = overlap / max(len(query_words), 1)
        scores.append((score, i))
    
    # Sort by score and return top k
    scores.sort(reverse=True)
    return [META[idx] for _, idx in scores[:k]]

# ─── FastAPI setup ─────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Query(BaseModel):
    q: str

@app.post("/query")
def query_verses(query: Query):
    text = query.q.strip().lower()

    # 1) chapter/verse direct lookup
    m = re.match(r'.*chapter\s+(\d+)\s+verse\s+(\d+).*', text)
    if m:
        c,v = int(m.group(1)), int(m.group(2))
        for md in META:
            if md["chapter"]==c and md["verse"]==v:
                return {"answer": md["translation"], "used_verses": True}
        return {"answer": "I couldn't find that verse.", "used_verses": True}

    # 2) Try to get embeddings from HuggingFace
    hf_token = os.getenv("HF_API_TOKEN")
    verses = None
    
    # Method 1: Try using a BERT-based model that supports feature extraction
    try:
        emb_resp = requests.post(
            "https://api-inference.huggingface.co/models/bert-base-uncased",
            headers={"Authorization": f"Bearer {hf_token}"},
            json={"inputs": query.q, "options": {"wait_for_model": True}},
            timeout=10
        )
        
        if emb_resp.status_code == 200:
            emb_data = emb_resp.json()
            # BERT returns last hidden state, we'll use the [CLS] token (first token)
            if isinstance(emb_data, list) and len(emb_data) > 0:
                # Take the first token's embedding (CLS token)
                q_emb = np.array(emb_data[0][0])  # Shape: [seq_len, hidden_size] -> [hidden_size]
                verses = top_k(q_emb, k=3)
                print("Successfully used BERT embeddings")
    except Exception as e:
        print(f"BERT embedding failed: {e}")

    # Method 2: Try OpenAI API if available (alternative embedding service)
    if verses is None and os.getenv("OPENAI_API_KEY"):
        try:
            import openai
            openai.api_key = os.getenv("OPENAI_API_KEY")
            
            response = openai.Embedding.create(
                input=query.q,
                model="text-embedding-ada-002"
            )
            q_emb = np.array(response['data'][0]['embedding'])
            verses = top_k(q_emb, k=3)
            print("Successfully used OpenAI embeddings")
        except Exception as e:
            print(f"OpenAI embedding failed: {e}")

    # Method 3: Try using sentence-transformers via a different HF model
    if verses is None:
        try:
            # Try using a different sentence transformer model that might work better with the API
            emb_resp = requests.post(
                "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-MiniLM-L6-v2",
                headers={"Authorization": f"Bearer {hf_token}"},
                json={
                    "inputs": {
                        "source_sentence": query.q,
                        "sentences": ["This is a test sentence to get embeddings"]
                    },
                    "options": {"wait_for_model": True}
                },
                timeout=10
            )
            
            if emb_resp.status_code == 200:
                # This won't give us direct embeddings, but we can try
                print("Sentence similarity API response received")
        except Exception as e:
            print(f"Alternative sentence transformer failed: {e}")

    # Method 4: Fallback to simple text-based search
    if verses is None:
        print("Using fallback text-based search")
        verses = simple_text_search(query.q, k=3)

    # 3) Generate response using the found verses
    if not verses:
        return {"answer": "I couldn't find relevant verses for your query.", "used_verses": False}

    # Create prompt for text generation
    prompt = "Below are three relevant Bhagavad Gita verses:\n\n" + \
             "\n".join(f"{v['id']}: {v['translation']}" for v in verses) + \
             f"\n\nQuestion: {query.q}\nAnswer concisely, using only the above verses as reference:"
    
    # 4) Try to call Mistral for final answer
    try:
        resp = requests.post(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
            headers={"Authorization": f"Bearer {hf_token}"},
            json={
                "inputs": prompt, 
                "parameters": {"max_new_tokens": 200, "temperature": 0.7}, 
                "options": {"wait_for_model": True}
            },
            timeout=30
        )

        if resp.status_code == 200:
            response_data = resp.json()
            if isinstance(response_data, list) and len(response_data) > 0:
                gen = response_data[0].get("generated_text", "")
                if gen.strip():
                    return {"answer": gen.strip(), "used_verses": True}
    except Exception as e:
        print(f"Mistral generation failed: {e}")

    # Fallback: return just the verses
    verses_text = "\n\n".join(f"{v['id']}: {v['translation']}" for v in verses)
    return {"answer": f"Here are relevant verses for your question:\n\n{verses_text}", "used_verses": True}

# AWS Lambda handler
handler = Mangum(app)