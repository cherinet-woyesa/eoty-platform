# Multi-Source Video Recording - Design Document

## Overview

This design document outlines the technical architecture for implementing true simultaneous camera and screen recording with real-time video compositing. The solution uses HTML5 Canvas API for video composition, integrates with the existing `useVideoRecorder` hook, and provides a seamless user experience for educational content creation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VideoRecorder Component                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              User Interface Layer                    │   │
│  │  - Layout Selector                                   │   │
│  │  - Source Controls (Camera/Screen)                   │   │
│  │  - Recording Controls                                │   │
│  │  - Preview Display                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           useVideoRecorder Hook                      │   │
│  │  - State Management                                  │   │
│  │  - Source Coordination                               │   │
│  │  - Recording Lifecycle                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           VideoCompositor Class                      │   │
│  │  - Canvas Rendering                                  │   │
│  │  - Layout Management                                 │   │
│  │  - Stream Generation                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   MediaRecorder API    │
              │   - Video Encoding     │
              │   - File Generation    │
              └────────────────────────┘
```

### Component Interaction Flow

1. **User initiates recording** → VideoRecorder component
2. **Component requests sources** → useVideoRecorder hook
3. **Hook captures streams** → Browser APIs (getUserMedia, getDisplayMedia)
4. **Hook creates compositor** → VideoCompositor class
5. **Compositor renders** → Canvas API (requestAnimationFrame loop)
6. **Compositor outputs stream** → MediaRecorder API
7. **Recording completes** → Blob saved and uploaded

## Components and Interfaces

### 1. VideoCompositor Class

The core compositing engine that merges multiple video sources into a single output stream.

#### Class Structure

```typescript
class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElements: Map<string, HTMLVideoElement>;
  private layout: CompositorLayout;
  private animationFrameId: number | null;
  private outputStream: MediaStream | null;
  private isRunning: boolean;
  private frameCount: number;
  private droppedFrames: number;
  private lastFrameTime: number;

  constructor(width: number, height: number);
  
  // Source management
  addVideoSource(id: string, stream: MediaStream, config: SourceConfig): void;
  removeVideoSource(id: string): void;
  updateVideoSource(id: string, config: Partial<SourceConfig>): void;
  
  // Layout management
  setLayout(layout: CompositorLayout): void;
  getAvailableLayouts(): CompositorLayout[];
  
  // Rendering control
  start(): MediaStream;
  stop(): void;
  pause(): void;
  resume(): void;
  
  // Performance monitoring
  getPerformanceMetrics(): PerformanceMetrics;
  
  // Cleanup
  dispose(): void;
}
```

#### Key Methods

**addVideoSource()**
- Creates HTMLVideoElement for the stream
- Configures video element properties (muted, autoplay)
- Stores element in videoElements map
- Triggers layout recalculation

**render() (private)**
- Called via requestAnimationFrame
- Clears canvas
- Draws each video source according to layout
- Applies visual effects (borders, shadows, rounded corners)
- Tracks frame timing and dropped frames

**start()**
- Captures canvas stream using captureStream(30)
- Starts render loop
- Returns MediaStream for recording

### 2. Layout System

#### Layout Types

```typescript
type LayoutType = 
  | 'picture-in-picture'
  | 'side-by-side'
  | 'screen-only'
  | 'camera-only'
  | 'presentation';

interface CompositorLayout {
  type: LayoutType;
  canvas: {
    width: number;
    height: number;
  };
  sources: {
    camera?: SourceLayout;
    screen?: SourceLayout;
  };
}

interface SourceLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  borderRadius?: number;
  border?: {
    width: number;
    color: string;
  };
  shadow?: {
    blur: number;
    color: string;
    offsetX: number;
    offsetY: number;
  };
}
```

#### Predefined Layouts

**Picture-in-Picture (Bottom-Right)**
```typescript
{
  type: 'picture-in-picture',
  canvas: { width: 1920, height: 1080 },
  sources: {
    screen: {
      x: 0, y: 0,
      width: 1920, height: 1080,
      zIndex: 0
    },
    camera: {
      x: 1600, y: 860,
      width: 300, height: 200,
      zIndex: 1,
      borderRadius: 8,
      border: { width: 3, color: '#ffffff' },
      shadow: { blur: 10, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 2 }
    }
  }
}
```

**Side-by-Side**
```typescript
{
  type: 'side-by-side',
  canvas: { width: 1920, height: 1080 },
  sources: {
    screen: {
      x: 0, y: 0,
      width: 960, height: 1080,
      zIndex: 0
    },
    camera: {
      x: 960, y: 0,
      width: 960, height: 1080,
      zIndex: 0
    }
  }
}
```

**Presentation Mode**
```typescript
{
  type: 'presentation',
  canvas: { width: 1920, height: 1080 },
  sources: {
    screen: {
      x: 0, y: 0,
      width: 1536, height: 1080,
      zIndex: 0
    },
    camera: {
      x: 1536, y: 0,
      width: 384, height: 1080,
      zIndex: 0
    }
  }
}
```

### 3. Enhanced useVideoRecorder Hook

#### Additional State

```typescript
// Compositor state
const [compositor, setCompositor] = useState<VideoCompositor | null>(null);
const [isCompositing, setIsCompositing] = useState(false);
const [currentLayout, setCurrentLayout] = useState<LayoutType>('picture-in-picture');
const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

// Video element refs for compositor
const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
const screenVideoRef = useRef<HTMLVideoElement | null>(null);
```

#### Modified Methods

**startRecording()**
```typescript
const startRecording = useCallback(async () => {
  try {
    // Determine if we need compositing
    const needsCompositing = recordingSources.camera && recordingSources.screen;
    
    let streamToRecord: MediaStream;
    
    if (needsCompositing) {
      // Initialize compositor
      const comp = new VideoCompositor(1920, 1080);
      
      // Add camera source
      if (recordingSources.camera) {
        comp.addVideoSource('camera', recordingSources.camera, {
          layout: getLayoutForSource('camera', currentLayout)
        });
      }
      
      // Add screen source
      if (recordingSources.screen) {
        comp.addVideoSource('screen', recordingSources.screen, {
          layout: getLayoutForSource('screen', currentLayout)
        });
      }
      
      // Start compositing
      const videoStream = comp.start();
      
      // Add audio tracks
      streamToRecord = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...getAudioTracks()
      ]);
      
      setCompositor(comp);
      setIsCompositing(true);
    } else {
      // Single source - use existing logic
      streamToRecord = createCombinedStream();
    }
    
    // Start MediaRecorder with composited stream
    const recorder = new MediaRecorder(streamToRecord, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 3000000
    });
    
    // ... rest of recording logic
  } catch (error) {
    handleRecordingError(error);
  }
}, [recordingSources, currentLayout]);
```

**changeLayout()**
```typescript
const changeLayout = useCallback((newLayout: LayoutType) => {
  if (!compositor || !isCompositing) {
    setCurrentLayout(newLayout);
    return;
  }
  
  // Update compositor layout in real-time
  const layoutConfig = getLayoutConfig(newLayout);
  compositor.setLayout(layoutConfig);
  setCurrentLayout(newLayout);
  
  // Smooth transition (handled by compositor)
}, [compositor, isCompositing]);
```

**addScreenShare() / removeScreenShare()**
```typescript
const addScreenShare = useCallback(async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080 },
      audio: true
    });
    
    setRecordingSources(prev => ({ ...prev, screen: screenStream }));
    
    // If already recording with compositor
    if (compositor && isRecording) {
      compositor.addVideoSource('screen', screenStream, {
        layout: getLayoutForSource('screen', currentLayout)
      });
      
      // Update layout to show both sources
      if (currentLayout === 'camera-only') {
        changeLayout('picture-in-picture');
      }
    }
  } catch (error) {
    handleError(error);
  }
}, [compositor, isRecording, currentLayout]);
```

### 4. UI Components

#### LayoutSelector Component

```typescript
interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  disabled?: boolean;
  isCompositing: boolean;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  disabled,
  isCompositing
}) => {
  const layouts = [
    {
      type: 'picture-in-picture',
      name: 'Picture-in-Picture',
      icon: PictureInPictureIcon,
      description: 'Camera overlay on screen'
    },
    {
      type: 'side-by-side',
      name: 'Side by Side',
      icon: SplitScreenIcon,
      description: 'Equal split view'
    },
    {
      type: 'presentation',
      name: 'Presentation',
      icon: PresentationIcon,
      description: 'Large screen, small camera'
    },
    {
      type: 'screen-only',
      name: 'Screen Only',
      icon: MonitorIcon,
      description: 'Hide camera'
    },
    {
      type: 'camera-only',
      name: 'Camera Only',
      icon: CameraIcon,
      description: 'Hide screen'
    }
  ];
  
  return (
    <div className="flex flex-wrap gap-2">
      {layouts.map(layout => (
        <button
          key={layout.type}
          onClick={() => onLayoutChange(layout.type)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            transition-all duration-200
            ${currentLayout === layout.type
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={layout.description}
        >
          <layout.icon className="w-5 h-5" />
          <span className="text-sm font-medium">{layout.name}</span>
        </button>
      ))}
    </div>
  );
};
```

#### CompositorPreview Component

```typescript
interface CompositorPreviewProps {
  compositor: VideoCompositor | null;
  isCompositing: boolean;
  performanceMetrics: PerformanceMetrics | null;
}

const CompositorPreview: React.FC<CompositorPreviewProps> = ({
  compositor,
  isCompositing,
  performanceMetrics
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (compositor && canvasRef.current) {
      // Mirror compositor canvas to preview
      const previewCtx = canvasRef.current.getContext('2d');
      const compositorCanvas = compositor.getCanvas();
      
      const updatePreview = () => {
        if (previewCtx && compositorCanvas) {
          previewCtx.drawImage(compositorCanvas, 0, 0);
        }
        if (isCompositing) {
          requestAnimationFrame(updatePreview);
        }
      };
      
      updatePreview();
    }
  }, [compositor, isCompositing]);
  
  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain"
      />
      
      {isCompositing && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>Live Composite</span>
        </div>
      )}
      
      {performanceMetrics && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs font-mono">
          <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
          <div>Dropped: {performanceMetrics.droppedFrames}</div>
        </div>
      )}
    </div>
  );
};
```

## Data Models

### TypeScript Interfaces

```typescript
// Compositor configuration
interface CompositorConfig {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: string;
}

// Source configuration
interface SourceConfig {
  layout: SourceLayout;
  visible: boolean;
  opacity: number;
}

// Performance metrics
interface PerformanceMetrics {
  fps: number;
  droppedFrames: number;
  averageRenderTime: number;
  memoryUsage: number;
  isPerformanceGood: boolean;
}

// Recording options
interface RecordingOptions {
  enableCamera: boolean;
  enableScreen: boolean;
  enableAudio: boolean;
  layout: LayoutType;
  videoBitrate: number;
  audioBitrate: number;
}

// Compositor state
interface CompositorState {
  isInitialized: boolean;
  isRunning: boolean;
  currentLayout: LayoutType;
  activeSources: string[];
  performanceMetrics: PerformanceMetrics;
}
```

## Error Handling

### Error Types

```typescript
enum CompositorErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  SOURCE_LOST = 'SOURCE_LOST',
  RENDERING_FAILED = 'RENDERING_FAILED',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED'
}

class CompositorError extends Error {
  type: CompositorErrorType;
  recoverable: boolean;
  suggestedAction: string;
  
  constructor(type: CompositorErrorType, message: string, recoverable: boolean) {
    super(message);
    this.type = type;
    this.recoverable = recoverable;
    this.suggestedAction = this.getSuggestedAction();
  }
  
  private getSuggestedAction(): string {
    switch (this.type) {
      case CompositorErrorType.SOURCE_LOST:
        return 'Recording will continue with remaining sources';
      case CompositorErrorType.PERFORMANCE_DEGRADED:
        return 'Consider reducing video quality or closing other applications';
      case CompositorErrorType.BROWSER_UNSUPPORTED:
        return 'Please use Chrome, Firefox, or Edge browser';
      default:
        return 'Please try again or contact support';
    }
  }
}
```

### Error Recovery Strategies

**Source Lost During Recording**
1. Detect stream ended event
2. Remove source from compositor
3. Adjust layout to remaining sources
4. Display warning notification
5. Continue recording

**Performance Degradation**
1. Monitor frame rate and dropped frames
2. If FPS < 20 for 5 seconds:
   - Reduce canvas resolution (1920x1080 → 1280x720)
   - Reduce frame rate (30fps → 24fps)
   - Disable visual effects (shadows, borders)
3. Display performance warning
4. Allow user to continue or stop

**Compositor Initialization Failure**
1. Catch initialization error
2. Fall back to single-source recording
3. Display error message with explanation
4. Disable layout switching UI

## Testing Strategy

### Unit Tests

**VideoCompositor Class**
- Canvas initialization
- Source addition/removal
- Layout application
- Stream generation
- Performance metric calculation
- Cleanup and disposal

**Layout System**
- Layout configuration validation
- Source positioning calculations
- Aspect ratio preservation
- Boundary checking

**useVideoRecorder Hook**
- State management
- Source coordination
- Compositor lifecycle
- Error handling

### Integration Tests

**Multi-Source Recording Flow**
1. Start with camera only
2. Add screen share
3. Verify compositor initialization
4. Change layouts
5. Remove screen share
6. Verify graceful degradation

**Error Recovery**
1. Simulate source loss
2. Verify layout adjustment
3. Verify recording continues
4. Check error notifications

**Performance Under Load**
1. Record for 10 minutes
2. Monitor memory usage
3. Check frame rate stability
4. Verify no memory leaks

### Browser Compatibility Tests

**Chrome/Edge**
- Full feature support
- Canvas compositing
- MediaRecorder with VP9

**Firefox**
- Canvas compositing
- MediaRecorder with VP8
- Audio mixing

**Safari** (Limited)
- Feature detection
- Fallback messaging
- Single-source recording

## Performance Optimization

### Canvas Rendering

**Optimization Techniques**
1. Use `willReadFrequently: false` for 2D context
2. Minimize canvas state changes
3. Batch drawing operations
4. Use integer coordinates for pixel-perfect rendering
5. Avoid unnecessary clears (only clear dirty regions)

**Frame Rate Management**
```typescript
private render = () => {
  const now = performance.now();
  const elapsed = now - this.lastFrameTime;
  
  // Target 30 FPS (33.33ms per frame)
  if (elapsed >= 33.33) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw sources in z-index order
    this.drawSources();
    
    this.frameCount++;
    this.lastFrameTime = now;
  } else {
    // Frame came too early, count as dropped
    this.droppedFrames++;
  }
  
  if (this.isRunning) {
    this.animationFrameId = requestAnimationFrame(this.render);
  }
};
```

### Memory Management

**Stream Cleanup**
```typescript
dispose(): void {
  // Stop render loop
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
  }
  
  // Stop output stream
  if (this.outputStream) {
    this.outputStream.getTracks().forEach(track => track.stop());
  }
  
  // Clean up video elements
  this.videoElements.forEach(video => {
    video.srcObject = null;
    video.remove();
  });
  this.videoElements.clear();
  
  // Clear canvas
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  this.isRunning = false;
}
```

### Audio Mixing

**Multiple Audio Sources**
```typescript
private getAudioTracks(): MediaStreamTrack[] {
  const audioTracks: MediaStreamTrack[] = [];
  
  // Add camera audio
  if (recordingSources.camera && options.enableAudio) {
    audioTracks.push(...recordingSources.camera.getAudioTracks());
  }
  
  // Add screen audio
  if (recordingSources.screen && options.enableSystemAudio) {
    audioTracks.push(...recordingSources.screen.getAudioTracks());
  }
  
  return audioTracks;
}
```

## Browser Compatibility

### Feature Detection

```typescript
const checkBrowserSupport = (): BrowserSupport => {
  const support: BrowserSupport = {
    canvas: false,
    mediaRecorder: false,
    captureStream: false,
    displayMedia: false,
    vp9Codec: false,
    warnings: []
  };
  
  // Check canvas support
  try {
    const canvas = document.createElement('canvas');
    support.canvas = !!canvas.getContext('2d');
    support.captureStream = typeof canvas.captureStream === 'function';
  } catch (e) {
    support.warnings.push('Canvas API not supported');
  }
  
  // Check MediaRecorder
  support.mediaRecorder = typeof MediaRecorder !== 'undefined';
  
  // Check getDisplayMedia
  support.displayMedia = 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function';
  
  // Check VP9 codec
  if (support.mediaRecorder) {
    support.vp9Codec = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
  }
  
  return support;
};
```

### Fallback Strategy

```typescript
const initializeRecording = () => {
  const support = checkBrowserSupport();
  
  if (!support.canvas || !support.captureStream) {
    // Cannot composite - use single source
    setCompositorAvailable(false);
    showWarning('Multi-source recording not available. Using single source mode.');
    return initializeSingleSourceRecording();
  }
  
  if (!support.vp9Codec) {
    // Use VP8 instead
    setCodec('video/webm;codecs=vp8');
  }
  
  return initializeCompositorRecording();
};
```

## Security Considerations

### Permission Handling

- Request camera permission before screen share
- Handle permission denials gracefully
- Explain why permissions are needed
- Provide retry mechanism

### Data Privacy

- All processing happens client-side
- No video data sent to external services during recording
- Clear indication when recording is active
- Secure upload over HTTPS only

## Future Enhancements

### Phase 2 Features

1. **Advanced Layouts**
   - Custom positioning with drag-and-drop
   - Animated transitions between layouts
   - Multiple camera support

2. **Visual Effects**
   - Background blur for camera
   - Virtual backgrounds
   - Chroma key (green screen)

3. **Performance**
   - WebGL-based rendering
   - Hardware acceleration
   - Adaptive quality based on device capabilities

4. **Collaboration**
   - Real-time streaming to viewers
   - Multi-presenter support
   - Live layout control by viewers

## Implementation Notes

### Development Approach

1. **Phase 1**: Core VideoCompositor class (Week 1)
2. **Phase 2**: Integration with useVideoRecorder (Week 2)
3. **Phase 3**: UI components and controls (Week 3)
4. **Phase 4**: Testing and optimization (Week 4)

### Dependencies

- No external libraries required
- Uses native Web APIs:
  - Canvas API
  - MediaStream API
  - MediaRecorder API
  - getUserMedia / getDisplayMedia

### File Structure

```
frontend/src/
├── utils/
│   ├── VideoCompositor.ts           # Core compositor class
│   ├── CompositorLayouts.ts         # Layout definitions
│   └── CompositorUtils.ts           # Helper functions
├── components/courses/
│   ├── LayoutSelector.tsx           # Layout selection UI
│   ├── CompositorPreview.tsx        # Preview component
│   └── VideoRecorder.tsx            # Updated main component
├── hooks/
│   └── useVideoRecorder.ts          # Updated hook
└── types/
    └── VideoCompositor.ts           # TypeScript interfaces
```

## Conclusion

This design provides a comprehensive, performant solution for simultaneous camera and screen recording using native browser APIs. The modular architecture allows for incremental implementation and testing, while the error handling and fallback strategies ensure a robust user experience across different browsers and devices.

The canvas-based compositing approach provides maximum flexibility for layout customization while maintaining excellent performance through optimized rendering techniques. The integration with the existing `useVideoRecorder` hook ensures minimal disruption to the current codebase while adding powerful new capabilities for educational content creation.
