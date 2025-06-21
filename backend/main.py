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
app.add_middleware(CORSMiddleware, allow_origins=["https://dharma-bot.vercel.app", "http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Query(BaseModel):
    q: str

@app.post("/query")
def query_verses(query: Query):
    text = query.q.strip().lower()

    # 1) chapter/verse direct lookup
    m = re.search(r'chapter\s+(\d+)\s+verse\s+(\d+)', text, re.IGNORECASE)
    if m:
        chap, verse = int(m.group(1)), int(m.group(2))
        for md in META:
            # support both naming conventions
            chap_val = md.get("chapter") or md.get("chapter_number") or md.get("chapter_id")
            verse_val = md.get("verse") or md.get("verse_number") or md.get("verse_order")

            if chap_val == chap and verse_val == verse:
                return {
                    "answer": md.get("translation", md.get("text", "")),
                    "used_verses": True
                }

        return {
            "answer": f"Sorry, I couldn’t find chapter {chap} verse {verse}.",
            "used_verses": True
        }

    # 2) Try to get embeddings from HuggingFace
    hf_token = os.getenv("HF_API_TOKEN")
    verses = None
    debug_info = []
    
    print(f"Starting embedding search for query: '{query.q}'")
    
    # Method 1: Try sentence-transformers/all-MiniLM-L6-v2 - FIXED URL
    try:
        print("Attempting sentence-transformers/all-MiniLM-L6-v2...")
        
        # FIXED: Correct URL format for HuggingFace Inference API
        emb_resp = requests.post(
            "https://router.huggingface.co/hf-inference/models/"
            "sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json"
            },
            json={"inputs": [ query.q ]},
            timeout=30
        )

        print(f"Response status: {emb_resp.status_code}")
        print(f"Response content: {emb_resp.text[:300]}...")
        
        if emb_resp.status_code == 200:
            emb_data = emb_resp.json()
            print(f"Response type: {type(emb_data)}")
            
            # Handle the embedding response format
            if isinstance(emb_data, list) and len(emb_data) > 0:
                # Sentence transformers return embeddings as nested arrays
                q_emb = np.array(emb_data)
                # If it's a 2D array (batch_size, embedding_dim), take the first row
                if q_emb.ndim == 2:
                    q_emb = q_emb[0]
                
                print(f"Successfully extracted embedding of shape: {q_emb.shape}")
                verses = top_k(q_emb, k=3)
                debug_info.append("Used sentence-transformers/all-MiniLM-L6-v2")
        else:
            print(f"Request failed: {emb_resp.status_code} - {emb_resp.text}")
            debug_info.append(f"sentence-transformers failed: {emb_resp.status_code}")
            
    except Exception as e:
        print(f"sentence-transformers method failed with exception: {e}")
        debug_info.append(f"sentence-transformers exception: {str(e)}")

    

    

    # Method 4: Fallback to simple text-based search
    if verses is None:
        print("Using fallback text-based search")
        verses = simple_text_search(query.q, k=3)
        debug_info.append("Used text-based fallback")

    print(f"Debug info: {debug_info}")

    # 3) Generate response using the found verses
    if not verses:
        return {"answer": "I couldn't find relevant verses for your query.", "used_verses": False}

    # Create prompt for text generation
    verses_context = "\n".join(f"Verse {v['id']}: {v['translation']}" for v in verses)
    prompt = f"""Based on these Bhagavad Gita verses, please answer the question concisely:

{verses_context}

Question: {query.q}

Answer:"""
    
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
                    # Clean up the response by removing the prompt
                    if "Answer:" in gen:
                        answer = gen.split("Answer:")[-1].strip()
                    else:
                        answer = gen.strip()
                    
                    # Add debug info to response for troubleshooting
                    ##if debug_info:
                        ##answer += f"\n\n[Debug: {', '.join(debug_info)}]"
                    return {"answer": answer, "used_verses": True}
    except Exception as e:
        print(f"Mistral generation failed: {e}")

    # Fallback: return just the verses
    verses_text = "\n\n".join(f"{v['id']}: {v['translation']}" for v in verses)
    #debug_text = f" [Debug: {', '.join(debug_info)}]" if debug_info else ""
    return {"answer": f"Here are relevant verses for your question:\n\n{verses_text}", "used_verses": True}

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "embeddings_loaded": len(EMBS), "metadata_loaded": len(META)}

# AWS Lambda handler
handler = Mangum(app)