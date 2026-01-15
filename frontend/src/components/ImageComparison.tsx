import React, { useState } from 'react';
import './ImageComparison.css';

interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
  onDownload: () => void;
  onStartOver: () => void;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  beforeImage,
  afterImage,
  onDownload,
  onStartOver,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="comparison-container">
      <h2 className="comparison-title">Your Inked Image is Ready!</h2>

      <div
        className="comparison-slider"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* After Image (Full) */}
        <div className="image-container">
          <img src={afterImage} alt="After" className="comparison-image" />
          <div className="image-label after-label">After</div>
        </div>

        {/* Before Image (Clipped) */}
        <div
          className="image-container before-container"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img src={beforeImage} alt="Before" className="comparison-image" />
          <div className="image-label before-label">Before</div>
        </div>

        {/* Slider Handle */}
        <div
          className="slider-handle"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={() => setIsDragging(true)}
        >
          <div className="slider-line"></div>
          <div className="slider-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="slider-line"></div>
        </div>
      </div>

      <div className="button-group">
        <button className="btn btn-primary" onClick={onDownload}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Image
        </button>
        <button className="btn btn-secondary" onClick={onStartOver}>
          Start Over
        </button>
      </div>
    </div>
  );
};
