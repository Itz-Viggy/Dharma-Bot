# backend/main.py

from dotenv import load_dotenv
import os
import re
import json
import requests
import chromadb
from chromadb.errors import NotFoundError
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum  # ← adapter for AWS Lambda

# ── ENV VARS ───────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── 1) LOAD VERSES JSON ────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "../verse.json")
with open(DATA_PATH, "r", encoding="utf-8") as f:
    raw_verses = json.load(f)

# ── 2) PREPARE LISTS FOR CHROMA ───────────────────────────────────────────────
ids, docs, metadatas = [], [], []
for v in raw_verses:
    chap = v.get("chapter_number") or v.get("chapter_id")
    verse = v.get("verse_number") or v.get("verse_order")
    uid = f"{chap}.{verse}"
    ids.append(uid)
    docs.append(v.get("translation", v["text"]))
    metadatas.append({
        "id": uid,
        "chapter": chap,
        "verse": verse,
        "text": v["text"],
        "translation": v.get("translation", v["text"]),
        "transliteration": v.get("transliteration", ""),
        "word_meanings": v.get("word_meanings", "")
    })

# ── 3) EMBEDDINGS ─────────────────────────────────────────────────────────────
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(docs, show_progress_bar=True)

# ── 4) CHROMA DB SETUP ────────────────────────────────────────────────────────
client = chromadb.Client()
try:
    client.get_collection("gita")
    client.delete_collection("gita")
except NotFoundError:
    pass
collection = client.create_collection(name="gita")
collection.add(
    ids=ids,
    documents=docs,
    metadatas=metadatas,
    embeddings=embeddings.tolist()
)

# ── 5) FASTAPI APP ───────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    q: str

@app.get("/debug")
def debug_collection():
    return collection.get(include=["documents", "metadatas"])

@app.post("/query")
def query_verses(query: Query):
    q_text = query.q.strip().lower()

    # direct lookup if asking chapter & verse
    m = re.match(r'.*chapter\s+(\d+)\s+verse\s+(\d+).*', q_text)
    if m:
        chap, verse = int(m.group(1)), int(m.group(2))
        for v in raw_verses:
            if (v.get("chapter_number") or v.get("chapter_id")) == chap and \
               (v.get("verse_number") or v.get("verse_order")) == verse:
                return {
                    "answer": v.get("translation", v["text"]),
                    "used_verses": True
                }
        return {"answer": "Sorry, I couldn’t find that verse in the Gita.", "used_verses": True}

    # always do RAG with top 3 verses
    results = collection.query(
        query_texts=[query.q],
        n_results=3,
        include=["metadatas"]
    )
    verses = results["metadatas"][0]

    prompt = (
        "Below are three relevant Bhagavad Gita verses:\n\n" +
        "\n".join(f"{md['id']}: {md['translation']}" for md in verses) +
        f"\n\nQuestion: {query.q}\nAnswer concisely, using only the above verses as reference:"
    )

    hf_token = os.getenv("HF_API_TOKEN")
    resp = requests.post(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
        headers={"Authorization": f"Bearer {hf_token}"},
        json={
            "inputs": prompt,
            "parameters": {"max_new_tokens": 200, "temperature": 0.7}
        },
        timeout=30
    )
    resp.raise_for_status()
    gen = resp.json()[0]
    answer = gen.get("generated_text", "").strip()

    return {"answer": answer, "used_verses": True}

# Wrap for Vercel's AWS Lambda-based serverless runtime
handler = Mangum(app)
