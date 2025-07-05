-- Analytics Database Schema for Windsock
-- Privacy-focused logging system for community insights

-- Domain analytics table
CREATE TABLE domain_analytics (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    analysis_count INTEGER DEFAULT 1,
    total_sentiment_score DECIMAL(5,2) DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    first_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain)
);

-- Author analytics table
CREATE TABLE author_analytics (
    id SERIAL PRIMARY KEY,
    author_name VARCHAR(500) NOT NULL,
    article_count INTEGER DEFAULT 1,
    domain_count INTEGER DEFAULT 1,
    total_sentiment_score DECIMAL(5,2) DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(author_name)
);

-- Author-domain relationship table
CREATE TABLE author_domain_stats (
    id SERIAL PRIMARY KEY,
    author_name VARCHAR(500) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    article_count INTEGER DEFAULT 1,
    avg_sentiment DECIMAL(5,2) DEFAULT 0,
    last_article TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(author_name, domain)
);

-- Content themes and topics (extracted from AI analysis)
CREATE TABLE content_themes (
    id SERIAL PRIMARY KEY,
    theme VARCHAR(255) NOT NULL,
    frequency INTEGER DEFAULT 1,
    avg_sentiment DECIMAL(5,2) DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(theme)
);

-- Daily analytics aggregations for time-based trends
CREATE TABLE daily_analytics (
    id SERIAL PRIMARY KEY,
    analysis_date DATE NOT NULL,
    total_analyses INTEGER DEFAULT 0,
    unique_domains INTEGER DEFAULT 0,
    unique_authors INTEGER DEFAULT 0,
    avg_sentiment DECIMAL(5,2) DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    top_domain VARCHAR(255),
    top_author VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(analysis_date)
);

-- Search query analytics (anonymized)
CREATE TABLE search_analytics (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL, -- 'url_input' or 'semantic_search'
    query_length INTEGER, -- character count of query
    results_count INTEGER DEFAULT 0,
    successful_scrapes INTEGER DEFAULT 0,
    avg_sentiment DECIMAL(5,2) DEFAULT 0,
    search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_domain_analytics_domain ON domain_analytics(domain);
CREATE INDEX idx_domain_analytics_analysis_count ON domain_analytics(analysis_count DESC);
CREATE INDEX idx_domain_analytics_last_analyzed ON domain_analytics(last_analyzed DESC);

CREATE INDEX idx_author_analytics_author_name ON author_analytics(author_name);
CREATE INDEX idx_author_analytics_article_count ON author_analytics(article_count DESC);
CREATE INDEX idx_author_analytics_last_seen ON author_analytics(last_seen DESC);

CREATE INDEX idx_author_domain_stats_author ON author_domain_stats(author_name);
CREATE INDEX idx_author_domain_stats_domain ON author_domain_stats(domain);
CREATE INDEX idx_author_domain_stats_count ON author_domain_stats(article_count DESC);

CREATE INDEX idx_content_themes_theme ON content_themes(theme);
CREATE INDEX idx_content_themes_frequency ON content_themes(frequency DESC);

CREATE INDEX idx_daily_analytics_date ON daily_analytics(analysis_date DESC);
CREATE INDEX idx_search_analytics_date ON search_analytics(search_date DESC);
CREATE INDEX idx_search_analytics_type ON search_analytics(query_type);

-- Views for common analytics queries
CREATE VIEW top_authors_monthly AS
SELECT 
    author_name,
    SUM(article_count) as total_articles,
    COUNT(DISTINCT domain) as domains_published,
    AVG(avg_sentiment) as avg_sentiment_score,
    DATE_TRUNC('month', last_article) as month
FROM author_domain_stats 
WHERE last_article >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY author_name, DATE_TRUNC('month', last_article)
ORDER BY total_articles DESC, month DESC;

CREATE VIEW top_domains_monthly AS
SELECT 
    domain,
    analysis_count,
    (positive_count::DECIMAL / NULLIF(analysis_count, 0)) * 100 as positive_percentage,
    (negative_count::DECIMAL / NULLIF(analysis_count, 0)) * 100 as negative_percentage,
    DATE_TRUNC('month', last_analyzed) as month
FROM domain_analytics 
WHERE last_analyzed >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
ORDER BY analysis_count DESC, month DESC;

CREATE VIEW sentiment_trends AS
SELECT 
    analysis_date,
    total_analyses,
    (positive_count::DECIMAL / NULLIF(total_analyses, 0)) * 100 as positive_percentage,
    (negative_count::DECIMAL / NULLIF(total_analyses, 0)) * 100 as negative_percentage,
    (neutral_count::DECIMAL / NULLIF(total_analyses, 0)) * 100 as neutral_percentage,
    avg_sentiment
FROM daily_analytics 
WHERE analysis_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY analysis_date DESC;