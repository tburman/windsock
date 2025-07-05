// ===== README.md =====
# Windsock (BETA)

A Next.js web application that analyzes sentiment across multiple URLs to show you which way the wind is blowing.

## Features

- 🌐 **Dual Input Modes**: Choose between URL input or semantic search to find relevant content
- 🔍 **Smart Search**: Use Exa.ai to discover relevant URLs with natural language queries and intelligent date constraints
- 📅 **Advanced Date Parsing**: Understands "today", "this week", "june and july 2025", and specific date formats
- 👤 **Author Extraction**: Automatically identifies and displays article authors using multiple detection strategies
- 📰 **Publication Dates**: Shows article publication dates from search results and extracted content for verification
- 🎯 **Site-Specific Extractors**: Specialized content extraction for major automotive and financial sites with enhanced metadata
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini Flash Lite via OpenRouter for fast, accurate sentiment analysis
- 📊 **Comprehensive Reporting**: Get overall sentiment trends, key themes, and "wind direction" insights
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
4. Add your API keys as environment variables:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `EXA_API_KEY`: Your Exa.ai API key
   - `LOGIN_USERNAME`: Your dashboard username
   - `LOGIN_PASSWORD`: Your dashboard password

### 3. Start Analyzing

**URL Mode:**
- Paste URLs (one per line) into the text area
- Click "Analyze Sentiment"

**Search Mode:**
- Toggle to Search mode  
- Enter queries like "Tesla earnings today", "Bitcoin news this week", or "parth jindal in june and july 2025"
- Choose number of results (10, 25, 50, or 100)
- Click "Search & Analyze"

Watch real-time progress as content is discovered and analyzed, then get comprehensive sentiment analysis and reporting with author attribution and publication dates.

## Cost Estimate

For 100 URLs using Gemini Flash Lite:
- **Analysis cost**: ~$0.01-0.02
- **Vercel hosting**: Free tier is sufficient
- **Total**: Practically free per analysis

## API Endpoints

- `POST /api/search-exa` - **NEW**: Semantic search using Exa.ai with intelligent date parsing and configurable result limits
- `POST /api/fetch-content` - Scrapes content from URLs with site-specific extractors, global shared caching, bot detection handling, and comprehensive metadata extraction (author, published date)
- `POST /api/fetch-content-batch` - Batch processing for multiple URLs with the same advanced extraction capabilities  
- `POST /api/analyze-sentiment` - Analyzes sentiment using OpenRouter
- `POST /api/generate-report` - Creates comprehensive summary report
- `POST /api/generate-headline` - Generates dynamic report headlines
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/user` - Authentication status check

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API routes with global shared caching
- **Content Discovery**: Exa.ai semantic search with date constraint detection
- **Web Scraping**: Axios + Cheerio with enhanced bot detection evasion and site-specific extractors
- **Content Extraction**: Modular extractor system for automotive sites (CarDekho, CarAndBike, AutocarIndia, EvoIndia) and financial sites (ZeeBiz, MoneyControl, MSN)
- **AI**: OpenRouter API + Google Gemini models (Flash Lite & Flash 1.5)
- **Authentication**: Cookie-based sessions with middleware protection
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_openrouter_api_key
EXA_API_KEY=your_exa_api_key
LOGIN_USERNAME=your_username
LOGIN_PASSWORD=your_password
```

**Required for deployment:**
- `OPENROUTER_API_KEY`: Your API key from OpenRouter.ai
- `EXA_API_KEY`: Your API key from Exa.ai (required for search functionality)
- `LOGIN_USERNAME`: Dashboard access username
- `LOGIN_PASSWORD`: Dashboard access password

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

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