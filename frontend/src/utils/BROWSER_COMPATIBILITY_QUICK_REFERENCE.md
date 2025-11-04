# Browser Compatibility - Quick Reference Guide

## Quick Start

### Check if recording is supported
```typescript
import { checkBrowserSupport } from './utils/BrowserCompatibility';

const support = checkBrowserSupport();

if (!support.canRecordVideo) {
  alert('Video recording not supported. Please use Chrome, Firefox, or Edge.');
}
```

### Get suggested codec
```typescript
const codec = support.suggestedCodec;
// Use this codec for MediaRecorder
```

### Check if multi-source compositing is available
```typescript
if (!support.canUseCompositor) {
  console.log('Multi-source recording not available. Single-source only.');
}
```

## Browser Support Summary

| Browser | Supported | Compositor | Best Codec | Max Quality |
|---------|-----------|------------|------------|-------------|
| Chrome 90+ | ✅ Yes | ✅ Yes | VP9 | 1080p@30fps |
| Edge 90+ | ✅ Yes | ✅ Yes | VP9 | 1080p@30fps |
| Firefox 88+ | ⚠️ Limited | ⚠️ Reduced | VP8 | 720p@30fps* |
| Safari 14+ | ⚠️ Limited | ❌ No | H.264 | 720p@24fps |
| Opera 76+ | ✅ Yes | ✅ Yes | VP9 | 1080p@30fps |

*Firefox can do 1080p but 720p recommended

## Common Issues & Solutions

### Issue: "Multi-source recording not supported"
**Solution:** Use Chrome 90+, Firefox 88+, or Edge 90+

### Issue: "Poor performance / dropped frames"
**Solution:** 
- Reduce resolution to 720p
- Close other applications
- Use Chrome instead of Firefox

### Issue: "Screen sharing not working"
**Solution:**
- Check browser permissions
- Update browser to latest version
- Try Chrome or Firefox

## API Functions

### Essential Functions
```typescript
// Check comprehensive support
checkBrowserSupport(): BrowserSupport

// Get user-friendly message
getBrowserCompatibilityMessage(support: BrowserSupport): string

// Detect browser
detectBrowser(): BrowserInfo

// Get available codecs
getAvailableCodecs(): string[]

// Check specific feature
isFeatureSupported(feature: string): boolean
```

### Browser-Specific Functions
```typescript
// Get browser-specific behavior
getBrowserSpecificBehavior(browserInfo: BrowserInfo): BrowserSpecificBehavior

// Apply optimizations
applyBrowserOptimizations(options: any, browserInfo: BrowserInfo): any

// Log compatibility report
logBrowserCompatibility(): void
```

## Console Testing

Open browser console and run:
```javascript
testBrowserCompatibility()      // Full compatibility check
demoRecordingSetup()           // Recording setup example
demoBrowserOptimizations()     // Optimization example
showCompatibilityReport()      // Full report
```

## Codec Fallback Chain

1. **VP9** (Best quality) - Chrome, Edge, Firefox, Opera
2. **VP8** (Good compatibility) - All modern browsers
3. **H.264** (Fallback) - Safari, older browsers
4. **Basic WebM/MP4** (Last resort)

## Feature Detection

```typescript
const capabilities = getBrowserCapabilities();

// Check individual features
capabilities.canvas           // Canvas API
capabilities.mediaRecorder    // MediaRecorder API
capabilities.captureStream    // canvas.captureStream()
capabilities.getDisplayMedia  // Screen sharing
capabilities.vp9Codec         // VP9 codec
capabilities.vp8Codec         // VP8 codec
capabilities.h264Codec        // H.264 codec
```

## Recommended Settings by Browser

### Chrome/Edge
```typescript
{
  resolution: '1080p',
  frameRate: 30,
  codec: 'video/webm;codecs=vp9',
  quality: 'high'
}
```

### Firefox
```typescript
{
  resolution: '720p',
  frameRate: 30,
  codec: 'video/webm;codecs=vp8',
  quality: 'medium'
}
```

### Safari
```typescript
{
  resolution: '720p',
  frameRate: 24,
  codec: 'video/mp4;codecs=h264',
  quality: 'medium',
  multiSource: false  // Disable compositor
}
```

## Error Messages

### "Multi-source recording not supported"
- Browser doesn't support canvas.captureStream()
- Fallback to single-source recording
- Recommend Chrome/Firefox/Edge

### "VP9 codec not supported"
- Using VP8 instead
- Slightly lower quality
- Still good for most use cases

### "Video recording not supported"
- Browser doesn't support MediaRecorder API
- Update browser or use Chrome/Firefox/Edge
- No recording possible

## Integration with useVideoRecorder

The hook automatically uses browser compatibility:

```typescript
const {
  browserSupport,  // Browser support info
  error,          // Compatibility errors
  // ... other properties
} = useVideoRecorder();

// Check support
if (browserSupport && !browserSupport.canUseCompositor) {
  // Show single-source UI only
}
```

## Documentation Files

- **BROWSER_COMPATIBILITY.md** - User documentation
- **BROWSER_COMPATIBILITY_IMPLEMENTATION.md** - Technical docs
- **TASK_6_COMPLETION_SUMMARY.md** - Implementation summary
- **BROWSER_COMPATIBILITY_QUICK_REFERENCE.md** - This file

## Support Contact

For issues:
1. Check browser console for errors
2. Run `testBrowserCompatibility()` in console
3. Review documentation
4. Update browser to latest version
5. Contact support with browser details

## Version Requirements

- **Chrome:** 90+
- **Edge:** 90+
- **Firefox:** 88+
- **Safari:** 14+ (limited)
- **Opera:** 76+

## Last Updated

2025-11-04
