# Pencil2Ink Implementation Plan

## Overview

Build a full-stack web application that converts pencil sketches to inked images using the TAMS/Tensor.art API. The application consists of a FastAPI backend serving REST endpoints and a React frontend with real-time status updates.

## Architecture

```
pencil2ink/
├── backend/
│   ├── main.py              # FastAPI app with 3 endpoints + static file serving
│   ├── signature.py         # TAMS API authentication signature generation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuration with proxy
│   ├── index.html
│   └── src/
│       ├── App.jsx          # Main React component
│       ├── components/      # Upload, Status, Comparison, Download components
│       └── main.jsx
├── .env.example             # Environment variable template
├── Dockerfile               # Multi-stage build (Node.js + Python)
├── fly.toml                 # Fly.io deployment config
├── dev.sh                   # Local development script
└── README.md                # User documentation
```

## Implementation Steps

### Step 1: Create Project Structure

**Backend Setup:**
- Create `backend/` directory
- Create `backend/main.py` with FastAPI app initialization that loads environment variables:
  - `TAMS_URL` (e.g., "https://ap-east-1.tensorart.cloud")
  - `TAMS_APP_ID`
  - `PRIVATE_KEY_PEM` (RSA private key in PEM format)
- Copy and adapt `generate_signature.py` from `pencil2ink_python/` to `backend/signature.py`
- Create `backend/requirements.txt`:
  ```
  fastapi
  uvicorn[standard]
  httpx
  cryptography
  pillow
  python-multipart
  ```
- Create `.env.example` with template:
  ```
  TAMS_URL=https://ap-east-1.tensorart.cloud
  TAMS_APP_ID=
  PRIVATE_KEY_PEM=
  ```

**Frontend Setup:**
- Create `frontend/` directory
- Initialize React app with Vite: `npm create vite@latest . -- --template react`
- Install dependencies:
  - `react-compare-image` or similar for before/after slider
  - Base React dependencies (automatically included)
- Configure Vite proxy in `vite.config.js` to forward `/api/*` to `http://localhost:8000`

**In-Memory Job Storage:**
```python
# In main.py
jobs = {}  # {job_id: {"tams_job_id": str, "timestamp": float}}
```

---

### Step 2: Implement `POST /api/upload` Endpoint

**Functionality:**
1. Accept multipart/form-data image file
2. Validate image:
   - Format: JPG or PNG (check magic bytes or PIL format)
   - File size: ≤ 1 MB
   - Dimensions: ≤ 1500×1500px (use Pillow to get dimensions)
3. Clean up expired jobs (timestamp > 1 hour ago) from `jobs` dict
4. Request signed upload URL from TAMS:
   ```python
   POST {TAMS_URL}/v1/resource/image
   Body: {"expireSec": 3600}
   Headers: Authorization with signature
   Response: {resourceId, putUrl, putHeaders}
   ```
5. Upload image binary to `putUrl` using PUT request with custom headers
6. Create img2img job at TAMS:
   ```python
   POST {TAMS_URL}/v1/jobs
   Body: {
     "request_id": <uuid>,
     "stages": [
       {
         "type": "INPUT_INITIALIZE",
         "inputInitialize": {
           "seed": 1300163161,
           "image_resource_id": <resourceId from step 4>,
           "count": 1
         }
       },
       {
         "type": "DIFFUSION",
         "diffusion": {
           "width": <actual_image_width>,
           "height": <actual_image_height>,
           "prompts": [{"text": "inkify, convert pencils to clean black ink, fill X-marked regions solid black, remove paper texture"}],
           "negativePrompts": [{"text": "color image, watercolor, blur, noise, pencil lines, grey"}],
           "sd_model": "879112449935019302",
           "sdVae": "Automatic",
           "sampler": "Euler",
           "steps": 20,
           "cfg_scale": 2,
           "guidance": 3.5,
           "denoisingStrength": 0.5,
           "clip_skip": 2,
           "lora": {
             "items": [{
               "loraModel": "920889236046011951",
               "weight": 0.80
             }]
           }
         }
       }
     ]
   }
   Headers: Authorization with signature
   Response: {job: {id, status, ...}}
   ```
7. Generate internal UUID for job tracking
8. Store mapping: `jobs[uuid] = {"tams_job_id": tams_job_id, "timestamp": time.time()}`
9. Return JSON response (always HTTP 200):
   - Success: `{"status": "success", "job_id": <uuid>}`
   - Error: `{"status": "error", "message": "<error_description>"}`

**Error Handling:**
- Invalid format → `{"status": "error", "message": "Only JPG and PNG formats allowed"}`
- File too large → `{"status": "error", "message": "File size must be under 1 MB"}`
- Dimensions too large → `{"status": "error", "message": "Image dimensions must be under 1500×1500px"}`
- TAMS API errors → `{"status": "error", "message": "Failed to process image: <tams_error>"}`

---

### Step 3: Implement `GET /api/status/{job_id}` Endpoint

**Functionality:**
1. Check if `job_id` exists in `jobs` dict
2. Retrieve `tams_job_id` from stored data
3. Fetch job status from TAMS:
   ```python
   GET {TAMS_URL}/v1/jobs/{tams_job_id}
   Headers: Authorization with signature
   Response: {
     job: {
       id,
       status,  # SUBMITTED, PENDING, WAITING, RUNNING, SUCCESS, FAILED
       progress: {percent},  # 0-100 during RUNNING
       waitingInfo: {message},  # during WAITING
       successInfo: {images: [{url}]},  # on SUCCESS
       failInfo: {message}  # on FAILED
     }
   }
   ```
4. Map TAMS status to response (always HTTP 200):
   - Success: `{"status": "success", "job_status": "<tams_status>", "progress": <0-100>, "message": "<optional_info>"}`
   - Job not found: `{"status": "error", "message": "Job not found"}`
   - TAMS error: `{"status": "error", "message": "<tams_error>"}`

**Status Mapping:**
- `SUBMITTED`, `PENDING` → progress: 0, message: "Initializing..."
- `WAITING` → progress: 10, message: waitingInfo.message
- `RUNNING` → progress: progress.percent, message: "Processing..."
- `SUCCESS` → progress: 100, message: "Completed!"
- `FAILED` → progress: 0, message: failInfo.message

---

### Step 4: Implement `GET /api/download/{job_id}` Endpoint

**Functionality:**
1. Check if `job_id` exists in `jobs` dict
2. Fetch job status from TAMS to verify SUCCESS
3. Extract image URL from `successInfo.images[0].url`
4. Download image binary using httpx:
   ```python
   response = httpx.get(image_url)
   ```
5. Return image with proper headers:
   ```python
   return Response(
     content=image_bytes,
     media_type="image/png",
     headers={"Content-Disposition": 'attachment; filename="inked_image.png"'}
   )
   ```
6. Error responses (always HTTP 200 with JSON):
   - Job not found: `{"status": "error", "message": "Job not found"}`
   - Not ready: `{"status": "error", "message": "Image not ready yet"}`
   - Failed job: `{"status": "error", "message": "Job processing failed"}`

**Note:** Job remains in dict for garbage collection (1 hour expiration)

---

### Step 5: Build React Frontend

**UI Flow:**

1. **Initial State - Upload Screen**
   - Drag-and-drop zone with file input
   - Visual feedback on drag over
   - File validation on client side (format, size)
   - "Upload" button to submit

2. **Processing State - Status Screen**
   - Show original image preview
   - Progress bar with percentage
   - Status message (waiting/processing/completed)
   - Poll `/api/status/{job_id}` every 2 seconds
   - Display any error messages

3. **Success State - Comparison Screen**
   - Before/after image comparison slider
   - Download button
   - On download click:
     - Fetch from `/api/download/{job_id}`
     - Trigger browser download
     - Show thank you screen

4. **Thank You State - Complete Screen**
   - Thank you message: "Thanks for using Pencil2Ink!"
   - "Start Over" button → reset to Initial State

**Component Structure:**
```jsx
App.jsx
├── UploadComponent (state: idle)
├── StatusComponent (state: processing)
├── ComparisonComponent (state: success)
└── ThankYouComponent (state: complete)
```

**State Management:**
```javascript
const [appState, setAppState] = useState('idle'); // idle, processing, success, complete, error
const [jobId, setJobId] = useState(null);
const [originalImage, setOriginalImage] = useState(null);
const [progress, setProgress] = useState(0);
const [statusMessage, setStatusMessage] = useState('');
const [errorMessage, setErrorMessage] = useState('');
```

**Vite Configuration:**
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
}
```

---

### Step 6: Create Dockerfile and Deployment

**Multi-Stage Dockerfile:**

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.14-slim
WORKDIR /app

# Copy backend files
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**FastAPI Static File Serving:**
```python
# In backend/main.py
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount API routes first
app.include_router(api_router, prefix="/api")

# Serve frontend static files
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# Catch-all route for React routing
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = f"frontend/dist/{full_path}"
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("frontend/dist/index.html")
```

**dev.sh Script:**
```bash
#!/bin/bash
docker build -t pencil2ink .
docker run -p 8000:8000 \
  -e TAMS_URL="$TAMS_URL" \
  -e TAMS_APP_ID="$TAMS_APP_ID" \
  -e PRIVATE_KEY_PEM="$PRIVATE_KEY_PEM" \
  pencil2ink
```

**fly.toml Configuration:**
```toml
app = "pencil2ink"
primary_region = "sea"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

---

## Technical Details

### TAMS API Authentication

**Signature Generation (signature.py):**
```python
import hashlib
import time
from base64 import b64encode
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

def generate_signature(method, path, body, app_id, private_key_pem):
    timestamp = str(int(time.time()))
    nonce = hashlib.md5(timestamp.encode()).hexdigest()

    # String to sign format
    string_to_sign = f"{method}\n{path}\n{timestamp}\n{nonce}\n{body}"

    # Load private key
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(),
        password=None
    )

    # Sign with SHA256-RSA
    signature = private_key.sign(
        string_to_sign.encode(),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # Encode signature
    signature_b64 = b64encode(signature).decode()

    # Build authorization header
    auth_header = (
        f"TAMS-SHA256-RSA "
        f"app_id={app_id},"
        f"nonce_str={nonce},"
        f"timestamp={timestamp},"
        f"signature={signature_b64}"
    )

    return auth_header
```

### Job Cleanup Logic

```python
import time

def cleanup_expired_jobs():
    """Remove jobs older than 1 hour"""
    current_time = time.time()
    expired_jobs = [
        job_id for job_id, data in jobs.items()
        if current_time - data["timestamp"] > 3600  # 1 hour
    ]
    for job_id in expired_jobs:
        del jobs[job_id]
    return len(expired_jobs)
```

Call `cleanup_expired_jobs()` at the start of the upload endpoint.

### Image Validation

```python
from PIL import Image
from io import BytesIO

def validate_image(file_bytes):
    # Check file size
    if len(file_bytes) > 1_000_000:  # 1 MB
        return False, "File size exceeds 1 MB"

    try:
        img = Image.open(BytesIO(file_bytes))

        # Check format
        if img.format not in ['JPEG', 'PNG']:
            return False, "Only JPG and PNG formats allowed"

        # Check dimensions
        width, height = img.size
        if width > 1500 or height > 1500:
            return False, "Image dimensions exceed 1500×1500px"

        return True, {"width": width, "height": height, "format": img.format}
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"
```

---

## API Response Examples

### Upload Success:
```json
{
  "status": "success",
  "job_id": "a7b3c4d5-e6f7-8901-2345-67890abcdef1"
}
```

### Status Responses:
```json
// Processing
{
  "status": "success",
  "job_status": "RUNNING",
  "progress": 45,
  "message": "Processing..."
}

// Completed
{
  "status": "success",
  "job_status": "SUCCESS",
  "progress": 100,
  "message": "Completed!"
}

// Error
{
  "status": "error",
  "message": "Job not found"
}
```

---

## Deployment Workflow

### Local Development:
```bash
# Terminal 1: Backend
cd pencil2ink/backend
export TAMS_URL="https://ap-east-1.tensorart.cloud"
export TAMS_APP_ID="your_app_id"
export PRIVATE_KEY_PEM="$(cat ../../keys/private_key.pem)"
pip install -r requirements.txt
uvicorn main:app --reload

# Terminal 2: Frontend
cd pencil2ink/frontend
npm install
npm run dev
```

### Docker Local:
```bash
cd pencil2ink
export TAMS_URL="https://ap-east-1.tensorart.cloud"
export TAMS_APP_ID="your_app_id"
export PRIVATE_KEY_PEM="$(cat ../keys/private_key.pem)"
./dev.sh
```

### Fly.io Production:
```bash
cd pencil2ink
fly launch --no-deploy
fly secrets set TAMS_URL="https://ap-east-1.tensorart.cloud"
fly secrets set TAMS_APP_ID="your_app_id"
fly secrets set PRIVATE_KEY_PEM="$(cat ../keys/private_key.pem)"
fly deploy
```

---

## Testing Checklist

- [ ] Backend signature generation works with TAMS API
- [ ] Image validation rejects invalid formats/sizes/dimensions
- [ ] Upload endpoint creates job and returns job_id
- [ ] Status endpoint correctly maps all TAMS statuses
- [ ] Download endpoint returns image binary
- [ ] Frontend uploads and displays status updates
- [ ] Progress bar reflects actual processing progress
- [ ] Before/after slider works smoothly
- [ ] Download triggers browser download
- [ ] Thank you screen and reset work correctly
- [ ] Error messages display properly
- [ ] Expired jobs are cleaned up after 1 hour
- [ ] Docker build succeeds
- [ ] App runs locally via Docker
- [ ] Fly.io deployment succeeds

---

## Future Enhancements (Out of Scope)

- User accounts and job history
- Persistent storage (database)
- Batch processing multiple images
- Custom parameter tuning UI
- Image gallery of conversions
- Rate limiting per IP
- Analytics and usage tracking
