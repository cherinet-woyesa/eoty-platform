import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { AlertTriangle, CheckCircle, XCircle, ArrowUpCircle, BarChart3 } from 'lucide-react';
import MetricsCard from './MetricsCard';

interface ModerationItem {
  id: number;
  user_id: number;
  content: string;
  content_type: string;
  moderation_flags: string;
  faith_alignment_score: number;
  status: string;
  created_at: string;
}

interface ModerationStats {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  high_faith_alignment: number;
  low_faith_alignment: number;
}

interface RecentActivity {
  date: string;
  pending: number;
  approved: number;
  rejected: number;
}

export const AIModerationTools: React.FC = () => {
  const [pendingItems, setPendingItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, statsResponse] = await Promise.all([
        adminApi.getPendingAIModeration(),
        adminApi.getModerationStats()
      ]);

      if (itemsResponse.success) {
        setPendingItems(itemsResponse.data.items);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data.stats);
        setRecentActivity(statsResponse.data.recent_activity);
      }
    } catch (err) {
      setError('Failed to load moderation data');
      console.error('Error loading moderation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (itemId: number, action: string) => {
    try {
      const response = await adminApi.reviewAIModeration(itemId, {
        action,
        notes: actionNotes
      });

      if (response.success) {
        // Remove the item from the list
        setPendingItems(prev => prev.filter(item => item.id !== itemId));
        setSelectedItem(null);
        setActionNotes('');
        loadModerationData(); // Refresh stats
      } else {
        setError(response.message || 'Failed to review item');
      }
    } catch (err) {
      setError('Failed to review item');
      console.error('Error reviewing item:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard
            title="Pending Review"
            value={stats.pending}
            icon={<AlertTriangle className="h-6 w-6 text-yellow-500" />}
            change={0}
          />
          <MetricsCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle className="h-6 w-6 text-green-500" />}
            change={0}
          />
          <MetricsCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircle className="h-6 w-6 text-red-500" />}
            change={0}
          />
          <MetricsCard
            title="Escalated"
            value={stats.escalated}
            icon={<ArrowUpCircle className="h-6 w-6 text-blue-500" />}
            change={0}
          />
        </div>
      )}

      {/* Faith Alignment Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Faith Alignment</h3>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>High Alignment</span>
                  <span>{stats.high_faith_alignment}</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(stats.high_faith_alignment / (stats.high_faith_alignment + stats.low_faith_alignment || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Low Alignment</span>
                  <span>{stats.low_faith_alignment}</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(stats.low_faith_alignment / (stats.high_faith_alignment + stats.low_faith_alignment || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity (7 days)</h3>
            <div className="mt-4 space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{new Date(activity.date).toLocaleDateString()}</span>
                  <div className="flex space-x-2">
                    <span className="text-yellow-600">{activity.pending} pending</span>
                    <span className="text-green-600">{activity.approved} approved</span>
                    <span className="text-red-600">{activity.rejected} rejected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Items List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending AI Moderation Items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Review content flagged by the AI moderation system
          </p>
        </div>
        
        {pendingItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending items</h3>
            <p className="mt-1 text-sm text-gray-500">
              All AI moderation items have been reviewed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingItems.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.content.substring(0, 100)}{item.content.length > 100 ? '...' : ''}
                    </p>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.content_type}
                      </span>
                      <span className="ml-2">
                        Faith Score: {item.faith_alignment_score}
                      </span>
                      <span className="ml-2">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    {item.moderation_flags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.moderation_flags.split(',').map((flag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Moderation Item
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-800">{selectedItem.content}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedItem.content_type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Faith Score: {selectedItem.faith_alignment_score}
                  </span>
                  {selectedItem.moderation_flags && selectedItem.moderation_flags.split(',').map((flag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Add any notes about this moderation decision..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(selectedItem.id, 'approve')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(selectedItem.id, 'reject')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(selectedItem.id, 'escalate')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Escalate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};