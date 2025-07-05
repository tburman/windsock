import { BaseExtractor } from './base.js'

export class AutocarIndiaExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'AutocarIndiaExtractor'
    this.domains = ['autocarindia.com']
  }

  async extract(html, url) {
    try {
      // First try to find AMP version using standard <link rel="amphtml"> discovery
      let ampUrl = this.findAmpUrl(html, url)
      if (ampUrl) {
        console.log(`🔄 AutocarIndia: Found AMP version: ${ampUrl}`)
        const ampResult = await this.extractFromAmp(ampUrl)
        if (ampResult) {
          return ampResult
        }
      }

      // Fallback to regular page extraction
      console.log('🔄 AutocarIndia: Extracting from regular page')
      return this.extractFromRegularPage(html, url)
      
    } catch (error) {
      console.log(`❌ AutocarIndia extraction failed: ${error.message}`)
      return null
    }
  }

  // Find AMP URL using standard discovery method
  findAmpUrl(html, url) {
    try {
      // Look for standard AMP link in HTML head
      const ampLinkMatch = html.match(/<link[^>]*rel=["']amphtml["'][^>]*href=["']([^"']+)["'][^>]*>/i)
      if (ampLinkMatch) {
        let ampUrl = ampLinkMatch[1]
        // Convert relative URLs to absolute
        if (ampUrl.startsWith('/')) {
          const urlObj = new URL(url)
          ampUrl = `${urlObj.protocol}//${urlObj.hostname}${ampUrl}`
        }
        return ampUrl
      }

      // Fallback to pattern-based discovery for known working sections
      return this.getAmpUrlFallback(url)
    } catch (error) {
      return null
    }
  }

  // Fallback AMP URL discovery for known working sections
  getAmpUrlFallback(url) {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname
      
      // Only attempt AMP for sections confirmed to have working AMP versions
      const AMP_SUPPORTED_SECTIONS = ['auto-features', 'advice']
      
      for (const section of AMP_SUPPORTED_SECTIONS) {
        if (path.includes(`/${section}/`)) {
          return url.replace(`/${section}/`, `/${section}-amp/`)
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  // Extract content from AMP version
  async extractFromAmp(ampUrl) {
    try {
      const axios = await import('axios')
      const response = await axios.default.get(ampUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      let html = response.data
      
      // Remove scripts, styles, and navigation elements
      html = html.replace(/<(script|style|nav|header|footer)[^>]*>.*?<\/\1>/gs, '')
      html = html.replace(/<script[^>]*>.*?<\/script>/gs, '')
      
      // Extract all paragraph content from the page
      const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs
      const paragraphMatches = [...html.matchAll(paragraphRegex)]
      
      if (!paragraphMatches || paragraphMatches.length === 0) {
        console.log('❌ AutocarIndia AMP: No paragraphs found')
        return null
      }

      // Process and filter paragraphs
      const meaningfulParagraphs = []
      for (const match of paragraphMatches) {
        let cleanText = match[1].replace(/<[^>]+>/g, ' ')
        cleanText = cleanText.replace(/\s+/g, ' ').trim()
        cleanText = this.cleanHtmlContent(cleanText)
        
        // Filter out navigation, ads, and boilerplate
        if (cleanText.length > 30 && 
            !cleanText.toLowerCase().match(/^(share|follow|subscribe|download|read more|click here)/) &&
            !cleanText.toLowerCase().includes('facebook') &&
            !cleanText.toLowerCase().includes('twitter') &&
            !cleanText.toLowerCase().includes('instagram') &&
            !cleanText.toLowerCase().includes('newsletter')) {
          meaningfulParagraphs.push(cleanText)
        }
      }

      if (meaningfulParagraphs.length === 0) {
        console.log('❌ AutocarIndia AMP: No meaningful content found after filtering')
        return null
      }

      const content = meaningfulParagraphs.join('\\n\\n')
      
      if (!this.validateContent(content)) {
        console.log('❌ AutocarIndia AMP: Content failed validation')
        return null
      }

      // Extract title, author, and published date from AMP version
      const title = this.extractAmpTitle(html)
      const author = this.extractAmpAuthor(html)
      const publishedDate = this.extractPublishedDate(html)

      console.log(`✅ AutocarIndia AMP: Extracted ${content.length} characters from ${meaningfulParagraphs.length} paragraphs`)

      return {
        content,
        title: title || '',
        author: author || null,
        publishedDate: publishedDate || null,
        metadata: {
          extractionMethod: 'amp-version',
          paragraphCount: meaningfulParagraphs.length,
          ampUrl: ampUrl
        }
      }

    } catch (error) {
      console.log(`❌ AutocarIndia AMP extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract title from AMP page
  extractAmpTitle(html) {
    const titleMatch = html.match(/<h6[^>]*class="[^"]*heding[^"]*"[^>]*>(.*?)<\/h6>/s)
    if (titleMatch) {
      return this.cleanHtmlContent(titleMatch[1])
    }
    
    // Fallback to meta title
    const metaTitleMatch = html.match(/<title[^>]*>(.*?)<\/title>/s)
    if (metaTitleMatch) {
      return this.cleanHtmlContent(metaTitleMatch[1]).replace(' | Autocar India', '')
    }
    
    return null
  }

  // Extract author from AMP page
  extractAmpAuthor(html) {
    // Look for author in byline or metadata
    const authorPatterns = [
      /<p[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/p>/s,
      /<span[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/span>/s,
      /<div[^>]*class="[^"]*byline[^"]*"[^>]*>(.*?)<\/div>/s
    ]

    for (const pattern of authorPatterns) {
      const match = html.match(pattern)
      if (match) {
        const author = this.cleanHtmlContent(match[1])
        if (author && author.length > 2 && author.length < 100) {
          return author.replace(/^(by|author|written by):?\\s*/i, '').trim()
        }
      }
    }

    return null
  }

  // Extract content from regular page
  async extractFromRegularPage(html, url) {
    try {
      // First try JSON-LD structured data extraction
      const jsonLdResult = this.extractFromJsonLd(html)
      if (jsonLdResult) {
        console.log('✅ AutocarIndia: Extracted from JSON-LD structured data')
        return jsonLdResult
      }

      // Try dynamic import of cheerio for DOM parsing
      let $
      try {
        const cheerio = await import('cheerio')
        $ = cheerio.load(html)
      } catch (error) {
        console.log('⚠️ AutocarIndia: Cheerio not available, falling back to regex')
        return this.extractFromRegularPageRegex(html, url)
      }

      // Extract using DOM selectors
      const content = this.extractContentWithCheerio($)
      const title = this.extractTitleWithCheerio($)
      const author = this.extractAuthorWithCheerio($)
      const publishedDate = this.extractPublishedDate(html)

      if (!content || !this.validateContent(content)) {
        console.log('❌ AutocarIndia: Regular page content validation failed')
        return null
      }

      console.log(`✅ AutocarIndia: Extracted ${content.length} characters from regular page`)
      return {
        content,
        title: title || '',
        author: author || null,
        publishedDate: publishedDate || null,
        metadata: {
          extractionMethod: 'regular-page',
          source: url
        }
      }

    } catch (error) {
      console.log(`❌ AutocarIndia regular page extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content from JSON-LD structured data
  extractFromJsonLd(html) {
    try {
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs)
      if (!jsonLdMatches) return null

      for (const match of jsonLdMatches) {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
        try {
          const data = JSON.parse(jsonContent)
          
          // Handle both single objects and arrays
          const articles = Array.isArray(data) ? data : [data]
          
          for (const item of articles) {
            if (item['@type'] === 'Article' || item['@type'] === 'NewsArticle') {
              const content = item.articleBody || item.description
              const title = item.headline || item.name
              const author = item.author?.name || item.author
              const publishedDate = item.datePublished
              
              if (content && this.validateContent(content)) {
                return {
                  content,
                  title: title || '',
                  author: author || null,
                  publishedDate: publishedDate || null,
                  metadata: {
                    extractionMethod: 'json-ld',
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

  // Extract content using Cheerio DOM parsing
  extractContentWithCheerio($) {
    // Try various content selectors commonly used by news sites
    const contentSelectors = [
      '.article-content',
      '.story-content', 
      '.news-content',
      '.post-content',
      '[class*="article"][class*="body"]',
      '[class*="story"][class*="text"]',
      '.content p',
      'article p'
    ]

    for (const selector of contentSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        const content = elements.map((i, el) => $(el).text().trim()).get().join('\n\n')
        if (content && this.validateContent(content)) {
          return content
        }
      }
    }

    return null
  }

  // Extract title using Cheerio
  extractTitleWithCheerio($) {
    const titleSelectors = [
      'h1',
      '.article-title',
      '.story-title',
      '.news-title',
      '[class*="headline"]',
      'meta[property="og:title"]',
      'title'
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          return title.replace(' | Autocar India', '')
        }
      }
    }

    return null
  }

  // Extract author using Cheerio
  extractAuthorWithCheerio($) {
    const authorSelectors = [
      '[class*="author"]',
      '[class*="byline"]',
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.writer',
      '.journalist'
    ]

    for (const selector of authorSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let author = element.attr('content') || element.text().trim()
        if (author && author.length > 2 && author.length < 100) {
          return author.replace(/^(by|author|written by):?\s*/i, '').trim()
        }
      }
    }

    return null
  }

  // Fallback regex-based extraction when Cheerio is not available
  extractFromRegularPageRegex(html, url) {
    try {
      // Extract paragraphs using regex
      const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs
      const paragraphMatches = [...html.matchAll(paragraphRegex)]
      
      if (!paragraphMatches || paragraphMatches.length === 0) {
        return null
      }

      const meaningfulParagraphs = []
      for (const match of paragraphMatches) {
        let cleanText = match[1].replace(/<[^>]+>/g, ' ')
        cleanText = cleanText.replace(/\s+/g, ' ').trim()
        cleanText = this.cleanHtmlContent(cleanText)
        
        if (cleanText.length > 30 && 
            !cleanText.toLowerCase().match(/^(share|follow|subscribe|download|read more|click here)/) &&
            !cleanText.toLowerCase().includes('facebook') &&
            !cleanText.toLowerCase().includes('twitter') &&
            !cleanText.toLowerCase().includes('instagram') &&
            !cleanText.toLowerCase().includes('newsletter')) {
          meaningfulParagraphs.push(cleanText)
        }
      }

      if (meaningfulParagraphs.length === 0) {
        return null
      }

      const content = meaningfulParagraphs.join('\n\n')
      
      if (!this.validateContent(content)) {
        return null
      }

      return {
        content,
        title: this.extractTitleRegex(html),
        author: this.extractAuthorRegex(html),
        publishedDate: this.extractPublishedDate(html),
        metadata: {
          extractionMethod: 'regex-fallback',
          paragraphCount: meaningfulParagraphs.length
        }
      }

    } catch (error) {
      return null
    }
  }

  // Extract title using regex
  extractTitleRegex(html) {
    const titlePatterns = [
      /<h1[^>]*>(.*?)<\/h1>/s,
      /<title[^>]*>(.*?)<\/title>/s,
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/s
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match) {
        const title = this.cleanHtmlContent(match[1])
        if (title && title.length > 5) {
          return title.replace(' | Autocar India', '')
        }
      }
    }

    return null
  }

  // Extract author using regex
  extractAuthorRegex(html) {
    const authorPatterns = [
      /<[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/[^>]*>/s,
      /<[^>]*class="[^"]*byline[^"]*"[^>]*>(.*?)<\/[^>]*>/s,
      /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/s
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

  extractMetadata(html, url) {
    return {
      extractorUsed: this.name,
      method: 'enhanced-multi-strategy',
      note: 'Uses AMP discovery, JSON-LD, and DOM parsing'
    }
  }
}