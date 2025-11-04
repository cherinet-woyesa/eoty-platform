// AudioMixer - Utility for mixing multiple audio tracks
// Handles multi-track audio from camera and screen sources

export interface AudioSourceConfig {
  id: string;
  stream: MediaStream;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  label: string;
}

export interface AudioMixerConfig {
  sampleRate?: number;
  channelCount?: number;
}

export interface AudioLevelData {
  id: string;
  level: number; // 0.0 to 1.0
  peak: number; // 0.0 to 1.0
  label: string;
}

export class AudioMixer {
  private audioContext: AudioContext | null = null;
  private audioSources: Map<string, {
    stream: MediaStream;
    sourceNode: MediaStreamAudioSourceNode;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
    config: AudioSourceConfig;
  }> = new Map();
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private outputStream: MediaStream | null = null;
  private levelMonitoringInterval: number | null = null;

  constructor(config?: AudioMixerConfig) {
    try {
      // Create audio context with specified config
      this.audioContext = new AudioContext({
        sampleRate: config?.sampleRate || 48000,
        latencyHint: 'interactive'
      });

      // Create destination node for mixed output
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      console.log('AudioMixer initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });
    } catch (error) {
      console.error('Failed to initialize AudioMixer:', error);
      throw new Error('AudioMixer initialization failed');
    }
  }

  /**
   * Add an audio source to the mixer
   */
  addAudioSource(config: AudioSourceConfig): boolean {
    if (!this.audioContext || !this.destinationNode) {
      console.error('AudioMixer not initialized');
      return false;
    }

    // Check if source already exists
    if (this.audioSources.has(config.id)) {
      console.warn(`Audio source ${config.id} already exists`);
      return false;
    }

    // Get audio tracks from stream
    const audioTracks = config.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn(`No audio tracks in stream for ${config.id}`);
      return false;
    }

    try {
      // Create source node from stream
      const sourceNode = this.audioContext.createMediaStreamSource(config.stream);
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = config.muted ? 0 : config.volume;

      // Create analyser node for level monitoring
      const analyserNode = this.audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;

      // Connect: source -> gain -> analyser -> destination
      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(this.destinationNode);

      // Store source data
      this.audioSources.set(config.id, {
        stream: config.stream,
        sourceNode,
        gainNode,
        analyserNode,
        config
      });

      console.log(`Audio source ${config.id} added`, {
        tracks: audioTracks.length,
        volume: config.volume,
        muted: config.muted
      });

      return true;
    } catch (error) {
      console.error(`Failed to add audio source ${config.id}:`, error);
      return false;
    }
  }

  /**
   * Remove an audio source from the mixer
   */
  removeAudioSource(id: string): boolean {
    const source = this.audioSources.get(id);
    if (!source) {
      console.warn(`Audio source ${id} not found`);
      return false;
    }

    try {
      // Disconnect nodes
      source.sourceNode.disconnect();
      source.gainNode.disconnect();
      source.analyserNode.disconnect();

      // Remove from map
      this.audioSources.delete(id);

      console.log(`Audio source ${id} removed`);
      return true;
    } catch (error) {
      console.error(`Failed to remove audio source ${id}:`, error);
      return false;
    }
  }

  /**
   * Set volume for a specific audio source
   */
  setVolume(id: string, volume: number): boolean {
    const source = this.audioSources.get(id);
    if (!source) {
      console.warn(`Audio source ${id} not found`);
      return false;
    }

    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Update gain node
    source.gainNode.gain.value = source.config.muted ? 0 : clampedVolume;
    source.config.volume = clampedVolume;

    console.log(`Volume set for ${id}:`, clampedVolume);
    return true;
  }

  /**
   * Mute/unmute a specific audio source
   */
  setMuted(id: string, muted: boolean): boolean {
    const source = this.audioSources.get(id);
    if (!source) {
      console.warn(`Audio source ${id} not found`);
      return false;
    }

    source.config.muted = muted;
    source.gainNode.gain.value = muted ? 0 : source.config.volume;

    console.log(`Mute set for ${id}:`, muted);
    return true;
  }

  /**
   * Get current volume for a source
   */
  getVolume(id: string): number {
    const source = this.audioSources.get(id);
    return source ? source.config.volume : 0;
  }

  /**
   * Get mute state for a source
   */
  isMuted(id: string): boolean {
    const source = this.audioSources.get(id);
    return source ? source.config.muted : false;
  }

  /**
   * Get the mixed audio output stream
   */
  getOutputStream(): MediaStream | null {
    if (!this.destinationNode) {
      return null;
    }

    // Cache the output stream
    if (!this.outputStream) {
      this.outputStream = this.destinationNode.stream;
    }

    return this.outputStream;
  }

  /**
   * Get all audio source IDs
   */
  getAudioSourceIds(): string[] {
    return Array.from(this.audioSources.keys());
  }

  /**
   * Get audio source config
   */
  getAudioSourceConfig(id: string): AudioSourceConfig | null {
    const source = this.audioSources.get(id);
    return source ? { ...source.config } : null;
  }

  /**
   * Get audio level for a specific source (0.0 to 1.0)
   */
  getAudioLevel(id: string): number {
    const source = this.audioSources.get(id);
    if (!source) {
      return 0;
    }

    const analyser = source.analyserNode;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Normalize to 0-1 range (255 is max value for Uint8Array)
    return Math.min(1.0, rms / 255);
  }

  /**
   * Get audio levels for all sources
   */
  getAllAudioLevels(): AudioLevelData[] {
    const levels: AudioLevelData[] = [];
    
    this.audioSources.forEach((source, id) => {
      const level = this.getAudioLevel(id);
      levels.push({
        id,
        level,
        peak: level, // For now, peak is same as level
        label: source.config.label
      });
    });

    return levels;
  }

  /**
   * Start monitoring audio levels with callback
   */
  startLevelMonitoring(callback: (levels: AudioLevelData[]) => void, intervalMs: number = 100): void {
    // Clear existing interval
    this.stopLevelMonitoring();

    // Start new interval
    this.levelMonitoringInterval = window.setInterval(() => {
      const levels = this.getAllAudioLevels();
      callback(levels);
    }, intervalMs);

    console.log('Audio level monitoring started');
  }

  /**
   * Stop monitoring audio levels
   */
  stopLevelMonitoring(): void {
    if (this.levelMonitoringInterval !== null) {
      clearInterval(this.levelMonitoringInterval);
      this.levelMonitoringInterval = null;
      console.log('Audio level monitoring stopped');
    }
  }

  /**
   * Check if audio context is running
   */
  isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioContext resumed');
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    console.log('Disposing AudioMixer');

    // Stop level monitoring
    this.stopLevelMonitoring();

    // Disconnect and remove all sources
    this.audioSources.forEach((source, id) => {
      try {
        source.sourceNode.disconnect();
        source.gainNode.disconnect();
        source.analyserNode.disconnect();
      } catch (error) {
        console.warn(`Error disconnecting source ${id}:`, error);
      }
    });
    this.audioSources.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(error => {
        console.warn('Error closing AudioContext:', error);
      });
      this.audioContext = null;
    }

    this.destinationNode = null;
    this.outputStream = null;

    console.log('AudioMixer disposed');
  }
}

/**
 * Helper function to collect audio tracks from multiple streams
 */
export function collectAudioTracks(
  cameraStream: MediaStream | null,
  screenStream: MediaStream | null,
  enableAudio: boolean = true
): MediaStreamTrack[] {
  if (!enableAudio) {
    return [];
  }

  const audioTracks: MediaStreamTrack[] = [];

  // Collect camera audio tracks
  if (cameraStream) {
    const cameraTracks = cameraStream.getAudioTracks();
    audioTracks.push(...cameraTracks);
    console.log(`Collected ${cameraTracks.length} audio track(s) from camera`);
  }

  // Collect screen audio tracks
  if (screenStream) {
    const screenTracks = screenStream.getAudioTracks();
    audioTracks.push(...screenTracks);
    console.log(`Collected ${screenTracks.length} audio track(s) from screen`);
  }

  console.log(`Total audio tracks collected: ${audioTracks.length}`);
  return audioTracks;
}

/**
 * Helper function to combine audio tracks into a single stream
 * Handles missing audio gracefully
 */
export function combineAudioTracks(
  cameraStream: MediaStream | null,
  screenStream: MediaStream | null,
  enableAudio: boolean = true
): MediaStream {
  const audioTracks = collectAudioTracks(cameraStream, screenStream, enableAudio);
  
  // Create a new MediaStream with all audio tracks
  const combinedStream = new MediaStream(audioTracks);
  
  console.log('Combined audio stream created', {
    totalTracks: combinedStream.getAudioTracks().length,
    cameraAudio: cameraStream?.getAudioTracks().length || 0,
    screenAudio: screenStream?.getAudioTracks().length || 0
  });

  return combinedStream;
}
