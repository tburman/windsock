// ===== README.md =====
# Windsock

A Next.js web application that analyzes sentiment across multiple URLs to show you which way the wind is blowing.

## Features

- 🌐 **Bulk URL Processing**: Analyze sentiment across dozens or hundreds of URLs
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini Flash Lite via OpenRouter for fast, accurate sentiment analysis
- 📊 **Comprehensive Reporting**: Get overall sentiment trends, key themes, and "wind direction" insights
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

- `POST /api/fetch-content` - Scrapes content from URLs
- `POST /api/analyze-sentiment` - Analyzes sentiment using OpenRouter
- `POST /api/generate-report` - Creates comprehensive summary report

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Web Scraping**: Axios + Cheerio
- **AI**: OpenRouter API + Gemini Flash Lite
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_key_here
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## License

MIT