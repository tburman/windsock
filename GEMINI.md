# Project: URL Sentiment Analyzer

This is a Next.js application that allows users to analyze the sentiment of web pages by providing a list of URLs.

## Core Functionality

The application consists of a frontend and three backend API endpoints, along with a new headline generation API.

### Frontend (`app/page.js`)

*   A single-page React application with a beautiful and responsive user interface, optimized for mobile use.
*   Users can input a list of URLs for bulk processing.
*   The application validates the URLs and processes them sequentially.
*   It calls the backend APIs to fetch content, analyze sentiment, and generate reports.
*   Displays real-time progress, individual results, and a final comprehensive summary report.
*   Includes copy-to-clipboard functionality for the overall report and individual URL analyses.
*   A "Copy All Individual Reports" button is available for bulk copying.
*   Styled with `tailwindcss` and uses `lucide-react` for icons.
*   Features a copyright notice in the footer.

### Backend (`pages/api/`)

*   **`POST /api/fetch-content`**:
    *   Fetches the HTML content of a given URL using `axios`.
    *   Uses `cheerio` to parse the HTML and extract the main text content and the article's headline.
    *   Includes a retry mechanism with exponential backoff.
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

## Key Technologies

*   **Frontend**: Next.js 14, React, Tailwind CSS
*   **Backend**: Next.js API routes
*   **Web Scraping**: Axios + Cheerio
*   **AI**: OpenRouter API + `google/gemini-2.5-flash-lite-preview-06-17`
*   **Deployment**: Vercel

## Setup and Development

### Environment Variables

Create a `.env.local` file in the project root with your OpenRouter API key:

```
OPENROUTER_API_KEY=your_key_here
```

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
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

This project is licensed under the MIT License.
