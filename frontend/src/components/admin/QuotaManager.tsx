import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api/admin';
import type { ContentQuota } from '../../services/api/admin';
import { 
  Database, 
  RefreshCw, 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Settings,
  Calendar,
  TrendingUp
} from 'lucide-react';

const QuotaManager: React.FC = () => {
  const [quotas, setQuotas] = useState<ContentQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingQuota, setEditingQuota] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [chapters] = useState([
    { id: 'addis-ababa', name: 'Addis Ababa' },
    { id: 'toronto', name: 'Toronto' },
    { id: 'washington', name: 'Washington DC' },
    { id: 'london', name: 'London' }
  ]);

  useEffect(() => {
    fetchQuotas();
  }, [selectedChapter]);

  const fetchQuotas = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getQuotas(selectedChapter !== 'all' ? selectedChapter : undefined);
      setQuotas(response.data.quotas);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch quotas:', err);
      setError('Failed to load quotas');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuota = async (quotaId: number, monthlyLimit: number) => {
    try {
      await adminApi.updateQuota(quotaId, monthlyLimit);
      // Refresh the quotas to get the updated data
      fetchQuotas();
      setEditingQuota(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to update quota:', err);
      setError('Failed to update quota: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResetQuota = async (quotaId: number) => {
    try {
      await adminApi.resetQuota(quotaId);
      // Refresh the quotas to get the updated data
      fetchQuotas();
      setError(null);
    } catch (err: any) {
      console.error('Failed to reset quota:', err);
      setError('Failed to reset quota: ' + (err.response?.data?.message || err.message));
    }
  };

  const startEditing = (quota: ContentQuota) => {
    setEditingQuota(quota.id);
    setEditValue(quota.monthly_limit);
  };

  const cancelEditing = () => {
    setEditingQuota(null);
  };

  const saveEditing = (quotaId: number) => {
    handleUpdateQuota(quotaId, editValue);
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return 'bg-red-50 border-red-200';
      case 'image':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getUsagePercentage = (quota: ContentQuota) => {
    if (quota.monthly_limit === 0) return 0;
    return Math.min(100, (quota.current_usage / quota.monthly_limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredQuotas = selectedChapter === 'all' 
    ? quotas 
    : quotas.filter(q => q.chapter_id === selectedChapter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Database className="h-6 w-6 mr-2 text-blue-600" />
            Content Quotas
          </h2>
          <p className="text-gray-600 mt-1">Manage upload quotas for each chapter</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-gray-500 mr-2" />
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Chapters</option>
              {chapters.map(chapter => (
                <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={fetchQuotas}
            disabled={loading}
            className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {filteredQuotas.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotas found</h3>
          <p className="text-gray-500">
            {selectedChapter !== 'all' 
              ? `No quotas configured for ${chapters.find(c => c.id === selectedChapter)?.name}` 
              : 'No quotas have been configured yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotas.map(quota => {
            const usagePercentage = getUsagePercentage(quota);
            const isUnlimited = quota.monthly_limit === 0;
            
            return (
              <div 
                key={quota.id} 
                className={`border rounded-lg p-5 transition-all duration-200 hover:shadow-md ${getContentTypeColor(quota.content_type)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getContentTypeIcon(quota.content_type)}
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900 capitalize">{quota.content_type}</h3>
                      <p className="text-sm text-gray-600">
                        {chapters.find(c => c.id === quota.chapter_id)?.name || quota.chapter_id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => startEditing(quota)}
                      className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                      title="Edit quota"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleResetQuota(quota.id)}
                      className="p-1 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-100 transition-colors"
                      title="Reset usage"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingQuota === quota.id ? (
                  <div className="mb-4">
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="ml-2 flex space-x-1">
                        <button
                          onClick={() => saveEditing(quota.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">0 = Unlimited</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {isUnlimited ? 'Unlimited' : `${quota.monthly_limit} uploads`}
                      </span>
                      <span className="text-sm text-gray-500">
                        {quota.current_usage} used
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(usagePercentage)}`}
                        style={{ width: `${isUnlimited ? 0 : usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center mt-2">
                      {usagePercentage >= 90 ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                      ) : usagePercentage >= 75 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      )}
                      <span className="text-xs text-gray-600">
                        {isUnlimited ? 'Unlimited usage' : `${usagePercentage.toFixed(1)}% used`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>
                    {new Date(quota.period_start).toLocaleDateString()} - {new Date(quota.period_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quota Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
          Quota Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{filteredQuotas.length}</div>
                <div className="text-sm text-gray-600">Total Quotas</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredQuotas.filter(q => getUsagePercentage(q) < 75).length}
                </div>
                <div className="text-sm text-gray-600">Healthy</div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredQuotas.filter(q => getUsagePercentage(q) >= 75 && getUsagePercentage(q) < 90).length}
                </div>
                <div className="text-sm text-gray-600">Warning</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredQuotas.filter(q => getUsagePercentage(q) >= 90).length}
                </div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotaManager;