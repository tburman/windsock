// Analytics Logger Service
// Privacy-focused logging for community insights

import { Pool } from 'pg';

// Database connection pool
let pool;

function getDbPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    // Supabase requires SSL but with rejectUnauthorized: false
    const isSupabase = connectionString?.includes('supabase.com') || connectionString?.includes('supa=');
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Extract domain from URL safely
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Normalize author name for consistency
 */
function normalizeAuthorName(author) {
  if (!author || typeof author !== 'string') return null;
  
  // Remove extra whitespace and normalize case
  return author.trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

/**
 * Extract themes from AI analysis content
 */
function extractThemes(analysisContent) {
  if (!analysisContent || typeof analysisContent !== 'string') return [];
  
  const themes = [];
  const content = analysisContent.toLowerCase();
  
  // Common themes to look for
  const themePatterns = [
    { pattern: /\b(tesla|electric\s+vehicle|ev|automotive)\b/g, theme: 'Electric Vehicles' },
    { pattern: /\b(bitcoin|cryptocurrency|crypto|blockchain)\b/g, theme: 'Cryptocurrency' },
    { pattern: /\b(ai|artificial\s+intelligence|machine\s+learning|ml)\b/g, theme: 'Artificial Intelligence' },
    { pattern: /\b(climate|environment|sustainability|green\s+energy)\b/g, theme: 'Environment' },
    { pattern: /\b(economy|inflation|recession|market|stock)\b/g, theme: 'Economy' },
    { pattern: /\b(politics|election|government|policy)\b/g, theme: 'Politics' },
    { pattern: /\b(health|healthcare|medical|covid|pandemic)\b/g, theme: 'Health' },
    { pattern: /\b(technology|tech|innovation|startup)\b/g, theme: 'Technology' },
    { pattern: /\b(earnings|revenue|profit|financial|quarterly)\b/g, theme: 'Financial Results' },
    { pattern: /\b(social\s+media|facebook|twitter|instagram|tiktok)\b/g, theme: 'Social Media' }
  ];
  
  themePatterns.forEach(({ pattern, theme }) => {
    if (pattern.test(content)) {
      themes.push(theme);
    }
  });
  
  return [...new Set(themes)]; // Remove duplicates
}

/**
 * Determine sentiment category from score
 */
function categorizeSentiment(score) {
  if (score >= 0.1) return 'positive';
  if (score <= -0.1) return 'negative';
  return 'neutral';
}

/**
 * Log analysis data to analytics tables
 */
export async function logAnalysisData(analysisData) {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.log('Analytics logging skipped - no database configured');
    return;
  }
  
  const client = getDbPool();
  
  try {
    await client.query('BEGIN');
    
    const {
      url,
      author,
      content,
      sentiment,
      analysisContent,
      timestamp = new Date(),
      themes = []
    } = analysisData;
    
    const domain = extractDomain(url);
    const normalizedAuthor = normalizeAuthorName(author);
    const sentimentScore = typeof sentiment === 'number' ? sentiment : 0;
    const sentimentCategory = categorizeSentiment(sentimentScore);
    const extractedThemes = extractThemes(analysisContent);
    
    // 1. Update domain analytics
    await client.query(`
      INSERT INTO domain_analytics (domain, analysis_count, total_sentiment_score, ${sentimentCategory}_count, last_analyzed)
      VALUES ($1, 1, $2, 1, $3)
      ON CONFLICT (domain) DO UPDATE SET
        analysis_count = domain_analytics.analysis_count + 1,
        total_sentiment_score = domain_analytics.total_sentiment_score + $2,
        ${sentimentCategory}_count = domain_analytics.${sentimentCategory}_count + 1,
        last_analyzed = $3,
        updated_at = CURRENT_TIMESTAMP
    `, [domain, sentimentScore, timestamp]);
    
    // 2. Update author analytics (if author exists)
    if (normalizedAuthor) {
      await client.query(`
        INSERT INTO author_analytics (author_name, article_count, total_sentiment_score, ${sentimentCategory}_count, last_seen)
        VALUES ($1, 1, $2, 1, $3)
        ON CONFLICT (author_name) DO UPDATE SET
          article_count = author_analytics.article_count + 1,
          total_sentiment_score = author_analytics.total_sentiment_score + $2,
          ${sentimentCategory}_count = author_analytics.${sentimentCategory}_count + 1,
          last_seen = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [normalizedAuthor, sentimentScore, timestamp]);
      
      // 3. Update author-domain relationship
      await client.query(`
        INSERT INTO author_domain_stats (author_name, domain, article_count, avg_sentiment, last_article)
        VALUES ($1, $2, 1, $3, $4)
        ON CONFLICT (author_name, domain) DO UPDATE SET
          article_count = author_domain_stats.article_count + 1,
          avg_sentiment = (author_domain_stats.avg_sentiment * author_domain_stats.article_count + $3) / (author_domain_stats.article_count + 1),
          last_article = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [normalizedAuthor, domain, sentimentScore, timestamp]);
    }
    
    // 4. Update content themes
    for (const theme of extractedThemes) {
      await client.query(`
        INSERT INTO content_themes (theme, frequency, avg_sentiment, last_seen)
        VALUES ($1, 1, $2, $3)
        ON CONFLICT (theme) DO UPDATE SET
          frequency = content_themes.frequency + 1,
          avg_sentiment = (content_themes.avg_sentiment * content_themes.frequency + $2) / (content_themes.frequency + 1),
          last_seen = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [theme, sentimentScore, timestamp]);
    }
    
    // 5. Update daily analytics
    const analysisDate = timestamp.toISOString().split('T')[0];
    await client.query(`
      INSERT INTO daily_analytics (analysis_date, total_analyses, avg_sentiment, ${sentimentCategory}_count)
      VALUES ($1, 1, $2, 1)
      ON CONFLICT (analysis_date) DO UPDATE SET
        total_analyses = daily_analytics.total_analyses + 1,
        avg_sentiment = (daily_analytics.avg_sentiment * daily_analytics.total_analyses + $2) / (daily_analytics.total_analyses + 1),
        ${sentimentCategory}_count = daily_analytics.${sentimentCategory}_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [analysisDate, sentimentScore]);
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Analytics logging error:', error);
  }
}

/**
 * Log search query analytics (anonymized)
 */
export async function logSearchData(searchData) {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return;
  }
  
  const client = getDbPool();
  
  try {
    const {
      queryType, // 'url_input' or 'semantic_search'
      queryLength,
      resultsCount,
      successfulScrapes,
      avgSentiment,
      timestamp = new Date()
    } = searchData;
    
    await client.query(`
      INSERT INTO search_analytics 
      (query_type, query_length, results_count, successful_scrapes, avg_sentiment, search_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [queryType, queryLength, resultsCount, successfulScrapes, avgSentiment, timestamp]);
    
  } catch (error) {
    console.error('Search analytics logging error:', error);
  }
}

/**
 * Batch log multiple analysis results
 */
export async function logBatchAnalysis(analysisResults) {
  if (!Array.isArray(analysisResults) || analysisResults.length === 0) {
    return;
  }
  
  // Log each analysis individually to handle different domains/authors
  for (const result of analysisResults) {
    if (result.url && result.sentiment !== undefined) {
      await logAnalysisData(result);
    }
  }
  
  // Log the batch search query
  const successfulScrapes = analysisResults.filter(r => r.content && !r.error).length;
  const avgSentiment = analysisResults
    .filter(r => typeof r.sentiment === 'number')
    .reduce((sum, r, _, arr) => sum + r.sentiment / arr.length, 0);
  
  await logSearchData({
    queryType: 'batch_analysis',
    queryLength: analysisResults.length,
    resultsCount: analysisResults.length,
    successfulScrapes,
    avgSentiment
  });
}

/**
 * Initialize database tables if they don't exist
 */
export async function initializeAnalyticsDB() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.log('Analytics database not configured - skipping initialization');
    return;
  }
  
  const client = getDbPool();
  
  try {
    // Check if tables exist
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'domain_analytics'
    `);
    
    if (rows.length === 0) {
      console.log('Analytics tables not found - please run the SQL schema creation script');
      console.log('File: sql/analytics_schema.sql');
    } else {
      console.log('Analytics database initialized successfully');
    }
    
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Export domain helper for external use
export { extractDomain, normalizeAuthorName, extractThemes, categorizeSentiment };