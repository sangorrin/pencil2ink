# Pencil2Ink 🎨

Convert pencil sketches to clean inked images using AI.

A web application that uses the TAMS/Tensor.art API with a custom-trained LoRA model to transform pencil drawings into professional inked artwork.

![Demo](https://img.shields.io/badge/Status-Production%20Ready-green)
![Python](https://img.shields.io/badge/Python-3.14-blue)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ Features

- 🎯 **Drag-and-drop** image upload interface
- ⚡ **Real-time** processing status with progress tracking
- 🔄 **Interactive** before/after comparison slider
- 📥 **One-click** download of processed images
- 🎨 **Clean UI** with smooth animations
- 🐳 **Docker** ready for easy deployment

## 📋 Image Requirements

- **Format:** JPG or PNG only
- **Max file size:** 1 MB
- **Max dimensions:** 1500px × 1500px

## 🚀 Quick Start (Local Development)

### Prerequisites

- Docker
- TAMS API credentials (App ID and private key)

### 1. Clone the Repository

```bash
git clone https://github.com/sangorrin/pencil2ink.git
cd pencil2ink
```

### 2. Create Environment File

Create a `.env` file in the project root:

```bash
TAMS_URL=https://ap-east-1.tensorart.cloud
TAMS_APP_ID=your_app_id_here
PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
your_private_key_here
-----END PRIVATE KEY-----"
```

### 3. Run with Single Command

```bash
./dev.sh
```

This will:
- ✅ Build the development Docker image
- ✅ Start both frontend and backend in containers
- ✅ Mount your code with hot-reload enabled
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:8000

**Press Ctrl+C to stop**

## 🐳 Docker Deployment

### Local Development
```bash
./dev.sh
```
Builds and runs the Docker container with volume mounts and hot-reload for backend.

### Production Build

Build the Docker image:
```bash
docker build -t pencil2ink .
```

Run the container:
```bash
docker run -p 8000:8000 \
  -e TAMS_URL="https://ap-east-1.tensorart.cloud" \
  -e TAMS_APP_ID="your_app_id" \
  -e PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
your_private_key_here
-----END PRIVATE KEY-----" \
  pencil2ink
```

Access at http://localhost:8000

## ☁️ Deploy to Fly.io

### Initial Setup

1. Install fly.io CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Authenticate:
```bash
fly auth login
```

3. Launch the app:
```bash
fly launch --no-deploy
```

4. Set secrets:
```bash
fly secrets set TAMS_URL="https://ap-east-1.tensorart.cloud"
fly secrets set TAMS_APP_ID="YOUR_APP_ID"
fly secrets set PRIVATE_KEY_PEM="$(cat path/to/private_key.pem)"
```

5. Deploy:
```bash
fly deploy
```

### Useful Fly.io Commands

View logs in real-time:
```bash
fly logs
```

Check app status and running machines:
```bash
fly status
```

List all secrets:
```bash
fly secrets list
```

Update a secret:
```bash
fly secrets set TAMS_APP_ID="new_value"
```

SSH into a running machine:
```bash
fly ssh console
```

### Deployment Troubleshooting

**Deployment fails:**
- Check logs: `fly logs`
- Verify secrets: `fly secrets list`
- Test Docker build locally: `docker build -t test .`

**App not responding:**
- Check machine status: `fly status`
- View error logs: `fly logs`
- Restart machine: `fly machines restart <machine-id>`

**Memory or CPU issues:**
- Increase machine size in `fly.toml`
- Check `fly status` for resource usage

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **httpx** - Async HTTP client
- **Pillow** - Image validation
- **cryptography** - RSA signature generation for TAMS API

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite 7** - Fast build tool
- **CSS3** - Animations and styling

### AI Model
- **Inkify LoRA** (Model ID: 920889236046011951)
- **Base Model:** flux1-dev-kontext_fp8_scaled (879112449935019302)

## 📁 Project Structure

```
pencil2ink/
├── backend/
│   ├── main.py              # FastAPI app with 3 endpoints
│   ├── signature.py         # TAMS API authentication
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Node dependencies
│   └── vite.config.ts       # Vite configuration
├── Dockerfile               # Docker build for both local dev and production
├── dev.sh                   # Start local development
└── .env                     # Environment variables (not in repo)
```

## 🔌 API Endpoints

### `POST /api/upload`
Upload a pencil sketch image and create a conversion job.

**Request:** `multipart/form-data` with image file

**Response:**
```json
{
  "status": "success",
  "job_id": "uuid"
}
```

### `GET /api/status/{job_id}`
Get the status of a conversion job.

**Response:**
```json
{
  "status": "success",
  "job_status": "SUCCESS",
  "progress": 100,
  "message": "Completed!"
}
```

### `GET /api/download/{job_id}`
Download the converted inked image.

**Response:** Image binary (PNG)

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ RSA-SHA256 signature authentication for TAMS API
- ✅ Input validation (file type, size, dimensions)
- ✅ No vulnerabilities in dependencies

## 📝 License

MIT License - See [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- Powered by [TAMS/Tensor.art API](https://tensorart.cloud)
- Custom Inkify LoRA model for pencil-to-ink conversion

## 🐛 Troubleshooting

### Docker won't start
- Ensure Docker is installed and running
- Check `.env` file exists with correct credentials
- Try `docker system prune` to clean up old images

### Can't access the app
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Check both ports are not in use: `lsof -ti:8000` and `lsof -ti:3000`

### Production Docker build fails
- Ensure `.env` is NOT in the image (it's in `.dockerignore`)
- Pass environment variables at runtime with `-e` flags
- Check Docker has enough memory allocated

---

**Built with ❤️ for artists and creators**