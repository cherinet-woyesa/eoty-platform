/**
 * FR7: Activity Logs Component
 * REQUIREMENT: Login history, abnormal activity alerts
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, MapPin, Monitor, Globe, Search, Filter, ShieldAlert } from 'lucide-react';
import { activityApi, type ActivityLog, type AbnormalActivityAlert } from '@/services/api/activity';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ActivityLogsProps {
  showAlerts?: boolean;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({
  showAlerts = true
}) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<AbnormalActivityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchActivityLogs();
    if (showAlerts) {
      fetchAlerts();
    }
  }, [filter, page]);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await activityApi.getActivityLogs({
        limit: pageSize,
        offset: page * pageSize,
        activityType: filter !== 'all' ? filter : undefined
      });

      if (response.success) {
        setLogs(response.data.logs || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await activityApi.getAbnormalActivityAlerts();
      if (response.success) {
        setAlerts(response.data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 bg-gray-50/50 p-6 rounded-xl min-h-[600px]">
      {/* Abnormal Activity Alerts */}
      {showAlerts && alerts.length > 0 && (
        <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t('activity.alerts.title', 'Security Alerts')}</h3>
              <p className="text-sm text-gray-500">{t('activity.alerts.subtitle', 'Unusual activity detected needing attention.')}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} flex items-start justify-between transition-all hover:shadow-md`}
              >
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">{alert.description}</div>
                    <div className="text-xs opacity-75">
                      {format(new Date(alert.created_at), 'PPpp')}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/50 border border-current uppercase tracking-wider">
                  {t(`activity.severity.${alert.severity}`, alert.severity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('activity.history.title', 'Activity History')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('activity.history.subtitle', 'Audit trail of system access and actions')}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(0);
                }}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              >
                <option value="all">{t('activity.filters.all', 'All Activities')}</option>
                <option value="login">{t('activity.filters.login', 'Logins')}</option>
                <option value="logout">{t('activity.filters.logout', 'Logouts')}</option>
                <option value="failed_login">{t('activity.filters.failed_login', 'Failed Logins')}</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" text={t('common.loading_records', 'Loading records...')} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">{t('activity.history.empty_title', 'No activity found')}</p>
            <p>{t('activity.history.empty_body', 'Try adjusting your filters.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activity.columns.activity', 'Activity')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activity.columns.status', 'Status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activity.columns.details', 'Details')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activity.columns.date', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${log.activity_type.includes('login') ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {log.activity_type.includes('login') ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {log.activity_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('common.success', 'Success')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {t('common.failed', 'Failed')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {!log.success && log.failure_reason && (
                          <div className="text-xs text-red-600 font-medium flex items-center mb-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {log.failure_reason}
                          </div>
                        )}
                        <div className="flex text-xs text-gray-500 gap-3">
                          {log.location && (
                            <span className="flex items-center gap-1" title={t('activity.details.location', 'Location')}><MapPin className="h-3 w-3" /> {log.location}</span>
                          )}
                          {log.ip_address && (
                            <span className="flex items-center gap-1" title={t('activity.details.ip_address', 'IP Address')}><Globe className="h-3 w-3" /> {log.ip_address}</span>
                          )}
                        </div>
                        <div className="flex text-xs text-gray-400 gap-3 mt-1">
                          {log.device_type && (
                            <span className="flex items-center gap-1 capitalize"><Monitor className="h-3 w-3" /> {log.device_type}</span>
                          )}
                          {log.browser && (
                            <span className="capitalize">• {log.browser}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.created_at), 'MMM d, yyyy')}
                      <span className="block text-xs text-gray-400">{format(new Date(log.created_at), 'h:mm a')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-right">
          <div className="inline-flex bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-200 rounded-l-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.previous', 'Previous')}
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < pageSize}
              className="px-4 py-2 border-t border-b border-r border-gray-200 rounded-r-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;

