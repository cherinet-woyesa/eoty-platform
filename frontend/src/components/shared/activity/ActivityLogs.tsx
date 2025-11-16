/**
 * FR7: Activity Logs Component
 * REQUIREMENT: Login history, abnormal activity alerts
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, MapPin, Monitor, Smartphone, Tablet, Globe } from 'lucide-react';
import { activityApi, type ActivityLog, type AbnormalActivityAlert } from '@/services/api/activity';

interface ActivityLogsProps {
  userId?: number;
  showAlerts?: boolean;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({
  userId,
  showAlerts = true
}) => {
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

  const getActivityIcon = (activityType: string, success: boolean) => {
    if (!success) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }

    switch (activityType) {
      case 'login':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'logout':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'failed_login':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Abnormal Activity Alerts (REQUIREMENT: Abnormal activity alerts) */}
      {showAlerts && alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Security Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium mb-1">{alert.description}</div>
                    <div className="text-xs opacity-75">
                      {formatDate(alert.created_at)}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded">
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs (REQUIREMENT: Login history) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Activity History</h2>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Activities</option>
            <option value="login">Logins</option>
            <option value="logout">Logouts</option>
            <option value="failed_login">Failed Logins</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No activity logs found</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-4 ${
                  log.success
                    ? 'border-gray-200 bg-white'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getActivityIcon(log.activity_type, log.success)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {log.activity_type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                      {log.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{log.location}</span>
                        </div>
                      )}
                      {log.device_type && (
                        <div className="flex items-center gap-1">
                          {getDeviceIcon(log.device_type)}
                          <span className="capitalize">{log.device_type}</span>
                        </div>
                      )}
                      {log.browser && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span className="capitalize">{log.browser}</span>
                        </div>
                      )}
                      {log.os && (
                        <span className="capitalize">{log.os}</span>
                      )}
                    </div>

                    {log.ip_address && (
                      <div className="text-xs text-gray-500 mb-1">
                        IP: {log.ip_address}
                      </div>
                    )}

                    {!log.success && log.failure_reason && (
                      <div className="text-sm text-red-600 mt-2">
                        {log.failure_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {logs.length === pageSize && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;

