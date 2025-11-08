# Mux Video Integration Design

## Overview

This design implements a hybrid storage architecture where Mux handles all video content while AWS S3 continues to serve non-video assets. The integration maintains backward compatibility with existing S3 videos while providing a migration path to Mux.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend Application                    │
│  ┌──────────────┐         ┌──────────────┐         │
│  │ Mux Uploader │         │  Mux Player  │         │
│  └──────────────┘         └──────────────┘         │
│  ┌──────────────┐         ┌──────────────┐         │
│  │ S3 Uploader  │         │Legacy Player │         │
│  └──────────────┘         └──────────────┘         │
└─────────────────────────────────────────────────────┘
                    ↓                    ↓
┌─────────────────────────────────────────────────────┐
│              Backend API Server                      │
│  ┌──────────────┐         ┌──────────────┐         │
│  │ Mux Service  │         │  S3 Service  │         │
│  └──────────────┘         └──────────────┘         │
│  ┌──────────────────────────────────────┐          │
│  │         Database (PostgreSQL)         │          │
│  └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
         ↓                              ↓
┌──────────────────┐         ┌──────────────────┐
│   Mux Platform   │         │    AWS S3        │
│   (Videos Only)  │         │ (Other Files)    │
└──────────────────┘         └──────────────────┘
```

### Storage Decision Flow

```
File Upload
    ↓
Is it a video?
    ↓
  Yes → Upload to Mux
    ↓
  Store: mux_asset_id, mux_playback_id
    ↓
  No → Upload to S3
    ↓
  Store: s3_key, s3_url
```

## Components and Interfaces

### 1. Database Schema Updates

```sql
-- Add Mux columns to lessons table
ALTER TABLE lessons ADD COLUMN mux_asset_id VARCHAR(255);
ALTER TABLE lessons ADD COLUMN mux_playback_id VARCHAR(255);
ALTER TABLE lessons ADD COLUMN video_provider VARCHAR(20) DEFAULT 's3';
ALTER TABLE lessons ADD COLUMN mux_upload_id VARCHAR(255);
ALTER TABLE lessons ADD COLUMN processing_status VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX idx_lessons_mux_asset ON lessons(mux_asset_id);
CREATE INDEX idx_lessons_video_provider ON lessons(video_provider);

-- Keep existing columns for backward compatibility
-- video_url (S3 URL)
-- hls_url (S3 HLS URL)
```

### 2. Backend Services

#### MuxService (New)

```typescript
class MuxService {
  // Create direct upload URL
  async createDirectUpload(options: {
    corsOrigin: string;
    newAssetSettings: {
      playback_policy: 'public' | 'signed';
      passthrough: string; // lessonId
    };
  }): Promise<{
    uploadUrl: string;
    uploadId: string;
    assetId: string;
  }>;

  // Get asset status
  async getAsset(assetId: string): Promise<{
    status: 'preparing' | 'ready' | 'errored';
    playbackId: string;
    duration: number;
  }>;

  // Create signed playback URL (for private videos)
  createSignedPlaybackUrl(playbackId: string, options: {
    expiresIn: number;
    type: 'video' | 'thumbnail';
  }): string;

  // Get video analytics
  async getVideoAnalytics(assetId: string): Promise<{
    views: number;
    watchTime: number;
    completionRate: number;
  }>;

  // Delete asset
  async deleteAsset(assetId: string): Promise<void>;
}
```

#### CloudStorageService (Updated)

```typescript
class CloudStorageService {
  // Keep existing S3 methods for non-video files
  async uploadFile(file: Buffer, key: string): Promise<string>;
  async getSignedUrl(key: string, expiresIn: number): Promise<string>;
  async deleteFile(key: string): Promise<void>;
  
  // Remove video-specific methods (moved to Mux)
  // - uploadVideo (deprecated)
  // - transcodeToHLS (deprecated)
}
```

### 3. API Endpoints

#### Video Upload Endpoints

```typescript
// Create Mux upload URL
POST /api/videos/mux/upload-url
Body: { lessonId: number }
Response: {
  uploadUrl: string;
  uploadId: string;
}

// Webhook for Mux events
POST /api/videos/mux/webhook
Body: { type: string; data: any }
Response: { received: true }

// Legacy S3 upload (deprecated but supported)
POST /api/courses/lessons/:lessonId/upload-video
Body: FormData with video file
Response: { success: true, videoUrl: string }
```

#### Playback Endpoints

```typescript
// Get video playback info
GET /api/videos/:lessonId/playback
Response: {
  provider: 'mux' | 's3';
  playbackId?: string;  // For Mux
  videoUrl?: string;    // For S3
  signedUrl?: string;   // For private videos
}
```

### 4. Frontend Components

#### MuxVideoUploader Component

```typescript
interface MuxVideoUploaderProps {
  lessonId: number;
  onUploadComplete: (assetId: string, playbackId: string) => void;
  onUploadProgress: (progress: number) => void;
  onError: (error: Error) => void;
}

// Uses @mux/mux-uploader-react
```

#### UnifiedVideoPlayer Component

```typescript
interface UnifiedVideoPlayerProps {
  lesson: {
    id: number;
    videoProvider: 'mux' | 's3';
    muxPlaybackId?: string;
    videoUrl?: string;
  };
  onProgress: (time: number) => void;
  onComplete: () => void;
}

// Renders MuxPlayer or legacy player based on provider
```

## Data Models

### Lesson Model (Updated)

```typescript
interface Lesson {
  id: number;
  title: string;
  description: string;
  
  // Video storage
  videoProvider: 'mux' | 's3';
  
  // Mux fields
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxUploadId?: string;
  
  // S3 fields (legacy)
  videoUrl?: string;
  hlsUrl?: string;
  
  // Common fields
  processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  duration?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### VideoAnalytics Model (New)

```typescript
interface VideoAnalytics {
  id: number;
  lessonId: number;
  provider: 'mux' | 's3';
  
  // Mux analytics
  muxViewCount?: number;
  muxWatchTime?: number;
  muxCompletionRate?: number;
  
  // Platform analytics
  totalViews: number;
  averageWatchTime: number;
  completionRate: number;
  
  lastSyncedAt: Date;
}
```

## Error Handling

### Upload Errors

```typescript
// Mux upload failure → Fallback to S3
try {
  await uploadToMux(video);
} catch (error) {
  console.error('Mux upload failed, falling back to S3:', error);
  await uploadToS3(video);
}
```

### Playback Errors

```typescript
// Mux playback failure → Show error with retry
<MuxPlayer
  playbackId={playbackId}
  onError={(error) => {
    showNotification('Video temporarily unavailable. Please try again.');
    logError('Mux playback error', error);
  }}
/>
```

## Testing Strategy

### Unit Tests

1. MuxService methods (upload, getAsset, createSignedUrl)
2. CloudStorageService S3 methods
3. Video provider detection logic
4. URL signing and validation

### Integration Tests

1. End-to-end video upload flow (Mux)
2. End-to-end video playback flow (Mux)
3. Backward compatibility with S3 videos
4. Webhook processing
5. Analytics synchronization

### Manual Testing

1. Record video → Upload to Mux → Verify playback
2. Upload video file → Verify Mux processing
3. View S3 video → Verify legacy player works
4. Test on different network speeds (adaptive streaming)
5. Test signed URLs for private videos

## Migration Strategy

### Phase 1: Setup (Week 1)
- Add Mux credentials to environment
- Create database migrations
- Implement MuxService
- Add Mux SDK to frontend

### Phase 2: New Uploads (Week 2)
- Implement Mux upload flow
- Update video recorder to use Mux
- Test with new videos only
- Keep S3 for existing videos

### Phase 3: Playback (Week 3)
- Implement UnifiedVideoPlayer
- Support both Mux and S3 playback
- Test all existing videos still work
- Monitor for errors

### Phase 4: Migration Tool (Week 4)
- Create admin tool to migrate S3 → Mux
- Migrate videos in batches
- Verify each migration
- Update database records

### Phase 5: Cleanup (Week 5)
- Remove deprecated S3 video code
- Update documentation
- Monitor costs and performance
- Optimize based on usage

## Security Considerations

1. **Signed URLs**: Use signed playback URLs for private courses
2. **Webhook Verification**: Verify Mux webhook signatures
3. **Access Control**: Check enrollment before generating playback URLs
4. **API Keys**: Store Mux credentials securely in environment variables
5. **CORS**: Configure Mux CORS for direct uploads

## Performance Optimizations

1. **CDN Delivery**: Mux automatically uses global CDN
2. **Adaptive Streaming**: Automatic bitrate adjustment
3. **Thumbnail Generation**: Use Mux thumbnail API
4. **Lazy Loading**: Load player only when needed
5. **Analytics Caching**: Cache Mux analytics data

## Cost Management

### Mux Pricing
- Storage: $5 per 1,000 minutes
- Delivery: $1 per 1,000 minutes delivered
- Encoding: Included

### S3 Pricing (Non-Video Files)
- Storage: $0.023 per GB
- Transfer: $0.09 per GB

### Estimated Monthly Cost (100 hours video, 1000 views)
- Mux: ~$47/month
- S3 (images, PDFs): ~$5/month
- **Total**: ~$52/month
