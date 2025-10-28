import React, { useState, useEffect } from 'react';
import { interactiveApi } from '../../services/api';

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

  useEffect(() => {
    loadValidationData();
    loadValidationHistory();
  }, []);

  const loadValidationData = async () => {
    try {
      setLoading(true);
      const response = await interactiveApi.runAcceptanceValidation();
      if (response.success) {
        setValidationData(response.data);
      } else {
        setError(response.message || 'Failed to load validation data');
      }
    } catch (err) {
      setError('Failed to load validation data');
      console.error('Load validation data error:', err);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    return status === 'passing' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (status: string) => {
    return status === 'passing' ? 'bg-green-100' : 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Validation Dashboard</h2>
        <button
          onClick={loadValidationData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
        >
          Refresh Validation
        </button>
      </div>

      {validationData && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`rounded-lg p-6 ${getStatusBg(validationData.overallStatus)}`}>
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-3 ${validationData.overallStatus === 'passing' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <h3 className="text-lg font-semibold">Overall System Status</h3>
              <span className={`ml-3 px-2 py-1 rounded text-sm font-medium ${getStatusColor(validationData.overallStatus)}`}>
                {validationData.overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-gray-600">
              Last checked: {formatTime(validationData.timestamp)}
            </p>
          </div>

          {/* Uptime Validation */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Uptime Validation</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${validationData.uptime.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {validationData.uptime.success ? 'PASSING' : 'FAILING'}
              </span>
            </div>
            {validationData.uptime.data && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">System Status</p>
                  <p className="text-lg font-semibold">{validationData.uptime.data.status}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-lg font-semibold">{Math.floor(validationData.uptime.data.startTime / 3600)}h</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Last Check</p>
                  <p className="text-lg font-semibold">{formatTime(validationData.uptime.data.timestamp)}</p>
                </div>
              </div>
            )}
            {validationData.uptime.error && (
              <div className="mt-4 text-red-600">
                <p>Error: {validationData.uptime.error}</p>
              </div>
            )}
          </div>

          {/* Data Persistence Validation */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Data Persistence Validation</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${validationData.dataPersistence.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {validationData.dataPersistence.success ? 'PASSING' : 'FAILING'}
              </span>
            </div>
            {validationData.dataPersistence.data && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-lg font-semibold">{validationData.dataPersistence.data.users}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="text-lg font-semibold">{validationData.dataPersistence.data.courses}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Lessons</p>
                  <p className="text-lg font-semibold">{validationData.dataPersistence.data.lessons}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Active Users (24h)</p>
                  <p className="text-lg font-semibold">{validationData.dataPersistence.data.activeUsers24h}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Progress Updates (24h)</p>
                  <p className="text-lg font-semibold">{validationData.dataPersistence.data.progressUpdates24h}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Last Check</p>
                  <p className="text-lg font-semibold">{formatTime(validationData.dataPersistence.data.timestamp)}</p>
                </div>
              </div>
            )}
            {validationData.dataPersistence.error && (
              <div className="mt-4 text-red-600">
                <p>Error: {validationData.dataPersistence.error}</p>
              </div>
            )}
          </div>

          {/* Moderation Validation */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Moderation Effectiveness Validation</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${validationData.moderation.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {validationData.moderation.success ? 'PASSING' : 'FAILING'}
              </span>
            </div>
            {validationData.moderation.data && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Discussions</p>
                  <p className="text-lg font-semibold">{validationData.moderation.data.totalDiscussions}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Moderated Discussions</p>
                  <p className="text-lg font-semibold">{validationData.moderation.data.moderatedDiscussions}</p>
                  <p className="text-sm text-gray-500">Rate: {validationData.moderation.data.moderationRate}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-lg font-semibold">{validationData.moderation.data.totalReports}</p>
                  <p className="text-sm text-gray-500">Resolved: {validationData.moderation.data.reportResolutionRate}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Auto-flagged Content</p>
                  <p className="text-lg font-semibold">{validationData.moderation.data.autoFlagged}</p>
                  <p className="text-sm text-gray-500">Effectiveness: {validationData.moderation.data.autoModerationEffectiveness}%</p>
                </div>
              </div>
            )}
            {validationData.moderation.error && (
              <div className="mt-4 text-red-600">
                <p>Error: {validationData.moderation.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation History */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Validation History</h3>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(record.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.value === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.value === 1 ? 'PASSING' : 'FAILING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.details ? 'Details available' : 'No details'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No validation history available</p>
        )}
      </div>
    </div>
  );
};

export default SystemValidationDashboard;