# backend/main.py

from dotenv import load_dotenv
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.errors import NotFoundError
from sentence_transformers import SentenceTransformer
import json
import requests

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

print("🔍 First raw verse object:", raw_verses[0])

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
collection.add(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings.tolist())

print("📦 Collection count:", collection.count())
print("🧠 Added document:", docs[0])
print("🧾 Metadata sample:", metadatas[0])

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

    # 1) Retrieve top-3 verses
    results = collection.query(
        query_texts=[query.q],
        n_results=3,
        include=["documents", "metadatas", "distances"]
    )
   # 2) Build RAG prompt
    # metadatas is returned as a list of lists (one list per query)
    verses = results["metadatas"][0]

    prompt_lines = [
        f"User asked: {query.q}",
        "",
        "Here are relevant verses:"
    ]
    for md in verses:
        prompt_lines.append(f"{md['id']}: {md['translation']}")
    prompt_lines.extend([
        "",
        "Based on these, provide a helpful, concise answer:"
    ])
    prompt = "\n".join(prompt_lines)

    # 3) Call Mistral 7B via Hugging Face
    hf_token = os.getenv("HF_API_TOKEN")
    if not hf_token:
        raise ValueError("HF_API_TOKEN environment variable is not set")

    resp = requests.post(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
        headers={
            "Authorization": f"Bearer {hf_token}",
            "Accept": "application/json",
        },
        json={
            "inputs": prompt,
            "parameters": {"max_new_tokens": 200, "temperature": 0.7}
        },
        timeout=30
    )
    resp.raise_for_status()

    # 4) Parse HF response as a list
    generated_list = resp.json()
    if not isinstance(generated_list, list) or not generated_list:
        raise RuntimeError(f"Unexpected HF response: {generated_list}")
    generated = generated_list[0]
    answer = generated.get("generated_text", "")

    # 5) Return the LLM answer
    return {"answer": answer.strip()}
