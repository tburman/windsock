-- Analytics Database Schema for Windsock (SQLite Version)
-- Privacy-focused logging system for community insights

-- Domain analytics table
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

-- Author analytics table
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

-- Author-domain relationship table
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

-- Content themes and topics (extracted from AI analysis)
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

-- Daily analytics aggregations for time-based trends
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

-- Search query analytics (anonymized)
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_type TEXT NOT NULL, -- 'url_input' or 'semantic_search'
    query_length INTEGER, -- character count of query
    results_count INTEGER DEFAULT 0,
    successful_scrapes INTEGER DEFAULT 0,
    avg_sentiment REAL DEFAULT 0,
    search_date TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_analytics_domain ON domain_analytics(domain);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_analysis_count ON domain_analytics(analysis_count DESC);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_last_analyzed ON domain_analytics(last_analyzed DESC);

CREATE INDEX IF NOT EXISTS idx_author_analytics_author_name ON author_analytics(author_name);
CREATE INDEX IF NOT EXISTS idx_author_analytics_article_count ON author_analytics(article_count DESC);
CREATE INDEX IF NOT EXISTS idx_author_analytics_last_seen ON author_analytics(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_author_domain_stats_author ON author_domain_stats(author_name);
CREATE INDEX IF NOT EXISTS idx_author_domain_stats_domain ON author_domain_stats(domain);
CREATE INDEX IF NOT EXISTS idx_author_domain_stats_count ON author_domain_stats(article_count DESC);

CREATE INDEX IF NOT EXISTS idx_content_themes_theme ON content_themes(theme);
CREATE INDEX IF NOT EXISTS idx_content_themes_frequency ON content_themes(frequency DESC);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(search_date DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_type ON search_analytics(query_type);

-- Views for common analytics queries (SQLite compatible)
CREATE VIEW IF NOT EXISTS top_authors_monthly AS
SELECT 
    author_name,
    SUM(article_count) as total_articles,
    COUNT(DISTINCT domain) as domains_published,
    AVG(avg_sentiment) as avg_sentiment_score,
    strftime('%Y-%m', last_article) as month
FROM author_domain_stats 
WHERE last_article >= date('now', '-12 months')
GROUP BY author_name, strftime('%Y-%m', last_article)
ORDER BY total_articles DESC, month DESC;

CREATE VIEW IF NOT EXISTS top_domains_monthly AS
SELECT 
    domain,
    analysis_count,
    CAST(positive_count AS REAL) / NULLIF(analysis_count, 0) * 100 as positive_percentage,
    CAST(negative_count AS REAL) / NULLIF(analysis_count, 0) * 100 as negative_percentage,
    strftime('%Y-%m', last_analyzed) as month
FROM domain_analytics 
WHERE last_analyzed >= date('now', '-12 months')
ORDER BY analysis_count DESC, month DESC;

CREATE VIEW IF NOT EXISTS sentiment_trends AS
SELECT 
    analysis_date,
    total_analyses,
    CAST(positive_count AS REAL) / NULLIF(total_analyses, 0) * 100 as positive_percentage,
    CAST(negative_count AS REAL) / NULLIF(total_analyses, 0) * 100 as negative_percentage,
    CAST(neutral_count AS REAL) / NULLIF(total_analyses, 0) * 100 as neutral_percentage,
    avg_sentiment
FROM daily_analytics 
WHERE analysis_date >= date('now', '-90 days')
ORDER BY analysis_date DESC;