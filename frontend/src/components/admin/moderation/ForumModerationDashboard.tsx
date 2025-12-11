import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { brandColors } from '@/theme/brand';
import { 
  Shield, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  BarChart, 
  Eye, 
  Clock, 
  Flag, 
  CheckCircle, 
  EyeOff, 
  Trash2, 
  AlertCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

interface ReportedPost {
  id: number;
  content: string;
  report_count: number;
  reports: string;
  created_at: string;
  first_name: string;
  last_name: string;
  topic_title: string;
  status?: string;
}

interface ModerationStat {
  total_reports: number;
  pending_moderation: number;
  total_moderation_actions: number;
  flagged_content: number;
}

const ForumModerationDashboard: React.FC = () => {
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [stats, setStats] = useState<ModerationStat>({
    total_reports: 0,
    pending_moderation: 0,
    total_moderation_actions: 0,
    flagged_content: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'flagged' | 'actions'>('reports');
  const [selectedPost, setSelectedPost] = useState<ReportedPost | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<{
    post: ReportedPost | null;
    action: 'approve' | 'hide' | 'delete' | 'warn' | null;
    showModal: boolean;
  }>({
    post: null,
    action: null,
    showModal: false
  });
  const [moderationReason, setModerationReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchModerationData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !showContentModal && !moderationAction.showModal) {
        fetchModerationData();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loading, showContentModal, moderationAction.showModal]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use adminApi service instead of direct fetch
      const response = await adminApi.getForumReports();

      if (response.success && response.data) {
        const data = response.data;
        
        // Transform the data to match our interface
        const transformedPosts: ReportedPost[] = data.reports?.map((report: any) => ({
          id: report.id,
          content: report.content || report.topic_content,
          report_count: report.report_count || 1,
          reports: JSON.stringify(report.reports || []),
          created_at: report.created_at,
          first_name: report.author_first_name || 'Unknown',
          last_name: report.author_last_name || '',
          topic_title: report.topic_title || 'Forum Topic',
          status: report.status || 'pending'
        })) || [];

        // Calculate stats
        const stats: ModerationStat = {
          total_reports: data.total_reports || transformedPosts.length,
          pending_moderation: data.pending_reports || transformedPosts.filter(p => p.report_count > 0).length,
          total_moderation_actions: data.resolved_reports || 0,
          flagged_content: data.flagged_content || transformedPosts.length
        };

        setStats(stats);
        setReportedPosts(transformedPosts);
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err: any) {
      console.error('Failed to fetch moderation data:', err);
      setError(`Failed to load forum moderation data: ${err.message}`);
      setReportedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (post: ReportedPost) => {
    setSelectedPost(post);
    setShowContentModal(true);
  };

  const openModerationModal = (post: ReportedPost, action: 'approve' | 'hide' | 'delete' | 'warn') => {
    setModerationAction({
      post,
      action,
      showModal: true
    });
    setModerationReason('');
  };

  const closeModerationModal = () => {
    setModerationAction({
      post: null,
      action: null,
      showModal: false
    });
    setModerationReason('');
  };

  const handleModeratePost = async () => {
    if (!moderationAction.post || !moderationAction.action) return;

    const { post, action } = moderationAction;

    if (!moderationReason.trim() && action !== 'approve') {
      alert('Please provide a reason for this moderation action');
      return;
    }

    setIsProcessingAction(true);
    try {
      // Call the backend API to moderate the forum report
      const response = await adminApi.moderateForumReport(post.id, action, moderationReason);

      if (response.success) {
        // Remove the moderated post from the list
        setReportedPosts(prev => prev.filter(p => p.id !== post.id));

        // Update stats
        setStats(prev => ({
          ...prev,
          pending_moderation: Math.max(0, prev.pending_moderation - 1),
          total_moderation_actions: prev.total_moderation_actions + 1
        }));

        closeModerationModal();
      } else {
        throw new Error(response.message || 'Failed to moderate post');
      }
    } catch (err: any) {
      console.error('Failed to moderate post:', err);
      setError('Failed to moderate forum report: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Filter posts based on search
  const filteredPosts = reportedPosts.filter(post => 
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.topic_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${post.first_name} ${post.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: brandColors.primaryHex }} />
          <p className="text-gray-600 text-lg">Loading moderation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forum Moderation</h1>
          <p className="text-gray-500 mt-1">Review and manage reported content</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchModerationData}
            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_moderation}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actions Taken</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_moderation_actions}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Auto-Flagged</p>
              <p className="text-2xl font-bold text-gray-900">{stats.flagged_content}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reported Posts ({reportedPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'flagged'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Auto-Flagged Content
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Actions
          </button>
        </nav>
      </div>

      {/* Reported Posts Tab */}
      {activeTab === 'reports' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportedPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      <div className="truncate">{post.content.substring(0, 100)}...</div>
                      <button
                        onClick={() => handleViewContent(post)}
                        className="text-blue-600 hover:text-blue-800 text-xs mt-1 flex items-center"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Full
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {post.first_name} {post.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{post.topic_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      <Flag className="h-3 w-3 mr-1" />
                      {post.report_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openModerationModal(post, 'approve')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                        title="Approve this post"
                      >
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => openModerationModal(post, 'hide')}
                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                        title="Hide this post"
                      >
                        <EyeOff className="h-3 w-3 inline mr-1" />
                        Hide
                      </button>
                      <button
                        onClick={() => openModerationModal(post, 'delete')}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                        title="Delete this post"
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {reportedPosts.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reported posts</h3>
              <p className="mt-1 text-sm text-gray-500">
                {error ? 'Unable to load forum reports. Please check your connection.' : 'All reported posts have been reviewed. The forum is clean!'}
              </p>
              {!error && (
                <button
                  onClick={fetchModerationData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Auto-Flagged Content Tab */}
      {activeTab === 'flagged' && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Auto-flagged content</h3>
          <p className="mt-1 text-sm text-gray-500">This section shows content automatically flagged by the system.</p>
        </div>
      )}

      {/* Recent Actions Tab */}
      {activeTab === 'actions' && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Recent moderation actions</h3>
          <p className="mt-1 text-sm text-gray-500">This section shows recent moderation actions taken by moderators.</p>
        </div>
      )}

      {/* Content Details Modal */}
      {showContentModal && selectedPost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Forum Post Details</h3>
              <button
                onClick={() => setShowContentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedPost.topic_title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <p className="text-sm text-gray-900">{selectedPost.first_name} {selectedPost.last_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posted Date</label>
                <p className="text-sm text-gray-900">{new Date(selectedPost.created_at).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Count</label>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  {selectedPost.report_count} reports
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedPost.content}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Details</label>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border max-h-40 overflow-y-auto">
                  {(() => {
                    try {
                      const reports = JSON.parse(selectedPost.reports);
                      return reports.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {reports.map((report: any, index: number) => (
                            <li key={index}>
                              {report.reason || 'No reason provided'} {report.details && ` - ${report.details}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No report details available</p>
                      );
                    } catch {
                      return <p>Unable to parse report details</p>;
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  openModerationModal(selectedPost, 'approve');
                  setShowContentModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Approve Post
              </button>
              <button
                onClick={() => {
                  openModerationModal(selectedPost, 'hide');
                  setShowContentModal(false);
                }}
                className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
              >
                <EyeOff className="h-4 w-4 inline mr-2" />
                Hide Post
              </button>
              <button
                onClick={() => {
                  openModerationModal(selectedPost, 'delete');
                  setShowContentModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 inline mr-2" />
                Delete Post
              </button>
              <button
                onClick={() => setShowContentModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Action Modal */}
      {moderationAction.showModal && moderationAction.post && moderationAction.action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {moderationAction.action === 'approve' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
                  {moderationAction.action === 'hide' && <EyeOff className="h-5 w-5 text-yellow-600 mr-2" />}
                  {moderationAction.action === 'delete' && <Trash2 className="h-5 w-5 text-red-600 mr-2" />}
                  {moderationAction.action === 'warn' && <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />}
                  {moderationAction.action === 'approve' && 'Approve Post'}
                  {moderationAction.action === 'hide' && 'Hide Post'}
                  {moderationAction.action === 'delete' && 'Delete Post'}
                  {moderationAction.action === 'warn' && 'Warn User'}
                </h3>
                <button
                  onClick={closeModerationModal}
                  className="p-1 rounded-md hover:bg-gray-100"
                >
                  <AlertTriangle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Post by: <span className="font-semibold text-gray-900">
                    {moderationAction.post.first_name} {moderationAction.post.last_name}
                  </span>
                </p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-700 line-clamp-4">
                    {moderationAction.post.content || 'No content preview available'}
                  </p>
                </div>
              </div>

              {moderationAction.action !== 'approve' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder={`Enter the reason for ${moderationAction.action === 'delete' ? 'deleting' : moderationAction.action === 'hide' ? 'hiding' : 'warning about'} this post...`}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div className={`bg-gray-50 border rounded-lg p-4 mb-4 ${
                moderationAction.action === 'approve' ? 'border-green-200 bg-green-50' :
                moderationAction.action === 'hide' ? 'border-yellow-200 bg-yellow-50' :
                moderationAction.action === 'delete' ? 'border-red-200 bg-red-50' :
                'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex items-start">
                  {moderationAction.action === 'approve' && <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />}
                  {moderationAction.action === 'hide' && <EyeOff className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />}
                  {moderationAction.action === 'delete' && <Trash2 className="h-5 w-5 text-red-600 mr-2 mt-0.5" />}
                  {moderationAction.action === 'warn' && <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-medium ${
                      moderationAction.action === 'approve' ? 'text-green-800' :
                      moderationAction.action === 'hide' ? 'text-yellow-800' :
                      moderationAction.action === 'delete' ? 'text-red-800' :
                      'text-orange-800'
                    }`}>
                      {moderationAction.action === 'approve' && 'This will approve the reported post'}
                      {moderationAction.action === 'hide' && 'This will hide the post from public view'}
                      {moderationAction.action === 'delete' && 'This will permanently delete the post'}
                      {moderationAction.action === 'warn' && 'This will send a warning to the user'}
                    </p>
                    <p className={`text-xs mt-1 ${
                      moderationAction.action === 'approve' ? 'text-green-700' :
                      moderationAction.action === 'hide' ? 'text-yellow-700' :
                      moderationAction.action === 'delete' ? 'text-red-700' :
                      'text-orange-700'
                    }`}>
                      {moderationAction.action === 'approve' && 'The post will remain visible and the report will be resolved.'}
                      {moderationAction.action === 'hide' && 'The post will be hidden but can be restored later.'}
                      {moderationAction.action === 'delete' && 'This action cannot be undone.'}
                      {moderationAction.action === 'warn' && 'The user will receive a notification about this action.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeModerationModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModeratePost}
                  disabled={isProcessingAction || (moderationAction.action !== 'approve' && !moderationReason.trim())}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                    moderationAction.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : moderationAction.action === 'hide'
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : moderationAction.action === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  } disabled:opacity-50`}
                >
                  {isProcessingAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {moderationAction.action === 'approve' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {moderationAction.action === 'hide' && <EyeOff className="h-4 w-4 mr-2" />}
                      {moderationAction.action === 'delete' && <Trash2 className="h-4 w-4 mr-2" />}
                      {moderationAction.action === 'warn' && <AlertCircle className="h-4 w-4 mr-2" />}
                      {moderationAction.action === 'approve' && 'Approve'}
                      {moderationAction.action === 'hide' && 'Hide'}
                      {moderationAction.action === 'delete' && 'Delete'}
                      {moderationAction.action === 'warn' && 'Warn'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumModerationDashboard;