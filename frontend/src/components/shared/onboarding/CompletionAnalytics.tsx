import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, TrendingUp, Clock, Target } from 'lucide-react';
import { onboardingApi } from '@/services/api/onboarding';

interface CompletionAnalyticsProps {
  flowId?: number;
}

const CompletionAnalytics: React.FC<CompletionAnalyticsProps> = ({ flowId }) => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [flowId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await onboardingApi.getAnalytics('?days=7');
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const completionRate = analytics.completion_rate || 0;
  const sevenDayCompletion = analytics.completion_rate || 0; // Using 7-day data
  const totalCompletions = analytics.completed_users || 0;
  const totalUsers = analytics.total_users || 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart className="h-5 w-5 mr-2 text-[#27AE60]" />
        {t('onboarding.analytics.title')}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Overall Completion Rate */}
        <div className="bg-gradient-to-br from-[#27AE60]/10 to-[#16A085]/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
          <p className="text-sm text-gray-600">{t('onboarding.analytics.completion_rate')}</p>
              <p className="text-2xl font-bold text-[#27AE60]">{completionRate}%</p>
            </div>
            <Target className="h-8 w-8 text-[#27AE60]" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#27AE60] to-[#16A085] h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 7-Day Completion Rate (REQUIREMENT: 95% completion within 7 days) */}
        <div className={`rounded-lg p-3 ${sevenDayCompletion >= 95 ? 'bg-green-50' : sevenDayCompletion >= 85 ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
          <p className="text-sm text-gray-600">{t('onboarding.analytics.seven_day')}</p>
              <p className={`text-2xl font-bold ${sevenDayCompletion >= 95 ? 'text-green-600' : sevenDayCompletion >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                {sevenDayCompletion}%
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${sevenDayCompletion >= 95 ? 'text-green-600' : sevenDayCompletion >= 85 ? 'text-yellow-600' : 'text-red-600'}`} />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  sevenDayCompletion >= 95 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  sevenDayCompletion >= 85 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${Math.min(sevenDayCompletion, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
          <p className="text-sm text-gray-600">{t('onboarding.analytics.total_users')}</p>
              <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Total Completions */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
          <p className="text-sm text-gray-600">{t('onboarding.analytics.total_completed')}</p>
              <p className="text-2xl font-bold text-purple-600">{totalCompletions}</p>
            </div>
            <BarChart className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Goal Indicators */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('onboarding.analytics.target', { days: analytics.timeframe_days || 7 })}</span>
          <span className={`font-medium ${analytics.meets_requirement ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.meets_requirement ? t('onboarding.analytics.goal_met') : t('onboarding.analytics.goal_miss')}
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {t('onboarding.analytics.summary', { completed: totalCompletions, total: totalUsers })}
        </div>
      </div>
    </div>
  );
};

export default CompletionAnalytics;
