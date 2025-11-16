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
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-stone-800">Community Forums</h1>
            </div>
            <p className="text-stone-600 font-medium">Join discussions with your chapter members</p>
          </div>
          {hasPermission('discussion:create') && (
            <Link
              to="/forums/create"
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Forum
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search forums and posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]/50 focus:border-[#27AE60] text-stone-700"
            />
          </div>
          <button className="inline-flex items-center px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-lg transition-all duration-200">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="text-3xl font-bold text-[#27AE60] mb-1">{forums.length}</div>
          <div className="text-sm text-stone-600 font-medium">Total Forums</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="text-3xl font-bold text-[#16A085] mb-1">
            {forums.filter(f => f.is_active).length}
          </div>
          <div className="text-sm text-stone-600 font-medium">Active Forums</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border border-stone-200 shadow-md text-center">
          <div className="text-3xl font-bold text-[#2980B9] mb-1">
            {forums.filter(f => f.is_public).length}
          </div>
          <div className="text-sm text-stone-600 font-medium">Public Forums</div>
        </div>
      </div>

      {/* Forums Grid */}
      <div className="space-y-4 sm:space-y-6">
        {filteredForums.length > 0 ? (
          filteredForums.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))
        ) : (
          <div className="text-center py-12 bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md">
            <MessageSquare className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">No forums found</h3>
            <p className="text-stone-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No forums available for your chapter yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forums;