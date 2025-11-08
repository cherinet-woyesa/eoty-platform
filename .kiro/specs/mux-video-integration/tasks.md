# Mux Video Integration - Implementation Plan

## Phase 1: Setup and Configuration

- [x] 1. Environment and Dependencies Setup











  - Install Mux SDK packages (`@mux/mux-node`, `@mux/mux-player-react`, `@mux/mux-uploader-react`)
  - Add Mux API credentials to `.env` (MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_WEBHOOK_SECRET)
  - Configure CORS settings for Mux direct uploads
  - _Requirements: 1.1, 1.2_

- [x] 2. Database Schema Updates



  - Create migration to add Mux columns to lessons table
  - Add indexes for mux_asset_id and video_provider
  - Create video_analytics table for Mux analytics
  - Test migration on development database
  - _Requirements: 1.2, 5.1_






## Phase 2: Backend Implementation

- [ ] 3. Mux Service Implementation
  - [x] 3.1 Create MuxService class with Mux client initialization


    - Implement createDirectUpload method
    - Implement getAsset method for status checking
    - Implement createSignedPlaybackUrl for private videos
    - _Requirements: 1.1, 8.1_



  - [x] 3.2 Implement video analytics methods





    - Create getVideoAnalytics method
    - Implement analytics sync job
    - Add analytics caching layer
    - _Requirements: 5.1, 5.2, 5.3_



  - [x] 3.3 Implement asset management methods



    - Create deleteAsset method
    - Implement bulk migration helper
    - Add error handling and retries
    - _Requirements: 6.2, 7.3_

- [x] 4. API Endpoints for Mux


  - [x] 4.1 Create upload URL endpoint


    - POST /api/videos/mux/upload-url
    - Validate lesson ownership
    - Generate Mux direct upload URL
    - _Requirements: 1.1, 8.2_

  - [x] 4.2 Create Mux webhook endpoint

    - POST /api/videos/mux/webhook
    - Verify webhook signature
    - Handle asset.ready, asset.errored events
    - Update lesson status in database
    - _Requirements: 1.3, 7.3_

  - [x] 4.3 Create playback info endpoint

    - GET /api/videos/:lessonId/playback
    - Check user enrollment
    - Return appropriate playback URL (Mux or S3)
    - Generate signed URLs for private content
    - _Requirements: 2.1, 2.2, 8.2, 8.3_

- [x] 5. Update Cloud Storage Service



  - Remove video transcoding logic (now handled by Mux)
  - Keep S3 methods for non-video files
  - Update file upload to route videos to Mux
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Phase 3: Frontend Implementation

- [x] 6. Mux Upload Component




  - [x] 6.1 Create MuxVideoUploader component


    - Integrate @mux/mux-uploader-react
    - Fetch upload URL from backend
    - Show upload progress
    - Handle upload completion
    - _Requirements: 1.1, 1.3_

  - [x] 6.2 Update EnhancedVideoRecorder


    - Add option to upload to Mux after recording
    - Replace S3 upload with Mux upload
    - Maintain recording functionality
    - _Requirements: 1.1, 1.4_

- [x] 7. Unified Video Player




  - [x] 7.1 Create UnifiedVideoPlayer component


    - Detect video provider (Mux or S3)
    - Render MuxPlayer for Mux videos
    - Render legacy player for S3 videos
    - _Requirements: 2.1, 2.2, 4.2_

  - [x] 7.2 Integrate Mux Player features


    - Add progress tracking callbacks
    - Implement playback speed controls
    - Add quality selector
    - Track viewing analytics
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 7.3 Update CourseDetails page


    - Replace EnhancedVideoPlayer with UnifiedVideoPlayer
    - Maintain all existing features (comments, resources)
    - Test with both Mux and S3 videos
    - _Requirements: 2.1, 4.5_

- [x] 8. Video Processing Status




  - Update VideoProcessingStatus component for Mux
  - Show Mux processing status
  - Handle Mux webhook updates via WebSocket
  - _Requirements: 1.3, 7.1_

## Phase 4: Migration and Compatibility

- [x] 9. Dual Storage Support

  - [x] 9.1 Implement provider detection logic




    - Check for mux_playback_id first
    - Fallback to video_url for S3
    - Add provider field to API responses
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 9.2 Update video API service


    - Add getPlaybackInfo method
    - Support both upload methods
    - Handle provider-specific errors
    - _Requirements: 4.1, 4.4_


- [x] 10. Migration Tool (Admin)






  - [x] 10.1 Create admin migration interface


    - List all S3 videos
    - Select videos to migrate
    - Show migration progress
    - _Requirements: 6.5, 6.6_



  - [x] 10.2 Implement migration backend


    - Download from S3
    - Upload to Mux
    - Update database records
    - Verify successful migration
    - _Requirements: 4.4, 6.5_

## Phase 5: Analytics and Monitoring



- [x] 11. Analytics Integration





  - [x] 11.1 Create analytics sync service


    - Fetch Mux view data
    - Store in video_analytics table
    - Combine with platform analytics
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 11.2 Update teacher dashboard



    - Display Mux analytics
    - Show engagement metrics
    - Add video performance charts
    - _Requirements: 5.4, 5.5_



- [x] 12. Cost Monitoring

  - Create cost reporting endpoint
  - Track Mux usage metrics
  - Display cost estimates in admin panel
  - _Requirements: 6.3, 6.4_

## Phase 6: Testing and Deployment

- [ ] 13. Testing
  - [ ]* 13.1 Write unit tests for MuxService
    - Test upload URL generation
    - Test asset status checking
    - Test signed URL creation
    - _Requirements: All_

  - [ ]* 13.2 Write integration tests
    - Test end-to-end upload flow
    - Test playback with both providers
    - Test webhook processing
    - _Requirements: All_

  - [ ]* 13.3 Manual testing
    - Test video recording and upload
    - Test playback on different devices
    - Test migration tool
    - Verify analytics accuracy
    - _Requirements: All_

- [ ] 14. Documentation
  - Update API documentation
  - Create Mux integration guide
  - Document migration process
  - Add troubleshooting guide
  - _Requirements: All_

- [ ] 15. Deployment
  - Deploy database migrations
  - Deploy backend changes
  - Deploy frontend changes
  - Configure Mux webhooks
  - Monitor for errors
  - _Requirements: All_

## Phase 7: Optimization and Cleanup

- [ ] 16. Performance Optimization
  - Implement analytics caching
  - Optimize playback URL generation
  - Add CDN caching headers
  - _Requirements: 5.5, 6.3_

- [ ] 17. Code Cleanup
  - Remove deprecated S3 video code
  - Update type definitions
  - Clean up unused dependencies
  - _Requirements: 6.2_

- [ ] 18. Monitoring and Alerts
  - Set up Mux webhook monitoring
  - Add error alerting
  - Track upload success rates
  - Monitor playback errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
