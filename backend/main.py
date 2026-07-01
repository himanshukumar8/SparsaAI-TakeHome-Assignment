"""
main.py — Research Runs API

Backend for the Research Runs dashboard. A client POSTs a prompt + URLs to start
a run; the API returns a run_id immediately and processes the run in the
background. The client polls GET /runs/{run_id} until status is "done", then
renders the brief and KPIs.

The scrape and LLM calls are stubbed so this runs with no API keys or network —
the response shapes match the real Firecrawl / Anthropic ones.

Generated with AI assistance. Integrate it (with the React frontend) and sign
off that it is production-ready.

Run (from backend directory):  uvicorn main:app --reload --reload-dir .
"""
import asyncio
import time
import logging
import os
from datetime import datetime, timezone

import uuid

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl, field_validator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def allowed_cors_origins():
    raw_origins = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app = FastAPI(title="Research Runs API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

RUNS = {}  # run_id -> {"status": ..., "result": ...}


class RunRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
    urls: list[HttpUrl] = Field(..., min_length=1, max_length=100)

    @field_validator("prompt")
    @classmethod
    def prompt_must_contain_text(cls, value):
        prompt = value.strip()
        if not prompt:
            raise ValueError("Prompt must contain non-whitespace text")
        return prompt


# --- stubbed externals (shapes match production) ---------------------------

def scrape_page(url):
    # prod: requests.get(url) through Firecrawl
    time.sleep(0.2)
    return {"url": url, "title": f"Title for {url}", "content": f"Scraped body of {url}. " * 20}


def call_llm(prompt):
    # prod: anthropic_client.messages.create(...)
    class _Block:
        def __init__(self, t):
            self.text = t
            self.type = "text"

    class _Usage:
        input_tokens = 1200
        output_tokens = 280

    class _Msg:
        content = [_Block("- Key finding A\n- Key finding B")]
        usage = _Usage()

    return _Msg()


# --- run logic --------------------------------------------------------------

def do_run(prompt, urls):
    pages = [scrape_page(u) for u in urls]

    seen, sources = set(), []
    for p in pages:
        if p["title"] not in seen:
            seen.add(p["title"])
            sources.append(p["url"])

    msg = call_llm(prompt)
    brief = msg.content[0].text
    tokens = msg.usage.output_tokens

    pages_scraped = len(pages)
    successful = [p for p in pages if p["content"]]
    success_rate = len(successful) / pages_scraped if pages_scraped > 0 else 0.0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt": prompt,
        "pages_scraped": pages_scraped,
        "success_rate": success_rate,
        "tokens_used": tokens,
        "sources": sources,
        "brief": brief,
    }


async def process_run(run_id, prompt, urls):
    start_time = time.time()
    try:
        row = await asyncio.to_thread(do_run, prompt, urls)
        RUNS[run_id]["status"] = "done"
        RUNS[run_id]["result"] = row
        duration = time.time() - start_time
        logger.info(f"Run {run_id} completed in {duration:.2f}s: scraped {row['pages_scraped']} pages")
    except Exception as exc:
        RUNS[run_id]["status"] = "failed"
        RUNS[run_id]["result"] = {"error": str(exc)}
        logger.error(f"Run {run_id} failed: {exc}", exc_info=True)


# --- endpoints --------------------------------------------------------------

@app.post("/runs")
async def start_run(req: RunRequest, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())
    RUNS[run_id] = {"status": "running", "result": None}
    
    logger.info(f"Run {run_id} created: {len(req.prompt)} char prompt, {len(req.urls)} URLs")
    
    # Cast HttpUrl to string for processing
    url_strings = [str(u) for u in req.urls]
    background_tasks.add_task(process_run, run_id, req.prompt, url_strings)
    return {"run_id": run_id}


@app.get("/runs/{run_id}")
async def get_run(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    return RUNS[run_id]
