// Demo/verification script for VideoCompositor
// This can be used to manually test the VideoCompositor functionality

import { VideoCompositor } from './VideoCompositor';
import type { CompositorLayout } from '../types/VideoCompositor';

/**
 * Demo function to test VideoCompositor with mock video streams
 * This can be called from browser console for manual testing
 */
export async function testVideoCompositor(): Promise<void> {
  console.log('=== VideoCompositor Demo Started ===');
  
  try {
    // 1. Create compositor instance
    console.log('1. Creating VideoCompositor (1920x1080)...');
    const compositor = new VideoCompositor(1920, 1080);
    console.log('✓ VideoCompositor created');
    
    // 2. Get camera stream
    console.log('2. Requesting camera access...');
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: true
    });
    console.log('✓ Camera stream obtained');
    
    // 3. Add camera source
    console.log('3. Adding camera source...');
    compositor.addVideoSource('camera', cameraStream, {
      layout: {
        x: 1600,
        y: 860,
        width: 300,
        height: 200,
        zIndex: 1,
        borderRadius: 8,
        border: { width: 3, color: '#ffffff' }
      },
      visible: true,
      opacity: 1.0
    });
    console.log('✓ Camera source added');
    
    // 4. Set picture-in-picture layout
    console.log('4. Setting picture-in-picture layout...');
    const pipLayout: CompositorLayout = {
      type: 'picture-in-picture',
      canvas: { width: 1920, height: 1080 },
      sources: {
        camera: {
          x: 1600,
          y: 860,
          width: 300,
          height: 200,
          zIndex: 1,
          borderRadius: 8,
          border: { width: 3, color: '#ffffff' }
        }
      }
    };
    compositor.setLayout(pipLayout);
    console.log('✓ Layout set');
    
    // 5. Start compositor
    console.log('5. Starting compositor...');
    const outputStream = compositor.start();
    console.log('✓ Compositor started', {
      tracks: outputStream.getTracks().length,
      active: outputStream.active
    });
    
    // 6. Monitor performance for 5 seconds
    console.log('6. Monitoring performance for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const metrics = compositor.getPerformanceMetrics();
    console.log('✓ Performance metrics:', {
      fps: metrics.fps.toFixed(2),
      droppedFrames: metrics.droppedFrames,
      avgRenderTime: metrics.averageRenderTime.toFixed(2) + 'ms',
      memoryUsage: (metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      isGood: metrics.isPerformanceGood
    });
    
    // 7. Test layout switching
    console.log('7. Testing layout switch to camera-only...');
    const cameraOnlyLayout: CompositorLayout = {
      type: 'camera-only',
      canvas: { width: 1920, height: 1080 },
      sources: {
        camera: {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          zIndex: 0
        }
      }
    };
    compositor.setLayout(cameraOnlyLayout);
    console.log('✓ Layout switched');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 8. Stop compositor
    console.log('8. Stopping compositor...');
    compositor.stop();
    console.log('✓ Compositor stopped');
    
    // 9. Cleanup
    console.log('9. Cleaning up...');
    compositor.dispose();
    cameraStream.getTracks().forEach(track => track.stop());
    console.log('✓ Cleanup complete');
    
    console.log('=== VideoCompositor Demo Completed Successfully ===');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

/**
 * Test with screen share
 */
export async function testVideoCompositorWithScreen(): Promise<void> {
  console.log('=== VideoCompositor Screen Share Demo Started ===');
  
  try {
    const compositor = new VideoCompositor(1920, 1080);
    
    // Get camera
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: true
    });
    
    // Get screen
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080 },
      audio: true
    });
    
    // Add both sources
    compositor.addVideoSource('screen', screenStream, {
      layout: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        zIndex: 0
      },
      visible: true,
      opacity: 1.0
    });
    
    compositor.addVideoSource('camera', cameraStream, {
      layout: {
        x: 1600,
        y: 860,
        width: 300,
        height: 200,
        zIndex: 1,
        borderRadius: 8,
        border: { width: 3, color: '#ffffff' }
      },
      visible: true,
      opacity: 1.0
    });
    
    // Set layout
    const layout: CompositorLayout = {
      type: 'picture-in-picture',
      canvas: { width: 1920, height: 1080 },
      sources: {
        screen: {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          zIndex: 0
        },
        camera: {
          x: 1600,
          y: 860,
          width: 300,
          height: 200,
          zIndex: 1,
          borderRadius: 8,
          border: { width: 3, color: '#ffffff' }
        }
      }
    };
    
    compositor.setLayout(layout);
    const outputStream = compositor.start();
    
    console.log('✓ Compositor running with camera and screen');
    console.log('Output stream:', {
      tracks: outputStream.getTracks().length,
      active: outputStream.active
    });
    
    // Monitor for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const metrics = compositor.getPerformanceMetrics();
    console.log('Performance:', metrics);
    
    // Cleanup
    compositor.stop();
    compositor.dispose();
    cameraStream.getTracks().forEach(track => track.stop());
    screenStream.getTracks().forEach(track => track.stop());
    
    console.log('=== Demo Completed ===');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testVideoCompositor = testVideoCompositor;
  (window as any).testVideoCompositorWithScreen = testVideoCompositorWithScreen;
  console.log('VideoCompositor demo functions loaded. Run:');
  console.log('  testVideoCompositor() - Test with camera only');
  console.log('  testVideoCompositorWithScreen() - Test with camera and screen');
}
