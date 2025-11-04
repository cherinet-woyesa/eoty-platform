# UI Components Integration Guide

This document provides guidance on integrating the newly created UI components for multi-source video recording.

## Components Created

### 1. LayoutSelector
**Location:** `frontend/src/components/courses/LayoutSelector.tsx`

**Purpose:** Provides a visual interface for selecting video layout configurations.

**Features:**
- Layout button grid with icons
- Active layout highlighting
- Hover preview tooltips
- Disabled state handling
- Layout descriptions
- Live compositing indicator

**Usage Example:**
```tsx
import { LayoutSelector } from './components/courses';

<LayoutSelector
  currentLayout={currentLayout}
  onLayoutChange={changeLayout}
  disabled={!isRecording}
  isCompositing={isCompositing}
/>
```

### 2. CompositorPreview
**Location:** `frontend/src/components/courses/CompositorPreview.tsx`

**Purpose:** Displays a live preview of the composited video output.

**Features:**
- Canvas preview element
- Live composite display with real-time updates
- "Live Composite" indicator
- Performance metrics display (FPS, dropped frames, render time, memory)
- Responsive sizing
- Performance status color coding

**Usage Example:**
```tsx
import { CompositorPreview } from './components/courses';

<CompositorPreview
  compositor={compositorInstance}
  isCompositing={isCompositing}
  performanceMetrics={performanceMetrics}
/>
```

### 3. SourceControlIndicators
**Location:** `frontend/src/components/courses/SourceControlIndicators.tsx`

**Purpose:** Provides visual indicators and controls for active video/audio sources.

**Features:**
- Active source indicators (camera/screen/mic icons)
- Visual feedback for source status
- Source toggle buttons
- Audio level visualization
- Recording status indicator
- Status summary text

**Usage Example:**
```tsx
import { SourceControlIndicators } from './components/courses';

<SourceControlIndicators
  recordingSources={recordingSources}
  onToggleCamera={initializeCamera}
  onToggleScreen={addScreenShare}
  onToggleMicrophone={toggleMicrophone}
  disabled={isRecording}
  isRecording={isRecording}
  micLevel={micLevel}
/>
```

### 4. KeyboardShortcuts
**Location:** `frontend/src/components/courses/KeyboardShortcuts.tsx`

**Purpose:** Implements keyboard shortcuts for recording controls and displays hints.

**Features:**
- Space key for pause/resume
- 'S' key for screen share toggle
- 'L' key for layout cycling
- Number keys (1-5) for direct layout selection
- Visual keyboard shortcut hints
- Automatic event listener management
- Input field detection (prevents shortcuts when typing)

**Keyboard Shortcuts:**
- `Space` - Pause/Resume recording (only during recording)
- `S` - Toggle screen sharing
- `L` - Cycle through layouts
- `1` - Picture-in-Picture layout
- `2` - Side-by-Side layout
- `3` - Presentation layout
- `4` - Screen-Only layout
- `5` - Camera-Only layout

**Usage Example:**
```tsx
import { KeyboardShortcuts } from './components/courses';

<KeyboardShortcuts
  isRecording={isRecording}
  isPaused={isPaused}
  onPauseResume={isPaused ? resumeRecording : pauseRecording}
  onToggleScreen={isScreenSharing ? removeScreenShare : addScreenShare}
  onCycleLayout={cycleLayout}
  onSelectLayout={changeLayout}
  disabled={false}
/>
```

## Integration with VideoRecorder Component

To integrate these components into the existing VideoRecorder component:

### 1. Import the components
```tsx
import {
  LayoutSelector,
  CompositorPreview,
  SourceControlIndicators,
  KeyboardShortcuts
} from './components/courses';
```

### 2. Add layout cycling function
```tsx
const cycleLayout = useCallback(() => {
  const layouts: LayoutType[] = [
    'picture-in-picture',
    'side-by-side',
    'presentation',
    'screen-only',
    'camera-only'
  ];
  const currentIndex = layouts.indexOf(currentLayout as LayoutType);
  const nextIndex = (currentIndex + 1) % layouts.length;
  changeLayout(layouts[nextIndex]);
}, [currentLayout, changeLayout]);
```

### 3. Replace existing layout controls
Replace the inline layout buttons with:
```tsx
<LayoutSelector
  currentLayout={compositorLayout}
  onLayoutChange={changeLayout}
  disabled={false}
  isCompositing={isCompositing}
/>
```

### 4. Replace source controls
Replace the existing source toggle buttons with:
```tsx
<SourceControlIndicators
  recordingSources={recordingSources}
  onToggleCamera={() => recordingSources.camera ? closeCamera() : initializeCamera()}
  onToggleScreen={() => isScreenSharing ? removeScreenShare() : addScreenShare()}
  disabled={false}
  isRecording={isRecording}
  micLevel={micLevel}
/>
```

### 5. Add compositor preview (optional)
For a dedicated preview area showing the composited output:
```tsx
{isCompositing && (
  <div className="mt-4">
    <CompositorPreview
      compositor={compositorInstance}
      isCompositing={isCompositing}
      performanceMetrics={performanceMetrics}
    />
  </div>
)}
```

### 6. Add keyboard shortcuts panel
Add to the settings or tips section:
```tsx
{showSettings && (
  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
    <KeyboardShortcuts
      isRecording={isRecording}
      isPaused={isPaused}
      onPauseResume={isPaused ? resumeRecording : pauseRecording}
      onToggleScreen={() => isScreenSharing ? removeScreenShare() : addScreenShare()}
      onCycleLayout={cycleLayout}
      onSelectLayout={changeLayout}
      disabled={false}
    />
  </div>
)}
```

## Requirements Satisfied

### Task 4.1 - LayoutSelector
✅ Create layout button grid with icons
✅ Add active layout highlighting
✅ Implement layout preview on hover
✅ Add disabled state handling
✅ Include layout descriptions
✅ Requirements: 6.2, 6.3

### Task 4.2 - CompositorPreview
✅ Create canvas preview element
✅ Implement live composite display
✅ Add "Live Composite" indicator
✅ Display performance metrics (FPS, dropped frames)
✅ Add responsive sizing
✅ Requirements: 6.1, 5.3

### Task 4.3 - SourceControlIndicators
✅ Create active source indicators (camera/screen icons)
✅ Add visual feedback for source status
✅ Implement source toggle buttons
✅ Requirements: 6.4

### Task 4.4 - KeyboardShortcuts
✅ Add Space key for pause/resume
✅ Add 'S' key for screen share toggle
✅ Add 'L' key for layout cycling
✅ Add number keys (1-5) for direct layout selection
✅ Display keyboard shortcut hints
✅ Requirements: 6.5

## Design Consistency

All components follow the existing design patterns:
- Tailwind CSS for styling
- Lucide React for icons
- Consistent color scheme (blue for primary, green for active, red for recording)
- Hover states and transitions
- Responsive design
- Accessibility considerations (tooltips, keyboard navigation)

## Next Steps

To complete the integration:
1. Update VideoRecorder component to use these new components
2. Test keyboard shortcuts in different scenarios
3. Verify performance metrics display accuracy
4. Test layout switching during recording
5. Ensure source controls work correctly with compositor
