// API endpoint for content themes analytics
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
    const { period = 'month', limit = 15 } = req.query;
    
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
        theme,
        frequency,
        ROUND(avg_sentiment, 2) as avg_sentiment,
        CASE 
          WHEN avg_sentiment >= 0.1 THEN 'positive'
          WHEN avg_sentiment <= -0.1 THEN 'negative'
          ELSE 'neutral'
        END as sentiment_category,
        last_seen,
        ROUND((frequency::numeric / (SELECT SUM(frequency) FROM content_themes WHERE frequency > 0 ${dateFilter})) * 100, 1) as percentage
      FROM content_themes
      WHERE frequency > 0 ${dateFilter}
      ORDER BY frequency DESC, avg_sentiment DESC
      LIMIT $1
    `, [parseInt(limit)]);
    
    // Get theme sentiment distribution
    const { rows: sentimentDist } = await client.query(`
      SELECT 
        COUNT(*) as total_themes,
        COUNT(CASE WHEN avg_sentiment >= 0.1 THEN 1 END) as positive_themes,
        COUNT(CASE WHEN avg_sentiment <= -0.1 THEN 1 END) as negative_themes,
        COUNT(CASE WHEN avg_sentiment > -0.1 AND avg_sentiment < 0.1 THEN 1 END) as neutral_themes,
        ROUND(AVG(avg_sentiment), 2) as overall_avg_sentiment
      FROM content_themes
      WHERE frequency > 0 ${dateFilter}
    `);
    
    const totalThemes = await client.query(`
      SELECT COUNT(*) as total FROM content_themes 
      WHERE frequency > 0 ${dateFilter}
    `);
    
    res.status(200).json({
      themes: rows,
      distribution: sentimentDist[0],
      period,
      total: parseInt(totalThemes.rows[0].total),
      limit: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Content themes API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}