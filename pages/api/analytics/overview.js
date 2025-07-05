// API endpoint for general analytics overview
import { Pool } from 'pg';

let pool;

function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return res.status(503).json({ error: 'Analytics database not configured' });
  }
  
  const client = getDbPool();
  
  try {
    // Get overall statistics
    const { rows: overallStats } = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM domain_analytics WHERE analysis_count > 0) as total_domains,
        (SELECT COUNT(*) FROM author_analytics WHERE article_count > 0) as total_authors,
        (SELECT COUNT(*) FROM content_themes WHERE frequency > 0) as total_themes,
        (SELECT SUM(analysis_count) FROM domain_analytics) as total_analyses,
        (SELECT SUM(article_count) FROM author_analytics) as total_articles,
        (SELECT ROUND(AVG(avg_sentiment), 2) FROM daily_analytics WHERE total_analyses > 0) as avg_sentiment_all_time
    `);
    
    // Get this month's statistics
    const { rows: monthStats } = await client.query(`
      SELECT 
        COUNT(*) as active_domains,
        SUM(analysis_count) as total_analyses,
        ROUND(AVG(total_sentiment_score::numeric / analysis_count), 2) as avg_sentiment,
        SUM(positive_count) as positive_count,
        SUM(negative_count) as negative_count,
        SUM(neutral_count) as neutral_count
      FROM domain_analytics 
      WHERE last_analyzed >= DATE_TRUNC('month', CURRENT_DATE)
        AND analysis_count > 0
    `);
    
    const monthData = monthStats[0];
    const totalMonthAnalyses = parseInt(monthData.total_analyses) || 0;
    
    if (totalMonthAnalyses > 0) {
      monthData.positive_percentage = Math.round((monthData.positive_count / totalMonthAnalyses) * 100 * 10) / 10;
      monthData.negative_percentage = Math.round((monthData.negative_count / totalMonthAnalyses) * 100 * 10) / 10;
      monthData.neutral_percentage = Math.round((monthData.neutral_count / totalMonthAnalyses) * 100 * 10) / 10;
    }
    
    // Get top performers this month
    const { rows: topAuthorsMonth } = await client.query(`
      SELECT author_name, article_count, ROUND(total_sentiment_score::numeric / article_count, 2) as avg_sentiment
      FROM author_analytics 
      WHERE last_seen >= DATE_TRUNC('month', CURRENT_DATE)
        AND article_count > 0
      ORDER BY article_count DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    const { rows: topDomainsMonth } = await client.query(`
      SELECT domain, analysis_count, ROUND(total_sentiment_score::numeric / analysis_count, 2) as avg_sentiment
      FROM domain_analytics 
      WHERE last_analyzed >= DATE_TRUNC('month', CURRENT_DATE)
        AND analysis_count > 0
      ORDER BY analysis_count DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    const { rows: topThemesMonth } = await client.query(`
      SELECT theme, frequency, ROUND(avg_sentiment, 2) as avg_sentiment
      FROM content_themes 
      WHERE last_seen >= DATE_TRUNC('month', CURRENT_DATE)
        AND frequency > 0
      ORDER BY frequency DESC, avg_sentiment DESC
      LIMIT 5
    `);
    
    // Get recent activity (last 7 days)
    const { rows: recentActivity } = await client.query(`
      SELECT 
        analysis_date,
        total_analyses,
        ROUND(avg_sentiment, 2) as avg_sentiment
      FROM daily_analytics 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY analysis_date DESC
    `);
    
    // Get search analytics
    const { rows: searchStats } = await client.query(`
      SELECT 
        query_type,
        COUNT(*) as query_count,
        AVG(results_count) as avg_results,
        AVG(successful_scrapes) as avg_successful_scrapes,
        ROUND(AVG(avg_sentiment), 2) as avg_sentiment
      FROM search_analytics 
      WHERE search_date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY query_type
      ORDER BY query_count DESC
    `);
    
    res.status(200).json({
      overall: overallStats[0],
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
    
  } catch (error) {
    console.error('Analytics overview API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}