# Site-Specific Content Extractors

This modular system manages site-specific content extraction for websites that require special handling beyond generic HTML scraping.

## Architecture

- **BaseExtractor**: Abstract base class that all extractors must extend
  - Provides standardized `extractPublishedDate(html)` method with comprehensive pattern matching
  - Handles common date format issues and timezone normalization
  - Includes content validation and HTML cleaning utilities
- **Registry**: Manages and routes to appropriate extractors based on URL
- **Individual Extractors**: Site-specific implementations (e.g., CarAndBike, CarDekho)

## Adding a New Extractor

### 1. Create the Extractor Class

Create a new file `lib/extractors/[sitename].js`:

```javascript
import { BaseExtractor } from './base.js'

export class MySiteExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'MySiteExtractor'
    this.domains = ['mysite.com', 'www.mysite.com']
  }

  async extract(html, url) {
    try {
      // Your extraction logic here
      const content = extractMyContent(html)
      
      if (!this.validateContent(content)) {
        return null
      }

      return {
        content,
        title: extractMyTitle(html),
        author: extractMyAuthor(html),
        publishedDate: this.extractPublishedDate(html), // Standardized date extraction
        metadata: {
          extractionMethod: 'custom-method',
          // Additional metadata specific to this site
        }
      }
      
    } catch (error) {
      console.log(`❌ MySite extraction failed: ${error.message}`)
      return null
    }
  }

  // Optional: site-specific metadata
  extractMetadata(html, url) {
    return {
      extractorUsed: this.name,
      method: 'my-custom-method'
    }
  }
}
```

### 2. Register the Extractor

Add your extractor to `lib/extractors/registry.js`:

```javascript
import { MySiteExtractor } from './mysite.js'

// In registerDefaultExtractors():
this.register(new MySiteExtractor())
```

### 3. Export from Index

Add to `lib/extractors/index.js`:

```javascript
export { MySiteExtractor } from './mysite.js'
```

## Common Extraction Patterns

### Next.js Sites (like CarAndBike)
```javascript
// Extract from __NEXT_DATA__ script tag
const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
const data = JSON.parse(nextDataMatch[1])
```

### JSON-LD Structured Data
```javascript
// Extract from structured data
const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)
const structuredData = JSON.parse(jsonLdMatch[1])
```

### AMP Discovery
```javascript
// Standard AMP discovery method
const ampLinkMatch = html.match(/<link[^>]*rel=[\"']amphtml[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>/i)
if (ampLinkMatch) {
  const ampUrl = ampLinkMatch[1]
  // Fetch and extract from AMP version
}
```

### API Endpoints
```javascript
// For sites that load content via AJAX
const apiUrl = extractApiUrlFromHtml(html)
const response = await fetch(apiUrl)
const data = await response.json()
```

### Custom DOM Selectors
```javascript
const $ = cheerio.load(html)
const content = $('.custom-article-selector').text()
```

## Best Practices

1. **Always validate extracted content** using `this.validateContent()`
2. **Use try-catch blocks** and return `null` on failure
3. **Log extraction attempts** with descriptive messages
4. **Clean HTML content** using `this.cleanHtmlContent()` when needed
5. **Extract published dates** using `this.extractPublishedDate(html)` from base class
6. **Return standardized format** with `content`, `title`, `author`, `publishedDate`, `metadata`
7. **Handle edge cases** gracefully (malformed dates, missing content, etc.)
8. **Test with multiple URLs** from the target site
9. **Detect JavaScript dependencies** and provide appropriate feedback
10. **Consider browser automation** for SPA and JavaScript-heavy sites

## Testing

Test your extractor with curl:

```bash
curl -X POST http://localhost:3000/api/fetch-content \
  -H "Content-Type: application/json" \
  -d '{"url": "https://mysite.com/article"}'
```

## Currently Supported Sites

All extractors now include **standardized published date extraction** and return a consistent format with `content`, `title`, `author`, `publishedDate`, and `metadata`.

- **CarAndBike.com**: Uses Next.js __NEXT_DATA__ extraction with full metadata support
  - Extracts from JSON API data embedded in `__NEXT_DATA__` script
  - Returns publishedDate from `pubDate` field
  - Includes additional metadata: excerpt, categories, readTime
  
- **CarDekho.com**: Comprehensive extraction with advanced date format handling
  - JSON-LD structured data extraction with fallback to DOM parsing
  - Handles CarDekho's non-standard date format ("G" instead of "T" in ISO dates)
  - Advanced timezone normalization (+0530 → +05:30)
  - CarDekho-specific content selectors and noise removal
  
- **AutocarIndia.com**: Multi-strategy extraction with AMP discovery, JSON-LD, and DOM parsing
  - Supports all sections: auto-features, advice, car-news, car-reviews, bike-reviews
  - Dynamic AMP discovery via `<link rel="amphtml">` tags
  - Comprehensive fallback extraction for non-AMP pages
  - Published date extraction from JSON-LD and meta tags
  
- **EvoIndia.com**: JSON-LD prioritized extraction with comprehensive fallback strategies
  - Primary extraction from rich JSON-LD structured data (Article/NewsArticle schema)
  - AMP version discovery and extraction when available
  - DOM-based extraction with EvoIndia-specific selectors
  - Supports all content sections: opinion, reviews, features, news
  - Published date from `datePublished` in JSON-LD
  
- **ZeeBiz.com**: JSON-LD prioritized extraction with ZeeBiz-specific DOM fallbacks
  - Primary extraction from excellent JSON-LD NewsArticle structured data
  - ZeeBiz-specific selectors (`.article-para`, `.articleheading`, `.writer-name`)
  - Advanced noise filtering to exclude ads and navigation elements
  - Supports all ZeeBiz content sections with high reliability
  - Published date extraction from JSON-LD and fallback methods
  
- **MoneyControl.com**: JSON-LD prioritized extraction with MoneyControl-specific author parsing
  - Primary extraction from JSON-LD NewsArticle structured data with control character cleaning
  - Handles Windows-style CRLF line endings and malformed JSON formatting
  - MoneyControl-specific DOM selectors (`.article_body`, `.content_wrapper`, `.author-name`)
  - Comprehensive author extraction from multiple JSON-LD patterns and DOM elements
  - Supports business news, company analysis, and financial content sections
  - Published date extraction from JSON-LD with fallback to base class methods
  
- **MSN.com**: Limited extraction with JavaScript dependency detection
  - Detects JavaScript-heavy pages that require browser automation
  - Attempts extraction from pre-rendered content (JSON-LD, meta tags)
  - Provides clear feedback when content requires JavaScript execution
  - Includes recommendations for browser automation tools (Puppeteer/Playwright)
  - Handles modern SPA (Single Page Application) architectures gracefully
  - Limited published date extraction from available metadata

## Debugging

Get extractor info:
```javascript
import { getExtractorInfo } from './lib/extractors'
console.log(getExtractorInfo())
```

Get supported domains:
```javascript
import { getSupportedDomains } from './lib/extractors'
console.log(getSupportedDomains())
```

## Published Date Extraction

The base class provides a standardized `extractPublishedDate(html)` method that all extractors can use:

### Supported Patterns
- **JSON-LD**: `datePublished`, `publishedTime`, `dateCreated`
- **Meta tags**: `article:published_time`, `publish-date`, `date`, `pubdate`
- **HTML elements**: `<time datetime="">`, `<time pubdate>`
- **Text patterns**: "Published on:", "Posted:", "Date:", etc.

### Date Format Handling
- **ISO format normalization**: Handles malformed formats (e.g., CarDekho's "G" instead of "T")
- **Timezone conversion**: Converts "+0530" to "+05:30", handles common timezone names
- **Multiple format support**: Handles various date string formats automatically

### Usage in Extractors
```javascript
// In your extractor's extract() method:
const publishedDate = this.extractPublishedDate(html)

return {
  content,
  title,
  author,
  publishedDate, // Will be ISO string or null
  metadata: { ... }
}
```

### Custom Date Extraction
For sites with unique date formats, override the method:
```javascript
extractPublishedDate(html) {
  // Custom logic for this site
  const customPattern = /My Site Date: ([^<]+)/i
  const match = html.match(customPattern)
  if (match) {
    const dateStr = this.normalizeDateString(match[1])
    return new Date(dateStr).toISOString()
  }
  
  // Fallback to base class method
  return super.extractPublishedDate(html)
}
```