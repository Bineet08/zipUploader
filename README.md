# Resumable Chunked File Upload System

A full-stack implementation of a **resumable, chunk-based file upload system** with pause, resume, retry, and recovery support.  
Built as part of a backend–frontend engineering assignment.

---

## 🚀 Features

- **Chunked uploads** (5 MB per chunk)
- **Resume upload after refresh / restart**
- **Pause & Resume**
- **Retry failed chunks**
- **Concurrent uploads (configurable)**
- **Idempotent backend handling**
- **Safe progress calculation (no >100% bugs)**
- **Automatic cleanup of stale uploads**
- **Dockerized setup (Backend + MySQL + Frontend)**

---

## 🧠 Architecture Overview

### Frontend
- React + Vite
- Uploads files in chunks using `FormData`
- Tracks:
  - Uploaded bytes
  - Upload speed
  - ETA
  - Chunk status (`pending`, `uploading`, `success`, `error`)
- Prevents double-counting using a `countedChunks` mechanism

### Backend
- Node.js + Express
- Uses **MySQL** for upload metadata
- Handles:
  - Upload initialization
  - Chunk validation & writing
  - Resume detection
  - Finalization after last chunk
  - Cleanup of stale uploads

---

## 🗄️ Database Schema

### uploads
- `id` (UUID, PK)
- `file_key` (filename + size, UNIQUE)
- `filename`
- `total_size`
- `total_chunks`
- `status` (`UPLOADING`, `PROCESSING`, `COMPLETED`)
- `created_at`, `updated_at`

### chunks
- `upload_id` (FK)
- `chunk_index`
- `status` (`PENDING`, `SUCCESS`)
- **UNIQUE(upload_id, chunk_index)**

---

## 🔁 Upload Flow

1. Frontend calls `/upload/status`
2. Backend returns already uploaded chunks (if any)
3. Frontend:
   - Skips completed chunks
   - Uploads remaining chunks concurrently
4. Each chunk:
   - Written at correct byte offset
   - Marked `SUCCESS` atomically
5. Final chunk triggers background finalization
6. Progress is calculated **only once per chunk**

---

## 🧹 Cleanup Job

A background job removes stale uploads:

- Status: `UPLOADING` or `PROCESSING`
- Older than **24 hours**
- Deletes:
  - Partial files from disk
  - Related DB rows (transaction-safe)

Runs automatically when backend starts.

---

## 🐳 Docker Setup

### Services
- `upload_mysql` — MySQL 8.0
- `upload_backend` — Node.js backend
- `upload_frontend` — Vite + React frontend

### Start Everything
```bash
docker compose down -v
docker compose up --build
```
### Environment Variables
- BACKEND
```bash
PORT=4000
NODE_ENV=development
DB_HOST=upload_mysql
DB_USER=uploader
DB_PASSWORD=******
DB_NAME=chunk_upload
CLIENT=http://localhost:5173

```
- FRONTEND
```bash
VITE_API_URL=http://localhost:4000
```
### 🛑 Edge Cases Handled

- Two final chunks arriving simultaneously → safe (DB + idempotency)

- Backend restart mid-upload → resumes from DB state

- Duplicate chunk uploads → ignored safely

- Progress exceeding 100% → prevented

- Partial uploads → cleaned automatically
- ## Failure Scenarios & System Guarantees

This system is designed to be **robust under real-world failure conditions**.  
Below is a detailed explanation of how each required scenario is handled.

---

### 1. Double-Finalize (Two “final chunk” requests arrive simultaneously)

**Problem:**  
Two chunk uploads may both believe they are the last chunk and attempt to finalize the upload.

**Solution:**  
- Each chunk is uniquely identified using a database constraint:  
  `UNIQUE(upload_id, chunk_index)`
- Finalization is triggered **only after** checking that no pending chunks remain.
- The `finaliseUpload` process uses a database row lock (`SELECT ... FOR UPDATE`) and
  transitions the upload status from `UPLOADING → PROCESSING → COMPLETED`.

**Guarantee:**  
Even if multiple requests arrive simultaneously, **only one finalize operation succeeds**.
All others exit safely without corrupting state.

✅ Race-condition safe  
✅ Idempotent finalization  

---

### 2. Network Flapping (30% chunk upload failure)

**Problem:**  
Chunk uploads may randomly fail due to unstable network conditions.

**Solution:**  
- The frontend retries failed chunk uploads using **exponential backoff**:
  - 1s → 2s → 4s delays
- Each chunk has a maximum retry limit.
- Failed chunks are marked as `error` and can be retried manually.

**Guarantee:**  
Temporary network failures do not break uploads, and retries do not overload the server.

✅ Exponential backoff implemented  
✅ Retry-safe and user-recoverable  

---

### 3. Out-of-Order Delivery (Chunk 10 arrives before Chunk 2)

**Problem:**  
Chunks may arrive in any order due to concurrency or retries.

**Solution:**  
- The backend **never appends chunks sequentially**.
- Each chunk is written directly to its correct byte offset:
  ```js
  start = chunkIndex * CHUNK_SIZE

## Authors

- [Bineet Gupta](https://www.github.com/bineet08)

