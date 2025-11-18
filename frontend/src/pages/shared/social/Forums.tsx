import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Search, Filter } from 'lucide-react';
import ForumCard from '@/components/shared/social/ForumCard';
import { useForums } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

const Forums: React.FC = () => {
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
    <div className="w-full space-y-2 p-2">
      {/* Compact Header with New Forum Button */}
      <div className="flex items-center justify-between mb-3">
        {hasPermission('discussion:create') && (
          <Link
            to="/forums/create"
            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-xs font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            New Forum
          </Link>
        )}
      </div>

      {/* Compact Search and Filters */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search forums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700 text-sm"
            />
          </div>
          <button className="inline-flex items-center px-3 py-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-xs font-semibold rounded-lg transition-all duration-200">
            <Filter className="h-3 w-3 mr-1.5" />
            Filters
          </button>
        </div>
      </div>

      {/* Compact Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm text-center">
          <div className="text-xl font-bold text-[#27AE60] mb-0.5">{forums.length}</div>
          <div className="text-xs text-stone-600 font-medium">Total Forums</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm text-center">
          <div className="text-xl font-bold text-[#16A085] mb-0.5">
            {forums.filter(f => f.is_active).length}
          </div>
          <div className="text-xs text-stone-600 font-medium">Active Forums</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-3 border border-stone-200 shadow-sm text-center">
          <div className="text-xl font-bold text-[#2980B9] mb-0.5">
            {forums.filter(f => f.is_public).length}
          </div>
          <div className="text-xs text-stone-600 font-medium">Public Forums</div>
        </div>
      </div>

      {/* Forums Grid */}
      <div className="space-y-2">
        {filteredForums.length > 0 ? (
          filteredForums.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))
        ) : (
          <div className="text-center py-8 bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 shadow-sm">
            <MessageSquare className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-stone-800 mb-1">No forums found</h3>
            <p className="text-xs text-stone-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No forums available for your chapter yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forums;