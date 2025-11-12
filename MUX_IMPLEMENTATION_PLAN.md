# Mux Implementation & Cleanup Plan

## 🎯 Goal
Implement Mux as the **ONLY** video solution and remove all unnecessary S3 video upload/transcoding code.

---

## 📋 Audit Results

### ✅ **KEEP & ENHANCE**

#### Backend:
1. **`backend/services/muxService.js`** ✅
   - Status: Already implemented
   - Action: Verify all methods work correctly

2. **`backend/controllers/videoController.js`** ✅
   - Keep: `createMuxUploadUrl`, `handleMuxWebhook`, `getPlaybackInfo`
   - Remove: `uploadVideo` (S3 upload method)

3. **`backend/utils/videoProviderDetection.js`** ✅
   - Status: Works with both Mux and S3
   - Action: Update to prefer Mux, S3 as fallback only

4. **`backend/services/videoAnalyticsService.js`** ✅
   - Status: Works with Mux
   - Action: Verify Mux analytics integration

5. **`backend/routes/videos.js`** ✅
   - Keep: `/mux/upload-url`, `/mux/webhook`, `/:lessonId/playback`
   - Remove: `/upload` (S3 upload route)

#### Frontend:
1. **`frontend/src/components/shared/courses/MuxVideoUploader.tsx`** ✅
   - Status: Already implemented
   - Action: Enhance with better error handling

2. **`frontend/src/services/api/videos.ts`** ✅
   - Keep: `createMuxUploadUrl`, `getMuxAssetStatus`
   - Remove: `uploadVideo`, `uploadVideoFile` (S3 methods)

3. **`frontend/src/components/shared/courses/EnhancedVideoRecorder.tsx`** ✅
   - Action: Make Mux default, remove S3 option

---

### ❌ **REMOVE/DEPRECATE**

#### Backend:
1. **`backend/services/videoProcessingService.js`** ❌
   - Status: S3 uploads + server-side transcoding
   - Action: **DELETE** or move to deprecated folder

2. **`backend/services/videoTranscodingService.js`** ❌
   - Status: HLS transcoding service
   - Action: **DELETE**

3. **`backend/services/ffmpegService.js`** ❌
   - Status: FFmpeg wrapper
   - Action: **CHECK** if used elsewhere, then delete

4. **`backend/scripts/transcodeToHLS.js`** ❌
   - Status: HLS transcoding script
   - Action: **DELETE**

5. **`backend/services/videoService.js`** ❌
   - Status: Basic S3 video service
   - Action: **DELETE** (replaced by muxService)

6. **`backend/services/videoDownloadService.js`** ⚠️
   - Status: Video download service
   - Action: **CHECK** if needed, update for Mux

7. **S3 video upload methods in `cloudStorageService.js`** ⚠️
   - Action: **KEEP** service but remove video-specific methods
   - Keep: subtitle uploads, resource uploads (non-video)

#### Routes:
1. **`POST /api/videos/upload`** ❌
   - Action: **REMOVE** or redirect to Mux upload

---

### 🔄 **UPDATE**

#### Backend:
1. **`backend/controllers/videoController.js`**
   - Remove `uploadVideo` method
   - Enhance `createMuxUploadUrl` with better validation
   - Ensure webhooks handle all cases

2. **`backend/routes/videos.js`**
   - Remove S3 upload route
   - Add deprecation notice if needed

3. **`backend/services/cloudStorageService.js`**
   - Remove `uploadVideo` method
   - Keep other methods (subtitles, resources)

#### Frontend:
1. **`frontend/src/components/shared/courses/EnhancedVideoRecorder.tsx`**
   - Set `useMuxUpload = true` by default
   - Remove S3 upload toggle
   - Always use Mux for new uploads

2. **`frontend/src/services/api/videos.ts`**
   - Remove `uploadVideo`, `uploadVideoFile` methods
   - Keep Mux methods only

3. **`frontend/src/components/shared/courses/VideoRecorder.tsx`** (if used)
   - Update to use Mux

---

## 🚀 Implementation Steps

### Phase 1: Backend Cleanup
1. ✅ Remove S3 video upload endpoint
2. ✅ Remove videoProcessingService
3. ✅ Remove videoTranscodingService
4. ✅ Remove ffmpegService (if not used elsewhere)
5. ✅ Update cloudStorageService (remove video methods)
6. ✅ Verify Mux webhooks work correctly

### Phase 2: Frontend Updates
1. ✅ Make Mux default in EnhancedVideoRecorder
2. ✅ Remove S3 upload options from UI
3. ✅ Update all upload flows to use Mux
4. ✅ Remove S3 upload API methods

### Phase 3: Testing & Verification
1. ✅ Test Mux direct upload
2. ✅ Test webhook handling
3. ✅ Test video playback
4. ✅ Test error handling
5. ✅ Verify analytics work

### Phase 4: Documentation
1. ✅ Update API documentation
2. ✅ Update deployment guide
3. ✅ Add migration notes for existing S3 videos

---

## ⚠️ Important Notes

1. **Existing S3 Videos:**
   - Keep S3 playback support for existing videos
   - Don't break existing lessons
   - Migration can happen later

2. **CloudStorageService:**
   - Keep for non-video files (images, PDFs, subtitles)
   - Only remove video-specific methods

3. **Database:**
   - Keep `video_provider` column
   - Keep S3-related columns for backward compatibility
   - New videos will use `video_provider = 'mux'`

---

## ✅ Success Criteria

- [ ] All new uploads use Mux only
- [ ] No S3 video upload code remains
- [ ] No server-side transcoding
- [ ] Webhooks properly handle all events
- [ ] Video playback works for both Mux and legacy S3
- [ ] Error handling is robust
- [ ] Analytics work correctly
- [ ] Documentation is updated


