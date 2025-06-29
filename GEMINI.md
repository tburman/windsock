# Project: URL Sentiment Analyzer

This is a Next.js application that allows users to analyze the sentiment of web pages by providing a list of URLs.

## Core Functionality

The application consists of a frontend and three backend API endpoints.

### Frontend (`app/page.js`)

*   A single-page React application.
*   Users can input a list of URLs for bulk processing.
*   The application validates the URLs and processes them sequentially.
*   It calls the backend APIs to fetch content, analyze sentiment, and generate a report.
*   Displays real-time progress, individual results, and a final summary report.
*   Styled with `tailwindcss` and uses `lucide-react` for icons.

### Backend (`pages/api/`)

*   **`POST /api/fetch-content`**:
    *   Fetches the HTML content of a given URL using `axios`.
    *   Uses `cheerio` to parse the HTML and extract the main text content.
    *   Includes a retry mechanism with exponential backoff.
*   **`POST /api/analyze-sentiment`**:
    *   Analyzes the sentiment of the provided text content using the OpenRouter API with the `google/gemini-flash-1.5-8b` model.
    *   Returns a structured JSON object with detailed analysis, including sentiment, confidence, tone, key messages, and more.
*   **`POST /api/generate-report`**:
    *   Takes the analysis results from multiple URLs.
    *   Generates a comprehensive summary report using the OpenRouter API.
    *   The report includes overall sentiment, distribution, dominant tone, key themes, and an executive summary.

## Key Technologies

*   **Frontend**: Next.js 14, React, Tailwind CSS
*   **Backend**: Next.js API routes
*   **Web Scraping**: Axios + Cheerio
*   **AI**: OpenRouter API + `google/gemini-flash-1.5-8b`
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
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

This project is licensed under the MIT License.