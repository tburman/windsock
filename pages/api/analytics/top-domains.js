// API endpoint for top domains analytics
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
    const { period = 'month', limit = 10 } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND last_analyzed >= DATE_TRUNC('week', CURRENT_DATE)";
        break;
      case 'month':
        dateFilter = "AND last_analyzed >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND last_analyzed >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = "AND last_analyzed >= DATE_TRUNC('month', CURRENT_DATE)";
    }
    
    const { rows } = await client.query(`
      SELECT 
        domain,
        analysis_count,
        ROUND(total_sentiment_score::numeric / analysis_count, 2) as avg_sentiment,
        positive_count,
        negative_count,
        neutral_count,
        ROUND((positive_count::numeric / analysis_count) * 100, 1) as positive_percentage,
        ROUND((negative_count::numeric / analysis_count) * 100, 1) as negative_percentage,
        ROUND((neutral_count::numeric / analysis_count) * 100, 1) as neutral_percentage,
        last_analyzed,
        (
          SELECT COUNT(DISTINCT author_name) 
          FROM author_domain_stats ads 
          WHERE ads.domain = da.domain ${dateFilter.replace('last_analyzed', 'last_article')}
        ) as unique_authors
      FROM domain_analytics da
      WHERE analysis_count > 0 ${dateFilter}
      ORDER BY analysis_count DESC, avg_sentiment DESC
      LIMIT $1
    `, [parseInt(limit)]);
    
    const totalDomains = await client.query(`
      SELECT COUNT(*) as total FROM domain_analytics 
      WHERE analysis_count > 0 ${dateFilter}
    `);
    
    res.status(200).json({
      domains: rows,
      period,
      total: parseInt(totalDomains.rows[0].total),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Top domains API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}