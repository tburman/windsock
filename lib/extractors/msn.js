import { BaseExtractor } from './base.js'

export class MSNExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'MSNExtractor'
    this.domains = ['msn.com']
  }

  async extract(html, url) {
    try {
      // MSN.com is heavily JavaScript-dependent and loads content dynamically
      // This makes traditional content extraction very challenging
      
      console.log('🔄 MSN: Attempting content extraction from JavaScript-heavy page')
      
      // Try to extract any available content from the initial HTML
      const result = this.extractFromInitialHTML(html, url)
      if (result) {
        return result
      }

      // If no content found, this indicates the page requires JavaScript execution
      console.log('⚠️ MSN: No content found in initial HTML - page requires JavaScript execution')
      
      return {
        content: null,
        title: this.extractTitle(html),
        author: null,
        metadata: {
          extractionMethod: 'msn-javascript-required',
          error: 'MSN.com requires JavaScript execution for content loading',
          recommendation: 'Use a browser automation tool like Puppeteer or Playwright for full content extraction',
          url: url
        }
      }
      
    } catch (error) {
      console.log(`❌ MSN extraction failed: ${error.message}`)
      return null
    }
  }

  // Attempt to extract any content from the initial HTML (usually minimal for MSN)
  extractFromInitialHTML(html, url) {
    try {
      // Check for any pre-rendered content (rare but possible)
      const prerenderedContent = this.extractPrerenderedContent(html)
      if (prerenderedContent) {
        console.log(`✅ MSN: Found pre-rendered content: ${prerenderedContent.length} characters`)
        return {
          content: prerenderedContent,
          title: this.extractTitle(html),
          author: this.extractAuthor(html),
          metadata: {
            extractionMethod: 'msn-prerendered',
            note: 'Extracted from pre-rendered content in initial HTML'
          }
        }
      }

      // Check for any text content in the HTML
      const textContent = this.extractAnyTextContent(html)
      if (textContent && textContent.length > 200) {
        console.log(`✅ MSN: Found text content: ${textContent.length} characters`)
        return {
          content: textContent,
          title: this.extractTitle(html),
          author: this.extractAuthor(html),
          metadata: {
            extractionMethod: 'msn-text-extraction',
            note: 'Extracted available text from initial HTML'
          }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  // Extract any pre-rendered content (JSON-LD, meta descriptions, etc.)
  extractPrerenderedContent(html) {
    // Try JSON-LD first
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs)
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          let jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim()
          const data = JSON.parse(jsonContent)
          
          if (data['@type'] === 'NewsArticle' || data['@type'] === 'Article') {
            const content = data.articleBody || data.description
            if (content && this.validateContent(content)) {
              return content
            }
          }
        } catch (error) {
          continue
        }
      }
    }

    // Try meta description as fallback
    const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    if (metaDescription && metaDescription[1] && metaDescription[1].length > 100) {
      return metaDescription[1]
    }

    // Try Open Graph description
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    if (ogDescription && ogDescription[1] && ogDescription[1].length > 100) {
      return ogDescription[1]
    }

    return null
  }

  // Extract any meaningful text content from the HTML
  extractAnyTextContent(html) {
    try {
      // Remove scripts, styles, and other non-content elements
      let cleanHtml = html
        .replace(/<script[^>]*>.*?<\/script>/gs, '')
        .replace(/<style[^>]*>.*?<\/style>/gs, '')
        .replace(/<noscript[^>]*>.*?<\/noscript>/gs, '')
        .replace(/<!--.*?-->/gs, '')

      // Look for any substantial text blocks
      const textBlocks = []
      const textMatches = cleanHtml.match(/>([^<]{50,})</g)
      
      if (textMatches) {
        for (const match of textMatches) {
          let text = match.replace(/^>/, '').replace(/<$/, '').trim()
          text = this.cleanHtmlContent(text)
          
          // Filter out obvious non-content (JavaScript, CSS, etc.)
          if (text && 
              text.length > 50 && 
              !text.match(/^(function|var|const|let|if|for|while|return|{|}|;)/) &&
              !text.match(/^(font-|color:|background:|margin:|padding:)/) &&
              !text.toLowerCase().includes('javascript') &&
              !text.toLowerCase().includes('stylesheet')) {
            textBlocks.push(text)
          }
        }
      }

      if (textBlocks.length > 0) {
        const content = textBlocks.join('\n\n')
        if (this.validateContent(content)) {
          return content
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  // Extract title from various sources
  extractTitle(html) {
    const titlePatterns = [
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<h1[^>]*>(.*?)<\/h1>/s,
      /<title[^>]*>(.*?)<\/title>/s
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const title = this.cleanHtmlContent(match[1])
        if (title && title.length > 5 && !title.toLowerCase().includes('msn')) {
          return title
        }
      }
    }

    return null
  }

  // Extract author information
  extractAuthor(html) {
    const authorPatterns = [
      /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']twitter:creator["'][^>]*content=["']([^"']+)["'][^>]*>/i
    ]

    for (const pattern of authorPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        const author = this.cleanHtmlContent(match[1])
        if (author && author.length > 2 && author.length < 100) {
          return author
        }
      }
    }

    return null
  }

  extractMetadata(html, url) {
    return {
      extractorUsed: this.name,
      method: 'msn-limited-extraction',
      note: 'MSN.com requires JavaScript execution for full content. Consider using browser automation.',
      limitations: [
        'Content loaded dynamically via JavaScript',
        'Initial HTML contains minimal content',
        'Requires browser automation (Puppeteer/Playwright) for full extraction'
      ],
      alternatives: [
        'Use headless browser automation',
        'Try RSS feeds if available',
        'Use MSN API if accessible'
      ]
    }
  }
}