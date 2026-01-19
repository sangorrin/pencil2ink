import React, { useState, useRef } from 'react';
import './ImageUploader.css';

interface ImageUploaderProps {
  onUploadSuccess: (jobId: string, originalImage: string) => void;
  onError: (message: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadSuccess, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return 'Only JPG and PNG images are supported';
    }
    return null;
  };

  const validateImageDimensions = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width > 3840 || img.height > 2160) {
          resolve('Image dimensions must be under 3840×2160px');
        } else {
          resolve(null);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('Failed to load image');
      };

      img.src = url;
    });
  };

  // Resize image to fit within maxWidth/maxHeight preserving aspect ratio.
  const resizeImageToMax = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality = 0.92
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;

        // If already within limits, return original file
        if (width <= maxWidth && height <= maxHeight) {
          resolve(file);
          return;
        }

        const aspect = width / height;
        let targetWidth = width;
        let targetHeight = height;

        if (width > maxWidth) {
          targetWidth = maxWidth;
          targetHeight = Math.round(targetWidth / aspect);
        }
        if (targetHeight > maxHeight) {
          targetHeight = maxHeight;
          targetWidth = Math.round(targetHeight * aspect);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to encode resized image'));
              return;
            }
            const resizedFile = new File([blob], file.name, { type: file.type });
            resolve(resizedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for resizing'));
      };

      img.src = url;
    });
  };

  const handleUpload = async (file: File) => {
    // Basic validation
    const basicError = validateFile(file);
    if (basicError) {
      onError(basicError);
      return;
    }

    // Dimension and size validation: attempt to resize if needed
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    const MAX_W = 3840;
    const MAX_H = 2160;

    let uploadFile: File = file;
    const dimensionError = await validateImageDimensions(file);

    if (dimensionError || file.size > MAX_BYTES) {
      try {
        // Resize to fit within allowed dimensions while preserving aspect ratio
        const resized = await resizeImageToMax(file, MAX_W, MAX_H);

        // If resized still exceeds byte limit, fail (could implement progressive compression)
        if (resized.size > MAX_BYTES) {
          onError('Resized image still exceeds 5 MB');
          return;
        }

        uploadFile = resized;
      } catch (err) {
        onError('Image dimensions exceed limits and could not be resized');
        return;
      }
    }

    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', uploadFile);

      // Upload to backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Create data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          onUploadSuccess(data.job_id, e.target?.result as string);
        };
        reader.readAsDataURL(uploadFile);
      } else {
        onError(data.message || 'Upload failed');
      }
    } catch (error) {
      onError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="uploader-container">
      <h1 className="title">Pencil2Ink</h1>
      <p className="subtitle">Convert your pencil sketches to clean inked images</p>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div className="upload-spinner">
            <div className="spinner"></div>
            <p>Uploading...</p>
          </div>
        ) : (
          <>
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="drop-text">
              <span className="drop-highlight">Click to upload</span> or drag and drop
            </p>
            <p className="drop-hint">JPG or PNG • Max 5 MB • Max 3840×2160px</p>
          </>
        )}
      </div>
    </div>
  );
};
