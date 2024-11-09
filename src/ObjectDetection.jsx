import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const DitherDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const [model, setModel] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  // Simplified pixel density state
  const densities = [2, 4, 8, 16, 32, 64];
  const [densityIndex, setDensityIndex] = useState(2); // Start at 8x
  const currentScale = densities[densityIndex];

  // Keyboard controls
  const handleKeyPress = (e) => {
    e.preventDefault();
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      setDensityIndex(prev => Math.min(prev + 1, densities.length - 1));
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      setDensityIndex(prev => Math.max(prev - 1, 0));
    }
  };

  // Touch controls
  const handleTap = (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTimeRef.current;
    
    if (tapLength < 300 && tapLength > 0) {
      flipCamera();
    }
    lastTapTimeRef.current = currentTime;
  };

  const flipCamera = async () => {
    if (!videoRef.current) return;

    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        const tracks = videoRef.current.srcObject?.getTracks();
        tracks?.forEach(track => track.stop());
        
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera flip failed:', err);
    }
  };

  // Modified detection drawing with extra thick stroke
  const drawDetections = (predictions, canvas, scale) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      
      // Align to pixel grid
      const alignedX = Math.floor(x / scale) * scale;
      const alignedY = Math.floor(y / scale) * scale;
      const alignedWidth = Math.floor(width / scale) * scale;
      const alignedHeight = Math.floor(height / scale) * scale;

      // Draw extra thick stroke
      const strokeWidth = scale * 8; // Much thicker stroke
      ctx.strokeStyle = '#5a00e6';
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(alignedX, alignedY, alignedWidth, alignedHeight);

      // Draw label on the top stroke
      const text = `${prediction.class}`;
      ctx.font = `${scale * 1.5}px monospace`;
      ctx.fillStyle = '#ffffff'; // White text
      
      // Center text on top stroke
      const textWidth = ctx.measureText(text).width;
      const textX = alignedX + (alignedWidth - textWidth) / 2;
      const textY = alignedY + (strokeWidth / 2) + (scale / 2);
      
      ctx.fillText(text, textX, textY);
    });
  };

  // Add keyboard and touch event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchend', handleTap);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchend', handleTap);
    };
  }, [facingMode]); // Dependency needed for flipCamera closure

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="opacity-0 absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas
        ref={detectionCanvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Info overlay - always visible */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full font-mono">
        {densities[densityIndex]}x
      </div>
    </div>
  );
};

export default DitherDetection;