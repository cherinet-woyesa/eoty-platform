// frontend/src/components/courses/CompositorPreview.tsx
import { useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { VideoCompositor } from '@/utils/VideoCompositor';
import type { PerformanceMetrics } from '@/types/VideoCompositor';

interface CompositorPreviewProps {
  compositor: VideoCompositor | null;
  isCompositing: boolean;
  performanceMetrics: PerformanceMetrics | null;
}

const CompositorPreview: FC<CompositorPreviewProps> = ({
  compositor,
  isCompositing,
  performanceMetrics
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!compositor || !canvasRef.current || !isCompositing) {
      return;
    }

    const previewCanvas = canvasRef.current;
    const previewCtx = previewCanvas.getContext('2d');
    const compositorCanvas = compositor.getCanvas();

    if (!previewCtx || !compositorCanvas) {
      return;
    }

    // Update preview by mirroring compositor canvas
    const updatePreview = () => {
      if (previewCtx && compositorCanvas && isCompositing) {
        try {
          // Draw the compositor canvas to the preview canvas
          previewCtx.drawImage(
            compositorCanvas,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height
          );
        } catch (error) {
          console.error('Error updating compositor preview:', error);
        }

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updatePreview);
      }
    };

    // Start the preview update loop
    updatePreview();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [compositor, isCompositing]);

  // Get performance status color
  const getPerformanceColor = () => {
    if (!performanceMetrics) return 'text-gray-400';
    
    if (performanceMetrics.fps >= 25) return 'text-green-500';
    if (performanceMetrics.fps >= 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get performance status text
  const getPerformanceStatus = () => {
    if (!performanceMetrics) return 'Initializing...';
    
    if (performanceMetrics.isPerformanceGood) return 'Good';
    if (performanceMetrics.fps >= 20) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Canvas preview element */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain"
      />

      {/* Live Composite indicator */}
      {isCompositing && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-10">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>Live Composite</span>
        </div>
      )}

      {/* Performance metrics display */}
      {performanceMetrics && isCompositing && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs font-mono space-y-1 z-10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">FPS:</span>
            <span className={`font-bold ${getPerformanceColor()}`}>
              {performanceMetrics.fps.toFixed(1)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Dropped:</span>
            <span className={performanceMetrics.droppedFrames > 10 ? 'text-yellow-400' : 'text-gray-300'}>
              {performanceMetrics.droppedFrames}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Render:</span>
            <span className="text-gray-300">
              {performanceMetrics.averageRenderTime.toFixed(1)}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Memory:</span>
            <span className="text-gray-300">
              {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
          
          <div className="pt-1 border-t border-gray-600 mt-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">Status:</span>
              <span className={`font-bold ${getPerformanceColor()}`}>
                {getPerformanceStatus()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No compositor message */}
      {!compositor && !isCompositing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm">Compositor not initialized</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompositorPreview;
