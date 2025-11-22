import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Search, Filter } from 'lucide-react';
import ForumCard from '@/components/shared/social/ForumCard';
import { useForums } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

interface ForumsProps {
  embedded?: boolean;
}

const Forums: React.FC<ForumsProps> = ({ embedded = false }) => {
  const { forums, loading, error } = useForums();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredForums = forums.filter(forum =>
    forum.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    forum.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-12 bg-stone-200 rounded-xl w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-red-200 p-6 shadow-md">
          <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Error Loading Forums
          </h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50"}>
      <div className={embedded ? "" : "p-6 lg:p-8"}>
        {/* Ethiopian Orthodox Themed Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Chapter Forums</h1>
                <p className="text-lg text-stone-600 mt-1">Join faith-based discussions with your Orthodox community</p>
              </div>
            </div>
            {hasPermission('discussion:create') && (
              <Link
                to="/forums/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Create Forum
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="🔍 Search forums by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-stone-700 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('discussion:create') && (
                <Link
                  to="/forums/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  ✏️ Create Forum
                </Link>
              )}
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-300 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-[#27AE60]/10 to-[#27AE60]/5 rounded-xl p-4 border border-[#27AE60]/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
                <div>
                  <div className="text-2xl font-bold text-[#27AE60]">{forums.length}</div>
                  <div className="text-sm text-stone-600 font-medium">Total Forums</div>
                </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#16A085]/10 to-[#16A085]/5 rounded-xl p-4 border border-[#16A085]/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#16A085] to-[#2980B9] rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">✨</span>
              </div>
                <div>
                  <div className="text-2xl font-bold text-[#16A085]">{forums.filter(f => f.is_active).length}</div>
                  <div className="text-sm text-stone-600 font-medium">Active Forums</div>
                </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#2980B9]/10 to-[#2980B9]/5 rounded-xl p-4 border border-[#2980B9]/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#2980B9] to-[#27AE60] rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🌍</span>
              </div>
                <div>
                  <div className="text-2xl font-bold text-[#2980B9]">{forums.filter(f => f.is_public).length}</div>
                  <div className="text-sm text-stone-600 font-medium">Public Forums</div>
                </div>
            </div>
          </div>
        </div>

      {/* Forums Grid */}
      <div className="space-y-2">
        {filteredForums.length > 0 ? (
          filteredForums.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-r from-stone-50 to-neutral-50 rounded-xl border border-stone-200 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-[#27AE60]" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">
              {searchTerm ? 'No forums found' : 'No forums available yet'}
            </h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              {searchTerm
                ? '🙏 Try different search terms or browse all forums'
                : '🙏 Be the first to start a faith-based discussion in your chapter. Share wisdom, ask questions, and grow together in Orthodox tradition.'}
            </p>
            {!searchTerm && hasPermission('discussion:create') && (
              <div className="mt-6">
                <Link
                  to="/forums/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  ✏️ Create First Forum
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Forums;