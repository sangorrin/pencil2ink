import { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ImageComparison } from './components/ImageComparison';
import { ThankYouScreen } from './components/ThankYouScreen';
import './App.css';

type AppState = 'upload' | 'processing' | 'comparison' | 'thankyou';

function App() {
  const [state, setState] = useState<AppState>('upload');
  const [jobId, setJobId] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleUploadSuccess = (newJobId: string, imageDataUrl: string) => {
    setJobId(newJobId);
    setOriginalImage(imageDataUrl);
    setState('processing');
    setError('');
  };

  const handleProcessingComplete = (imageUrl: string) => {
    setProcessedImage(imageUrl);
    setState('comparison');
  };

  const handleError = (message: string) => {
    setError(message);
    // Show error for 5 seconds then go back to upload
    setTimeout(() => {
      setState('upload');
      setError('');
    }, 5000);
  };

  const handleDownload = () => {
    // Create download link
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'inked_image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Move to thank you screen
    setState('thankyou');
  };

  const handleStartOver = () => {
    // Clean up blob URLs
    if (processedImage.startsWith('blob:')) {
      URL.revokeObjectURL(processedImage);
    }

    // Reset state
    setJobId('');
    setOriginalImage('');
    setProcessedImage('');
    setError('');
    setState('upload');
  };

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      )}

      {state === 'upload' && (
        <ImageUploader onUploadSuccess={handleUploadSuccess} onError={handleError} />
      )}

      {state === 'processing' && (
        <ProcessingStatus
          jobId={jobId}
          onComplete={handleProcessingComplete}
          onError={handleError}
        />
      )}

      {state === 'comparison' && (
        <ImageComparison
          beforeImage={originalImage}
          afterImage={processedImage}
          onDownload={handleDownload}
          onStartOver={handleStartOver}
        />
      )}

      {state === 'thankyou' && <ThankYouScreen onStartOver={handleStartOver} />}
    </div>
  );
}

export default App;
