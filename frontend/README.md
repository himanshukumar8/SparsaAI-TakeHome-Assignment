# Research Runs Frontend

React/Vite UI for the Research Runs dashboard. The app submits a prompt and source URLs to the FastAPI backend, polls for completion, and renders the resulting brief, KPIs, and sources.

## Scripts

```sh
npm run dev
npm run build
npm run lint
npm run preview
```

## Configuration

Set `VITE_API_URL` when the backend is not running on `http://localhost:8000`.

```sh
VITE_API_URL=http://localhost:8000 npm run dev
```

The backend must allow the frontend origin through `CORS_ALLOWED_ORIGINS`.
