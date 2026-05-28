<div align="center">

<img src="https://img.shields.io/badge/VedaAI-Question%20Paper%20Generator-6366f1?style=for-the-badge&logo=bookstack&logoColor=white" alt="VedaAI" height="40"/>

# VedaAI

**AI-Powered Question Paper & Assignment Generation for Educators**

Generate CBSE/NCERT-compliant exam papers in seconds — powered by multimodal OCR, real-time streaming, and lightning-fast LLM inference.

[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?style=flat-square)](https://groq.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)

[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Engineering Notes](#-engineering-notes)

</div>

---

## Overview

VedaAI is a production-grade full-stack platform that transforms raw reference materials — textbook images, scanned PDFs, or open-ended teacher instructions — into fully structured, curriculum-compliant question papers. It couples multimodal OCR with structured LLM generation and an asynchronous task queue to deliver a fast, interactive, real-time streaming experience.

---

## ✨ Features

- **Multimodal Input** — Upload textbook images, PDFs, or type free-form instructions; Gemini 2.5 Flash extracts diagrams, equations, and text with high accuracy.
- **Flexible Section Builder** — Configure any mix of question types (MCQ, Short Answer, Long Answer, etc.) with custom counts and marking schemes.
- **Real-time Streaming UI** — Watch your exam paper materialize live, question by question, via WebSocket events and a smooth typewriter animation.
- **CBSE/NCERT Compliance** — Prompts and schemas are tuned for Indian curriculum standards.
- **Bulletproof JSON Generation** — Zod-validated structured outputs; no crashes from malformed LLM responses.
- **PDF Export** — One-click high-fidelity PDF compilation of completed papers.
- **Non-blocking Architecture** — All heavy AI workloads run in isolated BullMQ workers; the API stays snappy under load.
- **Cloud Asset Storage** — Reference files securely hosted on Cloudinary.

---

## 🏗 Architecture

VedaAI uses a decoupled three-tier architecture: a Next.js frontend, an Express API server, and a background worker tier that handles all AI inference asynchronously.
---
### Request flow

| Step | Actor | Action |
|------|-------|--------|
| ① | Create Assignment View | `POST /api/assignments` with config + file |
| ② | Create Assignment View | Joins a private Socket.IO room keyed to the assignment ID |
| ③ | BullMQ Worker | Picks up the enqueued job from Redis |
| ④ | Worker → Gemini 2.5 Flash | Streams the file for OCR and concept distillation |
| ⑤ | Worker → Groq Llama 3.3 | Generates sections, then fills each with questions |
| ⑥ | Worker → Socket.IO | Emits granular progress events (logs, sections, questions) |
| ⑦ | Socket.IO → Live Exam View | Streams events to the client; typewriter animation renders them |
| ⑧ | Worker → MongoDB | Persists the finalized paper; closes the socket room |
### End-to-End Request Flow

| Step | What Happens |
|------|-------------|
| **1. Initiation** | Teacher configures sections (type, count, marks), uploads reference materials, and clicks **Create**. |
| **2. Asset Upload** | Files are routed to **Cloudinary** for secure, CDN-backed storage. |
| **3. Queueing** | A pending assignment is registered in **MongoDB**; a job is pushed to **BullMQ**. The API returns immediately — no blocking. |
| **4. WebSocket Handshake** | Frontend navigates to `/assignments/[id]/generating` and joins a private Socket.IO room keyed to the assignment ID. |
| **5. Worker Execution** | A background worker picks up the job, fetches the remote file, and pipes it through Gemini for OCR if it's a PDF or image. |
| **6. Structured Generation** | Groq Llama 3.3 70B generates section skeletons, then iteratively fills each section with questions matched exactly to the configured type and marking scheme. |
| **7. Live Streaming** | The worker emits granular events (logs, progress %, sections, individual questions) over Socket.IO as generation proceeds. |
| **8. Finalization** | The completed paper is persisted in MongoDB; the Socket.IO room is closed. |

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | [Next.js 16](https://nextjs.org/) | App Router, SSR, client components |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, reactive global store |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide](https://lucide.dev/) | Glassmorphic design system, responsive layouts |
| **API Server** | [Express 5](https://expressjs.com/) | TypeScript-first REST backend |
| **Database** | [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) | Document storage for assignments and papers |
| **Task Queue** | [BullMQ](https://bullmq.io/) + [Redis](https://redis.io/) | Async background workers with retries |
| **WebSockets** | [Socket.IO](https://socket.io/) | Low-latency bi-directional event streaming |
| **LLM (Structured)** | [Groq](https://groq.com/) — Llama 3.3 70B | Fast JSON-schema question generation |
| **LLM (Multimodal)** | [Gemini 2.5 Flash](https://ai.google.dev/) | OCR: equations, diagrams, handwriting |
| **File Storage** | [Cloudinary](https://cloudinary.com/) | Cloud asset hosting |
| **Validation** | [Zod](https://zod.dev/) | Runtime schema safety for LLM outputs |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- Docker & Docker Compose (recommended), **or** local MongoDB + Redis instances
- API keys for Groq, Gemini, and Cloudinary

---

### Option A — Docker Compose *(Recommended)*

Spins up MongoDB, Redis, and the backend API in one command.

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys (see Configuration section)

# 2. Start backend services
cd backend
docker-compose up --build -d

# 3. Start the frontend
cd ../frontend/veda.ai
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

Services started by Docker Compose:

| Service | URL |
|---------|-----|
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |
| Backend API | `localhost:3000` |

---

### Option B — Manual Local Setup

```bash
# Step 1: Start MongoDB and Redis locally
# (Ensure credentials match your .env)

# Step 2: Backend
cd backend
npm install
npm run dev        # Starts API server + file watcher on :3000

# Step 3: Frontend
cd ../frontend/veda.ai
npm install
npm run dev        # Starts Next.js on :3001
```

---

## ⚙️ Configuration

### Backend — `backend/.env`

```env
PORT=3000
NODE_ENV=development

# ── Database ─────────────────────────────────────────
MONGO_URI=mongodb://admin:password123@localhost:27017/ved?authSource=admin
MONGO_DB=ved

# ── Queue & Cache ─────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# ── AI Providers ──────────────────────────────────────
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# ── Asset Storage ─────────────────────────────────────
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ── CORS ──────────────────────────────────────────────
FRONTEND_URL=http://localhost:3001
```

### Frontend — `frontend/veda.ai/.env`

```env
BACKEND_URL=http://localhost:3000
```

---

## 📡 API Reference

### `POST /api/assignments`

Registers a new assignment and schedules a background generation job.

**Request body:**
```json
{
  "title": "CBSE Class 8 Science",
  "dueDate": "2026-06-15T00:00:00.000Z",
  "instructions": "Focus on the NCERT chapter on Crop Production.",
  "questionConfigs": [
    { "type": "MCQ", "count": 5, "marks": 1 },
    { "type": "ShortAnswer", "count": 3, "marks": 3 }
  ]
}
```

**Response:** `201 Created` with assignment ID and initial status.

---

### `GET /api/assignments/:id`

Returns the assignment's metadata, current processing state, progress logs, and generated paper if complete.

---

### `POST /api/assignments/:id/regenerate`

Queues a fresh generation job for an existing assignment, discarding the previous output.

---

### `GET /api/assignments/:id/pdf`

Compiles the finalized paper into a PDF and streams it to the client.

---

### `DELETE /api/assignments/:id`

Removes the assignment and its associated paper from the database.

---

## 🔬 Engineering Notes

### 1. Solving Stale React Closures in High-Frequency Streaming

WebSocket events arrive faster than React can batch re-renders. A naive `setInterval` inside a component captures stale closure state, causing dropped or duplicated text nodes in the typewriter animation.

**Solution:** Decouple mutable state (position trackers, queues, data arrays) from render triggers using a `useRef` / lightweight tick counter pattern:

```typescript
const sectionsRef = useRef<Section[]>([]);
const queueRef    = useRef<StreamItem[]>([]);
const [tick, setTick] = useState(0);

// Mutate refs freely; bump tick to schedule a clean re-render
const rerender = useCallback(() => setTick((t) => t + 1), []);
```

Refs are always current; `tick` simply tells React "something changed." Zero race conditions, zero dropped frames.

---

### 2. Bulletproof Structured JSON from LLMs

LLM outputs are inherently unpredictable. A malformed JSON response crashing the client is unacceptable in a production app.

**Defence layers:**
- Zod schemas (`QuestionSchema`, `SectionSchema`) validate every parsed object at runtime.
- Section structure generation is decoupled from question-level generation — models receive tightly scoped, unambiguous prompts with exact marks, counts, and types.
- A `extractJSON` utility strips markdown fences (` ```json `) before parsing, eliminating the most common failure mode.

---

### 3. Non-Blocking Event-Loop Architecture

LLM inference — especially multimodal OCR — can take 10–30 seconds per job. Performing this synchronously in a request handler would block the entire Node.js event loop.

**Solution:**
- Express delegates every generation job to **BullMQ** workers immediately, returning a `202 Accepted` to the client in milliseconds.
- Workers run in an isolated process; failures are retried automatically with configurable backoff.
- Multimodal assets are base64-encoded and streamed directly to Gemini, avoiding expensive in-process CPU work.

---

## 📁 Project Structure

```
vedaai/
├── backend/
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   ├── workers/         # BullMQ job processors
│   │   ├── models/          # Mongoose schemas
│   │   ├── services/        # Groq & Gemini API clients
│   │   └── utils/           # JSON extraction, validation helpers
│   ├── docker-compose.yml
│   └── .env
└── frontend/veda.ai/
    ├── app/
    │   ├── assignments/     # Assignment creation & live view
    │   └── api/             # Next.js route handlers (proxy)
    ├── store/               # Zustand global state
    └── .env
```

---

## 👥 Contributing



For support, scaling inquiries, or feature requests, reach out to me @Annuvrat.

---

<div align="center">

Built with Passion for educators, by the **Annuvrat** .

</div>