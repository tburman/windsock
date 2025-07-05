// Unified Analytics API Router
// Automatically routes to SQLite or PostgreSQL based on environment

import { getDatabaseType } from '../../../lib/analytics';

// Import PostgreSQL handlers
import topAuthorsPostgres from './top-authors.js';
import topDomainsPostgres from './top-domains.js';
import sentimentTrendsPostgres from './sentiment-trends.js';
import contentThemesPostgres from './content-themes.js';
import overviewPostgres from './overview.js';

// Import SQLite handlers
import { getAnalyticsData, getAnalyticsRecord } from '../../../lib/analytics/logger-sqlite.js';

// SQLite implementations for each endpoint
const sqliteHandlers = {
  'top-authors': async (req, res) => {
    const { period = 'month', limit = 10 } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND last_seen >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND last_seen >= date('now', '-1 month')";
        break;
      case 'year':
        dateFilter = "AND last_seen >= date('now', '-1 year')";
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = "AND last_seen >= date('now', '-1 month')";
    }
    
    const rows = getAnalyticsData(`
      SELECT 
        author_name,
        article_count,
        ROUND(CAST(total_sentiment_score AS REAL) / article_count, 2) as avg_sentiment,
        positive_count,
        negative_count,
        neutral_count,
        ROUND((CAST(positive_count AS REAL) / article_count) * 100, 1) as positive_percentage,
        last_seen,
        (
          SELECT COUNT(DISTINCT domain) 
          FROM author_domain_stats ads 
          WHERE ads.author_name = aa.author_name ${dateFilter.replace('last_seen', 'last_article')}
        ) as domains_count
      FROM author_analytics aa
      WHERE article_count > 0 ${dateFilter}
      ORDER BY article_count DESC, avg_sentiment DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    const totalAuthors = getAnalyticsRecord(`
      SELECT COUNT(*) as total FROM author_analytics 
      WHERE article_count > 0 ${dateFilter}
    `);
    
    res.status(200).json({
      authors: rows,
      period,
      total: totalAuthors?.total || 0,
      limit: parseInt(limit)
    });
  },

  'top-domains': async (req, res) => {
    const { period = 'month', limit = 10 } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND last_analyzed >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND last_analyzed >= date('now', '-1 month')";
        break;
      case 'year':
        dateFilter = "AND last_analyzed >= date('now', '-1 year')";
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = "AND last_analyzed >= date('now', '-1 month')";
    }
    
    const rows = getAnalyticsData(`
      SELECT 
        domain,
        analysis_count,
        ROUND(CAST(total_sentiment_score AS REAL) / analysis_count, 2) as avg_sentiment,
        positive_count,
        negative_count,
        neutral_count,
        ROUND((CAST(positive_count AS REAL) / analysis_count) * 100, 1) as positive_percentage,
        ROUND((CAST(negative_count AS REAL) / analysis_count) * 100, 1) as negative_percentage,
        ROUND((CAST(neutral_count AS REAL) / analysis_count) * 100, 1) as neutral_percentage,
        last_analyzed,
        (
          SELECT COUNT(DISTINCT author_name) 
          FROM author_domain_stats ads 
          WHERE ads.domain = da.domain ${dateFilter.replace('last_analyzed', 'last_article')}
        ) as unique_authors
      FROM domain_analytics da
      WHERE analysis_count > 0 ${dateFilter}
      ORDER BY analysis_count DESC, avg_sentiment DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    const totalDomains = getAnalyticsRecord(`
      SELECT COUNT(*) as total FROM domain_analytics 
      WHERE analysis_count > 0 ${dateFilter}
    `);
    
    res.status(200).json({
      domains: rows,
      period,
      total: totalDomains?.total || 0,
      limit: parseInt(limit)
    });
  },

  'overview': async (req, res) => {
    // Get overall statistics
    const overallStats = getAnalyticsRecord(`
      SELECT 
        (SELECT COUNT(*) FROM domain_analytics WHERE analysis_count > 0) as total_domains,
        (SELECT COUNT(*) FROM author_analytics WHERE article_count > 0) as total_authors,
        (SELECT COUNT(*) FROM content_themes WHERE frequency > 0) as total_themes,
        (SELECT SUM(analysis_count) FROM domain_analytics) as total_analyses,
        (SELECT SUM(article_count) FROM author_analytics) as total_articles,
        (SELECT ROUND(AVG(avg_sentiment), 2) FROM daily_analytics WHERE total_analyses > 0) as avg_sentiment_all_time
    `);
    
    // Get this month's statistics
    const monthStats = getAnalyticsRecord(`
      SELECT 
        COUNT(*) as active_domains,
        SUM(analysis_count) as total_analyses,
        ROUND(AVG(CAST(total_sentiment_score AS REAL) / analysis_count), 2) as avg_sentiment,
        SUM(positive_count) as positive_count,
        SUM(negative_count) as negative_count,
        SUM(neutral_count) as neutral_count
      FROM domain_analytics 
      WHERE last_analyzed >= date('now', '-1 month')
        AND analysis_count > 0
    `);
    
    const monthData = monthStats || {};
    const totalMonthAnalyses = parseInt(monthData.total_analyses) || 0;
    
    if (totalMonthAnalyses > 0) {
      monthData.positive_percentage = Math.round((monthData.positive_count / totalMonthAnalyses) * 100 * 10) / 10;
      monthData.negative_percentage = Math.round((monthData.negative_count / totalMonthAnalyses) * 100 * 10) / 10;
      monthData.neutral_percentage = Math.round((monthData.neutral_count / totalMonthAnalyses) * 100 * 10) / 10;
    }
    
    // Get top performers this month
    const topAuthorsMonth = getAnalyticsData(`
      SELECT author_name, article_count, ROUND(CAST(total_sentiment_score AS REAL) / article_count, 2) as avg_sentiment
      FROM author_analytics 
      WHERE last_seen >= date('now', '-1 month')
        AND article_count > 0
      ORDER BY article_count DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    const topDomainsMonth = getAnalyticsData(`
      SELECT domain, analysis_count, ROUND(CAST(total_sentiment_score AS REAL) / analysis_count, 2) as avg_sentiment
      FROM domain_analytics 
      WHERE last_analyzed >= date('now', '-1 month')
        AND analysis_count > 0
      ORDER BY analysis_count DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    const topThemesMonth = getAnalyticsData(`
      SELECT theme, frequency, ROUND(avg_sentiment, 2) as avg_sentiment
      FROM content_themes 
      WHERE last_seen >= date('now', '-1 month')
        AND frequency > 0
      ORDER BY frequency DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    // Get recent activity (last 7 days)
    const recentActivity = getAnalyticsData(`
      SELECT 
        analysis_date,
        total_analyses,
        ROUND(avg_sentiment, 2) as avg_sentiment
      FROM daily_analytics 
      WHERE analysis_date >= date('now', '-7 days')
      ORDER BY analysis_date DESC
    `);
    
    // Get search analytics
    const searchStats = getAnalyticsData(`
      SELECT 
        query_type,
        COUNT(*) as query_count,
        AVG(results_count) as avg_results,
        AVG(successful_scrapes) as avg_successful_scrapes,
        ROUND(AVG(avg_sentiment), 2) as avg_sentiment
      FROM search_analytics 
      WHERE search_date >= date('now', '-1 month')
      GROUP BY query_type
      ORDER BY query_count DESC
    `);
    
    res.status(200).json({
      overall: overallStats || {},
      thisMonth: monthData,
      topPerformers: {
        authors: topAuthorsMonth,
        domains: topDomainsMonth,
        themes: topThemesMonth
      },
      recentActivity,
      searchStats,
      generatedAt: new Date().toISOString()
    });
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { endpoint } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint parameter required' });
  }
  
  try {
    const dbType = getDatabaseType();
    
    if (dbType === 'postgresql') {
      // Route to PostgreSQL handlers
      switch (endpoint) {
        case 'top-authors':
          return topAuthorsPostgres(req, res);
        case 'top-domains':
          return topDomainsPostgres(req, res);
        case 'sentiment-trends':
          return sentimentTrendsPostgres(req, res);
        case 'content-themes':
          return contentThemesPostgres(req, res);
        case 'overview':
          return overviewPostgres(req, res);
        default:
          return res.status(404).json({ error: 'Endpoint not found' });
      }
    } else {
      // Use SQLite handlers
      const handler = sqliteHandlers[endpoint];
      if (handler) {
        return handler(req, res);
      } else {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
    }
    
  } catch (error) {
    console.error('Unified analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}