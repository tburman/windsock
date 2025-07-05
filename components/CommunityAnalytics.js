import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Globe, Hash, Activity } from 'lucide-react';

const CommunityAnalytics = ({ isOpen, onClose }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analytics/overview');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalyticsData();
    }
  }, [isOpen]);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || 0}%`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Community Analytics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading analytics: {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Analyses</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overall?.total_analyses)}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Unique Domains</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overall?.total_domains)}</p>
                  </div>
                  <Globe className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Authors Tracked</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overall?.total_authors)}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Content Themes</p>
                    <p className="text-2xl font-bold">{formatNumber(analyticsData.overall?.total_themes)}</p>
                  </div>
                  <Hash className="w-8 h-8 text-orange-200" />
                </div>
              </div>
            </div>

            {/* This Month Stats */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                This Month
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(analyticsData.thisMonth?.total_analyses)}
                  </p>
                  <p className="text-sm text-gray-600">Total Analyses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatPercentage(analyticsData.thisMonth?.positive_percentage)}
                  </p>
                  <p className="text-sm text-gray-600">Positive Sentiment</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(analyticsData.thisMonth?.active_domains)}
                  </p>
                  <p className="text-sm text-gray-600">Active Domains</p>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Authors */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Top Authors This Month</h3>
                <div className="space-y-2">
                  {analyticsData.topPerformers?.authors?.slice(0, 5).map((author, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-[150px]">
                        {author.author_name}
                      </span>
                      <span className="text-sm font-medium text-blue-600">
                        {author.article_count} articles
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Domains */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Top Domains This Month</h3>
                <div className="space-y-2">
                  {analyticsData.topPerformers?.domains?.slice(0, 5).map((domain, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-[150px]">
                        {domain.domain}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {domain.analysis_count} analyses
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Themes */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Trending Themes</h3>
                <div className="space-y-2">
                  {analyticsData.topPerformers?.themes?.slice(0, 5).map((theme, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-[150px]">
                        {theme.theme}
                      </span>
                      <span className="text-sm font-medium text-purple-600">
                        {theme.frequency}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Activity (Last 7 Days)</h3>
              <div className="space-y-2">
                {analyticsData.recentActivity?.map((day, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm text-gray-600">
                      {new Date(day.analysis_date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-600">
                        {day.total_analyses} analyses
                      </span>
                      <span className={`text-sm font-medium ${
                        day.avg_sentiment > 0 ? 'text-green-600' : 
                        day.avg_sentiment < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {day.avg_sentiment > 0 ? '+' : ''}{day.avg_sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Click "Load Analytics" to view community statistics
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityAnalytics;