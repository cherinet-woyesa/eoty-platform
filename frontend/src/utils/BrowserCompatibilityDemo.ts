// Browser Compatibility Demo
// This file demonstrates how to use the browser compatibility features

import {
  checkBrowserSupport,
  getBrowserCompatibilityMessage,
  getBrowserSpecificBehavior,
  logBrowserCompatibility,
  detectBrowser,
  getAvailableCodecs,
  isFeatureSupported
} from './BrowserCompatibility';

/**
 * Demo function to check and display browser compatibility
 * Can be called from browser console: testBrowserCompatibility()
 */
export function testBrowserCompatibility(): void {
  console.log('=== Browser Compatibility Check ===\n');

  // 1. Detect browser
  const browserInfo = detectBrowser();
  console.log('Browser:', browserInfo.name, browserInfo.version);
  console.log('Supported:', browserInfo.isSupported ? 'Yes' : 'No');
  console.log('');

  // 2. Check comprehensive support
  const support = checkBrowserSupport();
  console.log('Can use compositor:', support.canUseCompositor);
  console.log('Can record video:', support.canRecordVideo);
  console.log('Suggested codec:', support.suggestedCodec);
  console.log('');

  // 3. Display capabilities
  console.log('Capabilities:');
  console.log('- Canvas API:', support.capabilities.canvas ? '✓' : '✗');
  console.log('- MediaRecorder:', support.capabilities.mediaRecorder ? '✓' : '✗');
  console.log('- captureStream:', support.capabilities.captureStream ? '✓' : '✗');
  console.log('- getDisplayMedia:', support.capabilities.getDisplayMedia ? '✓' : '✗');
  console.log('- VP9 codec:', support.capabilities.vp9Codec ? '✓' : '✗');
  console.log('- VP8 codec:', support.capabilities.vp8Codec ? '✓' : '✗');
  console.log('- H.264 codec:', support.capabilities.h264Codec ? '✓' : '✗');
  console.log('');

  // 4. Display warnings
  if (support.warnings.length > 0) {
    console.warn('Warnings:');
    support.warnings.forEach(warning => console.warn('- ' + warning));
    console.log('');
  }

  // 5. Display recommendations
  if (support.recommendations.length > 0) {
    console.log('Recommendations:');
    support.recommendations.forEach(rec => console.log('- ' + rec));
    console.log('');
  }

  // 6. Get user-friendly message
  const message = getBrowserCompatibilityMessage(support);
  console.log('User Message:', message);
  console.log('');

  // 7. Get browser-specific behavior
  const behavior = getBrowserSpecificBehavior(browserInfo);
  if (behavior.knownIssues.length > 0) {
    console.log('Known Issues:');
    behavior.knownIssues.forEach(issue => console.log('- ' + issue));
    console.log('');
  }

  // 8. Display available codecs
  const codecs = getAvailableCodecs();
  console.log('Available codecs:', codecs);
  console.log('');

  // 9. Test individual features
  console.log('Individual Feature Tests:');
  console.log('- Canvas:', isFeatureSupported('canvas'));
  console.log('- MediaRecorder:', isFeatureSupported('mediaRecorder'));
  console.log('- captureStream:', isFeatureSupported('captureStream'));
  console.log('- getDisplayMedia:', isFeatureSupported('getDisplayMedia'));
  console.log('');

  console.log('=== End of Compatibility Check ===');
}

/**
 * Demo function to show how to use browser compatibility in recording setup
 */
export function demoRecordingSetup(): void {
  console.log('=== Recording Setup Demo ===\n');

  const support = checkBrowserSupport();

  // Check if recording is possible
  if (!support.canRecordVideo) {
    console.error('❌ Video recording not supported in this browser');
    console.log('Please use Chrome 90+, Firefox 88+, or Edge 90+');
    return;
  }

  console.log('✓ Video recording is supported');

  // Check if multi-source compositing is available
  if (!support.canUseCompositor) {
    console.warn('⚠️ Multi-source compositing not available');
    console.log('Falling back to single-source recording');
  } else {
    console.log('✓ Multi-source compositing is available');
  }

  // Use suggested codec
  console.log('Using codec:', support.suggestedCodec);

  // Check screen sharing
  if (!support.capabilities.getDisplayMedia) {
    console.warn('⚠️ Screen sharing not supported');
  } else {
    console.log('✓ Screen sharing is available');
  }

  console.log('\n=== End of Recording Setup Demo ===');
}

/**
 * Demo function to show browser-specific optimizations
 */
export function demoBrowserOptimizations(): void {
  console.log('=== Browser-Specific Optimizations Demo ===\n');

  const browserInfo = detectBrowser();
  const behavior = getBrowserSpecificBehavior(browserInfo);

  console.log('Browser:', browserInfo.name, browserInfo.version);
  console.log('');

  console.log('Optimizations:');
  if (behavior.optimizations.preferredCodec) {
    console.log('- Preferred codec:', behavior.optimizations.preferredCodec);
  }
  if (behavior.optimizations.maxResolution) {
    console.log('- Max resolution:', behavior.optimizations.maxResolution);
  }
  if (behavior.optimizations.maxFrameRate) {
    console.log('- Max frame rate:', behavior.optimizations.maxFrameRate);
  }
  if (behavior.optimizations.disableFeatures) {
    console.log('- Disabled features:', behavior.optimizations.disableFeatures);
  }

  console.log('\n=== End of Optimizations Demo ===');
}

/**
 * Demo function to display full compatibility report
 */
export function showCompatibilityReport(): void {
  logBrowserCompatibility();
}

// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).testBrowserCompatibility = testBrowserCompatibility;
  (window as any).demoRecordingSetup = demoRecordingSetup;
  (window as any).demoBrowserOptimizations = demoBrowserOptimizations;
  (window as any).showCompatibilityReport = showCompatibilityReport;
  
  console.log('Browser Compatibility Demo loaded!');
  console.log('Available functions:');
  console.log('- testBrowserCompatibility()');
  console.log('- demoRecordingSetup()');
  console.log('- demoBrowserOptimizations()');
  console.log('- showCompatibilityReport()');
}
