import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const DitherDetection = () => {
  // ... [previous basic setup]

  const pixelDensities = [2, 4, 8, 16, 32, 64];
  const [densityIndex, setDensityIndex] = useState(2); // Start at 8x
  const [facingMode, setFacingMode] = useState('environment');
  
  // For double tap detection
  const lastTapRef = useRef(0);
  const touchTimeoutRef = useRef(null);
  const DOUBLE_TAP_DELAY = 300; // milliseconds
  
  // For touch controls
  const touchStartRef = useRef(0);
  const SWIPE_THRESHOLD = 50;

  const adjustDensity = (direction) => {
    console.log('Adjusting density:', direction); // Debug log
    setDensityIndex(prevIndex => {
      const newIndex = direction === 'up' 
        ? Math.min(prevIndex + 1, pixelDensities.length - 1)
        : Math.max(prevIndex - 1, 0);
      console.log('New density:', pixelDensities[newIndex] + 'x'); // Debug log
      return newIndex;
    });
  };

  const handleKeyDown = (event) => {
    console.log('Key pressed:', event.key); // Debug log
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      adjustDensity('up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      adjustDensity('down');
    }
  };

  const handleTouchStart = (e) => {
    const now = Date.now();
    touchStartRef.current = e.touches[0].clientY;

    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      clearTimeout(touchTimeoutRef.current);
      flipCamera();
      lastTapRef.current = 0;
    } else {
      // Potential first tap
      lastTapRef.current = now;
      touchTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!touchStartRef.current) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      console.log('Swipe detected:', diff > 0 ? 'up' : 'down'); // Debug log
      adjustDensity(diff > 0 ? 'up' : 'down');
      touchStartRef.current = touchEnd;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = 0;
  };

  const flipCamera = async () => {
    console.log('Flipping camera'); // Debug log
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());

      const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newFacingMode);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        console.error('Camera flip error:', err);
      }
    }
  };

  // Set up keyboard controls
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  // Debug current pixel density
  useEffect(() => {
    console.log('Current pixel density:', pixelDensities[densityIndex] + 'x');
  }, [densityIndex]);

  return (
    <div 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ... [video and canvas elements remain the same] */}
      <div style={styles.info}>
        {modelLoading ? 'Loading...' : `${pixelDensities[densityIndex]}x`}
      </div>
    </div>
  );
};

export default DitherDetection;