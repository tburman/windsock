# Analytics System Setup Guide

This guide explains how to set up and use the privacy-focused analytics system for Windsock.

## Overview

The analytics system collects aggregate data about:
- Domain analysis frequency and sentiment patterns
- Author publication patterns (anonymized)
- Content themes and topics
- Search query patterns (anonymized)
- Time-based trends

**Privacy Focus**: The system does NOT store:
- Full URLs (only domains)
- User identities
- Complete article content
- Personal information
- Individual user search histories

## Environment-Aware Database System

The analytics system automatically adapts to your environment:
- **Development**: Uses SQLite (fallback) or PostgreSQL if configured
- **Production**: Uses PostgreSQL (Supabase, Vercel Postgres, etc.)

## Quick Setup

### 1. For Development (Local)

**Option A: SQLite (No Configuration Required)**
```bash
npm install
npm run init-analytics
```
This creates a local SQLite database at `data/analytics.db` automatically.

**Option B: PostgreSQL (Optional for Development)**
```bash
# Add to .env.local
POSTGRES_URL="your_postgresql_connection_string"
npm run init-analytics
```

### 2. For Production (Vercel + Supabase)

**Step 1: Create Supabase Database**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the **POSTGRES_URL** (non-pooling connection)

**Step 2: Create Database Schema**
1. Go to Supabase SQL Editor
2. Run this command to create tables:
```sql
-- Create basic analytics tables
CREATE TABLE domain_analytics (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    analysis_count INTEGER DEFAULT 1,
    total_sentiment_score DECIMAL(5,2) DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    first_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE author_analytics (
    id SERIAL PRIMARY KEY,
    author_name VARCHAR(500) NOT NULL UNIQUE,
    article_count INTEGER DEFAULT 1,
    domain_count INTEGER DEFAULT 1,
    total_sentiment_score DECIMAL(5,2) DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_analytics (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL,
    query_length INTEGER,
    results_count INTEGER DEFAULT 0,
    successful_scrapes INTEGER DEFAULT 0,
    avg_sentiment DECIMAL(5,2) DEFAULT 0,
    search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Step 3: Set Vercel Environment Variables**
In your Vercel project dashboard:
```bash
POSTGRES_URL="postgres://postgres.xxx:password@xxx.supabase.com:5432/postgres"
OPENROUTER_API_KEY="your_openrouter_key"
EXA_API_KEY="your_exa_key"
LOGIN_USERNAME="your_username"
LOGIN_PASSWORD="your_password"
```

**Step 4: Deploy**
```bash
git push origin main
# Vercel will auto-deploy
```

## Dependencies

All required dependencies are included in package.json:
```bash
npm install  # Installs pg, better-sqlite3, dotenv, etc.
```

## Usage

### API Endpoints

The analytics system provides several API endpoints:

#### 1. Overview Statistics
```javascript
GET /api/analytics/overview
```
Returns overall statistics including total analyses, domains, authors, and recent activity.

#### 2. Top Authors
```javascript
GET /api/analytics/top-authors?period=month&limit=10
```
Parameters:
- `period`: `week`, `month`, `year`, `all`
- `limit`: Number of results (default: 10)

#### 3. Top Domains
```javascript
GET /api/analytics/top-domains?period=month&limit=10
```
Same parameters as top authors.

#### 4. Content Themes
```javascript
GET /api/analytics/content-themes?period=month&limit=15
```
Returns trending themes and topics.

#### 5. Sentiment Trends
```javascript
GET /api/analytics/sentiment-trends?days=30
```
Parameters:
- `days`: Number of days to analyze (default: 30)

### Frontend Integration

Add the analytics component to your dashboard:

```javascript
import CommunityAnalytics from '../components/CommunityAnalytics';

// In your dashboard component
const [showAnalytics, setShowAnalytics] = useState(false);

// Add button to show analytics
<button onClick={() => setShowAnalytics(true)}>
  View Community Analytics
</button>

// Add the analytics component
<CommunityAnalytics 
  isOpen={showAnalytics} 
  onClose={() => setShowAnalytics(false)} 
/>
```

## Data Collection

The system automatically logs data when users:
1. **Analyze individual URLs**: Logs domain, author, sentiment, themes
2. **Generate batch reports**: Logs all analyzed URLs as a batch
3. **Perform searches**: Logs search type, query length, result count

### Data Processing

- **Domains**: Extracted from URLs, stored without paths
- **Authors**: Normalized (title case, whitespace cleaned)
- **Themes**: Auto-detected from content using keyword patterns
- **Sentiment**: Converted to numeric scores (-1 to 1)
- **Time**: Aggregated by day for trend analysis

## Maintenance

### Database Maintenance

The system includes:
- **LRU Cache**: Prevents memory bloat
- **Indexed Queries**: Optimized for common analytics queries
- **Aggregation Views**: Pre-computed common statistics

### Monitoring

Check these metrics regularly:
- Database size growth
- Query performance
- Error rates in analytics logging

### Scaling Considerations

For high-traffic applications:
1. **Database Indexing**: Additional indexes may be needed
2. **Caching**: Consider Redis for API endpoint caching
3. **Archiving**: Old daily analytics can be archived monthly

## Privacy Compliance

The system is designed to be privacy-compliant:
- No personal data collection
- Domain-level aggregation only
- No individual user tracking
- Anonymized search patterns
- No full content storage

## Troubleshooting

### Common Issues

1. **"Analytics database not configured"**
   - Check environment variables
   - Verify database connection string

2. **"Analytics tables not found"**
   - Run the SQL schema creation script
   - Check database permissions

3. **High database usage**
   - Review analytics logging frequency
   - Consider implementing sampling for high-volume sites

4. **Slow analytics queries**
   - Check database indexes
   - Review query complexity
   - Consider caching strategies

### Debug Mode

Enable debug logging:
```javascript
// In your API routes
console.log('Analytics logging:', { analyticsData });
```

## Security Considerations

1. **Database Access**: Use read-only credentials for analytics queries when possible
2. **API Rate Limiting**: Implement rate limiting on analytics endpoints
3. **Input Validation**: All analytics inputs are validated and sanitized
4. **Data Retention**: Consider implementing data retention policies

## Future Enhancements

Potential additions:
- Geographic analysis (based on domain origins)
- Advanced sentiment analysis (emotion detection)
- Automated insights and alerts
- Real-time analytics dashboard
- Export capabilities for further analysis

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for error messages
3. Verify database connectivity and schema
4. Check environment variable configuration