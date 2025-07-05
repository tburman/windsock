# Windsock - AI-Powered Sentiment Analysis Tool

A Next.js web application that analyzes sentiment across multiple URLs to show you which way the wind is blowing.

## Features

- 🌐 **Dual Input Modes**: Choose between URL input or semantic search to find relevant content
- 🔍 **Optimized Search**: Enhanced Exa.ai integration with semantic search, quality filtering, and intelligent result ranking
- 📅 **Advanced Date Parsing**: Understands "today", "this week", "june and july 2025", and specific date formats
- 👤 **Author Extraction**: Automatically identifies and displays article authors using multiple detection strategies
- 📰 **Publication Dates**: Shows article publication dates from search results and extracted content for verification
- 🎯 **Site-Specific Extractors**: Specialized content extraction for major automotive, financial, and news sites with enhanced metadata
- ⚡ **Batch Processing**: Toggle between sequential processing (detailed progress) and batch processing (faster results)
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini Flash Lite via OpenRouter for fast, accurate sentiment analysis
- 📊 **Comprehensive Reporting**: Get overall sentiment trends, key themes, and "wind direction" insights
- 📈 **Community Analytics**: Privacy-focused analytics system tracking domain trends, author insights, and content themes
- ⚡ **Smart Caching**: Global shared cache with content hash validation for optimal performance
- 🛡️ **Graceful Error Handling**: Handles bot detection and site blocks with user-friendly error messages
- 🔄 **Reset Functionality**: Start fresh with a complete analysis reset at any time
- 💰 **Cost Effective**: Gemini Flash Lite provides excellent analysis at very low cost
- 🚀 **Zero DevOps**: Deploy to Vercel with one click

## Quick Start

### 1. Get Your API Keys

**OpenRouter (Required):**
1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Add credits to your account (a few dollars goes a long way)
3. Copy your API key

**Exa.ai (Required for Search):**
1. Sign up at [Exa.ai](https://exa.ai)
2. Get your API key from the dashboard
3. Copy your API key

### 2. Deploy to Vercel

1. Create a new GitHub repository
2. Upload all the files from this project
3. Connect your GitHub repo to Vercel
4. Set up Supabase database (for analytics):
   - Create project at [Supabase.com](https://supabase.com)
   - Run SQL schema in SQL Editor (see [ANALYTICS_SETUP.md](ANALYTICS_SETUP.md))
5. Add your environment variables in Vercel:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `EXA_API_KEY`: Your Exa.ai API key
   - `LOGIN_USERNAME`: Your dashboard username
   - `LOGIN_PASSWORD`: Your dashboard password
   - `POSTGRES_URL`: Your Supabase connection string (for analytics)

### 3. Start Analyzing

**URL Mode:**
- Paste URLs (one per line) into the text area
- Choose processing mode: Sequential (detailed progress) or Batch (faster)
- Click "Analyze Sentiment"

**Search Mode:**
- Toggle to Search mode  
- Enter queries like "Tesla earnings today", "Bitcoin news this week", or "parth jindal in june and july 2025"
- Choose number of results (10, 25, 50, or 100)
- Choose processing mode: Sequential or Batch
- Click "Search & Analyze"

Watch real-time progress as content is discovered and analyzed, then get comprehensive sentiment analysis and reporting with author attribution and publication dates.

## Cost Estimate

For 100 URLs using Gemini Flash Lite:
- **Analysis cost**: ~$0.01-0.02
- **Vercel hosting**: Free tier is sufficient
- **Total**: Practically free per analysis

## API Endpoints

### Core Analysis
- `POST /api/search-exa` - **Optimized semantic search** using Exa.ai with query preprocessing, quality scoring, domain filtering, and intelligent result ranking
- `POST /api/fetch-content` - Scrapes content from URLs with site-specific extractors, global shared caching, bot detection handling, and comprehensive metadata extraction (author, published date)
- `POST /api/fetch-content-batch` - Batch processing for multiple URLs with the same advanced extraction capabilities  
- `POST /api/analyze-sentiment` - Analyzes sentiment using OpenRouter
- `POST /api/generate-report` - Creates comprehensive summary report
- `POST /api/generate-headline` - Generates dynamic report headlines

### Analytics (NEW)
- `GET /api/analytics/unified?endpoint=overview` - Community analytics overview
- `GET /api/analytics/unified?endpoint=top-authors` - Top authors by time period
- `GET /api/analytics/unified?endpoint=top-domains` - Domain analysis patterns
- `GET /api/analytics/unified?endpoint=content-themes` - Trending content themes
- `GET /api/analytics/unified?endpoint=sentiment-trends` - Sentiment trends over time

### Authentication
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/user` - Authentication status check

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API routes with global shared caching
- **Database**: SQLite (development) / PostgreSQL (production)
- **Content Discovery**: Exa.ai semantic search with query optimization, quality filtering, and result ranking
- **Web Scraping**: Axios + Cheerio with enhanced bot detection evasion and site-specific extractors
- **Content Extraction**: Modular extractor system for automotive sites (CarDekho, CarAndBike, AutocarIndia, EvoIndia), financial sites (ZeeBiz, MoneyControl, MSN), and news sites (HindustanTimes)
- **AI**: OpenRouter API + Google Gemini models (Flash Lite & Flash 1.5)
- **Analytics**: Privacy-focused analytics with automatic environment detection
- **Authentication**: Cookie-based sessions with middleware protection
- **Deployment**: Vercel + Supabase

## Environment Variables

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_openrouter_api_key
EXA_API_KEY=your_exa_api_key
LOGIN_USERNAME=your_username
LOGIN_PASSWORD=your_password

# Optional: PostgreSQL for production analytics
POSTGRES_URL=your_supabase_connection_string
```

**Required for deployment:**
- `OPENROUTER_API_KEY`: Your API key from OpenRouter.ai
- `EXA_API_KEY`: Your API key from Exa.ai (required for search functionality)
- `LOGIN_USERNAME`: Dashboard access username
- `LOGIN_PASSWORD`: Dashboard access password
- `POSTGRES_URL`: Database connection for analytics (optional, uses SQLite fallback)

## Development

```bash
npm install
npm run init-analytics  # Initialize analytics database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

For detailed analytics setup, see [ANALYTICS_SETUP.md](ANALYTICS_SETUP.md)

## Exa Search Optimizations (Updated 2025-01-05)

The search functionality has been significantly enhanced to provide better quality results:

### Enhanced Search Method
- **Uses `searchAndContents()`** instead of basic search for richer metadata
- **Text snippets** (1000 characters) for better context
- **Highlights** show relevant content sections  
- **Summaries** provide quick article overviews

### Query Preprocessing
- **Automatic optimization** removes unnecessary words and adds context
- **News context** automatically added for better article discovery
- **Minimum length** ensures semantic search effectiveness
- Example: "AI" becomes "latest news about AI news articles analysis"

### Quality Scoring & Filtering
Each result gets scored (0-1) based on:
- **Content richness** (title quality, summary length, highlights)
- **Publication recency** (recent articles get boost)
- **Domain reputation** (trusted news sources prioritized)
- **Spam detection** (low-quality domains filtered out)

Results below 0.3 quality score are filtered out automatically.

### Advanced Parameters
The search API supports additional parameters:
```javascript
{
  "query": "search term",
  "numResults": 25,
  "includeDomains": ["reuters.com", "nytimes.com"],  // Optional
  "excludeDomains": ["spam.com"],                    // Optional  
  "searchType": "auto"                              // auto/neural/keyword
}
```

### Trusted Domain Boosting
Results from reputable sources get quality score increases:
- Reuters, AP, BBC, CNN, New York Times, Washington Post, Wall Street Journal

These optimizations provide search result quality comparable to the Exa MCP while maintaining cost efficiency.

## Performance & Error Handling

### Smart Caching
- **Global shared cache**: All users benefit from cached content across sessions
- **Content hash validation**: Only refetches when content actually changes, not just on time expiry
- **Domain-aware TTL**: News sites (2h), financial sites (1h), social media (30m), blogs (12h)
- **LRU memory management**: Automatic eviction of least-used entries when cache reaches 2500 URLs (~125MB)
- **Intelligent cleanup**: Removes expired entries every 30 minutes to maintain performance
- **High capacity**: Supports analysis of up to 2000 URLs without cache pressure

### Graceful Error Handling
- **Bot Detection**: Handles sites that block automated access (e.g., Yahoo Finance) with user-friendly messages
- **Network Issues**: Graceful handling of timeouts and connection problems
- **Content Extraction**: Clear messaging when pages lack extractable content
- **Visual Error States**: Color-coded error types with helpful explanations
- **Smart Report Updates**: Only regenerates reports when removing successful analyses, not error results
- **Reset Functionality**: Complete analysis reset with confirmation dialog for starting fresh

### Site Compatibility
- **Anti-bot evasion**: Modern browser headers and user agents
- **Retry logic**: Exponential backoff for transient failures
- **Multiple redirects**: Handles complex redirect chains
- **Content parsing**: Semantic HTML parsing for better text extraction
- **Site-specific extractors**: Specialized handling for major automotive and financial sites
- **Published date extraction**: Comprehensive date parsing from multiple sources (JSON-LD, meta tags, HTML elements)

### Enhanced User Experience
- **Instant Button Feedback**: All buttons provide immediate tactile feedback with click animations and scale effects
- **Immediate Processing State**: Search and analysis buttons instantly show processing state to prevent double-clicks
- **Comprehensive Copy Functions**: Copy overall reports, individual reports, or bulk individual reports with enhanced headers
- **Statistical Headers**: Individual report copies include summary statistics (URL counts, sentiment distribution, average confidence, top themes)
- **URL Processing Stats**: Reports display detailed breakdowns of successful vs failed URL processing
- **Visual State Management**: Clear loading states, progress indicators, and error classifications

## Known Limitations

Some websites actively block automated access:
- **Financial sites** (Yahoo Finance, Bloomberg) use sophisticated bot detection
- **Social media** platforms restrict scraping
- **Subscription sites** may require authentication

For these sites, the app will show clear error messages rather than failing silently.

## License

All rights reserved. Copyright © 2025 Tushar Burman.