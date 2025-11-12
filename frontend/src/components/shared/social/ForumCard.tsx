import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Lock } from 'lucide-react';
import type { Forum } from '@/types/community';

interface ForumCardProps {
  forum: Forum;
}

const ForumCard: React.FC<ForumCardProps> = ({ forum }) => {
  return (
    <Link 
      to={`/forums/${forum.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{forum.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{forum.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {!forum.is_public && <Lock className="h-4 w-4" />}
          <Users className="h-4 w-4" />
          <span>Chapter Forum</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className={`px-2 py-1 rounded-full text-xs ${
          forum.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {forum.is_active ? 'Active' : 'Archived'}
        </span>
        
        <div className="flex items-center space-x-4">
          <span>Public: {forum.is_public ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </Link>
  );
};

export default ForumCard;