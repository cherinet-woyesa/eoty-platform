import React, { useState } from 'react';
import { Users, Lock, Globe2, MessageSquare, Eye, Heart, Pin, Share2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export type DiscussionVisibility = 'public' | 'chapter' | 'private';

export interface DiscussionCardData {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  visibility: DiscussionVisibility;
  replies: number;
  lastActivity: string;
  participants?: string[]; // avatar URLs or initials
  author?: string;
  pinned?: boolean;
  locked?: boolean;
  forumName?: string;
  views?: number;
  likes?: number;
  userLiked?: boolean;
}

interface Props {
  discussion: DiscussionCardData;
  onClick?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onLike?: (id: string) => Promise<void> | void;
}

const visibilityBadge = (visibility: DiscussionVisibility) => {
  switch (visibility) {
    case 'public':
      return { label: 'Public', icon: Globe2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'chapter':
      return { label: 'Chapter', icon: Users, color: 'text-[#1e1b4b] bg-[#1e1b4b]/10 border-[#1e1b4b]/20' };
    default:
      return { label: 'Private', icon: Lock, color: 'text-amber-600 bg-amber-50 border-amber-200' };
  }
};

const DiscussionCard: React.FC<Props> = ({ discussion, onClick, onTagClick, onLike }) => {
  const badge = visibilityBadge(discussion.visibility);
  const { showNotification } = useNotification();
  const [copied, setCopied] = useState(false);
  const [localLiked, setLocalLiked] = useState(!!discussion.userLiked);
  const [localLikes, setLocalLikes] = useState(discussion.likes ?? 0);
  const [liking, setLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localLiked || liking) return;
    try {
      setLiking(true);
      await onLike?.(discussion.id);
      setLocalLiked(true);
      setLocalLikes((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to like card', err);
      showNotification({ type: 'error', title: 'Like failed', message: 'Could not like this discussion.' });
    } finally {
      setLiking(false);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Dynamically determine the link based on current path to maintain context
    const currentPath = window.location.pathname;
    const isCommunity = currentPath.includes('/community');
    const pathParts = currentPath.split('/');

    let prefix = '';
    if (pathParts[1] === 'admin') prefix = '/admin';
    else if (pathParts[1] === 'teacher') prefix = '/teacher';
    else if (pathParts[1] === 'member') prefix = '/member';

    let linkPath = `/forums/${discussion.id}/thread`;
    if (isCommunity) {
      linkPath = `${prefix}/community/forums/${discussion.id}/thread`;
    }

    const link = `${window.location.origin}${linkPath}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }
      setCopied(true);
      showNotification({ type: 'success', title: 'Link copied', message: 'Discussion link copied.' });
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy link', err);
      showNotification({ type: 'error', title: 'Copy failed', message: 'Could not copy the link.' });
    }
  };

  return (
    <div
      onClick={() => onClick?.(discussion.id)}
      className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col h-full"
    >
      {/* Status indicators */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {discussion.pinned && (
          <Pin className="h-4 w-4 text-amber-500 fill-current" />
        )}
        {discussion.locked && (
          <Lock className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Header: Author & Date */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
          {discussion.author ? discussion.author.charAt(0).toUpperCase() : 'M'}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 leading-none">
            {discussion.author || 'Member'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            {discussion.lastActivity}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
        {discussion.title}
      </h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4 mt-auto">
        {discussion.tags.slice(0, 2).map((tag) => (
          <span 
            key={tag} 
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(tag);
            }}
            className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer: Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-gray-500">
          <button 
            onClick={handleLike}
            className="flex items-center gap-1.5 hover:text-rose-600 transition-colors" 
            title="Likes"
          >
            <Heart className={`h-4 w-4 ${localLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-xs font-bold">{localLikes}</span>
          </button>
          <div className="flex items-center gap-1.5" title="Replies">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-bold">{discussion.replies}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Views">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-bold">{discussion.views || 0}</span>
          </div>
        </div>
        
        <button
          onClick={handleCopyLink}
          className="text-gray-400 hover:text-indigo-600 transition-colors"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DiscussionCard;
