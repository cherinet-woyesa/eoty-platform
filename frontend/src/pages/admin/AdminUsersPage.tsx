import React, { useState } from 'react';
import { Users, UsersIcon as ChaptersIcon, Shield } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import ChapterManagement from './config/ChapterManagement';

const AdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'chapters' | 'roles'>('users');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm">User Management</span>
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'chapters'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ChaptersIcon className="h-4 w-4" />
              <span className="text-sm">Chapters</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'roles'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm">Roles & Permissions</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'users' && (
              <div className="animate-in fade-in duration-300">
                <UserManagement />
              </div>
            )}
            {activeTab === 'chapters' && (
              <div className="animate-in fade-in duration-300">
                <ChapterManagement />
              </div>
            )}
            {activeTab === 'roles' && (
              <div className="animate-in fade-in duration-300 p-6">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-8 text-center">
                  <Shield className="h-16 w-16 text-[#E74C3C] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Roles & Permissions</h3>
                  <p className="text-gray-600">Manage user roles and access permissions</p>
                  {/* TODO: Implement roles and permissions management */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;

