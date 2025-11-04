// Browser Compatibility Detection for Video Recording Features
// Task 6.1: Feature detection system for multi-source video recording

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
}

export interface BrowserCapabilities {
  canvas: boolean;
  mediaRecorder: boolean;
  captureStream: boolean;
  getDisplayMedia: boolean;
  vp9Codec: boolean;
  vp8Codec: boolean;
  h264Codec: boolean;
}

export interface BrowserSupport {
  browserInfo: BrowserInfo;
  capabilities: BrowserCapabilities;
  warnings: string[];
  recommendations: string[];
  canUseCompositor: boolean;
  canRecordVideo: boolean;
  suggestedCodec: string;
}

/**
 * Detect browser name and version from user agent
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = '';
  let isSupported = false;

  // Chrome detection (must come before Safari check)
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '';
    isSupported = parseInt(version) >= 90;
  }
  // Edge detection (Chromium-based)
  else if (userAgent.includes('Edg')) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : '';
    isSupported = parseInt(version) >= 90;
  }
  // Firefox detection
  else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : '';
    isSupported = parseInt(version) >= 88;
  }
  // Safari detection
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : '';
    // Safari has limited support
    isSupported = parseInt(version) >= 14;
  }
  // Opera detection
  else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    name = 'Opera';
    const match = userAgent.match(/(?:OPR|Opera)\/(\d+)/);
    version = match ? match[1] : '';
    isSupported = parseInt(version) >= 76;
  }

  return {
    name,
    version,
    isSupported
  };
}

/**
 * Check Canvas API support
 */
export function checkCanvasSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return !!ctx;
  } catch (e) {
    console.error('Canvas API check failed:', e);
    return false;
  }
}

/**
 * Check MediaRecorder API support
 */
export function checkMediaRecorderSupport(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function';
}

/**
 * Check canvas.captureStream() support
 */
export function checkCaptureStreamSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return typeof canvas.captureStream === 'function';
  } catch (e) {
    console.error('captureStream check failed:', e);
    return false;
  }
}

/**
 * Check getDisplayMedia (screen sharing) support
 */
export function checkGetDisplayMediaSupport(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
}

/**
 * Check VP9 codec support
 */
export function checkVP9CodecSupport(): boolean {
  if (!checkMediaRecorderSupport()) {
    return false;
  }

  try {
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
  } catch (e) {
    console.error('VP9 codec check failed:', e);
    return false;
  }
}

/**
 * Check VP8 codec support
 */
export function checkVP8CodecSupport(): boolean {
  if (!checkMediaRecorderSupport()) {
    return false;
  }

  try {
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  } catch (e) {
    console.error('VP8 codec check failed:', e);
    return false;
  }
}

/**
 * Check H.264 codec support
 */
export function checkH264CodecSupport(): boolean {
  if (!checkMediaRecorderSupport()) {
    return false;
  }

  try {
    // Try various H.264 MIME types
    return (
      MediaRecorder.isTypeSupported('video/webm;codecs=h264') ||
      MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ||
      MediaRecorder.isTypeSupported('video/x-matroska;codecs=avc1')
    );
  } catch (e) {
    console.error('H.264 codec check failed:', e);
    return false;
  }
}

/**
 * Get all browser capabilities
 */
export function getBrowserCapabilities(): BrowserCapabilities {
  return {
    canvas: checkCanvasSupport(),
    mediaRecorder: checkMediaRecorderSupport(),
    captureStream: checkCaptureStreamSupport(),
    getDisplayMedia: checkGetDisplayMediaSupport(),
    vp9Codec: checkVP9CodecSupport(),
    vp8Codec: checkVP8CodecSupport(),
    h264Codec: checkH264CodecSupport()
  };
}

/**
 * Determine the best codec to use based on browser support
 */
export function getSuggestedCodec(capabilities: BrowserCapabilities): string {
  // Prefer VP9 for better quality and compression
  if (capabilities.vp9Codec) {
    return 'video/webm;codecs=vp9';
  }

  // Fall back to VP8
  if (capabilities.vp8Codec) {
    return 'video/webm;codecs=vp8';
  }

  // Fall back to H.264 if available
  if (capabilities.h264Codec) {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
      return 'video/mp4;codecs=h264';
    }
    return 'video/webm;codecs=h264';
  }

  // Last resort - try basic WebM
  if (capabilities.mediaRecorder) {
    return 'video/webm';
  }

  return '';
}

/**
 * Generate warnings based on missing capabilities
 */
function generateWarnings(
  browserInfo: BrowserInfo,
  capabilities: BrowserCapabilities
): string[] {
  const warnings: string[] = [];

  // Browser version warnings
  if (!browserInfo.isSupported) {
    warnings.push(
      `${browserInfo.name} version ${browserInfo.version} may have limited support. ` +
      `Recommended: Chrome 90+, Firefox 88+, or Edge 90+.`
    );
  }

  // Canvas warnings
  if (!capabilities.canvas) {
    warnings.push('Canvas API not supported. Video compositing will not work.');
  }

  // MediaRecorder warnings
  if (!capabilities.mediaRecorder) {
    warnings.push('MediaRecorder API not supported. Video recording will not work.');
  }

  // captureStream warnings
  if (!capabilities.captureStream) {
    warnings.push(
      'Canvas captureStream not supported. Multi-source recording will not work.'
    );
  }

  // getDisplayMedia warnings
  if (!capabilities.getDisplayMedia) {
    warnings.push('Screen sharing not supported in this browser.');
  }

  // Codec warnings
  if (!capabilities.vp9Codec && !capabilities.vp8Codec && !capabilities.h264Codec) {
    warnings.push('No supported video codecs found. Recording may not work.');
  } else if (!capabilities.vp9Codec && capabilities.vp8Codec) {
    warnings.push('VP9 codec not supported. Using VP8 (lower quality).');
  }

  // Safari-specific warnings
  if (browserInfo.name === 'Safari') {
    warnings.push(
      'Safari has limited support for multi-source recording. ' +
      'Some features may not work as expected.'
    );
  }

  return warnings;
}

/**
 * Generate recommendations based on browser and capabilities
 */
function generateRecommendations(
  browserInfo: BrowserInfo,
  capabilities: BrowserCapabilities
): string[] {
  const recommendations: string[] = [];

  // Browser upgrade recommendations
  if (!browserInfo.isSupported) {
    if (browserInfo.name === 'Chrome' || browserInfo.name === 'Edge') {
      recommendations.push(`Update ${browserInfo.name} to version 90 or higher.`);
    } else if (browserInfo.name === 'Firefox') {
      recommendations.push('Update Firefox to version 88 or higher.');
    } else if (browserInfo.name === 'Safari') {
      recommendations.push(
        'For best experience, use Chrome, Firefox, or Edge instead of Safari.'
      );
    } else {
      recommendations.push(
        'Use Chrome 90+, Firefox 88+, or Edge 90+ for full feature support.'
      );
    }
  }

  // Feature-specific recommendations
  if (!capabilities.captureStream && capabilities.mediaRecorder) {
    recommendations.push(
      'Multi-source recording not available. You can still record single sources.'
    );
  }

  if (!capabilities.getDisplayMedia && capabilities.mediaRecorder) {
    recommendations.push(
      'Screen sharing not available. You can still record from camera.'
    );
  }

  // Codec recommendations
  if (!capabilities.vp9Codec && capabilities.vp8Codec) {
    recommendations.push(
      'Consider updating your browser for better video quality (VP9 codec).'
    );
  }

  return recommendations;
}

/**
 * Comprehensive browser support check
 * Returns detailed information about browser capabilities and compatibility
 */
export function checkBrowserSupport(): BrowserSupport {
  const browserInfo = detectBrowser();
  const capabilities = getBrowserCapabilities();
  const warnings = generateWarnings(browserInfo, capabilities);
  const recommendations = generateRecommendations(browserInfo, capabilities);

  // Determine if compositor can be used
  const canUseCompositor =
    capabilities.canvas &&
    capabilities.captureStream &&
    capabilities.mediaRecorder;

  // Determine if basic video recording can be used
  const canRecordVideo =
    capabilities.mediaRecorder &&
    (capabilities.vp9Codec || capabilities.vp8Codec || capabilities.h264Codec);

  // Get suggested codec
  const suggestedCodec = getSuggestedCodec(capabilities);

  const support: BrowserSupport = {
    browserInfo,
    capabilities,
    warnings,
    recommendations,
    canUseCompositor,
    canRecordVideo,
    suggestedCodec
  };

  // Log support information for debugging
  console.log('Browser Support Check:', {
    browser: `${browserInfo.name} ${browserInfo.version}`,
    canUseCompositor,
    canRecordVideo,
    suggestedCodec,
    warningCount: warnings.length,
    recommendationCount: recommendations.length
  });

  return support;
}

/**
 * Get a user-friendly message about browser compatibility
 */
export function getBrowserCompatibilityMessage(support: BrowserSupport): string {
  const { browserInfo, canUseCompositor, canRecordVideo, warnings } = support;

  if (!canRecordVideo) {
    return (
      `Your browser (${browserInfo.name} ${browserInfo.version}) does not support video recording. ` +
      `Please use Chrome 90+, Firefox 88+, or Edge 90+ for full functionality.`
    );
  }

  if (!canUseCompositor) {
    return (
      `Multi-source video recording is not available in ${browserInfo.name} ${browserInfo.version}. ` +
      `You can still record from a single source (camera or screen). ` +
      `For full features, use Chrome 90+, Firefox 88+, or Edge 90+.`
    );
  }

  if (warnings.length > 0) {
    return (
      `${browserInfo.name} ${browserInfo.version} is supported with some limitations. ` +
      warnings.join(' ')
    );
  }

  return `${browserInfo.name} ${browserInfo.version} fully supports all recording features.`;
}

/**
 * Check if a specific feature is supported
 */
export function isFeatureSupported(feature: keyof BrowserCapabilities): boolean {
  const capabilities = getBrowserCapabilities();
  return capabilities[feature];
}

/**
 * Get available codecs as a list
 */
export function getAvailableCodecs(): string[] {
  const capabilities = getBrowserCapabilities();
  const codecs: string[] = [];

  if (capabilities.vp9Codec) {
    codecs.push('video/webm;codecs=vp9');
  }
  if (capabilities.vp8Codec) {
    codecs.push('video/webm;codecs=vp8');
  }
  if (capabilities.h264Codec) {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
      codecs.push('video/mp4;codecs=h264');
    } else {
      codecs.push('video/webm;codecs=h264');
    }
  }

  return codecs;
}

/**
 * Task 6.3: Browser-specific behaviors and adjustments
 */
export interface BrowserSpecificBehavior {
  browser: string;
  version: string;
  knownIssues: string[];
  recommendations: string[];
  optimizations: {
    preferredCodec?: string;
    maxResolution?: string;
    maxFrameRate?: number;
    disableFeatures?: string[];
  };
}

/**
 * Get browser-specific behaviors and optimizations
 */
export function getBrowserSpecificBehavior(browserInfo: BrowserInfo): BrowserSpecificBehavior {
  const behavior: BrowserSpecificBehavior = {
    browser: browserInfo.name,
    version: browserInfo.version,
    knownIssues: [],
    recommendations: [],
    optimizations: {}
  };

  const version = parseInt(browserInfo.version);

  // Chrome/Edge specific handling
  if (browserInfo.name === 'Chrome' || browserInfo.name === 'Edge') {
    behavior.optimizations.preferredCodec = 'video/webm;codecs=vp9';
    behavior.optimizations.maxResolution = '1080p';
    behavior.optimizations.maxFrameRate = 30;

    if (version < 90) {
      behavior.knownIssues.push(
        'Older Chrome/Edge versions may have issues with canvas compositing performance'
      );
      behavior.recommendations.push('Update to Chrome/Edge 90 or higher for best performance');
      behavior.optimizations.maxResolution = '720p';
    }

    if (version >= 90) {
      behavior.recommendations.push(
        'Chrome/Edge provides excellent support for all recording features'
      );
    }
  }

  // Firefox specific handling
  else if (browserInfo.name === 'Firefox') {
    // Firefox prefers VP8 over VP9 for better stability
    behavior.optimizations.preferredCodec = 'video/webm;codecs=vp8';
    behavior.optimizations.maxResolution = '1080p';
    behavior.optimizations.maxFrameRate = 30;

    if (version < 88) {
      behavior.knownIssues.push(
        'Older Firefox versions may have limited MediaRecorder support'
      );
      behavior.recommendations.push('Update to Firefox 88 or higher');
      behavior.optimizations.maxResolution = '720p';
    }

    if (version >= 88) {
      behavior.knownIssues.push(
        'Firefox may have slightly lower performance with canvas compositing compared to Chrome'
      );
      behavior.recommendations.push(
        'Firefox works well but Chrome/Edge may provide better performance'
      );
    }

    // Firefox-specific: Audio mixing can be problematic
    behavior.knownIssues.push(
      'Audio mixing from multiple sources may have sync issues in Firefox'
    );
  }

  // Safari specific handling
  else if (browserInfo.name === 'Safari') {
    behavior.optimizations.preferredCodec = 'video/mp4;codecs=h264';
    behavior.optimizations.maxResolution = '720p';
    behavior.optimizations.maxFrameRate = 24;
    behavior.optimizations.disableFeatures = ['multi-source-compositing'];

    behavior.knownIssues.push(
      'Safari has very limited support for MediaRecorder API',
      'Canvas captureStream may not work reliably in Safari',
      'Multi-source recording is not supported in Safari',
      'Screen sharing support is limited in Safari'
    );

    behavior.recommendations.push(
      'For best experience, use Chrome 90+, Firefox 88+, or Edge 90+ instead of Safari',
      'If you must use Safari, only single-source recording (camera only) is recommended'
    );

    if (version < 14) {
      behavior.knownIssues.push('Safari versions below 14 have no MediaRecorder support');
      behavior.recommendations.push('Update Safari to version 14 or higher');
    }
  }

  // Opera specific handling
  else if (browserInfo.name === 'Opera') {
    // Opera is Chromium-based, similar to Chrome
    behavior.optimizations.preferredCodec = 'video/webm;codecs=vp9';
    behavior.optimizations.maxResolution = '1080p';
    behavior.optimizations.maxFrameRate = 30;

    if (version >= 76) {
      behavior.recommendations.push('Opera provides good support similar to Chrome');
    } else {
      behavior.knownIssues.push('Older Opera versions may have compatibility issues');
      behavior.recommendations.push('Update to Opera 76 or higher');
    }
  }

  // Unknown browser
  else {
    behavior.knownIssues.push(
      'Unknown browser - compatibility cannot be guaranteed',
      'Recording features may not work as expected'
    );
    behavior.recommendations.push(
      'Use Chrome 90+, Firefox 88+, or Edge 90+ for guaranteed compatibility'
    );
    behavior.optimizations.maxResolution = '720p';
    behavior.optimizations.maxFrameRate = 24;
  }

  return behavior;
}

/**
 * Apply browser-specific optimizations to recording options
 */
export function applyBrowserOptimizations(
  options: any,
  browserInfo: BrowserInfo
): any {
  const behavior = getBrowserSpecificBehavior(browserInfo);
  const optimized = { ...options };

  // Apply resolution limits
  if (behavior.optimizations.maxResolution) {
    const resolutionPriority = ['1080p', '720p', '480p'];
    const maxIndex = resolutionPriority.indexOf(behavior.optimizations.maxResolution);
    const currentIndex = resolutionPriority.indexOf(options.resolution);

    if (currentIndex < maxIndex) {
      console.warn(
        `Reducing resolution from ${options.resolution} to ${behavior.optimizations.maxResolution} for browser compatibility`
      );
      optimized.resolution = behavior.optimizations.maxResolution;
    }
  }

  // Apply frame rate limits
  if (behavior.optimizations.maxFrameRate && options.frameRate > behavior.optimizations.maxFrameRate) {
    console.warn(
      `Reducing frame rate from ${options.frameRate} to ${behavior.optimizations.maxFrameRate} for browser compatibility`
    );
    optimized.frameRate = behavior.optimizations.maxFrameRate;
  }

  // Disable features if needed
  if (behavior.optimizations.disableFeatures) {
    behavior.optimizations.disableFeatures.forEach(feature => {
      if (feature === 'multi-source-compositing') {
        console.warn('Multi-source compositing disabled for browser compatibility');
        // This would be handled by the calling code
      }
    });
  }

  return optimized;
}

/**
 * Get a detailed browser compatibility report
 */
export function getBrowserCompatibilityReport(): string {
  const support = checkBrowserSupport();
  const behavior = getBrowserSpecificBehavior(support.browserInfo);

  let report = `Browser Compatibility Report\n`;
  report += `================================\n\n`;
  report += `Browser: ${support.browserInfo.name} ${support.browserInfo.version}\n`;
  report += `Supported: ${support.browserInfo.isSupported ? 'Yes' : 'No'}\n\n`;

  report += `Capabilities:\n`;
  report += `- Canvas API: ${support.capabilities.canvas ? '✓' : '✗'}\n`;
  report += `- MediaRecorder API: ${support.capabilities.mediaRecorder ? '✓' : '✗'}\n`;
  report += `- Canvas captureStream: ${support.capabilities.captureStream ? '✓' : '✗'}\n`;
  report += `- Screen Sharing (getDisplayMedia): ${support.capabilities.getDisplayMedia ? '✓' : '✗'}\n`;
  report += `- VP9 Codec: ${support.capabilities.vp9Codec ? '✓' : '✗'}\n`;
  report += `- VP8 Codec: ${support.capabilities.vp8Codec ? '✓' : '✗'}\n`;
  report += `- H.264 Codec: ${support.capabilities.h264Codec ? '✓' : '✗'}\n\n`;

  report += `Features:\n`;
  report += `- Multi-source Compositing: ${support.canUseCompositor ? '✓' : '✗'}\n`;
  report += `- Video Recording: ${support.canRecordVideo ? '✓' : '✗'}\n`;
  report += `- Suggested Codec: ${support.suggestedCodec || 'None'}\n\n`;

  if (behavior.knownIssues.length > 0) {
    report += `Known Issues:\n`;
    behavior.knownIssues.forEach(issue => {
      report += `- ${issue}\n`;
    });
    report += `\n`;
  }

  if (behavior.recommendations.length > 0) {
    report += `Recommendations:\n`;
    behavior.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += `\n`;
  }

  if (support.warnings.length > 0) {
    report += `Warnings:\n`;
    support.warnings.forEach(warning => {
      report += `- ${warning}\n`;
    });
    report += `\n`;
  }

  return report;
}

/**
 * Log browser compatibility information to console
 */
export function logBrowserCompatibility(): void {
  const report = getBrowserCompatibilityReport();
  console.log(report);
}
