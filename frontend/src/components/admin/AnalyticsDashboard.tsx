import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import type { AdminDashboard } from '@/types/admin';
import MetricsCard from './MetricsCard';
import { 
  Users, 
  BookOpen, 
  BarChart2, 
  Clock, 
  TrendingUp, 
  Server, 
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Zap,
  Cpu,
  Video,
  Star
} from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('7days');
  const [refreshing, setRefreshing] = useState(false);
  // FR5: Retention and accuracy
  const [retentionMetrics, setRetentionMetrics] = useState<any>(null);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [isVerifyingAccuracy, setIsVerifyingAccuracy] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'alerts'>('overview');

  useEffect(() => {
    fetchAnalytics();
    fetchRetentionMetrics(); // FR5: Fetch retention metrics
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAnalytics(timeframe);
      setAnalytics(response.data);
      setError(null);
      
      // FR5: Extract accuracy score if available
      if (response.data.metrics.accuracy_score) {
        setAccuracyScore(response.data.metrics.accuracy_score);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // FR5: Fetch retention metrics (REQUIREMENT: Retention metrics)
  const fetchRetentionMetrics = async () => {
    try {
      const response = await adminApi.getRetentionMetrics(timeframe);
      if (response.success) {
        setRetentionMetrics(response.data.metrics);
      }
    } catch (err: any) {
      console.error('Failed to fetch retention metrics:', err);
    }
  };

  // FR5: Verify dashboard accuracy (REQUIREMENT: 99% dashboard accuracy)
  const handleVerifyAccuracy = async () => {
    setIsVerifyingAccuracy(true);
    try {
      // Use current snapshot or create a new one
      const snapshotId = analytics?.snapshot_date ? Date.now() : Date.now();
      const response = await adminApi.verifyDashboardAccuracy(snapshotId);
      if (response.success) {
        setAccuracyScore(response.data.accuracy);
        alert(`Dashboard accuracy: ${(response.data.accuracy * 100).toFixed(2)}% (Requirement: 99%)\nMeets requirement: ${response.data.meetsRequirement ? 'Yes' : 'No'}`);
      }
    } catch (err: any) {
      console.error('Failed to verify accuracy:', err);
      alert(err.response?.data?.message || 'Failed to verify dashboard accuracy');
    } finally {
      setIsVerifyingAccuracy(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // FR5: Export usage data (REQUIREMENT: Full export of usage data)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 90 days
      
      const response = await adminApi.exportUsageData(startDate, endDate);
      if (response.success) {
        // Create download link
        const dataStr = JSON.stringify(response.data.export, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${endDate}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('Analytics data exported successfully!');
      }
    } catch (err: any) {
      console.error('Failed to export data:', err);
      alert(err.response?.data?.message || 'Failed to export analytics data');
    } finally {
      setIsExporting(false);
    }
  };

  const timeframeOptions = [
    { value: '24hours', label: '24 Hours', description: 'Last 24 hours' },
    { value: '7days', label: '7 Days', description: 'Last week' },
    { value: '30days', label: '30 Days', description: 'Last month' },
    { value: '90days', label: '90 Days', description: 'Last quarter' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#27AE60]/20 border-t-[#27AE60] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-700 font-semibold">Loading Analytics Dashboard...</p>
          <p className="text-sm text-stone-600 mt-1">Gathering platform insights</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Unable to Load Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-800 font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white/90 backdrop-blur-md rounded-xl p-8 border border-stone-200 max-w-md">
          <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="h-10 w-10 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No Data Available</h3>
          <p className="text-stone-600 mb-4">Analytics data will appear here once available</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-800 font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const metrics = analytics.metrics;

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-[#27AE60]/25 rounded-lg blur-md"></div>
                <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/20 to-[#16A085]/20 rounded-lg border border-[#27AE60]/25">
                  <BarChart2 className="h-6 w-6 text-[#27AE60]" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-stone-800">Analytics Dashboard</h1>
            </div>
            <p className="text-stone-700 text-sm mt-2">
              Real-time insights and platform performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            {/* FR5: Accuracy verification button (REQUIREMENT: 99% dashboard accuracy) */}
            <button
              onClick={handleVerifyAccuracy}
              disabled={isVerifyingAccuracy}
              className="flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-sm font-medium rounded-lg transition-all border border-blue-300 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {isVerifyingAccuracy ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  Verify Accuracy
                </>
              )}
            </button>
            {/* FR5: Export button (REQUIREMENT: Full export of usage data) */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-sm font-medium rounded-lg transition-all border border-[#27AE60]/25 shadow-sm hover:shadow-md hover:border-[#27AE60]/50 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#27AE60] mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2 text-[#27AE60]" />
                  Export
                </>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-sm font-medium rounded-lg transition-all border border-[#27AE60]/25 shadow-sm hover:shadow-md hover:border-[#27AE60]/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 text-[#27AE60] ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-2 mb-4 lg:mb-0">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Time Period:</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {timeframeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  timeframe === option.value
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs opacity-75">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs for heavy sections */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('chapters')}
          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeTab === 'chapters'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Chapter Performance
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeTab === 'alerts'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          System Alerts
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricsCard 
              title="Total Courses" 
              value={analytics.metrics.content.total} 
              change={12}
              icon={<BookOpen className="h-6 w-6" />}
              color="blue"
              trend="up"
              description="Total courses created"
            />
            <MetricsCard 
              title="Active Students" 
              value={analytics.metrics.users.total} 
              change={8}
              icon={<Users className="h-6 w-6" />}
              color="green"
              trend="up"
              description="Currently enrolled students"
            />
            <MetricsCard 
              title="Recorded Videos" 
              value={156} 
              change={8}
              icon={<Video className="h-6 w-6" />}
              color="purple"
              trend="up"
              description="Total video lessons"
            />
            <MetricsCard 
              title="Hours Taught" 
              value={342} 
              change={15}
              icon={<Clock className="h-6 w-6" />}
              color="orange"
              trend="up"
              description="Total teaching hours"
            />
            <MetricsCard 
              title="Rating" 
              value={4.8} 
              change={5}
              icon={<Star className="h-6 w-6" />}
              color="indigo"
              trend="up"
              format="number"
              description="Average course rating"
            />
            <MetricsCard 
              title="Completion Rate" 
              value={Math.round(analytics.metrics.engagement.completion_rate * 100)} 
              change={3}
              icon={<Target className="h-6 w-6" />}
              color="teal"
              trend="up"
              format="percent"
              description="Overall course completion"
            />
            <MetricsCard 
              title="Engagement Score" 
              value={85} 
              change={3}
              icon={<Zap className="h-6 w-6" />}
              color="red"
              trend="up"
              format="percent"
              description="User engagement index"
            />
          </div>

          {/* Performance & Content Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* System Performance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-blue-600" />
                  System Performance
                </h3>
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  metrics.technical.uptime > 99.5 
                    ? 'bg-green-100 text-green-800' 
                    : metrics.technical.uptime > 98 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    metrics.technical.uptime > 99.5 
                      ? 'bg-green-500' 
                      : metrics.technical.uptime > 98 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`} />
                  {metrics.technical.uptime > 99.5 ? 'Optimal' : metrics.technical.uptime > 98 ? 'Stable' : 'Degraded'}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Server className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Uptime</div>
                      <div className="text-sm text-gray-600">Platform availability</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{metrics.technical.uptime}%</div>
                    <div className="text-sm text-green-600 font-medium">✓ Stable</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Response Time</div>
                      <div className="text-sm text-gray-600">API performance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{metrics.technical.response_time}ms</div>
                    <div className="text-sm text-green-600 font-medium">✓ Fast</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Statistics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-600" />
                  Content Analytics
                </h3>
                <div className="text-sm text-gray-500">
                  Real-time updates
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-600">{metrics.content.uploads_today}</div>
                    <div className="text-sm text-gray-600 mt-1">Uploads Today</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-600">{(metrics.content.approval_rate * 100).toFixed(1)}%</div>
                    <div className="text-sm text-gray-600 mt-1">Approval Rate</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Pending Reviews</div>
                      <div className="text-sm text-gray-600">Awaiting moderation</div>
                    </div>
                    <div className="text-2xl font-bold text-amber-600">12</div>
                  </div>
                </div>
                {/* FR5: Retention metrics (REQUIREMENT: Retention metrics) */}
                {retentionMetrics && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">User Retention</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        retentionMetrics.retention_rate >= 0.8 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {timeframe}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{retentionMetrics.new_users || 0}</div>
                        <div className="text-xs text-gray-600">New Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{retentionMetrics.retained_users || 0}</div>
                        <div className="text-xs text-gray-600">Retained</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {((retentionMetrics.retention_rate || 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Rate</div>
                      </div>
                    </div>
                  </div>
                )}
                {/* FR5: Accuracy indicator (REQUIREMENT: 99% dashboard accuracy) */}
                {accuracyScore !== null && (
                  <div className={`p-4 rounded-xl border ${
                    accuracyScore >= 0.99 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Dashboard Accuracy</div>
                        <div className="text-sm text-gray-600">Requirement: 99%</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          accuracyScore >= 0.99 ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {(accuracyScore * 100).toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {accuracyScore >= 0.99 ? '✓ Meets requirement' : '⚠ Below requirement'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* CHAPTERS TAB */}
      {activeTab === 'chapters' && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Chapter Performance Comparison
            </h3>
            <p className="text-gray-600 text-sm mt-1">Performance metrics across all chapters</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chapter</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Users</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Posts</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Engagement</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(analytics.chapter_comparison).map(([chapterId, data]: any) => (
                  <tr key={chapterId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          data.engagement_score > 0.8 ? 'bg-green-500' : 
                          data.engagement_score > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900">{chapterId}</div>
                          <div className="text-sm text-gray-500">{data.total_users} members</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.total_users.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.active_users}</div>
                      <div className="text-xs text-gray-500">
                        {data.total_users > 0
                          ? `${((data.active_users / data.total_users) * 100).toFixed(1)}% active`
                          : '0% active'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.recent_posts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${data.engagement_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {(data.engagement_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        data.engagement_score > 0.8 
                          ? 'bg-green-100 text-green-800' 
                          : data.engagement_score > 0.6 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {data.engagement_score > 0.8 ? 'High' : data.engagement_score > 0.6 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && analytics.alerts && analytics.alerts.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
              System Alerts
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {analytics.alerts.length}
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analytics.alerts.map((alert: any, index: number) => (
              <div 
                key={index} 
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        alert.severity === 'critical' ? 'bg-red-500' : 
                        alert.severity === 'high' ? 'bg-orange-500' : 
                        alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-medium text-gray-900">{alert.message}</span>
                    </div>
                    {alert.chapter_id && (
                      <div className="text-sm text-gray-600 ml-6">
                        Chapter: <span className="font-medium">{alert.chapter_id}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' : 
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;