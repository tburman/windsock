import { BaseExtractor } from './base.js'

export class EvoIndiaExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'EvoIndiaExtractor'
    this.domains = ['evoindia.com']
  }

  async extract(html, url) {
    try {
      // First try to find AMP version using standard discovery method
      let ampUrl = this.findAmpUrl(html, url)
      if (ampUrl) {
        console.log(`🔄 EvoIndia: Found AMP version: ${ampUrl}`)
        const ampResult = await this.extractFromAmp(ampUrl)
        if (ampResult) {
          return ampResult
        }
      }

      // Primary extraction from JSON-LD structured data
      console.log('🔄 EvoIndia: Extracting from JSON-LD structured data')
      const jsonLdResult = this.extractFromJsonLd(html)
      if (jsonLdResult) {
        return jsonLdResult
      }

      // Fallback to DOM extraction
      console.log('🔄 EvoIndia: Falling back to DOM extraction')
      return await this.extractFromRegularPage(html, url)
      
    } catch (error) {
      console.log(`❌ EvoIndia extraction failed: ${error.message}`)
      return null
    }
  }

  // Find AMP URL using standard discovery method
  findAmpUrl(html, url) {
    try {
      // Look for standard AMP link in HTML head
      const ampLinkMatch = html.match(/<link[^>]*rel=[\"']amphtml[\"'][^>]*href=[\"']([^\"']+)[\"'][^>]*>/i)
      if (ampLinkMatch) {
        let ampUrl = ampLinkMatch[1]
        // Convert relative URLs to absolute
        if (ampUrl.startsWith('/')) {
          const urlObj = new URL(url)
          ampUrl = `${urlObj.protocol}//${urlObj.hostname}${ampUrl}`
        }
        return ampUrl
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
      
      // Try JSON-LD first on AMP page
      const jsonLdResult = this.extractFromJsonLd(html)
      if (jsonLdResult) {
        console.log('✅ EvoIndia AMP: Extracted from JSON-LD')
        return {
          ...jsonLdResult,
          metadata: {
            ...jsonLdResult.metadata,
            ampUrl: ampUrl
          }
        }
      }

      // Fallback to AMP-specific extraction
      return this.extractFromAmpDom(html, ampUrl)

    } catch (error) {
      console.log(`❌ EvoIndia AMP extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content from JSON-LD structured data
  extractFromJsonLd(html) {
    try {
      const jsonLdMatches = html.match(/<script[^>]*type=[\"']application\/ld\+json[\"'][^>]*>(.*?)<\/script>/gs)
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
              const author = this.extractAuthorFromJsonLd(item)
              const publishedDate = item.datePublished
              const category = item.articleSection
              
              if (content && this.validateContent(content)) {
                console.log(`✅ EvoIndia: Extracted ${content.length} characters from JSON-LD`)
                return {
                  content: this.cleanContent(content),
                  title: title || '',
                  author: author || null,
                  metadata: {
                    extractionMethod: 'json-ld',
                    publishedDate: publishedDate || null,
                    category: category || null,
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
      } else if (Array.isArray(jsonLdData.author) && jsonLdData.author[0]) {
        return jsonLdData.author[0].name || jsonLdData.author[0]
      }
    }
    return null
  }

  // Extract content from regular page using DOM parsing
  async extractFromRegularPage(html, url) {
    try {
      // Try dynamic import of cheerio for DOM parsing
      let $
      try {
        const cheerio = await import('cheerio')
        $ = cheerio.load(html)
      } catch (error) {
        console.log('⚠️ EvoIndia: Cheerio not available, falling back to regex')
        return this.extractFromRegularPageRegex(html, url)
      }

      // Extract using EvoIndia-specific DOM selectors
      const content = this.extractContentWithCheerio($)
      const title = this.extractTitleWithCheerio($)
      const author = this.extractAuthorWithCheerio($)
      const category = this.extractCategoryWithCheerio($)

      if (!content || !this.validateContent(content)) {
        console.log('❌ EvoIndia: Regular page content validation failed')
        return null
      }

      console.log(`✅ EvoIndia: Extracted ${content.length} characters from regular page`)
      return {
        content: this.cleanContent(content),
        title: title || '',
        author: author || null,
        metadata: {
          extractionMethod: 'dom-parsing',
          category: category || null,
          source: url
        }
      }

    } catch (error) {
      console.log(`❌ EvoIndia regular page extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content using Cheerio DOM parsing with EvoIndia-specific selectors
  extractContentWithCheerio($) {
    // Try EvoIndia-specific content selectors
    const contentSelectors = [
      '.details-content-story .story',
      '.story-wrap .story',
      '.content .story',
      '.article-content',
      '.story-content',
      'article .content'
    ]

    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        // Extract all paragraphs within the content area
        const paragraphs = element.find('p').map((i, el) => $(el).text().trim()).get()
        const content = paragraphs.filter(p => p.length > 30).join('\n\n')
        
        if (content && this.validateContent(content)) {
          return content
        }
      }
    }

    return null
  }

  // Extract title using Cheerio with EvoIndia-specific selectors
  extractTitleWithCheerio($) {
    const titleSelectors = [
      'h1.article-title',
      'h1.title',
      '.article-title',
      'h1',
      'meta[property="og:title"]',
      'title'
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          return title.replace(' | evo India', '')
        }
      }
    }

    return null
  }

  // Extract author using Cheerio with EvoIndia-specific selectors
  extractAuthorWithCheerio($) {
    const authorSelectors = [
      '.about-author .title',
      '.about-author a',
      '.author-name',
      '.byline',
      'meta[name="author"]',
      'meta[property="article:author"]'
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

  // Extract category using Cheerio with EvoIndia-specific selectors
  extractCategoryWithCheerio($) {
    const categorySelectors = [
      '.category-name.detail',
      '.category-name',
      '.article-section',
      'meta[property="article:section"]'
    ]

    for (const selector of categorySelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let category = element.attr('content') || element.text().trim()
        if (category && category.length > 2) {
          return category
        }
      }
    }

    return null
  }

  // Extract content from AMP page using DOM parsing
  extractFromAmpDom(html, ampUrl) {
    try {
      // Extract paragraphs using regex for AMP pages
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
        content: this.cleanContent(content),
        title: this.extractTitleRegex(html),
        author: this.extractAuthorRegex(html),
        metadata: {
          extractionMethod: 'amp-dom',
          ampUrl: ampUrl,
          paragraphCount: meaningfulParagraphs.length
        }
      }

    } catch (error) {
      return null
    }
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
        content: this.cleanContent(content),
        title: this.extractTitleRegex(html),
        author: this.extractAuthorRegex(html),
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
      /<h1[^>]*class="[^"]*article-title[^"]*"[^>]*>(.*?)<\/h1>/s,
      /<h1[^>]*>(.*?)<\/h1>/s,
      /<meta[^>]*property=[\"']og:title[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
      /<title[^>]*>(.*?)<\/title>/s
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match) {
        const title = this.cleanHtmlContent(match[1])
        if (title && title.length > 5) {
          return title.replace(' | evo India', '')
        }
      }
    }

    return null
  }

  // Extract author using regex
  extractAuthorRegex(html) {
    const authorPatterns = [
      /<meta[^>]*name=[\"']author[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
      /<[^>]*class=\"[^\"]*about-author[^\"]*\"[^>]*>.*?<[^>]*class=\"[^\"]*title[^\"]*\"[^>]*>(.*?)<\/[^>]*>/s,
      /<[^>]*class=\"[^\"]*author[^\"]*\"[^>]*>(.*?)<\/[^>]*>/s
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
      method: 'multi-strategy-evoindia',
      note: 'Uses JSON-LD, AMP discovery, and DOM parsing for EvoIndia.com'
    }
  }
}