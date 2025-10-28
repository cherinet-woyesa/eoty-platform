import React, { useState, useEffect } from 'react';
import { interactiveApi } from '../../services/api';
import { 
  Server, 
  Database, 
  Shield, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  Download,
  BarChart3,
  Zap
} from 'lucide-react';

interface ValidationData {
  timestamp: string;
  uptime: {
    success: boolean;
    data?: any;
    error?: string;
  };
  dataPersistence: {
    success: boolean;
    data?: any;
    error?: string;
  };
  moderation: {
    success: boolean;
    data?: any;
    error?: string;
  };
  overallStatus: string;
}

const SystemValidationDashboard: React.FC = () => {
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadValidationData();
    loadValidationHistory();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadValidationData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadValidationData = async () => {
    try {
      setRefreshing(true);
      const response = await interactiveApi.runAcceptanceValidation();
      if (response.success) {
        setValidationData(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to load validation data');
      }
    } catch (err) {
      setError('Failed to connect to validation service');
      console.error('Load validation data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadValidationHistory = async () => {
    try {
      const response = await interactiveApi.getValidationHistory();
      if (response.success) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('Load validation history error:', err);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusConfig = (status: string) => {
    return status === 'passing' 
      ? { 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          border: 'border-green-200',
          icon: CheckCircle 
        }
      : { 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          border: 'border-red-200',
          icon: XCircle 
        };
  };

  const ValidationCard = ({ 
    title, 
    success, 
    data, 
    error, 
    icon: Icon,
    children 
  }: any) => {
    const statusConfig = getStatusConfig(success ? 'passing' : 'failing');
    
    return (
      <div className={`bg-white rounded-2xl shadow-sm border ${statusConfig.border} p-6 transition-all duration-300 hover:shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${statusConfig.bg}`}>
              <Icon className={`h-6 w-6 ${statusConfig.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
            {success ? 'PASSING' : 'FAILING'}
          </span>
        </div>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Error:</span>
            </div>
            <p className="text-red-700 mt-1 text-sm">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading System Validation...</p>
          <p className="text-sm text-gray-500 mt-1">Checking platform health and performance</p>
        </div>
      </div>
    );
  }

  if (error && !validationData) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Validation Service Unavailable</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadValidationData}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2 flex items-center">
              <Activity className="h-8 w-8 mr-3" />
              System Validation Dashboard
            </h1>
            <p className="text-blue-100 opacity-90">
              Real-time monitoring of platform health, data integrity, and moderation systems
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            <button className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
            <button
              onClick={loadValidationData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Auto-refresh Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Auto Refresh</p>
              <p className="text-sm text-gray-600">Update every 30 seconds</p>
            </div>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoRefresh ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {validationData && (
        <div className="space-y-6">
          {/* Overall Status Banner */}
          <div className={`rounded-2xl p-6 border-2 transition-all duration-300 ${
            validationData.overallStatus === 'passing' 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`h-4 w-4 rounded-full ${
                  validationData.overallStatus === 'passing' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Overall System Status</h2>
                  <p className="text-gray-600">
                    Comprehensive health check of all platform systems
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  validationData.overallStatus === 'passing' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validationData.overallStatus.toUpperCase()}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Last checked: {formatTime(validationData.timestamp)}
                </p>
              </div>
            </div>
          </div>

          {/* Validation Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Uptime Validation */}
            <ValidationCard
              title="Uptime & Performance"
              success={validationData.uptime.success}
              error={validationData.uptime.error}
              icon={Server}
            >
              {validationData.uptime.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600">System Status</p>
                      <p className="text-lg font-bold text-blue-600 capitalize">
                        {validationData.uptime.data.status}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600">Uptime</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatUptime(validationData.uptime.data.startTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    Last check: {formatTime(validationData.uptime.data.timestamp)}
                  </div>
                </div>
              )}
            </ValidationCard>

            {/* Data Persistence Validation */}
            <ValidationCard
              title="Data Integrity"
              success={validationData.dataPersistence.success}
              error={validationData.dataPersistence.error}
              icon={Database}
            >
              {validationData.dataPersistence.data && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {validationData.dataPersistence.data.users}
                      </p>
                      <p className="text-xs text-gray-600">Users</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {validationData.dataPersistence.data.courses}
                      </p>
                      <p className="text-xs text-gray-600">Courses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {validationData.dataPersistence.data.lessons}
                      </p>
                      <p className="text-xs text-gray-600">Lessons</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {validationData.dataPersistence.data.activeUsers24h}
                      </p>
                      <p className="text-xs text-gray-600">Active (24h)</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-purple-700">
                      {validationData.dataPersistence.data.progressUpdates24h} progress updates today
                    </p>
                  </div>
                </div>
              )}
            </ValidationCard>

            {/* Moderation Validation */}
            <ValidationCard
              title="Moderation System"
              success={validationData.moderation.success}
              error={validationData.moderation.error}
              icon={Shield}
            >
              {validationData.moderation.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">
                        {validationData.moderation.data.moderatedDiscussions}
                      </p>
                      <p className="text-xs text-gray-600">Moderated</p>
                      <p className="text-xs text-green-600 font-medium">
                        {validationData.moderation.data.moderationRate}% rate
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">
                        {validationData.moderation.data.totalReports}
                      </p>
                      <p className="text-xs text-gray-600">Reports</p>
                      <p className="text-xs text-green-600 font-medium">
                        {validationData.moderation.data.reportResolutionRate}% resolved
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3">
                    <p className="text-sm text-center font-medium text-orange-700">
                      Auto-moderation: {validationData.moderation.data.autoModerationEffectiveness}% effective
                    </p>
                  </div>
                </div>
              )}
            </ValidationCard>
          </div>

          {/* Detailed Metrics Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Detailed System Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-xl font-bold text-blue-600">
                  {validationData.uptime.data?.responseTime || 'N/A'}ms
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Database Health</p>
                <p className="text-xl font-bold text-green-600">
                  {validationData.dataPersistence.success ? 'Optimal' : 'Degraded'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Content Safety</p>
                <p className="text-xl font-bold text-purple-600">
                  {validationData.moderation.data?.moderationRate || 0}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-xl font-bold text-orange-600">
                  {validationData.overallStatus === 'passing' ? '< 1%' : '> 5%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Validation History
            <span className="ml-2 bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
              {history.length} records
            </span>
          </h3>
        </div>
        
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.slice(0, 10).map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        record.value === 1 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {record.value === 1 ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {record.value === 1 ? 'PASSING' : 'FAILING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.duration || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.details ? (
                        <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                          View Details
                        </span>
                      ) : (
                        'No details'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Validation History</h3>
            <p className="text-gray-500">Validation records will appear here after system checks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemValidationDashboard;