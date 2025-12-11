import React, { useState } from 'react';
import { Users, UsersIcon as ChaptersIcon, Shield, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserManagement from '@/components/admin/users/UserManagement';
import ChapterManagement from './config/ChapterManagement';
import RolesPermissionsManagement from './config/RolesPermissionsManagement';
import ChapterRolesManagement from '@/components/admin/users/ChapterRolesManagement';
import { brandColors } from '@/theme/brand';

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'users' | 'chapters' | 'roles' | 'chapter-roles'>('users');

  const tabs = [
    { id: 'users', label: t('nav.students', 'Members'), icon: Users },
    { id: 'chapters', label: t('nav.chapters', 'Chapters'), icon: ChaptersIcon },
    { id: 'chapter-roles', label: t('admin.chapter_roles', 'Chapter Roles'), icon: UserCog },
    { id: 'roles', label: t('admin.permissions', 'Permissions'), icon: Shield },
  ];

  return (
    <div className="w-full h-full overflow-hidden bg-gray-50/50">
      <div className="w-full h-full space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-6rem)] max-w-full">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-all border-b-2 whitespace-nowrap min-w-[120px] ${
                    isActive
                      ? 'bg-indigo-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor: isActive ? brandColors.accentHex : 'transparent',
                    color: isActive ? brandColors.primaryHex : undefined
                  }}
                >
                  <tab.icon className={`h-4 w-4 ${isActive ? '' : 'text-gray-400'}`} style={{ color: isActive ? brandColors.primaryHex : undefined }} />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-gray-50/30">
            {activeTab === 'users' && (
              <div className="animate-in fade-in duration-300 w-full h-full">
                <UserManagement />
              </div>
            )}
            {activeTab === 'chapters' && (
              <div className="animate-in fade-in duration-300 w-full h-full">
                <ChapterManagement />
              </div>
            )}
            {activeTab === 'chapter-roles' && (
              <div className="animate-in fade-in duration-300 w-full h-full">
                <ChapterRolesManagement />
              </div>
            )}
            {activeTab === 'roles' && (
              <div className="animate-in fade-in duration-300 w-full min-w-0 h-full">
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

