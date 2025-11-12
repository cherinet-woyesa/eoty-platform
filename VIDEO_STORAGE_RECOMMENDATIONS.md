# Video Upload & Storage - Production Recommendations

## 📊 Current Implementation Analysis

### Current Architecture
- **Hybrid System**: Both AWS S3 (legacy) and Mux (new) are implemented
- **Upload Method**: Multer with memory storage (2GB limit)
- **Processing**: Server-side HLS transcoding using FFmpeg
- **CDN**: CloudFront for S3 videos
- **Storage**: Direct S3 uploads or Mux direct uploads

### Current Issues for Production Scale

1. **Memory Storage Problem**
   - Multer stores entire file in memory (up to 2GB)
   - Can crash server with multiple concurrent uploads
   - No chunked upload support for large files

2. **Server Resource Intensive**
   - HLS transcoding runs on application server
   - Blocks server resources during processing
   - No queue system for processing

3. **Cost Concerns**
   - S3 storage + CloudFront bandwidth costs
   - Server compute costs for transcoding
   - No clear cost optimization strategy

4. **Scalability Limitations**
   - Single server processing bottleneck
   - No horizontal scaling for video processing
   - Limited concurrent upload capacity

5. **User Experience**
   - Long wait times for large uploads
   - No resumable uploads
   - Limited progress feedback

---

## 🎯 Recommended Production Architecture

### Option 1: **Mux-First Approach** (RECOMMENDED)

#### Why Mux?
- ✅ **Zero server processing** - Mux handles all transcoding
- ✅ **Automatic adaptive streaming** - HLS/DASH out of the box
- ✅ **Global CDN** - Built-in, no CloudFront needed
- ✅ **Cost-effective** - Pay per minute watched, not stored
- ✅ **Direct uploads** - Bypass your server entirely
- ✅ **Analytics included** - View counts, watch time, etc.
- ✅ **Automatic thumbnails** - Generated automatically
- ✅ **Multi-resolution** - Automatic quality adaptation

#### Implementation Strategy

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Browser)                      │
│                                                       │
│  1. Request direct upload URL from backend           │
│  2. Upload directly to Mux (bypasses your server)   │
│  3. Poll for asset status                           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│              Backend API                              │
│                                                       │
│  - Generate Mux direct upload URL                    │
│  - Store mux_asset_id, mux_playback_id in DB        │
│  - Handle webhooks for status updates               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│              Mux Platform                            │
│                                                       │
│  - Receives video directly from browser              │
│  - Automatic transcoding to multiple formats         │
│  - Global CDN delivery                               │
│  - Analytics & insights                              │
└─────────────────────────────────────────────────────┘
```

#### Cost Comparison (Example: 1000 hours/month)

**S3 + CloudFront + Server Transcoding:**
- Storage: $23/month (1000 GB)
- CloudFront: $85/month (1TB transfer)
- Server compute: $50-200/month (transcoding)
- **Total: ~$158-308/month**

**Mux:**
- Storage: $0 (included)
- CDN: $0 (included)
- Processing: $0 (included)
- **Total: ~$50-150/month** (based on watch time)
- **Savings: 50-70%**

---

### Option 2: **Hybrid Approach** (Transitional)

Keep both systems but:
- **New uploads** → Mux only
- **Existing videos** → Keep on S3, migrate gradually
- **Fallback** → S3 for edge cases

---

## 🚀 Implementation Recommendations

### 1. **Switch to Mux Direct Uploads**

**Current Problem:**
```javascript
// ❌ BAD: File goes through your server
Frontend → Backend (2GB in memory) → S3
```

**Recommended:**
```javascript
// ✅ GOOD: Direct upload to Mux
Frontend → Mux (bypasses your server)
Backend only generates upload URL
```

**Benefits:**
- No server memory usage
- Faster uploads (direct to Mux)
- No bandwidth costs on your server
- Scales infinitely

### 2. **Implement Chunked Uploads** (If staying with S3)

For large files, use multipart uploads:

```javascript
// Recommended: Use AWS SDK multipart upload
const upload = new Upload({
  client: s3Client,
  params: {
    Bucket: bucket,
    Key: key,
    Body: fileStream, // Stream, not buffer
  },
  partSize: 10 * 1024 * 1024, // 10MB chunks
  leavePartsOnError: false,
});

upload.on('httpUploadProgress', (progress) => {
  // Real-time progress updates
});
```

### 3. **Remove Server-Side Transcoding**

**Current:**
- Server runs FFmpeg → High CPU/Memory usage
- Blocks server resources
- Slow processing

**Recommended:**
- Let Mux handle all transcoding
- Or use AWS MediaConvert (serverless)
- Or use dedicated transcoding service

### 4. **Implement Upload Queue System**

For S3 uploads, use a queue:

```javascript
// Use Bull or similar for job queue
const uploadQueue = new Queue('video-upload', {
  redis: redisConfig,
  limiter: {
    max: 5, // Max 5 concurrent uploads
    duration: 1000,
  },
});
```

### 5. **Add Resumable Uploads**

Use tus protocol or similar:

```javascript
// Frontend: tus-js-client
import * as tus from 'tus-js-client';

const upload = new tus.Upload(file, {
  endpoint: '/api/videos/upload',
  retryDelays: [0, 3000, 5000, 10000, 20000],
  metadata: {
    filename: file.name,
    filetype: file.type,
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
    console.log('Progress:', percentage + '%');
  },
  onSuccess: () => {
    console.log('Upload finished!');
  },
});

upload.start();
```

### 6. **Implement Rate Limiting**

```javascript
// Per-user rate limiting
const videoUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 videos per hour per user
  message: 'Too many video uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 7. **Add Video Validation**

```javascript
// Validate before processing
- File size limits (per user tier)
- Video duration limits
- Format validation
- Content scanning (optional: for inappropriate content)
```

### 8. **Implement Webhooks**

For Mux status updates:

```javascript
// Mux webhook handler
app.post('/webhooks/mux', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'video.asset.ready') {
    // Update lesson with playback URL
    await updateLessonWithMuxAsset(data.id);
  }
  
  res.status(200).send('OK');
});
```

---

## 📋 Migration Plan

### Phase 1: Immediate (Week 1-2)
1. ✅ Enable Mux for all new uploads
2. ✅ Update frontend to use Mux direct upload
3. ✅ Implement webhook handlers
4. ✅ Add Mux player to frontend

### Phase 2: Short-term (Month 1)
1. ✅ Add upload progress tracking
2. ✅ Implement retry logic
3. ✅ Add error handling and user feedback
4. ✅ Monitor costs and usage

### Phase 3: Medium-term (Month 2-3)
1. ✅ Migrate existing S3 videos to Mux (optional)
2. ✅ Deprecate S3 video uploads
3. ✅ Optimize costs
4. ✅ Add analytics dashboard

---

## 🔒 Security Recommendations

### 1. **Signed URLs for Private Videos**

```javascript
// Mux signed playback tokens
const token = await muxService.generatePlaybackToken(playbackId, {
  expiresIn: 3600, // 1 hour
  params: {
    userId: req.user.id,
    lessonId: lesson.id,
  },
});
```

### 2. **Upload Authentication**

```javascript
// Verify user has permission before generating upload URL
if (!hasPermission(req.user, 'video:upload')) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

### 3. **Content Validation**

```javascript
// Optional: Content moderation
- Scan for inappropriate content
- Validate video duration
- Check file integrity
```

---

## 💰 Cost Optimization

### Mux Cost Optimization
1. **Use public playback** when possible (cheaper)
2. **Set playback policies** appropriately
3. **Monitor usage** with Mux analytics
4. **Archive old videos** (Mux has lifecycle policies)

### S3 Cost Optimization (if keeping)
1. **Use S3 Intelligent-Tiering** for old videos
2. **Set lifecycle policies** (move to Glacier after 90 days)
3. **Compress videos** before upload
4. **Use CloudFront caching** effectively

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
1. **Upload Success Rate** - Should be >95%
2. **Processing Time** - Should be <5 minutes for 1-hour video
3. **Storage Costs** - Track monthly
4. **Bandwidth Usage** - Monitor CDN costs
5. **Error Rates** - Track and alert on failures

### Recommended Tools
- **Mux Analytics Dashboard** (built-in)
- **AWS CloudWatch** (for S3/CloudFront)
- **Custom dashboard** for your metrics

---

## 🎬 Frontend Implementation

### Recommended: Use Mux Player

```javascript
import MuxPlayer from '@mux/mux-player-react';

<MuxPlayer
  playbackId={lesson.mux_playback_id}
  streamType="on-demand"
  metadata={{
    video_title: lesson.title,
    viewer_user_id: user.id,
  }}
  onPlay={() => trackPlayback('play')}
  onPause={() => trackPlayback('pause')}
/>
```

### Upload Component

```javascript
// Use Mux direct upload
const { uploadUrl, uploadId } = await api.getMuxUploadUrl();

const upload = new tus.Upload(file, {
  endpoint: uploadUrl,
  metadata: {
    lessonId: lesson.id,
  },
  onSuccess: () => {
    // Poll for asset status
    pollForAssetStatus(uploadId);
  },
});
```

---

## ✅ Action Items

### High Priority
1. [ ] Switch all new uploads to Mux direct upload
2. [ ] Remove server-side transcoding
3. [ ] Implement webhook handlers for Mux
4. [ ] Add upload progress tracking
5. [ ] Implement rate limiting

### Medium Priority
1. [ ] Add resumable uploads (tus protocol)
2. [ ] Implement chunked uploads (if keeping S3)
3. [ ] Add video validation
4. [ ] Set up monitoring dashboard
5. [ ] Optimize costs

### Low Priority
1. [ ] Migrate existing S3 videos to Mux
2. [ ] Add content moderation
3. [ ] Implement advanced analytics
4. [ ] Add video editing features

---

## 📚 Resources

- [Mux Documentation](https://docs.mux.com/)
- [Mux Direct Upload Guide](https://docs.mux.com/guides/video/upload-files-directly)
- [AWS S3 Multipart Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [TUS Protocol](https://tus.io/)
- [Video Streaming Best Practices](https://www.bitmovin.com/video-streaming-best-practices/)

---

## 🎯 Final Recommendation

**For production at scale, I strongly recommend:**

1. **Use Mux for all new video uploads** - It's purpose-built for video and handles everything
2. **Keep S3 for non-video assets** - Images, PDFs, etc.
3. **Remove server-side transcoding** - Let Mux handle it
4. **Implement direct uploads** - Bypass your server for uploads
5. **Add proper monitoring** - Track costs and performance

This will:
- ✅ Reduce server costs by 50-70%
- ✅ Improve user experience (faster uploads)
- ✅ Scale automatically
- ✅ Provide better video quality
- ✅ Include analytics out of the box


