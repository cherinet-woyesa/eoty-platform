// AudioLevelIndicators - Component for displaying audio levels and controls
import React, { useEffect, useState } from 'react';
import type { AudioLevelData } from '@/utils/AudioMixer';

interface AudioLevelIndicatorsProps {
  audioLevels: AudioLevelData[];
  onVolumeChange?: (sourceId: string, volume: number) => void;
  onMuteToggle?: (sourceId: string, muted: boolean) => void;
  getMutedState?: (sourceId: string) => boolean;
  getVolume?: (sourceId: string) => number;
}

export const AudioLevelIndicators: React.FC<AudioLevelIndicatorsProps> = ({
  audioLevels,
  onVolumeChange,
  onMuteToggle,
  getMutedState,
  getVolume
}) => {
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // Initialize muted states and volumes
  useEffect(() => {
    const newMutedStates: Record<string, boolean> = {};
    const newVolumes: Record<string, number> = {};
    
    audioLevels.forEach(level => {
      newMutedStates[level.id] = getMutedState ? getMutedState(level.id) : false;
      newVolumes[level.id] = getVolume ? getVolume(level.id) : 1.0;
    });
    
    setMutedStates(newMutedStates);
    setVolumes(newVolumes);
  }, [audioLevels, getMutedState, getVolume]);

  const handleMuteToggle = (sourceId: string) => {
    const newMuted = !mutedStates[sourceId];
    setMutedStates(prev => ({ ...prev, [sourceId]: newMuted }));
    onMuteToggle?.(sourceId, newMuted);
  };

  const handleVolumeChange = (sourceId: string, volume: number) => {
    setVolumes(prev => ({ ...prev, [sourceId]: volume }));
    onVolumeChange?.(sourceId, volume);
  };

  if (audioLevels.length === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '8px',
      minWidth: '250px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '4px'
      }}>
        Audio Levels
      </div>
      
      {audioLevels.map(level => (
        <AudioLevelIndicator
          key={level.id}
          data={level}
          muted={mutedStates[level.id] || false}
          volume={volumes[level.id] || 1.0}
          onMuteToggle={() => handleMuteToggle(level.id)}
          onVolumeChange={(volume) => handleVolumeChange(level.id, volume)}
        />
      ))}
    </div>
  );
};

interface AudioLevelIndicatorProps {
  data: AudioLevelData;
  muted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
}

const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({
  data,
  muted,
  volume,
  onMuteToggle,
  onVolumeChange
}) => {
  // Calculate color based on level
  const getLevelColor = (level: number): string => {
    if (level > 0.8) return '#ef4444'; // Red for high levels
    if (level > 0.6) return '#f59e0b'; // Orange for medium-high
    if (level > 0.3) return '#10b981'; // Green for good levels
    return '#6b7280'; // Gray for low levels
  };

  const levelColor = getLevelColor(data.level);
  const displayLevel = muted ? 0 : data.level;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      {/* Label and Mute Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#e5e7eb',
          fontWeight: 500
        }}>
          {data.label}
        </span>
        
        <button
          onClick={onMuteToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: muted ? '#ef4444' : '#e5e7eb',
            fontSize: '16px'
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Level Meter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          flex: 1,
          height: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${displayLevel * 100}%`,
            backgroundColor: levelColor,
            transition: 'width 0.1s ease-out',
            borderRadius: '3px'
          }} />
        </div>
        
        <span style={{
          fontSize: '10px',
          color: '#9ca3af',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {Math.round(displayLevel * 100)}%
        </span>
      </div>

      {/* Volume Slider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          fontSize: '10px',
          color: '#9ca3af',
          minWidth: '40px'
        }}>
          Volume:
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          disabled={muted}
          style={{
            flex: 1,
            height: '4px',
            cursor: muted ? 'not-allowed' : 'pointer',
            opacity: muted ? 0.5 : 1
          }}
        />
        <span style={{
          fontSize: '10px',
          color: '#9ca3af',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
