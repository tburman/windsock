// Base extractor class that all site-specific extractors should extend
export class BaseExtractor {
  constructor() {
    this.name = 'BaseExtractor'
    this.domains = [] // Array of domains this extractor handles
  }

  // Check if this extractor can handle the given URL
  canHandle(url) {
    if (!this.domains.length) return false
    
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      return this.domains.some(domain => hostname.includes(domain))
    } catch (error) {
      return false
    }
  }

  // Extract content from HTML - must be implemented by subclasses
  async extract(html, url) {
    throw new Error(`extract() method must be implemented by ${this.name}`)
  }

  // Optional: Extract additional metadata
  extractMetadata(html, url) {
    return {}
  }

  // Helper method to clean HTML content - simple HTML tag removal
  cleanHtmlContent(htmlContent) {
    if (!htmlContent) return ''
    
    // Remove HTML tags and clean up whitespace
    return htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  // Helper method to validate content quality
  validateContent(content) {
    if (!content || typeof content !== 'string') return false
    if (content.length < 100) return false
    
    // Check for common noise indicators
    const noisePatterns = [
      /^(search results|no results found|page not found)/i,
      /^(404|error|access denied)/i,
      /^(home\s+about\s+contact|privacy\s+terms)/i
    ]
    
    return !noisePatterns.some(pattern => pattern.test(content.substring(0, 200)))
  }

  // Standardized method to extract published date from HTML
  extractPublishedDate(html) {
    // Common date extraction patterns across all sites
    const patterns = [
      // JSON-LD structured data
      /"datePublished":\s*"([^"]+)"/,
      /"publishedTime":\s*"([^"]+)"/,
      /"dateCreated":\s*"([^"]+)"/,
      
      // Meta tags
      /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']publish-date["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      
      // HTML elements
      /<time[^>]*datetime=["']([^"']+)["'][^>]*>/i,
      /<time[^>]*pubdate[^>]*datetime=["']([^"']+)["'][^>]*>/i,
      
      // Common text patterns
      /Published on:\s*([^<\n]+)/i,
      /Published:\s*([^<\n]+)/i,
      /Date:\s*([^<\n]+)/i,
      /Posted:\s*([^<\n]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        try {
          let dateStr = match[1].trim()
          
          // Handle common date format issues
          dateStr = this.normalizeDateString(dateStr)
          
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            return date.toISOString()
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    
    return null
  }

  // Normalize various date string formats to ISO format
  normalizeDateString(dateStr) {
    // Handle malformed ISO formats (like CarDekho's "G" instead of "T")
    if (dateStr.includes('G')) {
      dateStr = dateStr.replace('G', 'T')
    }
    
    // Fix timezone format from +0530 to +05:30 and remove space before timezone
    dateStr = dateStr.replace(/\s+([+-])(\d{2})(\d{2})$/, '$1$2:$3')
    
    // Handle other common timezone formats
    dateStr = dateStr.replace(/\s+(UTC|GMT)$/i, '+00:00')
    dateStr = dateStr.replace(/\s+(IST)$/i, '+05:30')
    dateStr = dateStr.replace(/\s+(EST)$/i, '-05:00')
    dateStr = dateStr.replace(/\s+(PST)$/i, '-08:00')
    
    return dateStr
  }
}