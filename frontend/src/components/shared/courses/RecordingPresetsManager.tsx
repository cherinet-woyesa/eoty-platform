import React, { useState, useEffect } from 'react';
import { Save, Trash2, Star, StarOff, Plus, X, Settings } from 'lucide-react';
import { recordingPresetsApi, type RecordingPreset, type CreatePresetData } from '@/services/api';
import { useNotification } from '@/context/NotificationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';

interface RecordingPresetsManagerProps {
  currentSettings: {
    quality: '480p' | '720p' | '1080p';
    frameRate: number;
    bitrate?: number;
    autoAdjustQuality: boolean;
    videoDeviceId?: string;
    audioDeviceId?: string;
    enableScreen: boolean;
    layout: string;
  };
  onPresetSelect: (preset: RecordingPreset) => void;
  onClose: () => void;
  isOpen: boolean;
}

const RecordingPresetsManager: React.FC<RecordingPresetsManagerProps> = ({
  currentSettings,
  onPresetSelect,
  onClose,
  isOpen
}) => {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { data: presets, isLoading, isError, error } = useQuery<RecordingPreset[], Error>({
    queryKey: ['recordingPresets'],
    queryFn: () => recordingPresetsApi.getPresets(),
    enabled: isOpen
  });

  const createPresetMutation = useMutation<RecordingPreset, Error, CreatePresetData>({
    mutationFn: (data) => recordingPresetsApi.createPreset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordingPresets'] });
      setShowCreateForm(false);
      setPresetName('');
      setIsDefault(false);
      showNotification({
        type: 'success',
        title: 'Preset Saved',
        message: 'Your recording preset has been saved successfully.',
        duration: 3000
      });
    },
    onError: (err) => {
      showNotification({
        type: 'error',
        title: 'Failed to Save Preset',
        message: err.message || 'Unable to save preset. Please try again.',
        duration: 5000
      });
    }
  });

  const deletePresetMutation = useMutation<boolean, Error, string>({
    mutationFn: (presetId) => recordingPresetsApi.deletePreset(presetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordingPresets'] });
      showNotification({
        type: 'success',
        title: 'Preset Deleted',
        message: 'The preset has been deleted successfully.',
        duration: 3000
      });
    },
    onError: (err) => {
      showNotification({
        type: 'error',
        title: 'Failed to Delete Preset',
        message: err.message || 'Unable to delete preset. Please try again.',
        duration: 5000
      });
    }
  });

  const updateDefaultMutation = useMutation<RecordingPreset, Error, { presetId: string; isDefault: boolean }>({
    mutationFn: ({ presetId, isDefault }) => recordingPresetsApi.updatePreset(presetId, { is_default: isDefault }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordingPresets'] });
      showNotification({
        type: 'success',
        title: 'Default Updated',
        message: 'Default preset has been updated.',
        duration: 3000
      });
    }
  });

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showNotification({
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter a name for your preset.',
        duration: 3000
      });
      return;
    }

    createPresetMutation.mutate({
      name: presetName.trim(),
      quality: currentSettings.quality,
      frame_rate: currentSettings.frameRate,
      bitrate: currentSettings.bitrate,
      auto_adjust_quality: currentSettings.autoAdjustQuality,
      video_device_id: currentSettings.videoDeviceId,
      audio_device_id: currentSettings.audioDeviceId,
      enable_screen: currentSettings.enableScreen,
      layout: currentSettings.layout,
      is_default: isDefault
    });
  };

  const handleDeletePreset = (presetId: number) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      deletePresetMutation.mutate(presetId.toString());
    }
  };

  const handleToggleDefault = (preset: RecordingPreset) => {
    updateDefaultMutation.mutate({
      presetId: preset.id.toString(),
      isDefault: !preset.is_default
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <h3 className="text-xl font-bold text-slate-700 flex items-center space-x-2">
            <Settings className="h-6 w-6 text-slate-600" />
            <span>Recording Presets</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100/50 text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          )}

          {isError && (
            <div className="mb-4">
              <ErrorAlert error={error} />
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {/* Create New Preset Form */}
              {showCreateForm ? (
                <div className="mb-6 p-4 bg-slate-50/50 rounded-lg border border-slate-200/50">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Save Current Settings as Preset</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Preset name (e.g., 'High Quality', 'Quick Record')"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent text-sm bg-white/80 text-slate-700"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="h-4 w-4 text-[#4FC3F7] rounded focus:ring-2 focus:ring-[#4FC3F7]/50"
                      />
                      <label htmlFor="isDefault" className="text-sm text-slate-700">
                        Set as default preset
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSavePreset}
                        disabled={createPresetMutation.isPending}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createPresetMutation.isPending ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save Preset</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setPresetName('');
                          setIsDefault(false);
                        }}
                        className="px-4 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-slate-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full mb-4 px-4 py-2 bg-gradient-to-r from-[#4FC3F7]/90 to-[#00D4FF]/90 text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Save Current Settings as Preset</span>
                </button>
              )}

              {/* Presets List */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Saved Presets</h4>
                {presets && presets.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No presets saved yet. Create one above to get started!
                  </p>
                ) : (
                  presets?.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-4 bg-white/80 rounded-lg border border-slate-200/50 hover:border-[#4FC3F7]/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-semibold text-slate-700">{preset.name}</h5>
                            {preset.is_default && (
                              <span className="px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] rounded text-xs font-medium border border-[#FFD700]/40">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>Quality: {preset.quality} @ {preset.frame_rate}fps</p>
                            {preset.bitrate && <p>Bitrate: {preset.bitrate} kbps</p>}
                            {preset.auto_adjust_quality && <p>Auto-adjust: Enabled</p>}
                            {preset.enable_screen && <p>Screen sharing: Enabled</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleDefault(preset)}
                            className="p-2 rounded-lg hover:bg-slate-100/50 text-slate-600 transition-colors"
                            title={preset.is_default ? 'Remove as default' : 'Set as default'}
                          >
                            {preset.is_default ? (
                              <Star className="h-4 w-4 text-[#FFD700]" fill="#FFD700" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onPresetSelect(preset)}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all text-xs font-medium"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            disabled={deletePresetMutation.isPending}
                            className="p-2 rounded-lg hover:bg-red-50/50 text-red-500 transition-colors disabled:opacity-50"
                            title="Delete preset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingPresetsManager;

