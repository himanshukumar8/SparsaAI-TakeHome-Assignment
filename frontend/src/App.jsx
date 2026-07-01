import { useState, useEffect, useRef } from "react";

// Configurable API base URL
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 1000;

function getApiErrorMessage(detail, fallback) {
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join("; ") || fallback;
  }
  if (typeof detail === "string") {
    return detail;
  }
  return fallback;
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [urls, setUrls] = useState("");
  const [runId, setRunId] = useState(null);
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const urlList = urls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
  const isValid = prompt.trim().length > 0 && urlList.length > 0;
  
  const isLoading = isSubmitting || Boolean(runId && run?.status !== "done" && run?.status !== "failed");

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup abort controller on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  async function startRun() {
    if (!isValid) return;
    setError(null);
    setRun(null);
    setRunId(null);
    setIsSubmitting(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const submitController = new AbortController();
    abortControllerRef.current = submitController;
    
    try {
      const res = await fetch(`${API}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, urls: urlList }),
        signal: submitController.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(errData?.detail, `Server error: ${res.status}`));
      }
      const data = await res.json();
      if (isMountedRef.current) {
        setRunId(data.run_id);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (abortControllerRef.current === submitController) {
        abortControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  useEffect(() => {
    if (!runId) return;

    let isSubscribed = true;
    let timeoutId = null;
    let pollController;
    
    const scheduleNextPoll = () => {
      timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    
    const poll = async () => {
      pollController = new AbortController();
      
      try {
        const res = await fetch(`${API}/runs/${runId}`, {
          signal: pollController.signal
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch run status: ${res.status}`);
        }
        const data = await res.json();
        
        if (isSubscribed) {
          setRun(data);
          if (data.status === "done" || data.status === "failed") {
            return;
          }
          scheduleNextPoll();
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (isSubscribed) {
          setError(err.message);
        }
      } finally {
        pollController = null;
      }
    };

    poll(); // Initial check

    return () => {
      isSubscribed = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (pollController) {
        pollController.abort();
      }
    };
  }, [runId]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Research Runs</h1>
        <p className="subtitle">AI-powered deep web synthesis</p>
      </header>

      <main className="main-content">
        <div className="card input-card">
          <div className="form-group">
            <label htmlFor="prompt-input">Prompt</label>
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What do you want researched?"
              rows={3}
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="urls-input">Sources (URLs)</label>
            <textarea
              id="urls-input"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="One source URL per line"
              rows={4}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="button"
            onClick={startRun} 
            disabled={!isValid || isLoading}
            className={`run-button ${isLoading ? 'loading' : ''}`}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                <span>Running...</span>
              </>
            ) : "Run Synthesis"}
          </button>
        </div>

        {error && (
          <div className="alert error-alert" role="alert">
            <span className="alert-icon" aria-hidden="true">!</span>
            <div className="alert-content">
              <h4>Submission Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {run && run.status === "failed" && (
          <div className="alert error-alert" role="alert">
            <span className="alert-icon" aria-hidden="true">!</span>
            <div className="alert-content">
              <h4>Run Failed</h4>
              <p>{run.result?.error || "Unknown processing error occurred"}</p>
            </div>
          </div>
        )}

        {run && run.status === "done" && (
          <div className="card result-card">
            <div className="kpi-grid">
              <div className="kpi-item">
                <span className="kpi-label">Pages Scraped</span>
                <span className="kpi-value">{run.result.pages_scraped}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Success Rate</span>
                <span className="kpi-value">{(run.result.success_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Tokens Used</span>
                <span className="kpi-value">{run.result.tokens_used}</span>
              </div>
            </div>

            <div className="result-section">
              <h3>Executive Brief</h3>
              <div className="brief-content">
                {run.result.brief}
              </div>
            </div>

            <div className="result-section">
              <h3>Sources Used</h3>
              <ul className="source-list">
                {run.result.sources.map((s, index) => (
                  <li key={index}>
                    <a href={s} target="_blank" rel="noopener noreferrer">{s}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
