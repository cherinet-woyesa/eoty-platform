import React, { useState, useEffect } from 'react';
import {
  Video,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Search,
  Upload,
  TrendingUp,
  Server
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface EligibleVideo {
  id: number;
  title: string;
  description: string;
  video_url: string;
  s3_key: string;
  hls_url: string;
  duration: number;
  video_provider: string;
  created_at: string;
  course_id: number;
  course_title: string;
  teacher_id: number;
  eligibility: {
    canMigrate: boolean;
    reason: string;
    currentProvider: string;
    s3Url?: string;
    s3Key?: string;
  };
}

interface MigrationStatus {
  total: number;
  s3: number;
  mux: number;
  errored: number;
  preparing: number;
  migrationProgress: number;
}

interface MigrationProgress {
  lessonId: number;
  status: string;
  provider: string;
  muxStatus: string;
  muxAssetId: string;
  muxPlaybackId: string;
  errorMessage: string;
}

const MuxMigration: React.FC = () => {
  const [videos, setVideos] = useState<EligibleVideo[]>([]);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<Map<number, MigrationProgress>>(new Map());
  const [keepS3Backup, setKeepS3Backup] = useState(true);

  useEffect(() => {
    fetchMigrationStatus();
    fetchEligibleVideos();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (selectAll) {
      setSelectedVideos(videos.filter(v => v.eligibility.canMigrate).map(v => v.id));
    } else {
      setSelectedVideos([]);
    }
  }, [selectAll, videos]);

  const fetchMigrationStatus = async () => {
    try {
      const response = await apiClient.get('/mux-migration/status');
      setStatus(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch migration status:', err);
    }
  };

  const fetchEligibleVideos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/mux-migration/eligible-videos', {
        params: {
          page: currentPage,
          limit: 50,
          search: searchTerm || undefined
        }
      });

      setVideos(response.data.data.videos);
      setTotalPages(response.data.data.pagination.totalPages);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch eligible videos:', err);
      setError('Failed to load eligible videos');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (selectedVideos.length === 0) {
      setError('Please select videos to migrate');
      return;
    }

    try {
      setMigrating(true);
      setError(null);

      await apiClient.post('/mux-migration/migrate', {
        lessonIds: selectedVideos,
        options: {
          keepS3Backup,
          batchSize: 5,
          retryFailures: 2
        }
      });

      // Start polling for progress
      selectedVideos.forEach(lessonId => {
        pollMigrationProgress(lessonId);
      });

      // Refresh status
      await fetchMigrationStatus();
      await fetchEligibleVideos();

      setSelectedVideos([]);
      setSelectAll(false);
    } catch (err: any) {
      console.error('Failed to start migration:', err);
      setError('Failed to start migration: ' + (err.response?.data?.message || err.message));
    } finally {
      setMigrating(false);
    }
  };

  const pollMigrationProgress = async (lessonId: number) => {
    const maxAttempts = 60; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiClient.get(`/mux-migration/progress/${lessonId}`);
        const progress = response.data.data;

        setMigrationProgress(prev => new Map(prev).set(lessonId, progress));

        // Stop polling if completed or failed
        if (progress.status === 'completed' || progress.status === 'failed') {
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (err) {
        console.error('Failed to fetch migration progress:', err);
      }
    };

    poll();
  };

  const handleVerify = async (lessonId: number) => {
    try {
      const response = await apiClient.post(`/mux-migration/verify/${lessonId}`);
      const verification = response.data.data;

      if (verification.verified) {
        // Update progress
        setMigrationProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(lessonId, {
            lessonId,
            status: 'completed',
            provider: 'mux',
            muxStatus: 'ready',
            muxAssetId: verification.assetId,
            muxPlaybackId: verification.playbackId,
            errorMessage: ''
          });
          return newMap;
        });

        // Refresh lists
        await fetchMigrationStatus();
        await fetchEligibleVideos();
      }
    } catch (err: any) {
      console.error('Failed to verify migration:', err);
      setError('Failed to verify migration: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleSelectVideo = (videoId: number) => {
    if (selectedVideos.includes(videoId)) {
      setSelectedVideos(selectedVideos.filter(id => id !== videoId));
    } else {
      setSelectedVideos([...selectedVideos, videoId]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Loading migration data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Server className="h-8 w-8" />
                Mux Video Migration
              </h1>
              <p className="text-purple-100 mt-2">
                Migrate videos from AWS S3 to Mux for better streaming performance
              </p>
            </div>
            <Upload className="h-16 w-16 opacity-20" />
          </div>
        </div>

        {/* Migration Status Overview */}
        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Database className="h-6 w-6 text-blue-600" />
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.total}</p>
              <p className="text-sm text-gray-600">Total Videos</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Video className="h-6 w-6 text-orange-600" />
                <span className="text-xs font-medium text-orange-600">S3</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.s3}</p>
              <p className="text-sm text-gray-600">On S3</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Server className="h-6 w-6 text-purple-600" />
                <span className="text-xs font-medium text-purple-600">Mux</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.mux}</p>
              <p className="text-sm text-gray-600">On Mux</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-6 w-6 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Processing</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.preparing}</p>
              <p className="text-sm text-gray-600">Processing</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <span className="text-xs font-medium text-red-600">Errors</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.errored}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        )}

        {/* Migration Progress Bar */}
        {status && status.total > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Migration Progress</span>
              <span className="text-sm font-bold text-purple-600">{status.migrationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${status.migrationProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {status.mux} of {status.total} videos migrated to Mux
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}

        {/* Search and Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={fetchEligibleVideos}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleMigrate}
                disabled={selectedVideos.length === 0 || migrating}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4 mr-2" />
                {migrating ? 'Migrating...' : `Migrate ${selectedVideos.length} Video${selectedVideos.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Migration Options */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={keepS3Backup}
                onChange={(e) => setKeepS3Backup(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Keep S3 backup after migration (recommended)</span>
            </label>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedVideos.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-purple-800 font-medium">
                {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedVideos([]);
                setSelectAll(false);
              }}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Videos Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => {
                  const progress = migrationProgress.get(video.id);
                  return (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedVideos.includes(video.id)}
                          onChange={() => toggleSelectVideo(video.id)}
                          disabled={!video.eligibility.canMigrate}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <Video className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {video.title}
                            </p>
                            {video.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {video.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{video.course_title}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{formatDuration(video.duration)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{formatDate(video.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        {progress ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(progress.status)}`}>
                            {getStatusIcon(progress.status)}
                            <span className="ml-1">{progress.status.replace('_', ' ')}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            video.eligibility.canMigrate ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {video.eligibility.canMigrate ? 'Ready' : 'Not Eligible'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {progress && progress.status === 'in_progress' && (
                          <button
                            onClick={() => handleVerify(video.id)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Videos Migrated!</h3>
            <p className="text-gray-600">
              There are no more S3 videos to migrate. All videos are now on Mux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MuxMigration;
