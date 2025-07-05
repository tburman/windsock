// API endpoint for sentiment trends analytics
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
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    // Get daily sentiment trends
    const { rows: dailyTrends } = await client.query(`
      SELECT 
        analysis_date,
        total_analyses,
        ROUND(avg_sentiment, 2) as avg_sentiment,
        positive_count,
        negative_count,
        neutral_count,
        ROUND((positive_count::numeric / total_analyses) * 100, 1) as positive_percentage,
        ROUND((negative_count::numeric / total_analyses) * 100, 1) as negative_percentage,
        ROUND((neutral_count::numeric / total_analyses) * 100, 1) as neutral_percentage
      FROM daily_analytics 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '${daysInt} days'
      ORDER BY analysis_date DESC
    `);
    
    // Get overall summary for the period
    const { rows: summary } = await client.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(total_analyses) as total_analyses,
        ROUND(AVG(avg_sentiment), 2) as avg_sentiment,
        SUM(positive_count) as total_positive,
        SUM(negative_count) as total_negative,
        SUM(neutral_count) as total_neutral
      FROM daily_analytics 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '${daysInt} days'
    `);
    
    // Calculate percentages for summary
    const summaryData = summary[0];
    const totalAnalyses = parseInt(summaryData.total_analyses) || 0;
    
    if (totalAnalyses > 0) {
      summaryData.positive_percentage = Math.round((summaryData.total_positive / totalAnalyses) * 100 * 10) / 10;
      summaryData.negative_percentage = Math.round((summaryData.total_negative / totalAnalyses) * 100 * 10) / 10;
      summaryData.neutral_percentage = Math.round((summaryData.total_neutral / totalAnalyses) * 100 * 10) / 10;
    }
    
    // Get top performing days
    const { rows: topDays } = await client.query(`
      SELECT 
        analysis_date,
        total_analyses,
        ROUND(avg_sentiment, 2) as avg_sentiment,
        ROUND((positive_count::numeric / total_analyses) * 100, 1) as positive_percentage
      FROM daily_analytics 
      WHERE analysis_date >= CURRENT_DATE - INTERVAL '${daysInt} days'
        AND total_analyses > 0
      ORDER BY avg_sentiment DESC
      LIMIT 5
    `);
    
    res.status(200).json({
      trends: dailyTrends,
      summary: summaryData,
      topDays,
      period: `${daysInt} days`
    });
    
  } catch (error) {
    console.error('Sentiment trends API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}