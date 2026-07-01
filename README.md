# Research Runs Dashboard (Production-Ready Take-home Assignment)

## Overview

This repository contains my solution for the Sparsa AI Internship Qualifying Round take-home assignment.

The application implements a production-ready Research Runs dashboard consisting of:

- FastAPI backend
- React (Vite) frontend

A user submits a research prompt and a list of source URLs. The backend immediately returns a `run_id`, processes the request asynchronously, and the frontend polls until completion before displaying the generated research summary and execution metrics.

The scraping and LLM integrations are intentionally stubbed as specified in the assignment.

---

## Features

### Backend

- FastAPI REST API
- Asynchronous background processing
- UUID-based Run IDs
- Request validation using Pydantic
- Structured error handling
- Centralized configuration
- CORS configuration
- Structured logging
- API contract preserved exactly as provided
- Production-oriented code organization

### Frontend

- React + Vite
- Responsive UI
- Input validation
- Safe polling implementation
- AbortController support
- Loading and error states
- Accessible form controls
- Safe rendering (no `dangerouslySetInnerHTML`)
- Responsive KPI dashboard

---

## Project Structure

```
backend/
    main.py

frontend/
    src/
    public/

decisionlog.md
signingoffnote.md
intern-candidate-brief.md
README.md
```

---

## API

### Start Research Run

```
POST /runs
```

Request

```json
{
  "prompt": "Research AI agents",
  "urls": [
    "https://example.com"
  ]
}
```

Response

```json
{
  "run_id": "uuid"
}
```

---

### Get Research Status

```
GET /runs/{run_id}
```

Response

```json
{
  "status": "running | done | failed",
  "result": {
    "timestamp": "...",
    "prompt": "...",
    "pages_scraped": 1,
    "success_rate": 1.0,
    "tokens_used": 280,
    "sources": [],
    "brief": "..."
  }
}
```

---

## Running the Backend

```bash
cd backend

pip install fastapi uvicorn

python -m uvicorn main:app --reload
```

Backend runs on

```
http://localhost:8000
```

---

## Running the Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

## Validation Performed

The project was verified through:

- Backend startup verification
- Frontend production build
- ESLint validation
- API contract verification
- Happy-path testing
- Invalid input testing
- Unknown Run ID handling
- Polling verification
- Accessibility review
- Repository cleanup

---

## Design Decisions

The implementation focuses on production readiness while preserving the assignment scope.

Key engineering decisions include:

- Preserved public API contract
- Defensive input validation
- Reliable asynchronous execution
- Improved frontend polling behavior
- Safe request cancellation
- Better error reporting
- Accessible UI components
- Repository cleanup before submission

---

## Assignment Scope

This implementation intentionally retains the constraints defined by the assignment.

The following remain stubbed as requested:

- Web scraping
- LLM integration
- In-memory storage

These can be replaced by production services without changing the public API.

---

## Documentation

Additional documents included:

- `signingoffnote.md`
- `decisionlog.md`
- `intern-candidate-brief.md`

---

## Author

Himanshu Kumar

M.Tech (Computer Science)

Indian Institute of Information Technology, Lucknow
