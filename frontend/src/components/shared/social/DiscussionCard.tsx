import React, { useState } from 'react';
import { Users, Lock, Globe2, Tag, MessageSquare, Clock, Share2, Check, Eye, Heart, Pin, Shield } from 'lucide-react';
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
    const link = `${window.location.origin}/forums/${discussion.id}/thread`;
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
      className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-[#1e1b4b]/20 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/5 via-transparent to-[#cfa15a]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Status indicators - Absolute positioned */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        {discussion.pinned && (
          <div className="p-1.5 rounded-full bg-[#cfa15a]/10 text-[#cfa15a] border border-[#cfa15a]/20" title="Pinned">
            <Pin className="h-3.5 w-3.5" />
          </div>
        )}
        {discussion.locked && (
          <div className="p-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200" title="Locked">
            <Lock className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="relative space-y-4">
        {/* Header: Author, Category, Date */}
        <div className="flex items-center gap-3 pr-16">
          {/* Author Avatar */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white flex items-center justify-center text-sm font-bold shadow-sm">
            {discussion.author ? discussion.author.charAt(0).toUpperCase() : 'M'}
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">
                {discussion.author || 'Member'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">{discussion.lastActivity}</span>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.color}`}>
                <badge.icon className="h-3 w-3" />
                {badge.label}
              </span>
              {discussion.forumName && (
                <>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {discussion.forumName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Body: Title, Excerpt */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-[#1e1b4b] transition-colors">
            {discussion.title}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {discussion.excerpt}
          </p>
        </div>

        {/* Tags */}
        {discussion.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {discussion.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
                className="inline-flex items-center px-2.5 py-1 bg-slate-50 hover:bg-[#1e1b4b]/5 text-slate-600 hover:text-[#1e1b4b] text-xs font-medium rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={localLiked || liking}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                localLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              <Heart className={`h-4 w-4 ${localLiked ? 'fill-current' : ''}`} />
              <span>{localLikes}</span>
            </button>

            {/* Reply */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <MessageSquare className="h-4 w-4" />
              <span>{discussion.replies}</span>
            </div>

            {/* Views */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <Eye className="h-4 w-4" />
              <span>{discussion.views || 0}</span>
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#1e1b4b] transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionCard;

