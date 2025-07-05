// API endpoint for top authors analytics
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
        dateFilter = "AND last_seen >= DATE_TRUNC('week', CURRENT_DATE)";
        break;
      case 'month':
        dateFilter = "AND last_seen >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND last_seen >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = "AND last_seen >= DATE_TRUNC('month', CURRENT_DATE)";
    }
    
    const { rows } = await client.query(`
      SELECT 
        author_name,
        article_count,
        ROUND(total_sentiment_score::numeric / article_count, 2) as avg_sentiment,
        positive_count,
        negative_count,
        neutral_count,
        ROUND((positive_count::numeric / article_count) * 100, 1) as positive_percentage,
        last_seen,
        (
          SELECT COUNT(DISTINCT domain) 
          FROM author_domain_stats ads 
          WHERE ads.author_name = aa.author_name ${dateFilter.replace('last_seen', 'last_article')}
        ) as domains_count
      FROM author_analytics aa
      WHERE article_count > 0 ${dateFilter}
      ORDER BY article_count DESC, avg_sentiment DESC
      LIMIT $1
    `, [parseInt(limit)]);
    
    const totalAuthors = await client.query(`
      SELECT COUNT(*) as total FROM author_analytics 
      WHERE article_count > 0 ${dateFilter}
    `);
    
    res.status(200).json({
      authors: rows,
      period,
      total: parseInt(totalAuthors.rows[0].total),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Top authors API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}