import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Video, Clock, CheckCircle, AlertTriangle, Eye, MoreVertical } from 'lucide-react';

interface ContentItem {
  id: string;
  type: 'course' | 'lesson' | 'resource' | 'quiz';
  title: string;
  description: string;
  status: 'published' | 'pending' | 'draft' | 'rejected';
  uploadDate: string;
  author: string;
  reviewStatus: 'approved' | 'pending' | 'needs_revision';
  views?: number;
  duration?: number;
  fileSize?: string;
}

interface ContentManagementPreviewProps {
  content?: ContentItem[];
  compact?: boolean;
}

const ContentManagementPreview: React.FC<ContentManagementPreviewProps> = ({ 
  content = [], 
  compact = false 
}) => {
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <FileText className="h-4 w-4" />;
      case 'lesson':
        return <Video className="h-4 w-4" />;
      case 'resource':
        return <FileText className="h-4 w-4" />;
      case 'quiz':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'needs_revision':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleContentAction = useCallback((contentId: string, action: string) => {
    console.log(`Action ${action} on content ${contentId}`);
  }, []);

  const pendingContent = content.filter(item => item.status === 'pending' || item.reviewStatus === 'pending');
  const recentContent = content
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, compact ? 4 : 6);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Queue</h3>
          <Link
            to="/admin/content"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage All
          </Link>
        </div>
        
        {/* Pending Alerts */}
        {pendingContent.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {pendingContent.length} items pending review
              </span>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="space-y-3">
          {recentContent.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getContentIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {item.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>by {item.author}</span>
                    <span>•</span>
                    <span>{formatDate(item.uploadDate)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleContentAction(item.id, 'view')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {content.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No content available</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{content.length}</div>
            <div className="text-xs text-gray-500">Total Items</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">{pendingContent.length}</div>
            <div className="text-xs text-gray-500">Pending Review</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Content Management</h2>
          <p className="text-gray-600 mt-1">Manage and review platform content</p>
        </div>
        <Link
          to="/admin/content"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Manage Content
        </Link>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{content.length}</div>
          <div className="text-sm text-blue-700">Total Content</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {content.filter(item => item.status === 'published').length}
          </div>
          <div className="text-sm text-green-700">Published</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {content.filter(item => item.status === 'pending').length}
          </div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {content.filter(item => item.status === 'rejected').length}
          </div>
          <div className="text-sm text-red-700">Rejected</div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Recent Content</h3>
        {recentContent.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  {getContentIcon(item.type)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {item.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getReviewStatusColor(item.reviewStatus)}`}>
                    {item.reviewStatus}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2 line-clamp-1">
                  {item.description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>by {item.author}</span>
                  <span>•</span>
                  <span>{formatDate(item.uploadDate)}</span>
                  {item.views && (
                    <>
                      <span>•</span>
                      <span>{item.views} views</span>
                    </>
                  )}
                  {item.duration && (
                    <>
                      <span>•</span>
                      <span>{item.duration}m</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleContentAction(item.id, 'view')}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="View content"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleContentAction(item.id, 'more')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {content.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-600">
            Content management data will appear here once users start uploading content.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex items-center space-x-3">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Review Pending
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          Bulk Actions
        </button>
      </div>
    </div>
  );
};

export default React.memo(ContentManagementPreview);