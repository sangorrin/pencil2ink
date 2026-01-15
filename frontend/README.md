# Pencil2Ink Frontend

React + TypeScript + Vite frontend for the Pencil2Ink application.

## Features

- 🎨 Drag-and-drop image upload interface
- ⏱️ Real-time processing status with progress tracking
- 🔄 Interactive before/after image comparison slider
- 📥 One-click image download
- ✨ Beautiful animations and smooth transitions
- 📱 Responsive design for mobile and desktop

## Development

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Proxy

The development server is configured to proxy `/api` requests to `http://localhost:8000`. Make sure the backend is running on port 8000.

## Components

- **ImageUploader**: Drag-and-drop file upload with validation
- **ProcessingStatus**: Real-time job status polling with progress circle
- **ImageComparison**: Interactive before/after slider
- **ThankYouScreen**: Post-download confirmation screen

## Tech Stack

- React 18
- TypeScript
- Vite 5
- CSS3 with animations
