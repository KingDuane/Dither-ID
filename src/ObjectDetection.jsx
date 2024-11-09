import React, { useState, useEffect, useRef } from 'react';

// ... [previous imports and Bayer matrix remain the same]

const DitherDetection = () => {
  // ... [previous state and refs remain the same]
  const touchStartRef = useRef(null);
  const SWIPE_THRESHOLD = 50; // minimum pixels for a swipe
  const DETECTION_COLOR = '#5a00e6';

  // Add touch handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStartRef.current - touchEnd;

    // Check if swipe is long enough
    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0) {
        // Swipe up - increase pixel size
        setCurrentScale(s => Math.min(s + 1, 16));
      } else {
        // Swipe down - decrease pixel size
        setCurrentScale(s => Math.max(s - 1, 4));
      }
      touchStartRef.current = touchEnd; // Reset for continuous swipe
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Add keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        setCurrentScale(s => Math.min(s + 1, 16));
      } else if (e.key === 'ArrowDown') {
        setCurrentScale(s => Math.max(s - 1, 4));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modify the detection drawing part in processFrame
  const processFrame = async () => {
    // ... [previous frame processing remains the same until detection drawing]

    // Draw detections with new color
    detectionCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      const alignedX = Math.floor(x / scale) * scale;
      const alignedY = Math.floor(y / scale) * scale;
      const alignedWidth = Math.floor(width / scale) * scale;
      const alignedHeight = Math.floor(height / scale) * scale;

      // Draw box with new color
      detectionCtx.strokeStyle = DETECTION_COLOR;
      detectionCtx.lineWidth = scale;
      detectionCtx.strokeRect(alignedX, alignedY, alignedWidth, alignedHeight);

      // Draw text with new color
      const text = `${prediction.class}`;
      detectionCtx.font = `${scale * 2}px monospace`;
      detectionCtx.fillStyle = DETECTION_COLOR;
      detectionCtx.fillText(text, alignedX, alignedY - scale);
    });

    // ... [rest of the code remains the same]
  };

  return (
    <div 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ... [rest of the JSX remains the same] */}
    </div>
  );
};

export default DitherDetection;