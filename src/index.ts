/**
 * RAG-as-a-Service Demo — Cloudflare Worker
 * Turn company documents into an AI assistant that answers questions 24/7
 * 
 * Demo version: In-memory storage (resets on worker restart)
 */

export interface Env {
  AI: Ai;
  ENVIRONMENT: string;
  /** Comma-separated browser origins; unset means no cross-origin access. */
  CORS_ORIGINS?: string;
}

interface Chunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
  chunk_id: number;
}

interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    source: string;
    chunk_id: number;
    score: number;
  }>;
  confidence: number;
}

// In-memory storage for demo
const knowledgeBase: Map<string, Chunk> = new Map();

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Root endpoint
      if (path === '/') {
        return new Response(JSON.stringify({
          service: 'RAG-as-a-Service',
          status: 'running',
          version: '1.0.0',
          platform: 'Cloudflare Workers',
          demo_mode: true,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Upload document
      if (path === '/upload' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Extract text from file
        const text = await file.text();
        
        // Chunk the text
        const chunks = chunkText(text, file.name);
        
        // Generate embeddings for all chunks
        const embeddings = await generateEmbeddings(env, chunks.map(c => c.text));
        
        // Store chunks with embeddings in memory
        storeChunks(chunks, embeddings, file.name);

        return new Response(JSON.stringify({
          status: 'success',
          filename: file.name,
          chunks_created: chunks.length,
          message: `Document processed into ${chunks.length} chunks`,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Query knowledge base
      if (path === '/query' && request.method === 'POST') {
        const { question, top_k = 3 } = await request.json();
        
        if (!question) {
          return new Response(JSON.stringify({ error: 'No question provided' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const result = await queryKnowledgeBase(env, question, top_k);

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Get stats
      if (path === '/stats' && request.method === 'GET') {
        const stats = getStats();
        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};

/**
 * Chunk text into overlapping segments
 */
function chunkText(text: string, filename: string): Array<{ id: string; text: string; chunk_id: number }> {
  const chunkSize = 500;
  const overlap = 50;
  const chunks: Array<{ id: string; text: string; chunk_id: number }> = [];
  
  // Clean text
  text = text.replace(/\s+/g, ' ').trim();
  
  let start = 0;
  let chunkId = 0;
  
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastSentence = text.substring(Math.max(start, end - 100), end);
      for (const punct of ['. ', '? ', '! ', '\n']) {
        const pos = lastSentence.lastIndexOf(punct);
        if (pos > 0) {
          end = Math.max(start, end - 100) + pos + 1;
          break;
        }
      }
    }
    
    const chunkText = text.substring(start, end).trim();
    
    if (chunkText) {
      chunks.push({
        id: `${filename}_chunk_${chunkId}`,
        text: chunkText,
        chunk_id: chunkId,
      });
      chunkId++;
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

/**
 * Generate embeddings using Cloudflare Workers AI
 */
async function generateEmbeddings(env: Env, texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process in batches of 10 (API limit)
  for (let i = 0; i < texts.length; i += 10) {
    const batch = texts.slice(i, i + 10);
    
    const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: batch,
    });
    
    embeddings.push(...response.data.map((d: any) => d.embedding));
  }
  
  return embeddings;
}

/**
 * Store chunks with embeddings in memory
 */
function storeChunks(
  chunks: Array<{ id: string; text: string; chunk_id: number }>,
  embeddings: number[][],
  filename: string
): void {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    
    const chunkData: Chunk = {
      id: chunk.id,
      text: chunk.text,
      embedding: embedding,
      source: filename,
      chunk_id: chunk.chunk_id,
    };
    
    knowledgeBase.set(chunk.id, chunkData);
  }
}

/**
 * Query knowledge base with RAG
 */
async function queryKnowledgeBase(env: Env, question: string, topK: number): Promise<QueryResponse> {
  if (knowledgeBase.size === 0) {
    return {
      answer: 'No documents in knowledge base. Please upload documents first.',
      sources: [],
      confidence: 0,
    };
  }

  // Generate question embedding
  const questionEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [question],
  });
  
  const queryVec = questionEmbedding.data[0].embedding;
  
  // Compute similarity for all chunks
  const scored: Array<Chunk & { score: number }> = [];
  
  for (const chunk of knowledgeBase.values()) {
    const score = cosineSimilarity(queryVec, chunk.embedding);
    scored.push({ ...chunk, score });
  }
  
  // Sort by score and take top K
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, topK);
  
  // Build context
  const context = topChunks.map(c => c.text).join('\n\n');
  
  // Generate answer with Workers AI
  const answer = await generateAnswer(env, question, context);
  
  return {
    answer,
    sources: topChunks.map(c => ({
      text: c.text,
      source: c.source,
      chunk_id: c.chunk_id,
      score: c.score,
    })),
    confidence: topChunks.length > 0 ? topChunks[0].score : 0,
  };
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate answer using Workers AI
 */
async function generateAnswer(env: Env, question: string, context: string): Promise<string> {
  const prompt = `You are a helpful assistant that answers questions based on the provided context. 
Always cite your sources. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${question}

Answer (in Thai or English based on the question):`;

  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Answer based on the provided context. Always cite sources.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });
  
  return response.response;
}

/**
 * Get knowledge base statistics
 */
function getStats(): any {
  return {
    total_chunks: knowledgeBase.size,
    status: 'ready',
    platform: 'Cloudflare Workers',
    ai_model: '@cf/meta/llama-3-8b-instruct',
    embedding_model: '@cf/baai/bge-base-en-v1.5',
    demo_mode: true,
  };
}
