# Browser Compatibility Documentation

## Overview

This document describes browser-specific behaviors, known issues, and recommendations for the multi-source video recording feature.

## Supported Browsers

### Chrome (Recommended)
- **Minimum Version:** 90+
- **Status:** ✅ Fully Supported
- **Codec Support:** VP9, VP8, H.264
- **Features:**
  - ✅ Multi-source compositing
  - ✅ Canvas captureStream
  - ✅ Screen sharing
  - ✅ High-quality recording (up to 1080p @ 30fps)

**Recommendations:**
- Chrome provides the best performance and feature support
- VP9 codec recommended for best quality
- All features work as expected

**Known Issues:**
- None for versions 90+

---

### Edge (Chromium-based) (Recommended)
- **Minimum Version:** 90+
- **Status:** ✅ Fully Supported
- **Codec Support:** VP9, VP8, H.264
- **Features:**
  - ✅ Multi-source compositing
  - ✅ Canvas captureStream
  - ✅ Screen sharing
  - ✅ High-quality recording (up to 1080p @ 30fps)

**Recommendations:**
- Edge provides excellent support similar to Chrome
- VP9 codec recommended for best quality
- All features work as expected

**Known Issues:**
- None for versions 90+

---

### Firefox
- **Minimum Version:** 88+
- **Status:** ✅ Supported with Limitations
- **Codec Support:** VP8 (preferred), VP9, H.264
- **Features:**
  - ✅ Multi-source compositing (with reduced performance)
  - ✅ Canvas captureStream
  - ✅ Screen sharing
  - ⚠️ Recording quality (up to 1080p @ 30fps, but may struggle)

**Recommendations:**
- Firefox works well but may have slightly lower performance than Chrome/Edge
- VP8 codec recommended for better stability in Firefox
- Consider using 720p resolution for better performance
- Chrome or Edge recommended for best experience

**Known Issues:**
- Canvas compositing performance may be lower than Chrome/Edge
- Audio mixing from multiple sources may have synchronization issues
- Some users report dropped frames during long recordings

**Workarounds:**
- Use lower resolution (720p) for better stability
- Avoid very long recording sessions (>30 minutes)
- Close other applications to free up resources

---

### Safari
- **Minimum Version:** 14+
- **Status:** ⚠️ Limited Support
- **Codec Support:** H.264 only
- **Features:**
  - ❌ Multi-source compositing (not supported)
  - ❌ Canvas captureStream (unreliable)
  - ⚠️ Screen sharing (limited)
  - ⚠️ Single-source recording only (camera or screen, not both)

**Recommendations:**
- **Use Chrome, Firefox, or Edge instead of Safari for full functionality**
- If you must use Safari, only single-source recording is supported
- Maximum resolution: 720p @ 24fps
- H.264 codec only

**Known Issues:**
- MediaRecorder API has very limited support
- Canvas captureStream does not work reliably
- Multi-source recording is not possible
- Screen sharing support is limited and may not work on all macOS versions
- Audio mixing is not supported

**Workarounds:**
- Use Chrome or Firefox on macOS for full feature support
- If Safari is required, record camera and screen separately and combine later

---

### Opera
- **Minimum Version:** 76+
- **Status:** ✅ Supported
- **Codec Support:** VP9, VP8, H.264
- **Features:**
  - ✅ Multi-source compositing
  - ✅ Canvas captureStream
  - ✅ Screen sharing
  - ✅ High-quality recording (up to 1080p @ 30fps)

**Recommendations:**
- Opera is Chromium-based and provides good support similar to Chrome
- VP9 codec recommended
- All features should work as expected

**Known Issues:**
- None for versions 76+

---

## Feature Compatibility Matrix

| Feature | Chrome 90+ | Edge 90+ | Firefox 88+ | Safari 14+ | Opera 76+ |
|---------|------------|----------|-------------|------------|-----------|
| Single-source recording | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Multi-source compositing | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Canvas captureStream | ✅ | ✅ | ✅ | ❌ | ✅ |
| Screen sharing | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| VP9 codec | ✅ | ✅ | ✅ | ❌ | ✅ |
| VP8 codec | ✅ | ✅ | ✅ | ❌ | ✅ |
| H.264 codec | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1080p recording | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| 30fps recording | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Audio mixing | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Layout switching | ✅ | ✅ | ✅ | ❌ | ✅ |
| Performance monitoring | ✅ | ✅ | ✅ | ❌ | ✅ |

**Legend:**
- ✅ Fully supported
- ⚠️ Supported with limitations
- ❌ Not supported

---

## Codec Recommendations by Browser

### Chrome/Edge
1. **VP9** (Recommended) - Best quality and compression
2. VP8 - Good fallback
3. H.264 - Last resort

### Firefox
1. **VP8** (Recommended) - Most stable in Firefox
2. VP9 - May work but less stable
3. H.264 - Fallback

### Safari
1. **H.264** (Only option) - Limited quality

---

## Resolution and Frame Rate Recommendations

### Chrome/Edge
- **Recommended:** 1080p @ 30fps
- **Maximum:** 1080p @ 30fps
- **Minimum:** 480p @ 24fps

### Firefox
- **Recommended:** 720p @ 30fps
- **Maximum:** 1080p @ 30fps (may struggle)
- **Minimum:** 480p @ 24fps

### Safari
- **Recommended:** 720p @ 24fps
- **Maximum:** 720p @ 24fps
- **Minimum:** 480p @ 24fps

---

## Automatic Fallback Behavior

The system automatically detects browser capabilities and applies appropriate fallbacks:

1. **Multi-source compositing not supported:**
   - Falls back to single-source recording
   - User can still record from camera OR screen (not both)
   - Warning message displayed

2. **VP9 codec not supported:**
   - Falls back to VP8 codec
   - Warning message displayed about reduced quality

3. **VP8 codec not supported:**
   - Falls back to H.264 codec
   - Warning message displayed

4. **No supported codecs:**
   - Recording disabled
   - Error message displayed
   - User advised to update browser

5. **Screen sharing not supported:**
   - Screen sharing button disabled
   - Camera-only recording available
   - Warning message displayed

---

## Testing Recommendations

### For Developers

When testing the video recording feature:

1. **Test on Chrome 90+** (primary target)
2. **Test on Firefox 88+** (secondary target)
3. **Test on Edge 90+** (tertiary target)
4. **Document Safari limitations** (limited support)

### Test Scenarios

1. Single-source recording (camera only)
2. Single-source recording (screen only)
3. Multi-source recording (camera + screen)
4. Layout switching during recording
5. Dynamic source addition/removal
6. Long recording sessions (10+ minutes)
7. Performance under load
8. Error recovery scenarios

---

## Troubleshooting

### Issue: "Multi-source recording not supported"
**Solution:** Use Chrome 90+, Firefox 88+, or Edge 90+

### Issue: "Video recording not working"
**Solution:** 
1. Check browser version
2. Update to latest version
3. Try Chrome or Firefox
4. Check browser console for errors

### Issue: "Poor performance / dropped frames"
**Solution:**
1. Reduce resolution to 720p
2. Close other applications
3. Use Chrome instead of Firefox
4. Check system resources

### Issue: "Audio not recording"
**Solution:**
1. Check microphone permissions
2. Check audio device selection
3. Try single-source recording
4. Check browser console for errors

### Issue: "Screen sharing not working"
**Solution:**
1. Check browser permissions
2. Update browser to latest version
3. Try Chrome or Firefox
4. Check system screen recording permissions (macOS)

---

## Browser Update Instructions

### Chrome
1. Click menu (⋮) → Help → About Google Chrome
2. Chrome will automatically check for updates
3. Restart Chrome after update

### Firefox
1. Click menu (☰) → Help → About Firefox
2. Firefox will automatically check for updates
3. Restart Firefox after update

### Edge
1. Click menu (⋯) → Help and feedback → About Microsoft Edge
2. Edge will automatically check for updates
3. Restart Edge after update

### Safari
1. Open App Store
2. Click Updates
3. Update Safari if available
4. Restart Safari after update

---

## API Support Detection

The system automatically detects the following APIs:

- **Canvas API:** Required for compositing
- **MediaRecorder API:** Required for recording
- **canvas.captureStream():** Required for multi-source
- **navigator.mediaDevices.getDisplayMedia():** Required for screen sharing
- **MediaRecorder.isTypeSupported():** Used for codec detection

If any required API is missing, appropriate fallbacks or error messages are displayed.

---

## Performance Considerations

### Chrome/Edge
- Excellent performance
- Can handle 1080p @ 30fps with multiple sources
- Minimal CPU usage

### Firefox
- Good performance
- May struggle with 1080p @ 30fps
- Higher CPU usage than Chrome
- Recommend 720p for better stability

### Safari
- Poor performance
- Limited to single source
- High CPU usage
- Not recommended for recording

---

## Future Improvements

Planned improvements for browser compatibility:

1. WebCodecs API support (when widely available)
2. Hardware acceleration detection
3. Adaptive quality based on device capabilities
4. Better Safari support (when APIs improve)
5. Mobile browser support

---

## Contact

For browser compatibility issues or questions, please:
1. Check browser console for detailed error messages
2. Review this documentation
3. Update browser to latest version
4. Contact support with browser details and error logs
