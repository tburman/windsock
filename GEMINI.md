# Project: URL Sentiment Analyzer

This is a Next.js application that allows users to analyze the sentiment of web pages by providing a list of URLs.

## Core Functionality

The application consists of a frontend, several backend API endpoints, and an authentication system using Vercel Edge Middleware.

### Frontend

*   **Login Page (`/` - `app/page.js`)**:
    *   A simple login form to authenticate users.
    *   Redirects authenticated users to the dashboard.
*   **Sentiment Analysis Dashboard (`/dashboard` - `pages/dashboard.js`)**:
    *   A protected single-page React application with a beautiful and responsive user interface, optimized for mobile use.
    *   Includes a logout button in the top right corner.
    *   Users can paste any block of text containing URLs. The application will automatically extract all valid URLs (http/https) and process them. This allows for easy analysis of citations or documents containing multiple links.
    *   The application processes the extracted URLs sequentially.
    *   It calls the backend APIs to fetch content, analyze sentiment, and generate reports.
    *   Displays real-time progress, individual results, and a final comprehensive summary report.
    *   Includes copy-to-clipboard functionality for the overall report and individual URL analyses.
    *   A "Copy All Individual Reports" button is available for bulk copying.
    *   Users can remove individual URL results after analysis, and the overall report will dynamically update to reflect the change.
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

*   **Frontend**: Next.js 14, React, Tailwind CSS
*   **Backend**: Next.js API routes, Vercel Edge Middleware
*   **Web Scraping**: Axios + Cheerio
*   **AI**: OpenRouter API + `google/gemini-2.5-flash-lite-preview-06-17`
*   **Deployment**: Vercel

## Setup and Development

### Environment Variables

Create a `.env.local` file in the project root for local development. This file is **not deployed** to Vercel. For deployment, you must set these variables directly in your Vercel project settings.

```
OPENROUTER_API_KEY=your_openrouter_api_key
LOGIN_USERNAME=your_login_username
LOGIN_PASSWORD=your_login_password
```

*   `OPENROUTER_API_KEY`: Your API key for the OpenRouter service.
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

This project is licensed under the MIT License.