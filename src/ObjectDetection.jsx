import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const DitherDetection = () => {
  // ... [previous imports and initial setup]

  // Define available pixel densities
  const pixelDensities = [2, 4, 8, 16, 32, 64];
  const [densityIndex, setDensityIndex] = useState(2); // Start at 8x (index 2)
  const currentScale = pixelDensities[densityIndex];
  
  const touchStartRef = useRef(null);
  const SWIPE_THRESHOLD = 30;
  const DETECTION_COLOR = '#5a00e6';

  const adjustPixelDensity = (direction) => {
    setDensityIndex(prevIndex => {
      if (direction === 'up') {
        return Math.min(prevIndex + 1, pixelDensities.length - 1);
      } else {
        return Math.max(prevIndex - 1, 0);
      }
    });
  };

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!touchStartRef.current) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      adjustPixelDensity(diff > 0 ? 'up' : 'down');
      touchStartRef.current = touchEnd;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjustPixelDensity('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjustPixelDensity('down');
    }
  };

  // Update detection drawing with thicker stroke and smaller text
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !model) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detectionCtx = detectionCanvasRef.current.getContext('2d');

    try {
      // ... [previous dithering code remains the same]

      // Draw detections with updated styling
      detectionCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const alignedX = Math.floor(x / currentScale) * currentScale;
        const alignedY = Math.floor(y / currentScale) * currentScale;
        const alignedWidth = Math.floor(width / currentScale) * currentScale;
        const alignedHeight = Math.floor(height / currentScale) * currentScale;

        // Even thicker stroke (4x pixel size)
        detectionCtx.strokeStyle = DETECTION_COLOR;
        detectionCtx.lineWidth = currentScale * 4;
        detectionCtx.strokeRect(alignedX, alignedY, alignedWidth, alignedHeight);

        // Smaller text (now 1x pixel size)
        const text = `${prediction.class}`;
        detectionCtx.font = `${currentScale}px monospace`;
        detectionCtx.fillStyle = DETECTION_COLOR;
        detectionCtx.fillText(text, alignedX + currentScale, alignedY - currentScale);
      });

      animationRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array as handleKeyDown references state through closure

  // ... [rest of the code remains the same]

  return (
    <div 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* ... [video and canvas elements remain the same] */}
      <div style={styles.info}>
        {modelLoading ? 'Loading...' : `${currentScale}x`}
      </div>
    </div>
  );
};

export default DitherDetection;