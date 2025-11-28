import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, BookOpen, Users, Globe, ArrowLeft, Plus, FolderOpen, Search, Filter } from 'lucide-react';
import { resourcesApi } from '@/services/api/resources';
import { coursesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Resource } from '@/types/resources';

const TeacherResourcePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState<'chapter_wide' | 'platform_wide'>('chapter_wide');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadResources();
    loadCourses();
  }, [selectedScope]);

  const loadResources = async () => {
    try {
      setLoading(true);
      let response;

      if (selectedScope === 'platform_wide') {
        response = await resourcesApi.getPlatformResources({ search: searchTerm });
      } else {
        response = await resourcesApi.getChapterResources(user?.chapter_id?.toString() || '', { search: searchTerm });
      }

      if (response.success) {
        setResources(response.data.resources || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await coursesApi.getTeacherCourses();
      if (response.success) {
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Debounce search
    setTimeout(() => loadResources(), 300);
  };

  const tabs = [
    {
      id: 'upload' as const,
      label: 'Upload Resources',
      icon: Upload,
      description: 'Add new educational materials'
    },
    {
      id: 'manage' as const,
      label: 'Manage Resources',
      icon: FolderOpen,
      description: 'View and organize uploaded resources'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Ethiopian Orthodox Themed Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-8 border border-[#27AE60]/25 shadow-xl mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">📚 Resource Management</h1>
                <p className="text-lg text-stone-600 mt-1">Upload and manage educational resources for Orthodox learning</p>
              </div>
            </div>
            <Link
              to="/teacher/dashboard"
              className="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-200 hover:border-[#27AE60]/40 text-stone-700 hover:text-[#27AE60] text-sm font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <nav className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Platform-wide Upload Card */}
              <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-xl border-2 border-blue-200/50 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                   onClick={() => window.location.href = '/teacher/resources/upload?scope=platform'}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">🌍 Platform Resources</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Available to all Orthodox communities worldwide
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Admin Only
                  </span>
                </div>
              </div>

              {/* Chapter-wide Upload Card */}
              <div className="bg-gradient-to-br from-white to-green-50/50 rounded-xl border-2 border-green-200/50 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                   onClick={() => window.location.href = '/teacher/resources/upload?scope=chapter'}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 Chapter Resources</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Shared with all members of your chapter
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Chapter Wide
                  </span>
                </div>
              </div>

              {/* Course-specific Upload Card */}
              <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-xl border-2 border-purple-200/50 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                   onClick={() => window.location.href = '/teacher/resources/upload?scope=course'}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">📖 Course Resources</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Specific to individual courses and lessons
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Course Specific
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl border border-stone-200 shadow-xl overflow-hidden">
              {/* Filters */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search resources..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedScope}
                      onChange={(e) => setSelectedScope(e.target.value as 'chapter_wide' | 'platform_wide')}
                    >
                      <option value="chapter_wide">Chapter Resources</option>
                      {isAdmin && <option value="platform_wide">Platform Resources</option>}
                    </select>
                  </div>
                  <div className="text-sm text-gray-600">
                    {resources.length} resources found
                  </div>
                </div>
              </div>

              {/* Resources Grid */}
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27AE60]"></div>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
                    <p className="text-gray-600 mb-4">Start by uploading some educational materials</p>
                    <Link
                      to="/teacher/resources/upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#27AE60]/90"
                    >
                      <Plus className="h-4 w-4" />
                      Upload First Resource
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => window.open(`/resources/${resource.id}`, '_blank')}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">
                            {resource.file_type.includes('pdf') ? '📄' :
                             resource.file_type.includes('image') ? '🖼️' :
                             resource.file_type.includes('video') ? '🎬' :
                             resource.file_type.includes('audio') ? '🎵' : '📝'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate mb-1">
                              {resource.title}
                            </h3>
                            {resource.category && (
                              <span className="inline-block px-2 py-1 text-xs bg-[#27AE60]/10 text-[#27AE60] rounded-full mb-2">
                                {resource.category}
                              </span>
                            )}
                            {resource.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{resource.author}</span>
                              <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherResourcePage;
