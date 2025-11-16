import React, { useState, useEffect, useCallback } from 'react';
import { resourcesApi } from '@/services/api/resources';
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  BarChart3, 
  Download,
  Upload,
  RefreshCw,
  Target,
  BookOpen,
  FileCheck
} from 'lucide-react';

interface CoverageStats {
  totalResources: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  byTopic: Record<string, number>;
  coveragePercentage: number;
  targetCoverage: number;
  missingCategories: string[];
  missingTopics: string[];
}

interface FaithSource {
  id: string;
  name: string;
  category: string;
  topic: string;
  language: string;
  status: 'uploaded' | 'pending' | 'missing';
  resourceId?: number;
}

const ResourceCoverageAudit: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [faithSources, setFaithSources] = useState<FaithSource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const loadCoverageData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all resources
      const resourcesResponse = await resourcesApi.getResources({});
      
      if (resourcesResponse.success) {
        const resources = resourcesResponse.data.resources || [];
        
        // Calculate coverage stats
        const byCategory: Record<string, number> = {};
        const byType: Record<string, number> = {};
        const byLanguage: Record<string, number> = {};
        const byTopic: Record<string, number> = {};
        
        resources.forEach((resource: any) => {
          if (resource.category) {
            byCategory[resource.category] = (byCategory[resource.category] || 0) + 1;
          }
          if (resource.file_type) {
            byType[resource.file_type] = (byType[resource.file_type] || 0) + 1;
          }
          if (resource.language) {
            byLanguage[resource.language] = (byLanguage[resource.language] || 0) + 1;
          }
          if (resource.topic) {
            byTopic[resource.topic] = (byTopic[resource.topic] || 0) + 1;
          }
        });

        // Calculate coverage percentage (target: 80%+)
        // This is a simplified calculation - in production, you'd compare against a list of known faith sources
        const totalExpectedSources = 100; // This would come from your faith sources database
        const coveragePercentage = Math.min((resources.length / totalExpectedSources) * 100, 100);
        
        // Identify missing categories and topics
        const expectedCategories = ['Scripture', 'Theology', 'History', 'Liturgy', 'Saints', 'Prayers'];
        const expectedTopics = ['Orthodox Doctrine', 'Church History', 'Spiritual Life', 'Worship', 'Ethics'];
        
        const missingCategories = expectedCategories.filter(cat => !byCategory[cat]);
        const missingTopics = expectedTopics.filter(topic => !byTopic[topic]);

        setStats({
          totalResources: resources.length,
          byCategory,
          byType,
          byLanguage,
          byTopic,
          coveragePercentage,
          targetCoverage: 80,
          missingCategories,
          missingTopics
        });

        // Generate faith sources list (simulated - in production, this would come from your database)
        const simulatedSources: FaithSource[] = [
          { id: '1', name: 'Holy Bible (Ge\'ez)', category: 'Scripture', topic: 'Orthodox Doctrine', language: 'geez', status: 'uploaded', resourceId: 1 },
          { id: '2', name: 'Book of Saints', category: 'Saints', topic: 'Spiritual Life', language: 'english', status: 'pending' },
          { id: '3', name: 'Liturgical Texts', category: 'Liturgy', topic: 'Worship', language: 'amharic', status: 'missing' },
          { id: '4', name: 'Church History', category: 'History', topic: 'Church History', language: 'english', status: 'uploaded', resourceId: 2 },
        ];
        
        setFaithSources(simulatedSources);
      }
    } catch (error) {
      console.error('Failed to load coverage data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoverageData();
  }, [loadCoverageData]);

  const handleExportReport = useCallback(() => {
    if (!stats) return;
    
    const report = {
      generatedAt: new Date().toISOString(),
      coverage: {
        percentage: stats.coveragePercentage,
        target: stats.targetCoverage,
        totalResources: stats.totalResources
      },
      breakdown: {
        byCategory: stats.byCategory,
        byType: stats.byType,
        byLanguage: stats.byLanguage,
        byTopic: stats.byTopic
      },
      gaps: {
        missingCategories: stats.missingCategories,
        missingTopics: stats.missingTopics
      },
      faithSources: faithSources
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource-coverage-audit-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [stats, faithSources]);

  const filteredSources = faithSources.filter(source => {
    if (selectedCategory !== 'all' && source.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && source.status !== selectedStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load coverage data</p>
        </div>
      </div>
    );
  }

  const coverageColor = stats.coveragePercentage >= stats.targetCoverage 
    ? 'text-green-600' 
    : stats.coveragePercentage >= 60 
    ? 'text-amber-600' 
    : 'text-red-600';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Resource Coverage Audit</h1>
            <p className="text-gray-600">Track resource library coverage against existing faith sources</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCoverageData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Coverage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Coverage</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${coverageColor}`}>
                {stats.coveragePercentage.toFixed(1)}%
              </span>
              <span className="text-gray-500">of target</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  stats.coveragePercentage >= stats.targetCoverage ? 'bg-green-500' :
                  stats.coveragePercentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(stats.coveragePercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Target: {stats.targetCoverage}% • Current: {stats.totalResources} resources
            </p>
            {stats.coveragePercentage < stats.targetCoverage && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Below target coverage</span>
              </div>
            )}
            {stats.coveragePercentage >= stats.targetCoverage && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Target coverage achieved</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Total Resources</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-bold text-gray-900">{stats.totalResources}</div>
            <p className="text-sm text-gray-600">Resources in library</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-bold text-gray-900">
              {Object.keys(stats.byCategory).length}
            </div>
            <p className="text-sm text-gray-600">Active categories</p>
            {stats.missingCategories.length > 0 && (
              <div className="text-xs text-amber-600">
                {stats.missingCategories.length} missing categories
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(count / stats.totalResources) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources by Type</h3>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{type.toUpperCase()}</span>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(count / stats.totalResources) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Faith Sources Tracking */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Faith Sources Tracking</h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.keys(stats.byCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="uploaded">Uploaded</option>
              <option value="pending">Pending</option>
              <option value="missing">Missing</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Topic</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Language</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((source) => (
                <tr key={source.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">{source.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.category}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.topic}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 capitalize">{source.language}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      source.status === 'uploaded' ? 'bg-green-100 text-green-800' :
                      source.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {source.status === 'uploaded' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {source.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {source.status === 'missing' && <FileCheck className="h-3 w-3 mr-1" />}
                      {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {source.status === 'uploaded' && source.resourceId ? (
                      <a
                        href={`/resources/${source.resourceId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Resource
                      </a>
                    ) : (
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Upload Resource
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gaps Analysis */}
      {(stats.missingCategories.length > 0 || stats.missingTopics.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Coverage Gaps Identified</h3>
              {stats.missingCategories.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">Missing Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.missingCategories.map(cat => (
                      <span key={cat} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stats.missingTopics.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">Missing Topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.missingTopics.map(topic => (
                      <span key={topic} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceCoverageAudit;

