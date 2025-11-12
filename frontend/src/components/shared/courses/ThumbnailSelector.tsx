import React, { useState, useEffect } from 'react';
import { Image, Loader, Check, X } from 'lucide-react';
import { thumbnailsApi, type ThumbnailOption } from '@/services/api';
import { formatTime } from '@/utils/formatters';
import { useNotification } from '@/context/NotificationContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ThumbnailSelectorProps {
  lessonId: string;
  currentThumbnailUrl?: string | null;
  onThumbnailSelected: (thumbnailUrl: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({
  lessonId,
  currentThumbnailUrl,
  onThumbnailSelected,
  onClose,
  isOpen
}) => {
  const { showNotification } = useNotification();
  const [thumbnails, setThumbnails] = useState<ThumbnailOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isOpen && lessonId) {
      loadThumbnails();
    }
  }, [isOpen, lessonId]);

  const loadThumbnails = async () => {
    setLoading(true);
    try {
      const data = await thumbnailsApi.generateThumbnails(lessonId, {
        count: 12,
        width: 640,
        height: 360
      });
      setThumbnails(data.thumbnails);
      setDuration(data.duration);
      setSelectedThumbnail(currentThumbnailUrl || null);
    } catch (error: any) {
      console.error('Failed to load thumbnails:', error);
      showNotification({
        type: 'error',
        title: 'Failed to Load Thumbnails',
        message: error.message || 'Unable to generate thumbnails. Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectThumbnail = (thumbnail: ThumbnailOption) => {
    setSelectedThumbnail(thumbnail.url);
  };

  const handleSave = async () => {
    if (!selectedThumbnail) {
      showNotification({
        type: 'warning',
        title: 'No Thumbnail Selected',
        message: 'Please select a thumbnail before saving.',
        duration: 3000
      });
      return;
    }

    setSaving(true);
    try {
      await thumbnailsApi.updateThumbnail(lessonId, selectedThumbnail);
      onThumbnailSelected(selectedThumbnail);
      showNotification({
        type: 'success',
        title: 'Thumbnail Updated',
        message: 'The lesson thumbnail has been updated successfully.',
        duration: 3000
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save thumbnail:', error);
      showNotification({
        type: 'error',
        title: 'Failed to Save Thumbnail',
        message: error.message || 'Unable to save thumbnail. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <h3 className="text-xl font-bold text-slate-700 flex items-center space-x-2">
            <Image className="h-6 w-6 text-slate-600" />
            <span>Select Video Thumbnail</span>
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-slate-600 mt-4">Generating thumbnails...</p>
            </div>
          ) : thumbnails.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Image className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p>No thumbnails available</p>
              <p className="text-sm mt-2">Thumbnails will be generated from your video</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Select a thumbnail for this lesson. Thumbnails are generated at evenly spaced intervals.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {thumbnails.map((thumbnail) => {
                  const isSelected = selectedThumbnail === thumbnail.url;
                  return (
                    <button
                      key={thumbnail.id}
                      onClick={() => handleSelectThumbnail(thumbnail)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-[#4FC3F7] shadow-lg shadow-[#4FC3F7]/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="aspect-video bg-slate-100 relative">
                        <img
                          src={thumbnail.url}
                          alt={`Thumbnail at ${formatTime(thumbnail.timestamp)}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect fill="%23e2e8f0" width="640" height="360"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="16"%3EThumbnail%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#4FC3F7]/20 flex items-center justify-center">
                            <div className="bg-[#4FC3F7] text-white rounded-full p-2">
                              <Check className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                          {formatTime(thumbnail.timestamp)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/50 transition-all duration-200 text-slate-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedThumbnail || saving}
            className="px-6 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all duration-200 font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>Save Thumbnail</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailSelector;

