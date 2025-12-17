import { useEffect, useRef, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

interface VirtualBackgroundOptions {
  enabled: boolean;
  mode: 'blur' | 'image' | 'none';
  blurRadius?: number;
  backgroundImage?: string; // URL
}

export const useVirtualBackground = (
  sourceStream: MediaStream | null,
  options: VirtualBackgroundOptions
) => {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const selfieSegmentationRef = useRef<SelfieSegmentation | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number>();
  const optionsRef = useRef(options);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
    
    // Preload background image if needed
    if (options.mode === 'image' && options.backgroundImage) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = options.backgroundImage;
      bgImageRef.current = img;
    }
  }, [options]);

  // Initialize MediaPipe Model
  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      },
    });

    selfieSegmentation.setOptions({
      modelSelection: 1, // 1 for landscape
    });

    selfieSegmentation.onResults(onResults);
    selfieSegmentationRef.current = selfieSegmentation;
    setIsModelLoaded(true);

    return () => {
      if (selfieSegmentationRef.current) {
        selfieSegmentationRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Initialize Canvas and Video Element
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;
      contextRef.current = canvas.getContext('2d');
      
      // Create stream from canvas once
      const stream = canvas.captureStream(30);
      setProcessedStream(stream);
    }

    if (!videoElementRef.current) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      videoElementRef.current = video;
    }
  }, []);

  // Handle Stream Changes
  useEffect(() => {
    if (sourceStream && videoElementRef.current) {
      videoElementRef.current.srcObject = sourceStream;
      videoElementRef.current.onloadedmetadata = () => {
        videoElementRef.current?.play().catch(e => console.error("Error playing hidden video:", e));
        startProcessing();
      };
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
  }, [sourceStream]);

  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    const currentOptions = optionsRef.current;

    if (!canvas || !ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw segmentation mask
    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

    // Only overwrite existing pixels.
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Only draw over missing pixels.
    ctx.globalCompositeOperation = 'destination-over';

    if (currentOptions.mode === 'blur') {
      ctx.filter = `blur(${currentOptions.blurRadius || 10}px)`;
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    } else if (currentOptions.mode === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
       // Fallback or None (just draw original)
       ctx.filter = 'none';
       ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
    
    // Continue loop
    requestRef.current = requestAnimationFrame(processFrame);
  };

  const processFrame = async () => {
    if (!videoElementRef.current || !optionsRef.current.enabled) {
        // If disabled, just draw video directly to canvas to keep stream alive
        if (videoElementRef.current && contextRef.current && canvasRef.current) {
            contextRef.current.drawImage(videoElementRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            requestRef.current = requestAnimationFrame(processFrame);
        }
        return;
    }

    if (selfieSegmentationRef.current) {
      await selfieSegmentationRef.current.send({ image: videoElementRef.current });
    }
  };

  const startProcessing = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    processFrame();
  };

  // If enabled changes, restart loop to ensure we switch modes correctly
  useEffect(() => {
      if (sourceStream) {
          startProcessing();
      }
  }, [options.enabled]);

  return {
    processedStream: options.enabled ? processedStream : sourceStream,
    isModelLoaded
  };
};
