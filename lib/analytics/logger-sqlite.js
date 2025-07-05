// Analytics Logger Service (SQLite Version)
// Privacy-focused logging for community insights

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database instance
let db;

function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'analytics.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(dbPath);
    
    // Initialize tables if they don't exist
    initializeTables();
  }
  return db;
}

function initializeTables() {
  try {
    // Create tables directly with exec
    db.exec(`
      CREATE TABLE IF NOT EXISTS domain_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        analysis_count INTEGER DEFAULT 1,
        total_sentiment_score REAL DEFAULT 0,
        positive_count INTEGER DEFAULT 0,
        negative_count INTEGER DEFAULT 0,
        neutral_count INTEGER DEFAULT 0,
        first_analyzed TEXT DEFAULT CURRENT_TIMESTAMP,
        last_analyzed TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(domain)
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS author_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_name TEXT NOT NULL,
        article_count INTEGER DEFAULT 1,
        domain_count INTEGER DEFAULT 1,
        total_sentiment_score REAL DEFAULT 0,
        positive_count INTEGER DEFAULT 0,
        negative_count INTEGER DEFAULT 0,
        neutral_count INTEGER DEFAULT 0,
        first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(author_name)
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS author_domain_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_name TEXT NOT NULL,
        domain TEXT NOT NULL,
        article_count INTEGER DEFAULT 1,
        avg_sentiment REAL DEFAULT 0,
        last_article TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(author_name, domain)
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        avg_sentiment REAL DEFAULT 0,
        first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(theme)
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_date TEXT NOT NULL,
        total_analyses INTEGER DEFAULT 0,
        unique_domains INTEGER DEFAULT 0,
        unique_authors INTEGER DEFAULT 0,
        avg_sentiment REAL DEFAULT 0,
        positive_count INTEGER DEFAULT 0,
        negative_count INTEGER DEFAULT 0,
        neutral_count INTEGER DEFAULT 0,
        top_domain TEXT,
        top_author TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(analysis_date)
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_type TEXT NOT NULL,
        query_length INTEGER,
        results_count INTEGER DEFAULT 0,
        successful_scrapes INTEGER DEFAULT 0,
        avg_sentiment REAL DEFAULT 0,
        search_date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_domain_analytics_domain ON domain_analytics(domain);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_author_analytics_author_name ON author_analytics(author_name);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(analysis_date DESC);`);
    
    console.log('SQLite analytics database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
  }
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
  try {
    const database = getDatabase();
    
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
    const timestampStr = timestamp.toISOString();
    
    // Begin transaction
    const transaction = database.transaction(() => {
      // 1. Update domain analytics
      const domainStmt = database.prepare(`
        INSERT INTO domain_analytics (domain, analysis_count, total_sentiment_score, ${sentimentCategory}_count, last_analyzed)
        VALUES (?, 1, ?, 1, ?)
        ON CONFLICT (domain) DO UPDATE SET
          analysis_count = analysis_count + 1,
          total_sentiment_score = total_sentiment_score + ?,
          ${sentimentCategory}_count = ${sentimentCategory}_count + 1,
          last_analyzed = ?,
          updated_at = CURRENT_TIMESTAMP
      `);
      domainStmt.run(domain, sentimentScore, timestampStr, sentimentScore, timestampStr);
      
      // 2. Update author analytics (if author exists)
      if (normalizedAuthor) {
        const authorStmt = database.prepare(`
          INSERT INTO author_analytics (author_name, article_count, total_sentiment_score, ${sentimentCategory}_count, last_seen)
          VALUES (?, 1, ?, 1, ?)
          ON CONFLICT (author_name) DO UPDATE SET
            article_count = article_count + 1,
            total_sentiment_score = total_sentiment_score + ?,
            ${sentimentCategory}_count = ${sentimentCategory}_count + 1,
            last_seen = ?,
            updated_at = CURRENT_TIMESTAMP
        `);
        authorStmt.run(normalizedAuthor, sentimentScore, timestampStr, sentimentScore, timestampStr);
        
        // 3. Update author-domain relationship
        const authorDomainStmt = database.prepare(`
          INSERT INTO author_domain_stats (author_name, domain, article_count, avg_sentiment, last_article)
          VALUES (?, ?, 1, ?, ?)
          ON CONFLICT (author_name, domain) DO UPDATE SET
            article_count = article_count + 1,
            avg_sentiment = (avg_sentiment * article_count + ?) / (article_count + 1),
            last_article = ?,
            updated_at = CURRENT_TIMESTAMP
        `);
        authorDomainStmt.run(normalizedAuthor, domain, sentimentScore, timestampStr, sentimentScore, timestampStr);
      }
      
      // 4. Update content themes
      for (const theme of extractedThemes) {
        const themeStmt = database.prepare(`
          INSERT INTO content_themes (theme, frequency, avg_sentiment, last_seen)
          VALUES (?, 1, ?, ?)
          ON CONFLICT (theme) DO UPDATE SET
            frequency = frequency + 1,
            avg_sentiment = (avg_sentiment * frequency + ?) / (frequency + 1),
            last_seen = ?,
            updated_at = CURRENT_TIMESTAMP
        `);
        themeStmt.run(theme, sentimentScore, timestampStr, sentimentScore, timestampStr);
      }
      
      // 5. Update daily analytics
      const analysisDate = timestampStr.split('T')[0];
      const dailyStmt = database.prepare(`
        INSERT INTO daily_analytics (analysis_date, total_analyses, avg_sentiment, ${sentimentCategory}_count)
        VALUES (?, 1, ?, 1)
        ON CONFLICT (analysis_date) DO UPDATE SET
          total_analyses = total_analyses + 1,
          avg_sentiment = (avg_sentiment * total_analyses + ?) / (total_analyses + 1),
          ${sentimentCategory}_count = ${sentimentCategory}_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `);
      dailyStmt.run(analysisDate, sentimentScore, sentimentScore);
    });
    
    transaction();
    
  } catch (error) {
    console.error('SQLite analytics logging error:', error);
  }
}

/**
 * Log search query analytics (anonymized)
 */
export async function logSearchData(searchData) {
  try {
    const database = getDatabase();
    
    const {
      queryType, // 'url_input' or 'semantic_search'
      queryLength,
      resultsCount,
      successfulScrapes,
      avgSentiment,
      timestamp = new Date()
    } = searchData;
    
    const stmt = database.prepare(`
      INSERT INTO search_analytics 
      (query_type, query_length, results_count, successful_scrapes, avg_sentiment, search_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(queryType, queryLength, resultsCount, successfulScrapes, avgSentiment, timestamp.toISOString());
    
  } catch (error) {
    console.error('SQLite search analytics logging error:', error);
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
  try {
    const database = getDatabase();
    console.log('SQLite analytics database initialized successfully');
  } catch (error) {
    console.error('SQLite database initialization error:', error);
  }
}

/**
 * Get analytics data for API endpoints
 */
export function getAnalyticsData(query, params = []) {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    console.error('SQLite analytics query error:', error);
    return [];
  }
}

/**
 * Get single analytics record
 */
export function getAnalyticsRecord(query, params = []) {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.get(...params);
  } catch (error) {
    console.error('SQLite analytics query error:', error);
    return null;
  }
}

// Export domain helper for external use
export { extractDomain, normalizeAuthorName, extractThemes, categorizeSentiment };