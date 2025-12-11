import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Video, Mic, FileText, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { communityPostsApi } from '@/services/api/communityPosts';
import type { Post } from '@/components/shared/social/PostCard';
import { brandColors } from '@/theme/brand';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'audio' | 'article' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (type: 'image' | 'video' | 'audio' | 'article') => {
    setSelectedMediaType(type);
    setIsExpanded(true);
    if (type !== 'article' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setSelectedMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;

    try {
      setIsSubmitting(true);
      setError(null);
      let mediaUrl = '';

      if (mediaFile) {
        const uploadResult = await communityPostsApi.uploadMedia(mediaFile, (progress) => {
          setUploadProgress(progress);
        });
        mediaUrl = uploadResult.data.url;
      }

      const payload = {
        content,
        mediaType: selectedMediaType || undefined,
        mediaUrl: mediaUrl || undefined
      };

      const response = await communityPostsApi.createPost(payload);
      onPostCreated(response.data.post);
      
      // Reset form
      setContent('');
      clearMedia();
      setIsExpanded(false);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Failed to create post', err);
      setError(err?.response?.data?.message || err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 transition-all duration-200 hover:shadow-md">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt={user.firstName} 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-100" 
            />
          ) : (
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={{ background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.primaryHoverHex})` }}
            >
              {user?.firstName?.[0] || 'U'}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div 
            className={`relative transition-all duration-200 ${isExpanded ? 'min-h-[120px]' : 'min-h-[48px]'}`}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={t('community.share_thoughts', { name: user?.firstName || 'friend' })}
              className="w-full h-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:#1e1b4b] focus:bg-white resize-none transition-all duration-200 text-gray-700 placeholder-gray-400"
              style={{ minHeight: isExpanded ? '120px' : '48px' }}
            />
          </div>

          {mediaPreview && (
            <div className="relative mt-4 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedMediaType === 'image' ? (
                <img src={mediaPreview} alt="Preview" className="max-h-80 w-full object-contain" />
              ) : (
                <video src={mediaPreview} controls className="max-h-80 w-full" />
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <div className={`flex items-center justify-between mt-4 pt-3 border-t border-gray-100 ${!isExpanded && !mediaPreview ? 'hidden' : ''}`}>
            <div className="flex gap-1 sm:gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
              />
              <MediaTypeButton 
                icon={<Image className="w-5 h-5" />} 
                label="Photo" 
                onClick={() => handleMediaSelect('image')}
                active={selectedMediaType === 'image'}
              />
              <MediaTypeButton 
                icon={<Video className="w-5 h-5" />} 
                label="Video" 
                onClick={() => handleMediaSelect('video')}
                active={selectedMediaType === 'video'}
              />
              <MediaTypeButton 
                icon={<Mic className="w-5 h-5" />} 
                label="Audio" 
                onClick={() => handleMediaSelect('audio')}
                active={selectedMediaType === 'audio'}
              />
              <MediaTypeButton 
                icon={<FileText className="w-5 h-5" />} 
                label="Article" 
                onClick={() => handleMediaSelect('article')}
                active={selectedMediaType === 'article'}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !mediaFile)}
              className="px-6 py-2 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 bg-[color:#1e1b4b] hover:bg-[color:#312e81]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress ? `${Math.round(uploadProgress)}%` : 'Posting...'}
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MediaTypeButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  active?: boolean;
}> = ({ icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={`p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-2 transition-colors ${
      active 
        ? 'bg-[color:#1e1b4b]/10 text-[color:#1e1b4b]' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`}
    title={label}
  >
    {icon}
    <span className="hidden sm:inline text-sm font-medium">{label}</span>
  </button>
);

export default CreatePost;
