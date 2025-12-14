import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import type { AdminDashboard } from '@/types/admin';
import MetricsCard from './MetricsCard';
import CreateEventModal from '@/components/admin/dashboard/modals/CreateEventModal';
import { brandColors } from '@/theme/brand';
import {
  Users,
  BookOpen,
  BarChart2,
  Clock,
  Server,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Cpu,
  Plus
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
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const brandPrimary = brandColors.primaryHex;
  const brandAccent = brandColors.accentHex;
  const brandPrimaryHover = brandColors.primaryHoverHex;

  useEffect(() => {
    fetchAnalytics();
    fetchRetentionMetrics(); // FR5: Fetch retention metrics
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      if (!analytics) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await adminApi.getAnalytics(timeframe);
      const payload = (response as any)?.data ?? response;
      if (payload?.success === false) {
        throw new Error(payload?.message || payload?.userMessage || 'Request failed');
      }
      const data = payload?.data ?? payload;
      if (!data?.metrics) {
        throw new Error('Invalid analytics response');
      }
      setAnalytics(data);
      
      // FR5: Extract accuracy score if available
      if (data.metrics?.accuracy_score) {
        setAccuracyScore(data.metrics.accuracy_score);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      const apiMessage = err?.response?.data?.message || err?.message;
      const userMessage = err?.response?.data?.userMessage;
      setError(userMessage || apiMessage || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // FR5: Fetch retention metrics (REQUIREMENT: Retention metrics)
  const fetchRetentionMetrics = async () => {
    try {
      const response = await adminApi.getRetentionMetrics(timeframe);
      const payload = (response as any)?.data ?? response;
      if (payload?.success && payload?.data?.metrics) {
        setRetentionMetrics(payload.data.metrics);
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
      const payload = (response as any)?.data ?? response;
      if (payload?.success) {
        const accuracy = payload?.data?.accuracy ?? payload?.accuracy;
        setAccuracyScore(accuracy);
        alert(`Dashboard accuracy: ${(accuracy * 100).toFixed(2)}% (Requirement: 99%)\nMeets requirement: ${payload?.data?.meetsRequirement ? 'Yes' : 'No'}`);
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
          <div className="w-16 h-16 border-4 border-[color:rgb(30,27,75,0.15)] border-t-[#1e1b4b] rounded-full animate-spin mx-auto mb-4"></div>
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
            className="px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: brandPrimary, border: `1px solid ${brandPrimary}`, boxShadow: '0 10px 25px -12px rgba(30,27,75,0.55)' }}
            onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = brandPrimaryHover)}
            onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = brandPrimary)}
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
            className="px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: brandPrimary, border: `1px solid ${brandPrimary}`, boxShadow: '0 10px 25px -12px rgba(30,27,75,0.55)' }}
            onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = brandPrimaryHover)}
            onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = brandPrimary)}
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
      {/* Compact Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">
            Real-time insights and platform performance metrics
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateEventModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded-md transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: brandPrimary, borderColor: brandPrimary }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Event
          </button>
          {/* FR5: Accuracy verification button (REQUIREMENT: 99% dashboard accuracy) */}
          <button
            onClick={handleVerifyAccuracy}
            disabled={isVerifyingAccuracy}
            className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border border-blue-300 shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {isVerifyingAccuracy ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600 mr-1.5"></div>
                <span className="hidden sm:inline">Verifying...</span>
                <span className="sm:hidden">Verify</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                <span className="hidden sm:inline">Verify Accuracy</span>
                <span className="sm:hidden">Verify</span>
              </>
            )}
          </button>
          {/* FR5: Export button (REQUIREMENT: Full export of usage data) */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ borderColor: `${brandPrimary}40` }}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 mr-1.5" style={{ borderColor: `${brandPrimary}30`, borderBottomColor: brandPrimary }}></div>
                <span className="hidden sm:inline">Exporting...</span>
                <span className="sm:hidden">Export</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 mr-1.5" style={{ color: brandPrimary }} />
                Export
              </>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-all border shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ borderColor: `${brandPrimary}40` }}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: brandPrimary }} />
            Refresh
          </button>
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
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent hover:border-gray-300'
                }`}
                style={
                  timeframe === option.value
                    ? { background: `linear-gradient(to right, ${brandPrimary}, ${brandAccent})` }
                    : undefined
                }
              >
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs opacity-75">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics (simplified) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricsCard
          title="Total Courses"
          value={metrics.content.total}
          icon={<BookOpen className="h-6 w-6" />}
          color="blue"
          trend="up"
          description="Courses created"
        />
        <MetricsCard
          title="Active Users (30d)"
          value={metrics.users.active}
          icon={<Users className="h-6 w-6" />}
          color="green"
          trend="up"
          description="Logged in last 30 days"
        />
        <MetricsCard
          title="New Users (7d)"
          value={metrics.users.new_this_week}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          trend="up"
          description="Joined this week"
        />
        <MetricsCard
          title="Platform Uptime"
          value={metrics.technical.uptime}
          icon={<Server className="h-6 w-6" />}
          color="teal"
          trend="up"
          format="number"
          description="Availability"
        />
        <MetricsCard
          title="Uploads Today"
          value={metrics.content.uploads_today}
          icon={<Activity className="h-6 w-6" />}
          color="purple"
          trend="up"
          description="New content"
        />
        <MetricsCard
          title="Approval Rate"
          value={Math.round((metrics.content.approval_rate || 0) * 100)}
          icon={<CheckCircle className="h-6 w-6" />}
          color="indigo"
          trend="up"
          format="percent"
          description="Moderation pass rate"
        />
      </div>

      {/* Chapters/Alerts sections omitted for simplified view */}

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onSuccess={() => {
          // Optionally refresh analytics if needed
          fetchAnalytics();
        }}
      />
    </div>
  );
};

export default AnalyticsDashboard;