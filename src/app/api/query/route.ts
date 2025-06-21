import { NextRequest, NextResponse } from 'next/server';
import { ChromaClient, Collection } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import rawVerses from '../../../../verse.json';


interface Verse {
  chapter_number?: number;
  chapter_id?: number;
  verse_number?: number;
  verse_order?: number;
  translation?: string;
  text: string;
  transliteration?: string;
  word_meanings?: string;
}


interface VerseMetadata extends Verse {
  id: string;
  chapter: number;
  verse: number;
}


const verses: Verse[] = rawVerses as Verse[];

// 4. Initialize ChromaDB client and collection on first import
const client = new ChromaClient();
let collection: Collection;

(async () => {
  try {
    collection = await client.getCollection({ name: 'gita' });
  } catch {
  
    collection = await client.createCollection({
      name: 'gita',
      embeddingFunction: new DefaultEmbeddingFunction()
    });

    
    const ids = verses.map(
      v => `${v.chapter_number || v.chapter_id}.${v.verse_number || v.verse_order}`
    );
    const docs = verses.map(v => v.translation || v.text);
    const metadatas = verses.map(v => ({
      id: `${v.chapter_number || v.chapter_id}.${v.verse_number || v.verse_order}`,
      chapter: v.chapter_number || v.chapter_id!,
      verse: v.verse_number || v.verse_order!,
      text: v.text,
      translation: v.translation || v.text,
      transliteration: v.transliteration || '',
      word_meanings: v.word_meanings || ''
    }));

    
    await collection.add({ ids, documents: docs, metadatas });
  }
})();


export async function POST(request: NextRequest) {
  const { q } = await request.json();
  const queryText = (q as string).trim();
  const lower = queryText.toLowerCase();

 
  const match = lower.match(/.*chapter\s+(\d+)\s+verse\s+(\d+).*/);
  if (match) {
    const chap = parseInt(match[1], 10);
    const verseNum = parseInt(match[2], 10);
    const found = verses.find(
      v =>
        (v.chapter_number || v.chapter_id) === chap &&
        (v.verse_number || v.verse_order) === verseNum
    );
    if (found) {
      return NextResponse.json({
        answer: found.translation || found.text,
        used_verses: true
      });
    }
    return NextResponse.json({
      answer: "Sorry, I couldn’t find that verse in the Gita.",
      used_verses: true
    });
  }

  
  const results = await collection.query({
    queryTexts: [queryText],
    nResults: 3,
    include: ['metadatas']
  });

  
  const rawMeta = results.metadatas[0];
  const topVerses = (rawMeta as unknown as (VerseMetadata | null)[])
    .filter((md): md is VerseMetadata => md !== null);

 
  const prompt =
    'Below are three relevant Bhagavad Gita verses:\n\n' +
    topVerses.map(md => `${md.id}: ${md.translation}`).join('\n') +
    `\n\nQuestion: ${queryText}\nAnswer concisely, using only the above verses as reference:`;

 
  const hfToken = process.env.HF_API_TOKEN;
  const hfResponse = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 200, temperature: 0.7 }
      })
    }
  );

  if (!hfResponse.ok) {
    return NextResponse.json(
      { answer: 'Error generating response', used_verses: true },
      { status: 500 }
    );
  }

  const generation = (await hfResponse.json())[0];
  const answer = (generation.generated_text as string).trim();

  return NextResponse.json({ answer, used_verses: true });
}
