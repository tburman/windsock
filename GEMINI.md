# Project: Windsock (BETA) - URL Sentiment Analyzer

This is a Next.js application that allows users to analyze the sentiment of web pages by providing a list of URLs.

## Core Functionality

The application consists of a frontend, several backend API endpoints, and an authentication system using Vercel Edge Middleware.

### Frontend

*   **Login Page (`/` - `app/page.js`)**:
    *   A beautifully designed login form with consistent Windsock branding.
    *   Features the Wind icon, Windsock title with BETA indicator, and gradient background.
    *   Redirects authenticated users to the dashboard.
*   **Sentiment Analysis Dashboard (`/dashboard` - `pages/dashboard.js`)**:
    *   A protected single-page React application with a beautiful and responsive user interface, optimized for mobile use.
    *   Features consistent branding with Wind icon, Windsock title with BETA indicator, and professional styling.
    *   Includes a logout button in the top right corner.
    *   **Dual input modes**: Users can toggle between URL input and semantic search:
        *   **URL Mode**: Paste any block of text containing URLs. The application will automatically extract all valid URLs (http/https) and process them.
        *   **Search Mode**: Enter search queries to find relevant content via Exa.ai semantic search. Supports natural language queries with intelligent date constraints like "Tesla earnings today", "Bitcoin news this week", "parth jindal in june and july 2025".
        *   **Result limit selector**: Choose between 10, 25, 50, or 100 search results when in search mode.
    *   The application processes URLs sequentially regardless of input method.
    *   It calls the backend APIs to fetch content, analyze sentiment, and generate reports.
    *   Displays real-time progress, individual results, and a final comprehensive summary report.
*   Includes a visual spinner overlay on the overall report section to indicate when it is being updated (not a full-screen overlay).
*   Includes copy-to-clipboard functionality for the overall report and individual URL analyses.
*   A "Copy All Individual Reports" button is available for bulk copying.
*   Users can remove individual URL results after analysis, and the overall report will dynamically update to reflect the change.
*   Users can add new URLs to an existing analysis, and the application will process them and update the overall report accordingly.
*   **Enhanced error handling**: Displays user-friendly error messages with color-coded error types (bot detection, network issues, content problems, etc.) instead of technical error messages.
*   **Error classification**: Different error types are shown with appropriate icons and explanations (🛡️ Bot Protection, 🌐 Network Issue, 📄 Page Not Found, etc.).
*   **Smart report regeneration**: Only regenerates comprehensive reports when removing URLs with successful analyses, skipping unnecessary regeneration for error results.
*   **Reset functionality**: Provides a "Start Fresh" button that appears when results exist, allowing users to completely clear all analysis data with confirmation dialog for safety.
*   **Author and Publication Date Extraction**: Employs multiple strategies to identify article authors and publication dates:
        *   Meta tags (`<meta name="author">`, `<meta property="article:author">`, `<meta property="article:published_time">`, etc.)
        *   JSON-LD structured data parsing for modern websites
        *   CSS selectors (`.author`, `.byline`, `[itemprop="author"]`, `time[datetime]`, etc.) with text cleanup
        *   Intelligent filtering to remove prefixes ("by", "written by") and suffixes ("editor", "staff writer")
*   **Published date display**: Shows article publication dates from Exa.ai search results on URL cards for verification of date constraints.
*   **Site-Specific Extractors**: Employs a modular system (`lib/extractors/`) to handle content extraction for specific websites that require special handling beyond generic HTML scraping. Currently includes extractors for CarAndBike, AutocarIndia, EvoIndia, ZeeBiz, MoneyControl, MSN, and **CarDekho**.
*   **Author and Publication Date Extraction**: Employs multiple strategies to identify article authors and publication dates:
    *   Meta tags (`<meta name="author">`, `<meta property="article:author">`, `<meta property="article:published_time">`, etc.)
    *   JSON-LD structured data parsing for modern websites
    *   CSS selectors (`.author`, `.byline`, `[itemprop="author"]`, `time[datetime]`, etc.) with text cleanup
    *   Intelligent filtering to remove prefixes ("by", "written by") and suffixes ("editor", "staff writer")
*   Styled with `tailwindcss` and uses `lucide-react` for icons.
*   Features a copyright notice in the footer.

### Backend (`pages/api/`)

*   **`POST /api/search-exa`**:
    *   **NEW**: Semantic search endpoint using Exa.ai API for content discovery.
    *   **Intelligent date parsing**: Automatically detects and converts date constraints from natural language queries:
        *   Relative dates: "today", "yesterday", "this week", "past 30 days"
        *   Month/year patterns: "june 2025", "june and july 2025", "december 2024"
        *   Specific dates: "2025-06-01" format
    *   **Configurable result limits**: Supports 10, 25, 50, or 100 search results
    *   **Auto search type**: Uses Exa.ai's automatic search type selection for optimal results
    *   Returns relevant URLs with titles, published dates from search index
    *   Handles rate limiting and quota exceeded errors gracefully with user-friendly messages
*   **`POST /api/fetch-content`**:
    *   Scrapes content from URLs with global shared caching, bot detection handling, author, and publication date extraction.
    *   **Site-Specific Extractors**: Employs a modular system (`lib/extractors/`) to handle content extraction for specific websites that require special handling beyond generic HTML scraping. Currently includes extractors for CarAndBike, AutocarIndia, EvoIndia, ZeeBiz, MoneyControl, MSN, and **CarDekho**.
    *   **Author and Publication Date Extraction Strategies**:
        *   Meta tags (`<meta name="author">`, `<meta property="article:author">`, `<meta property="article:published_time">`, etc.)
        *   JSON-LD structured data parsing for modern websites
        *   CSS selectors (`.author`, `.byline`, `[itemprop="author"]`, `time[datetime]`, etc.) with text cleanup
        *   Intelligent filtering to remove prefixes ("by", "written by") and suffixes ("editor", "staff writer")
    *   Includes a retry mechanism with exponential backoff.
    *   **Global shared caching**: Implements intelligent in-memory caching shared across all users with content hash validation.
    *   **Domain-aware TTL**: Different cache expiry times based on content type (news: 2h, finance: 1h, social: 30m, blogs: 12h).
    *   **LRU memory management**: Automatically evicts least-used entries when cache reaches 2500 URLs (~125MB).
    *   **Content change detection**: Only refetches when content hash changes, not just on time expiry.
    *   **Enhanced bot detection evasion**: Uses modern browser headers, multiple user agents, and site-specific referers.
    *   **Graceful error handling**: Classifies and handles different error types (bot detection, network issues, content extraction failures).
*   **`POST /api/analyze-sentiment`**:
    *   Analyzes the sentiment of the provided text content using the OpenRouter API with the `google/gemini-2.5-flash-lite-preview-06-17` model.
    *   Returns a structured JSON object with detailed analysis, including sentiment, confidence, tone, key messages, and more.
*   **`POST /api/generate-report`**:
    *   Takes the analysis results from multiple URLs.
    *   Generates a comprehensive summary report using the OpenRouter API.
    *   The report includes overall sentiment, distribution, dominant tone, key themes, and an executive summary.
*   **`POST /api/generate-headline`**:
    *   A new API endpoint that takes key messages and themes from analyzed URLs.
    *   Generates a concise, relevant headline for the overall report using the OpenRouter API.
*   **`POST /api/login`**:
    *   Handles user authentication. Validates credentials against environment variables (`LOGIN_USERNAME`, `LOGIN_PASSWORD`).
    *   Sets an `auth_token` cookie upon successful login.
*   **`POST /api/logout`**:
    *   Clears the `auth_token` cookie to log the user out.
*   **`GET /api/user`**:
    *   A utility endpoint to check the authentication status of the current user.

### Authentication (Vercel Edge Middleware)

*   **`middleware.js`**:
    *   Runs before requests are completed.
    *   Checks for the `auth_token` cookie.
    *   Protects the `/dashboard` route, redirecting unauthenticated users to the login page (`/`).
    *   Redirects authenticated users from the login page (`/`) directly to the dashboard (`/dashboard`).

## Key Technologies

*   **Frontend**: Next.js 15, React, Tailwind CSS
*   **Backend**: Next.js API routes with session caching, Vercel Edge Middleware
*   **Web Scraping**: Axios + Cheerio with enhanced bot detection evasion and error handling
*   **AI**: OpenRouter API + Google Gemini models (`google/gemini-2.5-flash-lite-preview-06-17`, `google/gemini-flash-1.5-8b`)
*   **Caching**: Global shared cache with content hash validation, domain-aware TTL, and LRU memory management
*   **Authentication**: Cookie-based sessions with middleware protection
*   **Deployment**: Vercel

## Setup and Development

### Environment Variables

Create a `.env.local` file in the project root for local development. This file is **not deployed** to Vercel. For deployment, you must set these variables directly in your Vercel project settings.

```
OPENROUTER_API_KEY=your_openrouter_api_key
EXA_API_KEY=your_exa_api_key
LOGIN_USERNAME=your_login_username
LOGIN_PASSWORD=your_login_password
```

*   `OPENROUTER_API_KEY`: Your API key for the OpenRouter service.
*   `EXA_API_KEY`: Your API key for the Exa.ai search service (required for search functionality).
*   `LOGIN_USERNAME`: The username for accessing the dashboard (e.g., `user`).
*   `LOGIN_PASSWORD`: The password for accessing the dashboard (e.g., `password`).

### Running Locally

1.  Install dependencies:
    ```bash
    npm install
    ```
    *Note: Project dependencies, including Next.js and ESLint configurations, have been updated for improved stability.*
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your browser. You will be presented with the login page. Use the credentials configured in your `.env.local` file (default: `user`/`password`) to access the sentiment analysis dashboard.

## License

All rights reserved. Copyright © 2025 Tushar Burman.