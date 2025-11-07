# Design Document

## Overview

This design document outlines the implementation approach for completing the Enhanced Video Player with subtitles, quality selection, resource management, video downloads, and enhanced statistics. The solution integrates with the existing React component architecture and backend API structure.

## Architecture

### Frontend Architecture

```
EnhancedVideoPlayer (React Component)
├── Video Controls Layer
│   ├── Subtitle Selector
│   ├── Quality Selector
│   ├── Download Button
│   └── Statistics Toggle
├── Video Overlay Layer
│   ├── Subtitle Display
│   └── Statistics Panel
└── Resources Tab
    └── Resource List with Download Links
```

### Backend Architecture

```
API Layer
├── /api/courses/lessons/:id/subtitles (GET, POST, DELETE)
├── /api/courses/lessons/:id/resources (GET, POST, DELETE)
├── /api/courses/lessons/:id/download-url (GET)
└── /api/courses/lessons/:id/resource/:resourceId/download (GET)

Service Layer
├── subtitleService.js
├── resourceService.js
└── videoDownloadService.js

Storage Layer
├── S3/Cloud Storage for subtitle files
├── S3/Cloud Storage for resource files
└── Database tables for metadata
```

## Components and Interfaces

### 1. Subtitle Management

#### Frontend Component: SubtitleSelector

```typescript
interface SubtitleTrack {
  id: string;
  language: string;
  languageCode: string;
  label: string;
  url: string;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrack: string | null;
  onTrackChange: (trackId: string | null) => void;
}
```

**Implementation Details:**
- Dropdown menu in video controls showing available subtitle languages
- "Off" option to disable subtitles
- Current selection highlighted
- Loads VTT files and adds them as text tracks to the video element

#### Frontend Component: SubtitleDisplay

```typescript
interface SubtitleDisplayProps {
  currentCue: string;
  visible: boolean;
}
```

**Implementation Details:**
- Renders current subtitle text as overlay
- Positioned at bottom center of video
- Black background with white text for readability
- Automatically updates based on video currentTime

#### Backend API: Subtitle Endpoints

**GET /api/courses/lessons/:id/subtitles**
- Returns array of available subtitle tracks
- Response: `{ success: true, data: { subtitles: SubtitleTrack[] } }`

**POST /api/courses/lessons/:id/subtitles** (Instructor only)
- Uploads subtitle file (VTT or SRT format)
- Validates file format
- Stores in cloud storage
- Creates database record
- Request body: `{ language: string, languageCode: string, file: File }`

**DELETE /api/courses/lessons/:id/subtitles/:subtitleId** (Instructor only)
- Removes subtitle file and database record

### 2. Quality Selection

#### Frontend Component: QualitySelector

```typescript
interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  label: string; // e.g., "1080p", "720p", "Auto"
}

interface QualitySelectorProps {
  levels: QualityLevel[];
  currentLevel: number;
  onLevelChange: (levelIndex: number) => void;
}
```

**Implementation Details:**
- Integrates with HLS.js quality levels API
- Dropdown menu showing available resolutions
- "Auto" option for adaptive bitrate
- Displays current quality in controls
- Seamless quality switching without buffering

#### HLS.js Integration

```typescript
// Access quality levels
const levels = hls.levels.map((level, index) => ({
  index,
  height: level.height,
  bitrate: level.bitrate,
  label: `${level.height}p`
}));

// Set quality level
hls.currentLevel = levelIndex; // -1 for auto

// Listen for quality changes
hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
  console.log('Quality switched to:', data.level);
});
```

### 3. Resource Management

#### Frontend Component: ResourceList

```typescript
interface Resource {
  id: string;
  lesson_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
}

interface ResourceListProps {
  lessonId: string;
  resources: Resource[];
  onDownload: (resourceId: string) => void;
}
```

**Implementation Details:**
- Displays list of resources in Resources tab
- Shows file name, type icon, and size
- Download button for each resource
- Empty state when no resources available
- Loading state while fetching

#### Backend API: Resource Endpoints

**GET /api/courses/lessons/:id/resources**
- Returns array of lesson resources
- Response: `{ success: true, data: { resources: Resource[] } }`

**POST /api/courses/lessons/:id/resources** (Instructor only)
- Uploads resource file
- Stores in cloud storage
- Creates database record
- Request body: `{ file: File, description?: string }`

**GET /api/courses/lessons/:id/resources/:resourceId/download**
- Generates signed download URL
- Returns: `{ success: true, data: { downloadUrl: string, expiresIn: number } }`

**DELETE /api/courses/lessons/:id/resources/:resourceId** (Instructor only)
- Removes resource file and database record

### 4. Video Download

#### Frontend Component: DownloadButton

```typescript
interface DownloadButtonProps {
  lessonId: string;
  downloadEnabled: boolean;
  onDownloadStart: () => void;
  onDownloadComplete: () => void;
  onDownloadError: (error: Error) => void;
}
```

**Implementation Details:**
- Button in video controls (hidden if download disabled)
- Requests download URL from backend
- Initiates browser download
- Shows loading state during URL generation
- Error handling for failed downloads

#### Backend API: Download Endpoint

**GET /api/courses/lessons/:id/download-url**
- Checks lesson download permission
- Verifies user enrollment
- Generates time-limited signed URL (valid for 1 hour)
- Logs download request
- Response: `{ success: true, data: { downloadUrl: string, expiresAt: string } }`

### 5. Enhanced Video Statistics

#### Frontend Component: VideoStatsPanel

```typescript
interface VideoStats {
  buffered: number; // seconds
  droppedFrames: number;
  totalFrames: number;
  currentBitrate: number; // bps
  averageBitrate: number; // bps
  currentQuality: string; // e.g., "1080p"
  networkSpeed: number; // Mbps estimate
  bufferHealth: 'good' | 'warning' | 'critical';
}

interface VideoStatsPanelProps {
  stats: VideoStats;
  visible: boolean;
  onClose: () => void;
}
```

**Implementation Details:**
- Overlay panel in top-right corner
- Real-time updates every second
- Color-coded indicators (green/yellow/red)
- Collapsible/expandable
- Persists visibility preference in localStorage

#### Statistics Collection

```typescript
// Collect from video element
const buffered = video.buffered.length > 0 
  ? video.buffered.end(video.buffered.length - 1) - video.currentTime 
  : 0;

// Collect from HLS.js
const currentLevel = hls.levels[hls.currentLevel];
const currentBitrate = currentLevel?.bitrate || 0;

// Collect from media source
const videoQuality = video.getVideoPlaybackQuality();
const droppedFrames = videoQuality.droppedVideoFrames;
const totalFrames = videoQuality.totalVideoFrames;

// Calculate buffer health
const bufferHealth = buffered > 10 ? 'good' 
  : buffered > 3 ? 'warning' 
  : 'critical';
```

## Data Models

### Database Schema

#### subtitles table
```sql
CREATE TABLE subtitles (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  language VARCHAR(100) NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, language_code)
);

CREATE INDEX idx_subtitles_lesson ON subtitles(lesson_id);
```

#### lesson_resources table
```sql
CREATE TABLE lesson_resources (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  description TEXT,
  download_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_resources_lesson ON lesson_resources(lesson_id);
```

#### lessons table (add column)
```sql
ALTER TABLE lessons 
ADD COLUMN allow_download BOOLEAN DEFAULT false;
```

## Error Handling

### Frontend Error Scenarios

1. **Subtitle Loading Failure**
   - Display error toast: "Failed to load subtitles"
   - Disable subtitle selector
   - Log error to console

2. **Quality Switch Failure**
   - Revert to previous quality
   - Display warning toast
   - Continue playback

3. **Resource Download Failure**
   - Display error message: "Download failed. Please try again."
   - Retry button available
   - Log error details

4. **Video Download Failure**
   - Display error: "Video download not available"
   - Check if download is permitted
   - Provide alternative (stream only)

### Backend Error Scenarios

1. **File Upload Errors**
   - Validate file size (max 100MB for resources, 5MB for subtitles)
   - Validate file types
   - Return 400 Bad Request with specific error message

2. **Storage Errors**
   - Retry upload 3 times
   - Return 500 Internal Server Error
   - Log error for monitoring

3. **Permission Errors**
   - Return 403 Forbidden if user not authorized
   - Check instructor role for uploads
   - Check enrollment for downloads

4. **URL Generation Errors**
   - Return 500 if signing fails
   - Log error details
   - Provide fallback error message

## Testing Strategy

### Unit Tests

#### Frontend
- SubtitleSelector component rendering and interaction
- QualitySelector level switching logic
- ResourceList display and download triggering
- VideoStatsPanel calculations and formatting
- Subtitle synchronization with video time

#### Backend
- Subtitle file validation (VTT/SRT format)
- Resource file upload and storage
- Signed URL generation and expiration
- Permission checking logic
- Database operations (CRUD)

### Integration Tests

#### Frontend
- HLS.js quality level detection and switching
- Subtitle track loading and display
- Resource download flow end-to-end
- Video download URL request and initiation

#### Backend
- Complete subtitle upload and retrieval flow
- Complete resource upload and download flow
- Video download permission checking
- Signed URL validation and expiration

### End-to-End Tests

1. **Subtitle Workflow**
   - Instructor uploads subtitle file
   - Student views available subtitles
   - Student enables subtitles
   - Subtitles display correctly synchronized

2. **Quality Selection Workflow**
   - Video loads with multiple quality levels
   - Student switches quality manually
   - Quality changes without interruption
   - Auto quality adapts to network

3. **Resource Workflow**
   - Instructor uploads resource files
   - Student views resource list
   - Student downloads resource
   - File downloads successfully

4. **Video Download Workflow**
   - Instructor enables download for lesson
   - Student sees download button
   - Student clicks download
   - Video file downloads successfully

### Performance Tests

- Subtitle file loading time (< 500ms)
- Quality switching time (< 2 seconds)
- Resource list loading (< 1 second)
- Download URL generation (< 500ms)
- Statistics update frequency (1 second intervals)

## Security Considerations

1. **File Upload Security**
   - Validate file types and sizes
   - Scan for malware
   - Use secure file names (UUID-based)
   - Store in isolated cloud storage

2. **Download Security**
   - Generate time-limited signed URLs (1 hour expiration)
   - Verify user enrollment before generating URLs
   - Log all download requests
   - Rate limit download requests

3. **Access Control**
   - Only instructors can upload subtitles/resources
   - Only enrolled students can download
   - Verify lesson ownership for uploads
   - Check download permissions

4. **Data Validation**
   - Sanitize file names
   - Validate subtitle file format
   - Check file size limits
   - Validate language codes

## Performance Optimization

1. **Lazy Loading**
   - Load subtitles only when selected
   - Fetch resources only when tab is opened
   - Generate download URLs on-demand

2. **Caching**
   - Cache subtitle files in browser
   - Cache resource list for 5 minutes
   - Cache quality levels after detection

3. **Compression**
   - Compress subtitle files (gzip)
   - Optimize resource file storage
   - Use CDN for static files

4. **Progressive Enhancement**
   - Core video playback works without enhancements
   - Graceful degradation if features unavailable
   - Feature detection for browser capabilities
