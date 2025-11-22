import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Lock } from 'lucide-react';
import type { Forum } from '@/types/community';

interface ForumCardProps {
  forum: Forum;
}

const ForumCard: React.FC<ForumCardProps> = ({ forum }) => {
  // Determine color scheme based on forum type
  const getColorScheme = () => {
    if (!forum.is_public) return { bg: '#2980B9', light: '#2980B9' }; // Private - Blue
    if (forum.category === 'Scripture') return { bg: '#27AE60', light: '#27AE60' }; // Scripture - Green
    if (forum.category === 'Theology') return { bg: '#16A085', light: '#16A085' }; // Theology - Teal
    return { bg: '#27AE60', light: '#27AE60' }; // Default - Green
  };

  const colors = getColorScheme();

  return (
    <Link
      to={`/forums/${forum.id}`}
      className="block bg-white/90 backdrop-blur-md rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-stone-200 hover:border-[#27AE60]/30 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 bg-gradient-to-r from-[${colors.bg}]/20 to-[${colors.light}]/10 rounded-xl border border-[${colors.bg}]/20`}>
            <MessageSquare className={`h-6 w-6 text-[${colors.bg}]`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-stone-800 group-hover:text-[#27AE60] transition-colors">
              {forum.title}
            </h3>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed line-clamp-2">
              {forum.description}
            </p>
            {forum.category && (
              <span className={`inline-flex items-center px-2 py-1 mt-2 rounded-full text-xs font-medium bg-[${colors.bg}]/10 text-[${colors.bg}] border border-[${colors.bg}]/20`}>
                {forum.category}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            {!forum.is_public && <Lock className="h-4 w-4 text-amber-600" title="Private Forum" />}
            <Users className="h-4 w-4" />
            <span className="font-medium">Chapter</span>
          </div>

          {forum.is_public && (
            <span className="inline-flex items-center px-2 py-1 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-full border border-[#27AE60]/20">
              🌍 Public
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-stone-200">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            forum.is_active
              ? 'bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 text-[#27AE60] border border-[#27AE60]/20'
              : 'bg-stone-100 text-stone-600 border border-stone-200'
          }`}>
            {forum.is_active ? '✨ Active' : '📦 Archived'}
          </span>

          {forum.topic_count !== undefined && (
            <span className="text-xs text-stone-500 bg-stone-50 px-2 py-1 rounded-md">
              📄 {forum.topic_count} topics
            </span>
          )}
        </div>

        <div className="text-xs text-stone-500">
          🙏 Orthodox Community
        </div>
      </div>
    </Link>
  );
};

export default ForumCard;