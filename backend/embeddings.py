import json
import numpy as np
from sentence_transformers import SentenceTransformer
import os

# 1) Load your raw verses
DATA_PATH = os.path.join(os.path.dirname(__file__), "../verse.json")
with open(DATA_PATH, "r", encoding="utf-8") as f:
    raw_verses = json.load(f)

# 2) Build docs list
docs = [v.get("translation", v["text"]) for v in raw_verses]

# 3) Compute embeddings locally
model = SentenceTransformer("all-MiniLM-L6-v2")
embs = model.encode(docs, show_progress_bar=True)

# 4) Save them
os.makedirs("data/", exist_ok=True)
np.save("data/embeddings.npy", embs)

# 5) Also save minimal metadata (id, chapter, verse, translation, etc.)
meta = [
    {
      "id": f"{(v.get('chapter_number') or v.get('chapter_id'))}."
            f"{(v.get('verse_number') or v.get('verse_order'))}",
      "chapter": v.get("chapter_number") or v.get("chapter_id"),
      "verse": v.get("verse_number") or v.get("verse_order"),
      "translation": v.get("translation", v["text"]),
      "transliteration": v.get("transliteration", ""),
      "text": v["text"]
    }
    for v in raw_verses
]
with open("data/metadata.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False)
