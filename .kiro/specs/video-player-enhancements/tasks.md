# Implementation Plan

- [x] 1. Database schema and migrations
















  - [x] 1.1 Create subtitles table migration

    - Write migration file to create subtitles table with columns: id, lesson_id, language, language_code, file_url, file_size, created_by, created_at, updated_at
    - Add unique constraint on (lesson_id, language_code)
    - Add foreign key constraints and indexes
    - _Requirements: 7.2_
  

  - [x] 1.2 Create lesson_resources table migration








    - Write migration file to create lesson_resources table with columns: id, lesson_id, filename, original_filename, file_type, file_size, file_url, description, download_count, created_by, created_at, updated_at
    - Add foreign key constraints and indexes
    - _Requirements: 6.2_
  
  - [x] 1.3 Add allow_download column to lessons table









    - Write migration to add allow_download boolean column with default false
    - _Requirements: 8.1_
- [x] 2. Backend API - Subtitle Management





- [ ] 2. Backend API - Subtitle Management

  - [x] 2.1 Create subtitle service


    - Implement subtitleService.js with functions: uploadSubtitle, getSubtitles, deleteSubtitle
    - Add file validation for VTT/SRT formats
    - Integrate with cloud storage (S3/similar)
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 2.2 Create subtitle routes and controller









    - Implement GET /api/courses/lessons/:id/subtitles endpoint
    - Implement POST /api/courses/lessons/:id/subtitles endpoint (instructor only)
    - Implement DELETE /api/courses/lessons/:id/subtitles/:subtitleId endpoint (instructor only)
    - Add authentication and authorization middleware
    - _Requirements: 7.3, 7.4_
  
  - [x] 2.3 Add subtitle validation middleware




    - Create middleware to validate subtitle file format and size
    - Validate language code format (ISO 639-1)
    - _Requirements: 7.1_

- [x] 3. Backend API - Resource Management





  - [x] 3.1 Create resource service



    - Implement resourceService.js with functions: uploadResource, getResources, deleteResource, generateDownloadUrl
    - Add file validation and size limits (max 100MB)
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 3.2 Create resource routes and controller




    - Implement GET /api/courses/lessons/:id/resources endpoint
    - Implement POST /api/courses/lessons/:id/resources endpoint (instructor only)
    - Implement GET /api/courses/lessons/:id/resources/:resourceId/download endpoint
    - Implement DELETE /api/courses/lessons/:id/resources/:resourceId endpoint (instructor only)
    - Add authentication and authorization middleware
    - _Requirements: 6.3, 6.4_
  
  - [x] 3.3 Add resource validation middleware


    - Create middleware to validate resource file type and size
    - Implement file type whitelist
    - _Requirements: 6.1_

- [x] 4. Backend API - Video Download


  - [x] 4.1 Create video download service





    - Implement videoDownloadService.js with function: generateDownloadUrl
    - Implement signed URL generation with 1-hour expiration
    - Add download logging for analytics
    - _Requirements: 8.3, 8.5_
  
  - [x] 4.2 Create video download endpoint


    - Implement GET /api/courses/lessons/:id/download-url endpoint
    - Check lesson allow_download permission
    - Verify user enrollment
    - Return signed download URL
    - _Requirements: 8.2, 8.4_
  
  - [x] 4.3 Update lesson management endpoints


    - Add allow_download field to lesson creation/update endpoints
    - Allow instructors to toggle download permission
    - _Requirements: 8.1_

- [x] 5. Frontend - Subtitle Feature







  - [x] 5.1 Create SubtitleSelector component


    - Build dropdown menu component for subtitle selection
    - Display available subtitle languages
    - Add "Off" option to disable subtitles
    - Highlight current selection
    - _Requirements: 1.2, 1.3_
  
  - [x] 5.2 Integrate subtitle loading in EnhancedVideoPlayer


    - Fetch available subtitles on component mount
    - Load selected subtitle file as VTT
    - Add text track to video element
    - Handle subtitle track switching
    - _Requirements: 1.1, 1.4_
  
  - [x] 5.3 Create SubtitleDisplay component


    - Render current subtitle cue as overlay
    - Style with black background and white text
    - Position at bottom center of video
    - Sync with video currentTime
    - _Requirements: 1.5_
  

  - [x] 5.4 Add subtitle API functions to services

    - Create getSubtitles API function
    - Create uploadSubtitle API function (for instructor interface)
    - Create deleteSubtitle API function
    - _Requirements: 1.1_
-

- [x] 6. Frontend - Quality Selection Feature






  - [x] 6.1 Create QualitySelector component

    - Build dropdown menu component for quality selection
    - Display available resolutions (e.g., "1080p", "720p", "Auto")
    - Highlight current quality level
    - _Requirements: 2.2, 2.3_
  

  - [x] 6.2 Integrate HLS quality detection

    - Access HLS.js levels array on manifest load
    - Map levels to quality options with labels
    - Detect when quality levels are available
    - _Requirements: 2.1_
  

  - [x] 6.3 Implement quality switching logic

    - Set HLS.js currentLevel on user selection
    - Handle "Auto" mode (currentLevel = -1)
    - Listen for LEVEL_SWITCHED events
    - Update UI to show current quality
    - _Requirements: 2.4, 2.5_
  
  - [x] 6.4 Add quality change analytics


    - Track quality changes for analytics
    - Log manual vs automatic quality switches
    - _Requirements: 2.5_

- [x] 7. Frontend - Resource Management Feature



  - [x] 7.1 Create ResourceList component


    - Build list component to display lesson resources
    - Show file name, type icon, and size
    - Add download button for each resource
    - Implement empty state when no resources
    - _Requirements: 3.2, 3.3_
  

  - [x] 7.2 Integrate resource loading in EnhancedVideoPlayer

    - Fetch lesson resources on component mount
    - Update Resources tab with resource count
    - Handle loading and error states
    - _Requirements: 3.1_
  

  - [-] 7.3 Implement resource download functionality

    - Request signed download URL from backend
    - Initiate browser download using URL
    - Handle download errors with retry option
    - _Requirements: 3.4_
  

  - [x] 7.4 Add resource API functions to services


    - Create getResources API function
    - Create downloadResource API function
    - Create uploadResource API function (for instructor interface)
    - _Requirements: 3.1, 3.4_

- [-] 8. Frontend - Video Download Feature

  - [ ] 8.1 Create DownloadButton component


    - Add download button to video controls
    - Show loading state during URL generation
    - Hide button if download not permitted
    - _Requirements: 4.1, 4.4_
  
  - [ ] 8.2 Implement video download logic
    - Request download URL from backend
    - Initiate browser download
    - Handle errors with user-friendly messages
    - _Requirements: 4.2, 4.3_
  

  - [x] 8.3 Add download API function to services

    - Create getVideoDownloadUrl API function
    - Handle permission errors
    - _Requirements: 4.2_

- [ ] 9. Frontend - Enhanced Video Statistics
  - [ ] 9.1 Create VideoStatsPanel component
    - Build overlay panel for statistics display
    - Show buffered time, bitrate, dropped frames
    - Add color-coded indicators (green/yellow/red)
    - Make panel collapsible/expandable
    - _Requirements: 5.2_
  
  - [ ] 9.2 Implement statistics collection
    - Collect buffer data from video element
    - Collect bitrate from HLS.js current level
    - Collect dropped frames from video quality API
    - Calculate buffer health status
    - Update statistics every second
    - _Requirements: 5.1, 5.3_
  
  - [ ] 9.3 Integrate statistics with EnhancedVideoPlayer
    - Add statistics toggle button to controls
    - Track quality changes in statistics
    - Log playback errors in statistics
    - Persist panel visibility in localStorage
    - _Requirements: 5.4, 5.5_

- [ ] 10. Error Handling and Edge Cases
  - [ ] 10.1 Add frontend error handling
    - Handle subtitle loading failures with toast notifications
    - Handle quality switch failures with fallback
    - Handle resource download failures with retry
    - Handle video download permission errors
    - _Requirements: All_
  
  - [ ] 10.2 Add backend error handling
    - Validate file uploads (size, type)
    - Handle storage errors with retries
    - Return appropriate HTTP status codes
    - Log errors for monitoring
    - _Requirements: All_

- [ ] 11. Integration and Polish
  - [ ] 11.1 Update EnhancedVideoPlayer component
    - Integrate all new features into main component
    - Ensure consistent styling with existing UI
    - Add keyboard shortcuts for new features
    - Optimize performance and loading times
    - _Requirements: All_
  
  - [ ] 11.2 Update video player controls layout
    - Reorganize control buttons for new features
    - Ensure responsive design on mobile
    - Add tooltips for all new buttons
    - Test accessibility (keyboard navigation, screen readers)
    - _Requirements: All_
  
  - [ ] 11.3 Add feature documentation
    - Document new API endpoints
    - Create user guide for new features
    - Add inline code comments
    - _Requirements: All_
