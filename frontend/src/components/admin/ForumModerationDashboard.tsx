import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, MessageSquare, User, BarChart } from 'lucide-react';

interface ReportedPost {
  id: number;
  content: string;
  report_count: number;
  reports: string;
  created_at: string;
  first_name: string;
  last_name: string;
  topic_title: string;
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

  useEffect(() => {
    fetchModerationData();
  }, []);

  const fetchModerationData = async () => {
    try {
      setLoading(true);

      // Fetch forum reports from the backend
      const response = await fetch('/api/admin/forum-reports', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch forum reports');
      }

      const data = await response.json();

      // Transform the data to match our interface
      const transformedPosts: ReportedPost[] = data.reports?.map((report: any) => ({
        id: report.id,
        content: report.content || report.topic_content,
        report_count: report.report_count || 1,
        reports: JSON.stringify(report.reports || []),
        created_at: report.created_at,
        first_name: report.author_first_name || 'Unknown',
        last_name: report.author_last_name || '',
        topic_title: report.topic_title || 'Forum Topic'
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
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch moderation data:', err);
      setError('Failed to load forum moderation data');

      // Fallback to mock data for development
      const mockStats: ModerationStat = {
        total_reports: 0,
        pending_moderation: 0,
        total_moderation_actions: 0,
        flagged_content: 0
      };

      setStats(mockStats);
      setReportedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleModeratePost = async (postId: number, action: 'delete' | 'hide' | 'warn' | 'approve', reason: string) => {
    try {
      // Call the backend API to moderate the forum report
      const response = await fetch(`/api/admin/forum-reports/${postId}/moderate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to moderate forum report');
      }

      // Remove the moderated post from the list
      setReportedPosts(prev => prev.filter(post => post.id !== postId));

      // Update stats
      setStats(prev => ({
        ...prev,
        pending_moderation: Math.max(0, prev.pending_moderation - 1),
        total_moderation_actions: prev.total_moderation_actions + 1
      }));

      // Show success message
      alert(`Forum report moderated successfully with action: ${action}`);
    } catch (err: any) {
      console.error('Failed to moderate post:', err);
      setError('Failed to moderate forum report: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Shield className="mr-2" />
          Forum Moderation Dashboard
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_moderation}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actions Taken</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_moderation_actions}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportedPosts.map((post) => (
                <tr key={post.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {post.content.substring(0, 100)}...
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
                    <div className="text-sm text-gray-900">{post.topic_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {post.report_count} reports
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const reason = prompt('Enter reason for approval:');
                          if (reason) handleModeratePost(post.id, 'approve', reason);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Enter reason for hiding:');
                          if (reason) handleModeratePost(post.id, 'hide', reason);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Hide
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this post?')) {
                            const reason = prompt('Enter reason for deletion:');
                            if (reason) handleModeratePost(post.id, 'delete', reason);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
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
              <p className="mt-1 text-sm text-gray-500">All reported posts have been reviewed.</p>
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
    </div>
  );
};

export default ForumModerationDashboard;