/**
 * FR5: Anomaly Alerts Component
 * Component for displaying audit and moderation anomalies
 * REQUIREMENT: Warns admins on audit or moderation anomalies
 */

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import type { AdminAnomaly } from '@/types/admin';
import { AlertTriangle, X, RefreshCw, CheckCircle, AlertCircle, Shield } from 'lucide-react';

interface AnomalyAlertsProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  maxDisplay?: number;
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  maxDisplay = 5
}) => {
  const [anomalies, setAnomalies] = useState<AdminAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAnomalies();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAnomalies();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAnomalies(undefined, 50);
      if (response.success) {
        // Filter out resolved anomalies and dismissed ones
        const activeAnomalies = response.data.anomalies
          .filter((a: AdminAnomaly) => !a.resolved && !dismissedIds.has(a.id))
          .sort((a: AdminAnomaly, b: AdminAnomaly) => {
            // Sort by severity: high > medium > low
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          });
        setAnomalies(activeAnomalies);
      }
    } catch (err: any) {
      console.error('Failed to fetch anomalies:', err);
      setError('Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (anomalyId: number) => {
    setDismissedIds(prev => new Set([...prev, anomalyId]));
    setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Shield className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const displayedAnomalies = anomalies.slice(0, maxDisplay);
  const hasMore = anomalies.length > maxDisplay;

  if (displayedAnomalies.length === 0 && !loading) {
    return null; // Don't show anything if there are no anomalies
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Anomaly Alerts
            {anomalies.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                {anomalies.length}
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
          title="Refresh anomalies"
        >
          <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Anomalies List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading && displayedAnomalies.length === 0 ? (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {displayedAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`border rounded-lg p-3 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div className="mt-0.5">
                    {getSeverityIcon(anomaly.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold uppercase">
                        {anomaly.severity}
                      </span>
                      <span className="text-xs opacity-75">
                        {anomaly.anomaly_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {anomaly.details}
                    </p>
                    <p className="text-xs opacity-75">
                      {new Date(anomaly.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(anomaly.id)}
                  className="ml-2 p-1 rounded-md hover:bg-black/10 opacity-75 hover:opacity-100"
                  title="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-600">
                +{anomalies.length - maxDisplay} more anomalies
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnomalyAlerts;


