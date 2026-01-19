# Custom Instructions for Pencil2Ink Development

## Project Overview

**Pencil2Ink** is a full-stack web application that converts pencil sketches to clean inked images using the TAMS/Tensor.art API. The app features a React frontend with a drag-and-drop upload interface and a FastAPI backend that manages job processing.

**Key Files:**
- `backend/main.py` - FastAPI app with 3 REST endpoints (upload, status, download)
- `frontend/src/App.tsx` - Main React component managing 4 UI states
- `backend/signature.py` - TAMS API authentication signature generation
- `Dockerfile` - Multi-stage build (Node.js + Python)

## Technology Stack

- **Backend:** FastAPI, Python 3.14, httpx, Pillow, cryptography
- **Frontend:** React 18, TypeScript, Vite 7, CSS3
- **Deployment:** Docker, Fly.io
- **AI Model:** Inkify LoRA (920889236046011951) + flux1-dev-kontext (879112449935019302)

## Development Guidelines

### Code Style
- Python: Follow PEP 8, use type hints
- TypeScript/React: Use functional components with hooks, prefer `const` over `let`
- All files use 2-space indentation (frontend) and 4-space (backend)

### Environment Variables
Always use `.env` file (not committed to repo). Required variables:
```
TAMS_URL=https://ap-east-1.tensorart.cloud
TAMS_APP_ID=<your_app_id>
PRIVATE_KEY_PEM=<your_private_key>
```

### Running Locally
```bash
./dev.sh  # Single command that handles everything
```

### API Design Decisions

**Always return HTTP 200 with JSON:**
- Even errors return `{"status": "error", "message": "..."}` with HTTP 200
- This simplifies frontend error handling

**Job Storage:**
- In-memory dict with 1-hour expiration
- No database needed for this use case
- Call `cleanup_expired_jobs()` at start of upload endpoint

**Image Validation:**
- Client-side: format validation (JPG/PNG) and client-side resizing/compression when needed to meet limits (5MB and max dimensions 3840×2160px)
- Server-side: format validation and strict enforcement using Pillow. Server will reject files that still exceed the limits.

### Frontend State Management

App state machine (upload → processing → comparison → thankyou):
```typescript
type AppState = 'upload' | 'processing' | 'comparison' | 'thankyou';
```

Poll `/api/status/{job_id}` every 2 seconds during processing.

## Common Tasks

### Add a new Backend Endpoint
1. Create function in `backend/main.py` decorated with `@app.get()` or `@app.post()`
2. Return `{"status": "success", ...}` or `{"status": "error", "message": "..."}`
3. Test with curl or Postman
4. Update README.md API section

### Modify Frontend Component
1. Edit `.tsx` file in `frontend/src/components/`
2. Changes auto-reload via Vite dev server
3. Test image upload/download flow

### Update TAMS API Params
1. Edit diffusion parameters in `backend/main.py` (around line 150-200)
2. Common params to adjust: `prompts`, `steps`, `cfg_scale`, `denoisingStrength`
3. Test with real image upload

### Deploy to Fly.io
```bash
fly deploy  # Builds Docker image and deploys
fly logs    # View real-time logs
fly status  # Check machine status
```

## Security Considerations

- ✅ Private key never logged (only in env vars)
- ✅ RSA-SHA256 signatures for TAMS API auth
- ✅ Input validation prevents invalid file uploads
- ✅ `.env` in `.gitignore` (never commit credentials)
- ✅ Docker `.dockerignore` excludes `.env` from image

## Testing

No automated tests currently. Manual testing checklist:
1. Upload valid JPG/PNG (should succeed)
2. Upload invalid file (should error)
3. Upload >5MB file (should error if client-side compression/resizing cannot reduce size)
4. Upload very large-dimension image (e.g., 8000×6000) — verify frontend resizes to fit within 3840×2160 and upload succeeds if resulting size ≤5MB
5. Poll status during processing
6. Download after completion
7. Verify downloaded file is valid PNG

## Troubleshooting

**Backend won't start:**
- Check `.env` file exists and has valid TAMS credentials
- Try `pip install -r backend/requirements.txt`

**Frontend dev server 404s:**
- Ensure Vite proxy is configured in `vite.config.ts` for `/api` routes
- Restart dev server after changing config

**TAMS API 401 Errors:**
- Verify `PRIVATE_KEY_PEM` format (must be valid PEM)
- Check `TAMS_APP_ID` is correct
- Verify signature generation in `signature.py`

## Future Enhancement Ideas

- User authentication and job history
- PostgreSQL for persistent storage
- Rate limiting per IP
- Custom LoRA model selection UI
- Batch processing multiple images
- Analytics dashboard

---

**Last Updated:** 19 January 2026
