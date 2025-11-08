import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Video,
  HardDrive,
  Activity,
  RefreshCw,
  Calendar
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface CostDashboardData {
  timeframe: string;
  currentCosts: {
    total: number;
    breakdown: {
      encoding: { cost: number; metrics: any };
      storage: { cost: number; metrics: any };
      delivery: { cost: number; metrics: any };
    };
  };
  usageMetrics: {
    totalVideos: number;
    totalDuration: number;
    readyVideos: number;
    processingVideos: number;
    erroredVideos: number;
  };
  deliveryMetrics: {
    totalViews: number;
    totalWatchTime: number;
    estimatedBandwidth: number;
  };
  topCourses: Array<{
    courseId: number;
    courseTitle: string;
    videoCount: number;
    estimatedMonthlyCost: number;
  }>;
  projections: {
    growthRate: string;
    projected: {
      total: number;
    };
  };
  alerts: {
    items: Array<{
      severity: string;
      type: string;
      message: string;
    }>;
    hasAlerts: boolean;
    criticalCount: number;
    warningCount: number;
  };
}

const MuxCostDashboard: React.FC = () => {
  const [data, setData] = useState<CostDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30:days');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE_URL}/mux-costs/dashboard?timeframe=${timeframe}`,
        { withCredentials: true }
      );

      setData(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch cost dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load cost data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cost data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Cost Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <DollarSign className="h-6 w-6 mr-2" />
              Mux Cost Monitoring
            </h2>
            <p className="text-green-100">
              Track video hosting costs and usage metrics
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="7:days" className="text-gray-900">7 Days</option>
              <option value="30:days" className="text-gray-900">30 Days</option>
              <option value="90:days" className="text-gray-900">90 Days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.hasAlerts && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Cost Alerts
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {data.alerts.items.length}
            </span>
          </h3>
          <div className="space-y-3">
            {data.alerts.items.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start">
                  <AlertTriangle
                    className={`h-5 w-5 mr-3 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${
                      alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(data.currentCosts.total)}
          </div>
          <div className="text-sm text-gray-600">Total Cost ({timeframe})</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {data.usageMetrics.totalVideos}
          </div>
          <div className="text-sm text-gray-600">Total Videos</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {data.deliveryMetrics.totalViews.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Views</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              parseFloat(data.projections.growthRate) >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {parseFloat(data.projections.growthRate) >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {data.projections.growthRate}%
          </div>
          <div className="text-sm text-gray-600">Growth Rate</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Encoding</span>
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {formatCurrency(data.currentCosts.breakdown.encoding.cost)}
            </div>
            <div className="text-xs text-gray-600">
              {data.currentCosts.breakdown.encoding.metrics.totalVideos} videos •{' '}
              {data.currentCosts.breakdown.encoding.metrics.totalDurationMinutes} min
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Storage</span>
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {formatCurrency(data.currentCosts.breakdown.storage.cost)}
            </div>
            <div className="text-xs text-gray-600">
              {data.currentCosts.breakdown.storage.metrics.totalStorageGB} GB stored
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Delivery</span>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {formatCurrency(data.currentCosts.breakdown.delivery.cost)}
            </div>
            <div className="text-xs text-gray-600">
              {data.currentCosts.breakdown.delivery.metrics.totalViews.toLocaleString()} views •{' '}
              {data.currentCosts.breakdown.delivery.metrics.estimatedBandwidthGB} GB
            </div>
          </div>
        </div>
      </div>

      {/* Top Courses by Cost */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Courses by Cost</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Course
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Videos
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Est. Monthly Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.topCourses.map((course) => (
                <tr key={course.courseId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{course.courseTitle}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {course.videoCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-green-600">
                      {formatCurrency(course.estimatedMonthlyCost)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          Next Month Projection
        </h3>
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 mb-1">Projected Total Cost</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(data.projections.projected.total)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Growth Rate</div>
            <div className={`text-2xl font-bold ${
              parseFloat(data.projections.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.projections.growthRate}%
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          * Projections are estimates based on current usage trends and may vary
        </p>
      </div>
    </div>
  );
};

export default MuxCostDashboard;
