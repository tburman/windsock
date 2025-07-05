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
}