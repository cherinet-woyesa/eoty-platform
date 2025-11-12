import { useState, useEffect } from 'react';
import { Settings, Zap, Monitor, Cpu, Wifi, TrendingDown, TrendingUp } from 'lucide-react';

interface QualityPreset {
  name: string;
  resolution: '480p' | '720p' | '1080p';
  frameRate: number;
  bitrate: number; // in kbps
  description: string;
}

interface RecordingQualitySettingsProps {
  currentQuality: '480p' | '720p' | '1080p';
  currentFrameRate: number;
  onQualityChange: (quality: '480p' | '720p' | '1080p') => void;
  onFrameRateChange: (frameRate: number) => void;
  onBitrateChange?: (bitrate: number) => void;
  autoAdjust: boolean;
  onAutoAdjustChange: (enabled: boolean) => void;
}

const RecordingQualitySettings: React.FC<RecordingQualitySettingsProps> = ({
  currentQuality,
  currentFrameRate,
  onQualityChange,
  onFrameRateChange,
  onBitrateChange,
  autoAdjust,
  onAutoAdjustChange
}) => {
  const [systemPerformance, setSystemPerformance] = useState<'good' | 'fair' | 'poor'>('good');
  const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'medium' | 'slow'>('fast');
  const [recommendedQuality, setRecommendedQuality] = useState<'480p' | '720p' | '1080p'>(currentQuality);

  const qualityPresets: QualityPreset[] = [
    {
      name: 'Low (480p)',
      resolution: '480p',
      frameRate: 24,
      bitrate: 1000,
      description: 'Best for slow connections, smaller file size'
    },
    {
      name: 'Medium (720p)',
      resolution: '720p',
      frameRate: 30,
      bitrate: 2500,
      description: 'Balanced quality and file size (recommended)'
    },
    {
      name: 'High (1080p)',
      resolution: '1080p',
      frameRate: 30,
      bitrate: 5000,
      description: 'Best quality, larger file size'
    },
    {
      name: 'Ultra (1080p 60fps)',
      resolution: '1080p',
      frameRate: 60,
      bitrate: 8000,
      description: 'Highest quality, very large file size'
    }
  ];

  const frameRateOptions = [24, 30, 60];

  // Check system performance
  useEffect(() => {
    const checkPerformance = async () => {
      try {
        // Check CPU cores
        const cores = navigator.hardwareConcurrency || 4;
        
        // Check memory (if available)
        // @ts-ignore
        const memory = (navigator.deviceMemory || 4) * 1024; // GB to MB
        
        // Simple performance estimation
        let performance: 'good' | 'fair' | 'poor' = 'good';
        if (cores < 4 || memory < 4096) {
          performance = 'fair';
        }
        if (cores < 2 || memory < 2048) {
          performance = 'poor';
        }
        
        setSystemPerformance(performance);
      } catch (error) {
        console.warn('Could not check system performance:', error);
      }
    };

    checkPerformance();
  }, []);

  // Check network speed
  useEffect(() => {
    const checkNetworkSpeed = async () => {
      try {
        const startTime = performance.now();
        await fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        const endTime = performance.now();
        const latency = endTime - startTime;

        if (latency < 100) {
          setNetworkSpeed('fast');
        } else if (latency < 500) {
          setNetworkSpeed('medium');
        } else {
          setNetworkSpeed('slow');
        }
      } catch (error) {
        console.warn('Could not check network speed:', error);
      }
    };

    checkNetworkSpeed();
  }, []);

  // Auto-adjust quality based on performance
  useEffect(() => {
    if (autoAdjust) {
      let recommended: '480p' | '720p' | '1080p' = '720p';
      
      if (systemPerformance === 'poor' || networkSpeed === 'slow') {
        recommended = '480p';
      } else if (systemPerformance === 'fair' || networkSpeed === 'medium') {
        recommended = '720p';
      } else {
        recommended = '1080p';
      }
      
      setRecommendedQuality(recommended);
      
      // Auto-apply if different from current
      if (recommended !== currentQuality) {
        onQualityChange(recommended);
      }
    }
  }, [autoAdjust, systemPerformance, networkSpeed, currentQuality, onQualityChange]);

  const getPerformanceIcon = () => {
    switch (systemPerformance) {
      case 'good':
        return <TrendingUp className="h-4 w-4 text-[#39FF14]" />;
      case 'fair':
        return <Monitor className="h-4 w-4 text-[#FFD700]" />;
      case 'poor':
        return <TrendingDown className="h-4 w-4 text-[#FF6B35]" />;
    }
  };

  const getNetworkIcon = () => {
    switch (networkSpeed) {
      case 'fast':
        return <Wifi className="h-4 w-4 text-[#39FF14]" />;
      case 'medium':
        return <Wifi className="h-4 w-4 text-[#FFD700]" />;
      case 'slow':
        return <Wifi className="h-4 w-4 text-[#FF6B35]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-adjust Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
        <div className="flex items-center space-x-3">
          <Zap className="h-5 w-5 text-[#FFD700]" />
          <div>
            <h4 className="font-semibold text-slate-700 text-sm">Auto-Adjust Quality</h4>
            <p className="text-xs text-slate-500">Automatically adjust based on system performance</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoAdjust}
            onChange={(e) => onAutoAdjustChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4FC3F7]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#39FF14]/90 peer-checked:to-[#00FF41]/90"></div>
        </label>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
          <div className="flex items-center space-x-2 mb-1">
            <Cpu className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">System</span>
          </div>
          <div className="flex items-center space-x-1">
            {getPerformanceIcon()}
            <span className="text-sm font-semibold text-slate-700 capitalize">{systemPerformance}</span>
          </div>
        </div>
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
          <div className="flex items-center space-x-2 mb-1">
            <Wifi className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Network</span>
          </div>
          <div className="flex items-center space-x-1">
            {getNetworkIcon()}
            <span className="text-sm font-semibold text-slate-700 capitalize">{networkSpeed}</span>
          </div>
        </div>
      </div>

      {autoAdjust && recommendedQuality !== currentQuality && (
        <div className="p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Recommended: {recommendedQuality.toUpperCase()} based on your system performance
          </p>
        </div>
      )}

      {/* Quality Presets */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Quality Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {qualityPresets.map((preset) => {
            const isSelected = currentQuality === preset.resolution && 
                              (preset.frameRate === 60 ? currentFrameRate === 60 : currentFrameRate < 60);
            
            return (
              <button
                key={preset.name}
                onClick={() => {
                  onQualityChange(preset.resolution);
                  onFrameRateChange(preset.frameRate);
                  if (onBitrateChange) {
                    onBitrateChange(preset.bitrate);
                  }
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#39FF14] bg-gradient-to-br from-[#39FF14]/10 to-[#00FF41]/10'
                    : 'border-slate-200/50 bg-white/90 hover:border-slate-300/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${
                    isSelected ? 'text-[#39FF14]' : 'text-slate-700'
                  }`}>
                    {preset.name}
                  </span>
                  {isSelected && (
                    <div className="w-2 h-2 bg-[#39FF14] rounded-full"></div>
                  )}
                </div>
                <p className="text-xs text-slate-500">{preset.description}</p>
                <div className="mt-2 flex items-center space-x-3 text-xs text-slate-600">
                  <span>{preset.resolution}</span>
                  <span>•</span>
                  <span>{preset.frameRate}fps</span>
                  <span>•</span>
                  <span>~{preset.bitrate / 1000}Mbps</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Frame Rate */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Frame Rate</label>
        <div className="flex space-x-2">
          {frameRateOptions.map((fps) => (
            <button
              key={fps}
              onClick={() => onFrameRateChange(fps)}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                currentFrameRate === fps
                  ? 'border-[#39FF14] bg-gradient-to-r from-[#39FF14]/20 to-[#00FF41]/20 text-[#39FF14] font-semibold'
                  : 'border-slate-200/50 bg-white/90 text-slate-600 hover:border-slate-300/50'
              }`}
            >
              {fps} fps
            </button>
          ))}
        </div>
      </div>

      {/* Estimated File Size */}
      <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Estimated file size (per minute):</span>
          <span className="text-sm font-semibold text-slate-700">
            {(() => {
              const preset = qualityPresets.find(p => 
                p.resolution === currentQuality && 
                (p.frameRate === 60 ? currentFrameRate === 60 : currentFrameRate < 60)
              );
              if (preset) {
                const sizePerMinute = (preset.bitrate * 60) / 8 / 1024; // MB per minute
                return `~${sizePerMinute.toFixed(1)} MB`;
              }
              return '~2.5 MB';
            })()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecordingQualitySettings;


