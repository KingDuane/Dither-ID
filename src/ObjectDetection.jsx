import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const DitherDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const touchStartRef = useRef(null);
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [currentScale, setCurrentScale] = useState(8);
  const [facingMode, setFacingMode] = useState('environment');

  const SWIPE_THRESHOLD = 30; // Made more sensitive
  const DETECTION_COLOR = '#5a00e6';

  // Touch controls for pixel density and camera flip
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling
    if (!touchStartRef.current) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0) {
        setCurrentScale(s => Math.min(s + 1, 16));
      } else {
        setCurrentScale(s => Math.max(s - 1, 4));
      }
      touchStartRef.current = touchEnd;
    }
  };

  const handleTouchEnd = (e) => {
    // If it was a tap (not a swipe), flip the camera
    if (Math.abs(e.changedTouches[0].clientY - touchStartRef.current) < SWIPE_THRESHOLD) {
      flipCamera();
    }
    touchStartRef.current = null;
  };

  // Keyboard controls for pixel density
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentScale(s => Math.min(s + 1, 16));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentScale(s => Math.max(s - 1, 4));
    }
  };

  const flipCamera = async () => {
    if (videoRef.current?.srcObject) {
      // Stop current stream
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      
      // Toggle facing mode
      setFacingMode(current => current === 'environment' ? 'user' : 'environment');
      
      // Restart camera with new facing mode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode === 'environment' ? 'user' : 'environment',
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

  // ... [previous initialization code remains the same]

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !model) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detectionCtx = detectionCanvasRef.current.getContext('2d');

    try {
      // [previous dithering code remains the same]

      // Draw detections with updated styling
      detectionCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const alignedX = Math.floor(x / scale) * scale;
        const alignedY = Math.floor(y / scale) * scale;
        const alignedWidth = Math.floor(width / scale) * scale;
        const alignedHeight = Math.floor(height / scale) * scale;

        // Thicker stroke
        detectionCtx.strokeStyle = DETECTION_COLOR;
        detectionCtx.lineWidth = scale * 2; // Made thicker
        detectionCtx.strokeRect(alignedX, alignedY, alignedWidth, alignedHeight);

        // Smaller text
        const text = `${prediction.class}`;
        detectionCtx.font = `${scale * 1.5}px monospace`; // Made smaller
        detectionCtx.fillStyle = DETECTION_COLOR;
        detectionCtx.fillText(text, alignedX + scale, alignedY - scale);
      });

      animationRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modified styles to prevent scrolling and handle touch events better
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'black',
      touchAction: 'none', // Prevent default touch behaviors
      userSelect: 'none' // Prevent text selection
    },
    // ... [rest of the styles remain the same]
  };

  return (
    <div 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        style={styles.fullscreen}
      />
      <canvas
        ref={detectionCanvasRef}
        style={styles.fullscreen}
      />
      <div style={styles.info}>
        {modelLoading ? 'Loading...' : `${currentScale}px`}
      </div>
    </div>
  );
};

export default DitherDetection;