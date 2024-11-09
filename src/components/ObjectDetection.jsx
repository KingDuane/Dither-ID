import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

console.log('TensorFlow.js version:', tf.version);

const DitherDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [currentScale, setCurrentScale] = useState(8);

  // Bayer matrix for dithering
  const bayerMatrix = [
    [ 0, 48, 12, 60,  3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [ 8, 56,  4, 52, 11, 59,  7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [ 2, 50, 14, 62,  1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58,  6, 54,  9, 57,  5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21]
  ].map(row => row.map(x => x / 64));

  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'black'
    },
    fullscreen: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    video: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: 0
    },
    info: {
      position: 'fixed',
      left: '50%',
      top: '20px',
      transform: 'translateX(-50%)',
      color: 'white',
      background: 'rgba(0,0,0,0.7)',
      padding: '10px 20px',
      borderRadius: '20px',
      fontFamily: 'monospace',
      zIndex: 100,
      textAlign: 'center'
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadModel = async () => {
      try {
        setModelLoading(true);
        console.log('Starting model load...');
        
        // Ensure TensorFlow.js is initialized
        await tf.ready();
        console.log('TensorFlow.js ready');
        
        // Load the model
        const loadedModel = await cocoSsd.load({
          base: 'lite_mobilenet_v2'  // Use lighter model for better performance
        });
        
        console.log('Model loaded successfully');
        
        if (isActive) {
          setModel(loadedModel);
          setModelLoading(false);
        }
      } catch (err) {
        console.error('Model loading error:', err);
      }
    };

    loadModel();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const initCamera = async () => {
      try {
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        if (!isActive) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Stream attached to video element');

          await new Promise((resolve) => {
            videoRef.current.onloadeddata = () => {
              console.log('Video data loaded');
              resolve();
            };
          });

          // Set canvas sizes
          const { videoWidth, videoHeight } = videoRef.current;
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
          detectionCanvasRef.current.width = videoWidth;
          detectionCanvasRef.current.height = videoHeight;
          console.log(`Canvas size set to ${videoWidth}x${videoHeight}`);

          await videoRef.current.play();
          console.log('Video playback started');

          if (isActive) {
            processFrame();
          }
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
      }
    };

    if (!modelLoading) {
      initCamera();
    }

    return () => {
      isActive = false;
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [modelLoading]);

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !model) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detectionCtx = detectionCanvasRef.current.getContext('2d');

    try {
      // First, run object detection
      console.log('Running detection...');
      const predictions = await model.detect(video);
      console.log('Detection results:', predictions);

      // Clear previous frame
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and process current frame
      const scale = currentScale;
      const scaledWidth = Math.floor(canvas.width / scale);
      const scaledHeight = Math.floor(canvas.height / scale);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = scaledWidth;
      tempCanvas.height = scaledHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.drawImage(video, 0, 0, scaledWidth, scaledHeight);
      
      // Apply dithering
      const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
      const data = imageData.data;
      
      for (let y = 0; y < scaledHeight; y++) {
        for (let x = 0; x < scaledWidth; x++) {
          const i = (y * scaledWidth + x) * 4;
          const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          const threshold = bayerMatrix[y % 8][x % 8];
          const value = gray > threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = value;
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw processed frame
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

      // Draw detections
      detectionCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const alignedX = Math.floor(x / scale) * scale;
        const alignedY = Math.floor(y / scale) * scale;
        const alignedWidth = Math.floor(width / scale) * scale;
        const alignedHeight = Math.floor(height / scale) * scale;

        detectionCtx.strokeStyle = '#5a00e6';
        detectionCtx.lineWidth = scale;
        detectionCtx.strokeRect(alignedX, alignedY, alignedWidth, alignedHeight);

        const text = `${prediction.class}`;
        detectionCtx.font = `${scale * 4}px monospace`;
        detectionCtx.fillStyle = '#5a00e6';
        detectionCtx.fillText(text, alignedX, alignedY - scale);
      });
      
      animationRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  };

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

  return (
    <div style={styles.container}>
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
    </div>
  );
};

export default DitherDetection;