import React from 'react';
import { TrendingUp, Filter, Hash, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CommunitySidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const CommunitySidebar: React.FC<CommunitySidebarProps> = ({
  activeFilter,
  onFilterChange
}) => {
  const filters = [
    { id: 'all', label: 'All Posts', icon: <Filter className="w-4 h-4" /> },
    { id: 'discussion', label: 'Discussions', icon: <Users className="w-4 h-4" /> },
    { id: 'showcase', label: 'Media Showcase', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'qa', label: 'Q&A', icon: <Hash className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 px-2">Filters</h3>
        <div className="space-y-1">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#27AE60]/10 text-[#27AE60]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 px-2">Community</h3>
        <div className="space-y-1">
          <Link 
            to="/leaderboards"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Award className="w-4 h-4 text-yellow-500" />
            Leaderboards
          </Link>
          <Link 
            to="/forums"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-500" />
            Forums
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CommunitySidebar;
