// API endpoint for top authors analytics (SQLite version)
import { getAnalyticsData, getAnalyticsRecord } from '../../../lib/analytics/logger-sqlite';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
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
    
  } catch (error) {
    console.error('Top authors API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}