# Pencil2Ink

Convert pencil sketches to clean inked images using AI.

A web application that uses the TAMS/Tensor.art API with a custom-trained LoRA model to transform pencil drawings into professional inked artwork.

## Technology Stack

**Backend:**
- FastAPI (Python 3.14)
- TAMS/Tensor.art API integration
- In-memory job queue

**Frontend:**
- React
- Before/after image comparison slider
- Simple drag-and-drop interface for uploading pencil sketch
- One-click download of generated inked image
- Real-time processing status updates

**Hosting:**
- fly.io (free tier)

## Image Requirements

- **Format:** JPG or PNG only
- **Max file size:** 1 MB
- **Max dimensions:** 1500x × 1500px

## Local deployment

### Prerequisites

- Python 3.14+
- TAMS API credentials (App ID and private key)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/sangorrin/pencil2ink.git
cd pencil2ink
```

2. Export environment variables (or copy .env.example to .env and write them)
```bash
export TAMS_URL="https://{YOUR_ZONE}.tensorart.cloud"
export TAMS_APP_ID="YOUR_APP_ID"
export PRIVATE_KEY_PEM="$(cat ../keys/private_key.pem)"
```

3. Build and run the Dockerfile
```bash
./dev.sh
```

4. Open http://localhost:8000 in your browser

## Deployment to fly.io

### Initial Setup

1. Install fly.io CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Authenticate:
```bash
fly auth login
```

3. Create the app:
```bash
cd pencil2ink
fly launch --no-deploy
```

4. Set secrets
```bash
fly secrets set TAMS_URL="https://{YOUR_ZONE}.tensorart.cloud"
fly secrets set TAMS_APP_ID="YOUR_APP_ID"
fly secrets set PRIVATE_KEY_PEM="$(cat ../private_key.pem)"
```

### Deploy

```bash
fly deploy
```

### View logs

```bash
fly logs
```

## API Endpoints

- `POST /api/upload` - Upload pencil sketch image
- `GET /api/status/{job_id}` - Get job processing status
- `GET /api/download/{job_id}` - Download processed inked image

## Project Structure

```
TODO
```

## License

See [LICENSE](LICENSE) file for details.

## Support

TODO