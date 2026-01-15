import React, { useEffect, useState } from 'react';
import './ProcessingStatus.css';

interface ProcessingStatusProps {
  jobId: string;
  onComplete: (imageUrl: string) => void;
  onError: (message: string) => void;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  jobId,
  onComplete,
  onError,
}) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [status, setStatus] = useState('PENDING');

  useEffect(() => {
    let pollInterval: number;
    let downloadAttempted = false;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = await response.json();

        if (data.status === 'success') {
          setProgress(data.progress);
          setMessage(data.message);
          setStatus(data.job_status);

          // If job is complete and we haven't tried downloading yet
          if (data.job_status === 'SUCCESS' && !downloadAttempted) {
            downloadAttempted = true;
            clearInterval(pollInterval);

            // Small delay for smooth transition
            setTimeout(async () => {
              try {
                const imageResponse = await fetch(`/api/download/${jobId}`);
                if (imageResponse.ok) {
                  const blob = await imageResponse.blob();
                  const imageUrl = URL.createObjectURL(blob);
                  onComplete(imageUrl);
                } else {
                  onError('Failed to download processed image');
                }
              } catch (err) {
                onError('Network error while downloading image');
              }
            }, 500);
          } else if (data.job_status === 'FAILED') {
            clearInterval(pollInterval);
            onError(data.message || 'Processing failed');
          }
        } else {
          clearInterval(pollInterval);
          onError(data.message || 'Failed to get status');
        }
      } catch (err) {
        clearInterval(pollInterval);
        onError('Network error. Please try again.');
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    pollInterval = window.setInterval(pollStatus, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, onComplete, onError]);

  return (
    <div className="processing-container">
      <h2 className="processing-title">Processing Your Image</h2>

      <div className="progress-circle">
        <svg className="progress-ring" width="200" height="200">
          <circle
            className="progress-ring-bg"
            cx="100"
            cy="100"
            r="90"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            className="progress-ring-fill"
            cx="100"
            cy="100"
            r="90"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 90}`}
            strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
          />
        </svg>
        <div className="progress-text">
          <div className="progress-percent">{progress}%</div>
          <div className="progress-status">{status}</div>
        </div>
      </div>

      <p className="progress-message">{message}</p>

      <div className="processing-animation">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
};
