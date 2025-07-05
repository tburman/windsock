import { BaseExtractor } from './base.js'

export class ZeeBizExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'ZeeBizExtractor'
    this.domains = ['zeebiz.com']
  }

  async extract(html, url) {
    try {
      // Primary extraction from JSON-LD structured data (most reliable for ZeeBiz)
      console.log('🔄 ZeeBiz: Extracting from JSON-LD structured data')
      const jsonLdResult = this.extractFromJsonLd(html)
      if (jsonLdResult) {
        return jsonLdResult
      }

      // Fallback to DOM extraction with ZeeBiz-specific selectors
      console.log('🔄 ZeeBiz: Falling back to DOM extraction')
      return await this.extractFromRegularPage(html, url)
      
    } catch (error) {
      console.log(`❌ ZeeBiz extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content from JSON-LD structured data (primary method for ZeeBiz)
  extractFromJsonLd(html) {
    try {
      const jsonLdMatches = html.match(/<script[^>]*type=[\"']application\/ld\+json[\"'][^>]*>(.*?)<\/script>/gs)
      if (!jsonLdMatches) return null

      for (const match of jsonLdMatches) {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
        try {
          const data = JSON.parse(jsonContent)
          
          // Handle both single objects and arrays
          const items = Array.isArray(data) ? data : [data]
          
          for (const item of items) {
            if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
              const content = item.articleBody || item.description
              const title = item.headline || item.name
              const author = this.extractAuthorFromJsonLd(item)
              const publishedDate = item.datePublished
              const section = item.articleSection
              
              if (content && this.validateContent(content)) {
                console.log(`✅ ZeeBiz: Extracted ${content.length} characters from JSON-LD`)
                return {
                  content: this.cleanContent(content),
                  title: title || '',
                  author: author || null,
                  metadata: {
                    extractionMethod: 'json-ld',
                    publishedDate: publishedDate || null,
                    section: section || null,
                    structuredData: true
                  }
                }
              }
            }
          }
        } catch (parseError) {
          continue // Try next JSON-LD block
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  // Extract author information from JSON-LD
  extractAuthorFromJsonLd(jsonLdData) {
    if (jsonLdData.author) {
      if (typeof jsonLdData.author === 'string') {
        return jsonLdData.author
      } else if (jsonLdData.author.name) {
        return jsonLdData.author.name
      } else if (Array.isArray(jsonLdData.author)) {
        const firstAuthor = jsonLdData.author[0]
        return firstAuthor?.name || firstAuthor
      }
    }
    return null
  }

  // Extract content from regular page using DOM parsing (fallback method)
  async extractFromRegularPage(html, url) {
    try {
      // Try dynamic import of cheerio for DOM parsing
      let $
      try {
        const cheerio = await import('cheerio')
        $ = cheerio.load(html)
      } catch (error) {
        console.log('⚠️ ZeeBiz: Cheerio not available, falling back to regex')
        return this.extractFromRegularPageRegex(html, url)
      }

      // Extract using ZeeBiz-specific DOM selectors
      const content = this.extractContentWithCheerio($)
      const title = this.extractTitleWithCheerio($)
      const author = this.extractAuthorWithCheerio($)

      if (!content || !this.validateContent(content)) {
        console.log('❌ ZeeBiz: Regular page content validation failed')
        return null
      }

      console.log(`✅ ZeeBiz: Extracted ${content.length} characters from regular page`)
      return {
        content: this.cleanContent(content),
        title: title || '',
        author: author || null,
        metadata: {
          extractionMethod: 'dom-parsing',
          source: url
        }
      }

    } catch (error) {
      console.log(`❌ ZeeBiz regular page extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content using Cheerio DOM parsing with ZeeBiz-specific selectors
  extractContentWithCheerio($) {
    // Remove noise elements before extraction
    this.removeNoiseElements($)

    // Try ZeeBiz-specific content selectors in order of preference
    const contentSelectors = [
      '.article-para',           // Primary content container for ZeeBiz
      '.article-para p',         // Paragraphs within article container
      '.story-content',          // Alternative story content
      '.news-content',           // News content container
      'article .content',        // Generic article content
      '.articleContent'          // Alternative article content class
    ]

    for (const selector of contentSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        // If selector targets container, extract all paragraphs within it
        if (selector === '.article-para') {
          const paragraphs = elements.find('p').map((i, el) => $(el).text().trim()).get()
          const content = paragraphs.filter(p => p.length > 30).join('\n\n')
          if (content && this.validateContent(content)) {
            return content
          }
        } else {
          // Extract text from all matching elements
          const content = elements.map((i, el) => $(el).text().trim()).get().join('\n\n')
          if (content && this.validateContent(content)) {
            return content
          }
        }
      }
    }

    return null
  }

  // Remove known noise elements from ZeeBiz pages
  removeNoiseElements($) {
    const noiseSelectors = [
      '.f-nav',                  // Fixed navigation
      '.socialicon',             // Social media icons
      '.taboola-below-article-thumbnails', // Taboola widgets
      '[data-module="taboola"]', // Taboola modules
      '.gpt-ad',                 // Google Ad Manager
      '[class*="gpt-"]',         // Google ad classes
      '.breadcrumb',             // Breadcrumb navigation
      '.advertisement',          // Advertisement containers
      '.ad-container',           // Ad containers
      '.related-articles',       // Related articles sidebar
      '.share-buttons',          // Social share buttons
      '.newsletter-signup',      // Newsletter signup forms
      'script',                  // All script tags
      'style',                   // All style tags
      'noscript'                 // NoScript tags
    ]

    noiseSelectors.forEach(selector => {
      $(selector).remove()
    })
  }

  // Extract title using Cheerio with ZeeBiz-specific selectors
  extractTitleWithCheerio($) {
    const titleSelectors = [
      '.articleheading',         // Primary ZeeBiz article title
      'h1.articleheading',       // Specific h1 with articleheading class
      'h1',                      // Generic h1
      '.article-title',          // Alternative article title
      '.news-title',             // News title
      'meta[property="og:title"]', // OpenGraph title
      'title'                    // Page title fallback
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          // Clean up ZeeBiz-specific title formatting
          title = title.replace(/\s*\|\s*Zee Business\s*$/i, '')
          title = title.replace(/\s*-\s*ZeeBiz\s*$/i, '')
          return title
        }
      }
    }

    return null
  }

  // Extract author using Cheerio with ZeeBiz-specific selectors
  extractAuthorWithCheerio($) {
    const authorSelectors = [
      '.writer-name span',       // Primary ZeeBiz author selector
      '.writerbox .writer-name span', // Full path to author
      '.writer-name',            // Writer name container
      '.author-name',            // Alternative author name
      '.byline',                 // Byline information
      '.article-author',         // Article author
      'meta[name="author"]',     // Meta author tag
      'meta[property="article:author"]' // Article author meta
    ]

    for (const selector of authorSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let author = element.attr('content') || element.text().trim()
        if (author && author.length > 2 && author.length < 100) {
          // Clean up author formatting
          author = author.replace(/^(by|author|written by):?\s*/i, '').trim()
          return author
        }
      }
    }

    return null
  }

  // Fallback regex-based extraction when Cheerio is not available
  extractFromRegularPageRegex(html, url) {
    try {
      // Remove script and style tags first
      let cleanHtml = html.replace(/<(script|style)[^>]*>.*?<\/\1>/gs, '')
      
      // Try to extract content from .article-para container
      const articleParaMatch = cleanHtml.match(/<div[^>]*class="[^"]*article-para[^"]*"[^>]*>(.*?)<\/div>/s)
      if (articleParaMatch) {
        // Extract paragraphs from within the container
        const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs
        const paragraphMatches = [...articleParaMatch[1].matchAll(paragraphRegex)]
        
        const meaningfulParagraphs = []
        for (const match of paragraphMatches) {
          let cleanText = match[1].replace(/<[^>]+>/g, ' ')
          cleanText = cleanText.replace(/\s+/g, ' ').trim()
          cleanText = this.cleanHtmlContent(cleanText)
          
          if (cleanText.length > 30 && 
              !cleanText.toLowerCase().match(/^(share|follow|subscribe|download|read more|click here)/) &&
              !cleanText.toLowerCase().includes('advertisement') &&
              !cleanText.toLowerCase().includes('taboola')) {
            meaningfulParagraphs.push(cleanText)
          }
        }

        if (meaningfulParagraphs.length > 0) {
          const content = meaningfulParagraphs.join('\n\n')
          
          if (this.validateContent(content)) {
            return {
              content: this.cleanContent(content),
              title: this.extractTitleRegex(html),
              author: this.extractAuthorRegex(html),
              metadata: {
                extractionMethod: 'regex-fallback',
                paragraphCount: meaningfulParagraphs.length
              }
            }
          }
        }
      }

      return null

    } catch (error) {
      return null
    }
  }

  // Extract title using regex
  extractTitleRegex(html) {
    const titlePatterns = [
      /<h1[^>]*class="[^"]*articleheading[^"]*"[^>]*>(.*?)<\/h1>/s,
      /<h1[^>]*>(.*?)<\/h1>/s,
      /<meta[^>]*property=[\"']og:title[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
      /<title[^>]*>(.*?)<\/title>/s
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match) {
        const title = this.cleanHtmlContent(match[1])
        if (title && title.length > 5) {
          return title.replace(/\s*\|\s*Zee Business\s*$/i, '')
        }
      }
    }

    return null
  }

  // Extract author using regex
  extractAuthorRegex(html) {
    const authorPatterns = [
      /<div[^>]*class="[^"]*writer-name[^"]*"[^>]*>.*?<span[^>]*>(.*?)<\/span>/s,
      /<meta[^>]*name=[\"']author[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
      /<[^>]*class=\"[^\"]*writer-name[^\"]*\"[^>]*>(.*?)<\/[^>]*>/s
    ]

    for (const pattern of authorPatterns) {
      const match = html.match(pattern)
      if (match) {
        const author = this.cleanHtmlContent(match[1])
        if (author && author.length > 2 && author.length < 100) {
          return author.replace(/^(by|author|written by):?\s*/i, '').trim()
        }
      }
    }

    return null
  }

  // Clean and normalize content
  cleanContent(content) {
    if (!content) return ''
    
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Clean up paragraph breaks
      .trim()
  }

  extractMetadata(html, url) {
    return {
      extractorUsed: this.name,
      method: 'json-ld-prioritized-zeebiz',
      note: 'Uses JSON-LD structured data with ZeeBiz-specific DOM fallbacks'
    }
  }
}