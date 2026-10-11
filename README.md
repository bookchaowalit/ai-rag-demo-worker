---
title: "RAG-as-a-Service Demo"
tags: [documentation, infra]
created: 2026-07-04
updated: 2026-08-08
description: "Documentation for RAG-as-a-Service Demo."
---

# RAG-as-a-Service Demo

Turn company documents into an AI assistant that answers questions 24/7 — in Thai, with citations.

## Features

- **Document Upload**: Upload PDF, DOCX, TXT files
- **Smart Chunking**: Automatic text segmentation with overlap
- **Vector Search**: Cosine similarity for semantic search
- **AI Answers**: Llama 3.8B powered responses with source citations
- **Thai Language**: Full Thai NLP support
- **Cloudflare Workers**: Globally distributed, serverless

## Quick Start (Local)

1. Install dependencies:
```bash
npm install
```

2. Run locally (recommended):
```bash
npm run dev
```

This worker is a superseded demo with public, in-memory storage. Do not use it
for production data. An explicit demo deployment requires:

```bash
ALLOW_RAG_DEMO_DEPLOY=true npm run deploy
```

The default `npm run deploy` is blocked by a predeploy guard.

Browser CORS is disabled by default. If a local demo UI needs browser access,
set the `CORS_ORIGINS` Worker variable to a comma-separated exact-origin list
(for example `http://localhost:3000,http://localhost:5173`). Wildcard origins
are intentionally unsupported.

3. Access the API:
```bash
# Root endpoint
curl https://rag-demo.<your-subdomain>.workers.dev/

# Upload document
curl -X POST https://rag-demo.<your-subdomain>.workers.dev/upload \
  -F "file=@document.pdf"

# Query knowledge base
curl -X POST https://rag-demo.<your-subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the refund policy?", "top_k": 3}'

# Get stats
curl https://rag-demo.<your-subdomain>.workers.dev/stats
```

## Architecture

```
Client → Cloudflare Worker → Document Processor → In-Memory Storage
                                    ↓
                            Workers AI Embeddings
                                    ↓
                            Workers AI Llama 3.8B
```

## Tech Stack

- **Platform**: Cloudflare Workers
- **AI**: Cloudflare Workers AI
  - Embeddings: `@cf/baai/bge-base-en-v1.5`
  - LLM: `@cf/meta/llama-3-8b-instruct`
- **Storage**: In-memory (demo mode)
- **Language**: JavaScript

## API Endpoints

### Upload Document
```bash
POST /upload
Content-Type: multipart/form-data

file: <document.pdf>
```

### Query Knowledge Base
```bash
POST /query
Content-Type: application/json

{
  "question": "What is the refund policy?",
  "top_k": 3
}
```

### Get Stats
```bash
GET /stats
```

## Production Deployment

For production use, replace in-memory storage with:
- **Cloudflare KV**: For persistent key-value storage
- **Cloudflare D1**: For SQL database
- **Cloudflare Vectorize**: For vector similarity search

## Pricing Model

- **Setup Fee**: ฿30K-200K (one-time)
- **Monthly Retainer**: ฿5K-25K/month
- **ROI**: 1/10th the cost of hiring staff

## Target Customers

- Law firms (10-50 employees)
- Accounting firms
- Insurance companies
- Any document-heavy business

## Next Steps

- [x] Core RAG backend (Cloudflare Worker)
- [ ] Add web UI (Next.js chat interface)
- [ ] Persistent storage (KV/D1 + Vectorize)
- [ ] Multi-tenant support
- [ ] Access control
- [ ] Analytics dashboard
- [ ] Deploy to production

## ที่มา

ย้ายมาจาก `solo-empire/infra/rag-demo-cf/` (2026-10-11) พร้อมประวัติ git. เป็น demo เท่านั้น: deploy ถูกกันด้วย `scripts/guard-demo-deploy.mjs` (ต้องตั้ง `ALLOW_RAG_DEMO_DEPLOY`). ติดตั้ง `npm ci`.
