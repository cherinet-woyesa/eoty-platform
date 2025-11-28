import React, { useState } from 'react';
import { Users, UsersIcon as ChaptersIcon, Shield, UserCog } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import ChapterManagement from './config/ChapterManagement';
import RolesPermissionsManagement from './config/RolesPermissionsManagement';
import ChapterRolesManagement from '@/components/admin/ChapterRolesManagement';

const AdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'chapters' | 'roles' | 'chapter-roles'>('users');

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="w-full h-full space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-6rem)] max-w-full">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-xs">Users</span>
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'chapters'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ChaptersIcon className="h-4 w-4" />
              <span className="text-xs">Chapters</span>
            </button>
            <button
              onClick={() => setActiveTab('chapter-roles')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'chapter-roles'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <UserCog className="h-4 w-4" />
              <span className="text-xs">Chapter Roles</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'roles'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs">Permissions</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
            {activeTab === 'users' && (
              <div className="animate-in fade-in duration-300 w-full">
                <UserManagement />
              </div>
            )}
            {activeTab === 'chapters' && (
              <div className="animate-in fade-in duration-300 w-full">
                <ChapterManagement />
              </div>
            )}
            {activeTab === 'chapter-roles' && (
              <div className="animate-in fade-in duration-300 w-full">
                <ChapterRolesManagement />
              </div>
            )}
            {activeTab === 'roles' && (
              <div className="animate-in fade-in duration-300 w-full min-w-0">
                <RolesPermissionsManagement />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;

