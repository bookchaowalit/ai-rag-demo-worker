---
title: solo-rag-demo-cf — Product Card
doc_id: CARD-solo-rag-demo-cf
doc_type: product-card
verdict: merge
version: 0.1
date: 2026-10-11
status: ร่างเพื่อพิจารณา
owner: Product owner (Book Dev)
---

# solo-rag-demo-cf — Product Card

## 1. สรุปคุณค่าในหนึ่งประโยค

เดโมที่แสดงว่าอัปโหลดเอกสาร แล้วถามตอบภาษาไทยพร้อมอ้างอิงแหล่งได้ บน Cloudflare Workers AI

## 2. ปัญหาและผู้ใช้เป้าหมาย

- ปัญหา: องค์กรอยากให้เอกสารตอบคำถามได้ตลอดเวลา — เป็นข้อเสนอเดโม ยังไม่มีลูกค้ายืนยัน
- ผู้ใช้เป้าหมาย: ธุรกิจไทยขนาดเล็ก **[สมมติฐาน]**

## 3. สิ่งที่ทำได้จริงตอนนี้

- Worker รับ `POST /upload`, `POST /query`, `GET /stats` และมี embeddings (`@cf/baai/bge-base-en-v1.5`) กับ LLM `@cf/meta/llama-3-8b-instruct` ตาม README
- เก็บข้อมูลใน memory แบบสาธารณะ; README ระบุว่าเป็น demo ที่ superseded และห้ามใช้กับข้อมูลจริง
- `npm run deploy` ถูกบล็อกด้วย predeploy guard ต้องตั้ง `ALLOW_RAG_DEMO_DEPLOY=true` จึงจะ deploy

## 4. หลักฐานสถานะ

| รายการ | ค่า (ตรวจจาก repository) |
|---|---|
| Stack | JavaScript (Cloudflare Workers) |
| Commits | 12 (แรก 2026-07-04 → ล่าสุด 2026-10-11) |
| Source | ประมาณ 662 บรรทัดใน 2 ไฟล์ (ไม่รวมเทสต์) |
| Tests | ไม่มี |
| CI | ไม่มี |
| Deploy config | `wrangler.toml` (Cloudflare Workers) พร้อม predeploy guard; ไม่มี live URL ที่ตรวจได้ |
| Live URL | ไม่มี (ไม่ได้ตรวจ) |
| README | 143 บรรทัด |

## 5. คุณค่าและจุดต่าง

- จุดต่างเดียวคือเดโม Thai + citation บน edge ราคาถูก
- มุมรายได้: ซ้ำกับ `ai-doc-assistant` (FastAPI, ชื่อ README เดียวกัน) **[ต้องยืนยัน]** ว่าตัวไหนเป็น canonical

## 6. ช่องว่างสำคัญ

- README บอกเองว่า superseded
- ไม่มีที่เก็บถาวร ไม่มี auth ไม่มีเทสต์ ไม่มี CI
- README พิมพ์ชื่อโมเดลว่า Llama 3.8B ทั้งที่ใช้ llama-3-8b-instruct — ควรแก้

## 7. คำตัดสิน

**`merge`** — ซ้ำหัวข้อกับ `ai-doc-assistant` และถูกระบุว่า superseded; canonical twin: `ai-doc-assistant` (ต้องให้เจ้าของยืนยัน) จะเปลี่ยนถ้ามีลูกค้าที่ต้องการ edition บน Cloudflare โดยเฉพาะ

## 8. ขั้นต่อไป

1. ยืนยัน canonical twin กับเจ้าของ แล้วเก็บเฉพาะส่วนที่ต่างไว้ใน `ai-doc-assistant`
2. ถ้าไม่ใช้ต่อ ให้เสนอ archive

## การอนุมัติ

| บทบาท | สถานะ | วันที่ | ลงนาม |
|---|---|---|---|
| Product owner (Book Dev) | รอพิจารณา | — | ________ |

## แหล่งข้อมูล

- `README.md`
- `wrangler.toml`, `src/`, `scripts/`
