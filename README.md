// ===== README.md =====
# Windsock

A Next.js web application that analyzes sentiment across multiple URLs to show you which way the wind is blowing.

## Features

- 🌐 **Bulk URL Processing**: Analyze sentiment across dozens or hundreds of URLs
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini Flash Lite via OpenRouter for fast, accurate sentiment analysis
- 📊 **Comprehensive Reporting**: Get overall sentiment trends, key themes, and "wind direction" insights
- ⚡ **Smart Caching**: Session-level deduplication prevents redundant URL fetches for better performance
- 🛡️ **Graceful Error Handling**: Handles bot detection and site blocks with user-friendly error messages
- 💰 **Cost Effective**: Gemini Flash Lite provides excellent analysis at very low cost
- 🚀 **Zero DevOps**: Deploy to Vercel with one click

## Quick Start

### 1. Get Your OpenRouter API Key

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Add credits to your account (a few dollars goes a long way)
3. Copy your API key

### 2. Deploy to Vercel

1. Create a new GitHub repository
2. Upload all the files from this project
3. Connect your GitHub repo to Vercel
4. Add your OpenRouter API key as an environment variable:
   - Key: `OPENROUTER_API_KEY`
   - Value: Your actual API key

### 3. Start Analyzing

- Paste URLs (one per line) into the text area
- Click "Analyze Sentiment"
- Watch real-time progress as each URL is processed
- Get comprehensive sentiment analysis and reporting

## Cost Estimate

For 100 URLs using Gemini Flash Lite:
- **Analysis cost**: ~$0.01-0.02
- **Vercel hosting**: Free tier is sufficient
- **Total**: Practically free per analysis

## API Endpoints

- `POST /api/fetch-content` - Scrapes content from URLs with session caching and bot detection handling
- `POST /api/analyze-sentiment` - Analyzes sentiment using OpenRouter
- `POST /api/generate-report` - Creates comprehensive summary report
- `POST /api/generate-headline` - Generates dynamic report headlines
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/user` - Authentication status check

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API routes with session caching
- **Web Scraping**: Axios + Cheerio with enhanced bot detection evasion
- **AI**: OpenRouter API + Google Gemini models (Flash Lite & Flash 1.5)
- **Authentication**: Cookie-based sessions with middleware protection
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_openrouter_api_key
LOGIN_USERNAME=your_username
LOGIN_PASSWORD=your_password
```

**Required for deployment:**
- `OPENROUTER_API_KEY`: Your API key from OpenRouter.ai
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
- **Session-level deduplication**: Prevents redundant fetches of the same URL within the same analysis session
- **1-hour cache expiry**: Balances performance with content freshness
- **Automatic cleanup**: Removes old cache entries to prevent memory bloat

### Graceful Error Handling
- **Bot Detection**: Handles sites that block automated access (e.g., Yahoo Finance) with user-friendly messages
- **Network Issues**: Graceful handling of timeouts and connection problems
- **Content Extraction**: Clear messaging when pages lack extractable content
- **Visual Error States**: Color-coded error types with helpful explanations

### Site Compatibility
- **Anti-bot evasion**: Modern browser headers and user agents
- **Retry logic**: Exponential backoff for transient failures
- **Multiple redirects**: Handles complex redirect chains
- **Content parsing**: Semantic HTML parsing for better text extraction

## Known Limitations

Some websites actively block automated access:
- **Financial sites** (Yahoo Finance, Bloomberg) use sophisticated bot detection
- **Social media** platforms restrict scraping
- **Subscription sites** may require authentication

For these sites, the app will show clear error messages rather than failing silently.

## License

MIT