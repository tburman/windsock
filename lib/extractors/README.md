# Site-Specific Content Extractors

This modular system manages site-specific content extraction for websites that require special handling beyond generic HTML scraping.

## Architecture

- **BaseExtractor**: Abstract base class that all extractors must extend
- **Registry**: Manages and routes to appropriate extractors based on URL
- **Individual Extractors**: Site-specific implementations (e.g., CarAndBike)

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
        metadata: {
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
5. **Handle edge cases** gracefully
6. **Test with multiple URLs** from the target site

## Testing

Test your extractor with curl:

```bash
curl -X POST http://localhost:3000/api/fetch-content \
  -H "Content-Type: application/json" \
  -d '{"url": "https://mysite.com/article"}'
```

## Currently Supported Sites

- **CarAndBike.com**: Uses Next.js __NEXT_DATA__ extraction
- **AutocarIndia.com**: Multi-strategy extraction with AMP discovery, JSON-LD, and DOM parsing
  - Supports all sections: auto-features, advice, car-news, car-reviews, bike-reviews
  - Dynamic AMP discovery via `<link rel="amphtml">` tags
  - Comprehensive fallback extraction for non-AMP pages
- **EvoIndia.com**: JSON-LD prioritized extraction with comprehensive fallback strategies
  - Primary extraction from rich JSON-LD structured data (Article/NewsArticle schema)
  - AMP version discovery and extraction when available
  - DOM-based extraction with EvoIndia-specific selectors
  - Supports all content sections: opinion, reviews, features, news

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