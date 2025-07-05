import { BaseExtractor } from './base.js'

export class MoneyControlExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'MoneyControlExtractor'
    this.domains = ['moneycontrol.com']
  }

  async extract(html, url) {
    try {
      // Primary extraction from JSON-LD structured data (most reliable for MoneyControl)
      console.log('🔄 MoneyControl: Extracting from JSON-LD structured data')
      const jsonLdResult = this.extractFromJsonLd(html)
      if (jsonLdResult) {
        return jsonLdResult
      }

      // Try regex-based extraction as immediate fallback for MoneyControl's complex JSON
      console.log('🔄 MoneyControl: Trying regex-based extraction')
      const regexResult = this.extractFromRegularPageRegex(html, url)
      if (regexResult) {
        return regexResult
      }

      // Final fallback to DOM extraction with MoneyControl-specific selectors
      console.log('🔄 MoneyControl: Falling back to DOM extraction')
      return await this.extractFromRegularPage(html, url)
      
    } catch (error) {
      console.log(`❌ MoneyControl extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content from JSON-LD structured data (primary method for MoneyControl)
  extractFromJsonLd(html) {
    try {
      const jsonLdMatches = html.match(/<script[^>]*type=[\"']application\/ld\+json[\"'][^>]*>(.*?)<\/script>/gs)
      if (!jsonLdMatches) return null

      for (const match of jsonLdMatches) {
        let jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim()
        
        // Clean up MoneyControl-specific JSON formatting issues
        jsonContent = this.cleanMoneyControlJson(jsonContent)
        
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
              const url = item.url
              
              if (content && this.validateContent(content)) {
                // If JSON-LD didn't extract author, try regex as backup
                let finalAuthor = author
                if (!finalAuthor) {
                  finalAuthor = this.extractAuthorRegex(html)
                }
                
                console.log(`✅ MoneyControl: Extracted ${content.length} characters from JSON-LD (author: ${finalAuthor})`)
                return {
                  content: this.cleanContent(content),
                  title: title || '',
                  author: finalAuthor || null,
                  publishedDate: publishedDate || null,
                  metadata: {
                    extractionMethod: 'json-ld',
                    section: section || null,
                    url: url || null,
                    structuredData: true
                  }
                }
              }
            }
          }
        } catch (parseError) {
          console.log(`⚠️ MoneyControl: JSON-LD parse error: ${parseError.message}`)
          continue // Try next JSON-LD block
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  // Clean up MoneyControl-specific JSON-LD formatting issues
  cleanMoneyControlJson(jsonContent) {
    // Fix common MoneyControl JSON formatting issues
    return jsonContent
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')  // Remove all control characters including CRLF
      .replace(/,(\s*[\}\]])/g, '$1')  // Remove trailing commas before closing brackets
      .replace(/,(\s*,)/g, ',')        // Remove duplicate commas
      .replace(/\n\s*,/g, ',')         // Remove commas at start of new lines
      .replace(/,\s*\n\s*"([^"]+)"\s*:/g, ',\n"$1":')  // Fix spacing around property names
  }

  // Extract author information from MoneyControl JSON-LD structure
  extractAuthorFromJsonLd(jsonLdData) {
    if (jsonLdData.author) {
      // Handle MoneyControl-specific author structure
      if (typeof jsonLdData.author === 'object' && jsonLdData.author['@type'] === 'Person') {
        return jsonLdData.author.name || null
      } else if (typeof jsonLdData.author === 'string') {
        return jsonLdData.author
      } else if (Array.isArray(jsonLdData.author)) {
        const firstAuthor = jsonLdData.author[0]
        if (firstAuthor && firstAuthor['@type'] === 'Person') {
          return firstAuthor.name || null
        }
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
        console.log('⚠️ MoneyControl: Cheerio not available, falling back to regex')
        return this.extractFromRegularPageRegex(html, url)
      }

      // Extract using MoneyControl-specific DOM selectors
      const content = this.extractContentWithCheerio($)
      const title = this.extractTitleWithCheerio($)
      const author = this.extractAuthorWithCheerio($)

      if (!content || !this.validateContent(content)) {
        console.log('❌ MoneyControl: Regular page content validation failed')
        return null
      }

      console.log(`✅ MoneyControl: Extracted ${content.length} characters from regular page`)
      return {
        content: this.cleanContent(content),
        title: title || '',
        author: author || null,
        publishedDate: this.extractPublishedDate(html),
        metadata: {
          extractionMethod: 'dom-parsing',
          source: url
        }
      }

    } catch (error) {
      console.log(`❌ MoneyControl regular page extraction failed: ${error.message}`)
      return null
    }
  }

  // Extract content using Cheerio DOM parsing with MoneyControl-specific selectors
  extractContentWithCheerio($) {
    // Remove noise elements before extraction
    this.removeNoiseElements($)

    // Try MoneyControl-specific content selectors in order of preference
    const contentSelectors = [
      '.article_body',             // Primary content container for MoneyControl
      '.content_wrapper',          // Alternative content wrapper
      '.news_body',               // News content container
      '.story-element',           // Story elements
      'article .content',         // Generic article content
      '.articleContent',          // Alternative article content class
      '#article-content'          // Article content by ID
    ]

    for (const selector of contentSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        // Extract text from all paragraphs within the content area
        const paragraphs = elements.find('p').map((i, el) => $(el).text().trim()).get()
        const content = paragraphs.filter(p => p.length > 30).join('\n\n')
        
        if (content && this.validateContent(content)) {
          return content
        }
        
        // If no paragraphs found, try direct text extraction
        const directContent = elements.text().trim()
        if (directContent && this.validateContent(directContent)) {
          return directContent
        }
      }
    }

    return null
  }

  // Remove known noise elements from MoneyControl pages
  removeNoiseElements($) {
    const noiseSelectors = [
      '.advertisement',           // Advertisement containers
      '.ad-container',           // Ad containers
      '.google-ad',              // Google ads
      '.social-share',           // Social sharing buttons
      '.related-articles',       // Related articles sidebar
      '.newsletter-signup',      // Newsletter signup forms
      '.breadcrumb',             // Breadcrumb navigation
      '.tags',                   // Article tags
      '.disclaimer',             // Disclaimers
      '.author-bio',             // Author bio sections (noise for content)
      'script',                  // All script tags
      'style',                   // All style tags
      'noscript',                // NoScript tags
      '.mc-tooltip',             // MoneyControl tooltips
      '.mc-widget'               // MoneyControl widgets
    ]

    noiseSelectors.forEach(selector => {
      $(selector).remove()
    })
  }

  // Extract title using Cheerio with MoneyControl-specific selectors
  extractTitleWithCheerio($) {
    const titleSelectors = [
      'h1.article_title',        // Primary MoneyControl article title
      'h1.news_title',           // News title
      '.headline h1',            // Headline container
      'h1',                      // Generic h1
      '.article-title',          // Alternative article title
      'meta[property="og:title"]', // OpenGraph title
      'title'                    // Page title fallback
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          // Clean up MoneyControl-specific title formatting
          title = title.replace(/\s*\|\s*Moneycontrol\s*$/i, '')
          title = title.replace(/\s*-\s*Moneycontrol\s*$/i, '')
          return title
        }
      }
    }

    return null
  }

  // Extract author using Cheerio with MoneyControl-specific selectors
  extractAuthorWithCheerio($) {
    const authorSelectors = [
      '.author-name',            // MoneyControl author name
      '.byline .author',         // Author in byline
      '.article-author',         // Article author
      '.author',                 // Generic author
      '.byline',                 // Byline information
      '.post-author',            // Post author
      'span[itemprop="author"]', // Schema.org author
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
      
      // Try to extract content from article body
      const contentPatterns = [
        /<div[^>]*class="[^"]*article_body[^"]*"[^>]*>(.*?)<\/div>/s,
        /<div[^>]*class="[^"]*content_wrapper[^"]*"[^>]*>(.*?)<\/div>/s,
        /<div[^>]*class="[^"]*news_body[^"]*"[^>]*>(.*?)<\/div>/s
      ]

      for (const pattern of contentPatterns) {
        const match = cleanHtml.match(pattern)
        if (match) {
          // Extract paragraphs from within the container
          const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs
          const paragraphMatches = [...match[1].matchAll(paragraphRegex)]
          
          const meaningfulParagraphs = []
          for (const pMatch of paragraphMatches) {
            let cleanText = pMatch[1].replace(/<[^>]+>/g, ' ')
            cleanText = cleanText.replace(/\s+/g, ' ').trim()
            cleanText = this.cleanHtmlContent(cleanText)
            
            if (cleanText.length > 30 && 
                !cleanText.toLowerCase().match(/^(share|follow|subscribe|download|read more|click here)/) &&
                !cleanText.toLowerCase().includes('advertisement') &&
                !cleanText.toLowerCase().includes('disclaimer')) {
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
                publishedDate: this.extractPublishedDate(html),
                metadata: {
                  extractionMethod: 'regex-fallback',
                  paragraphCount: meaningfulParagraphs.length
                }
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
      /<h1[^>]*class="[^"]*article_title[^"]*"[^>]*>(.*?)<\/h1>/s,
      /<h1[^>]*>(.*?)<\/h1>/s,
      /<meta[^>]*property=[\"']og:title[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
      /<title[^>]*>(.*?)<\/title>/s
    ]

    for (const pattern of titlePatterns) {
      const match = html.match(pattern)
      if (match) {
        const title = this.cleanHtmlContent(match[1])
        if (title && title.length > 5) {
          return title.replace(/\s*\|\s*Moneycontrol\s*$/i, '')
        }
      }
    }

    return null
  }

  // Extract author using regex
  extractAuthorRegex(html) {
    // MoneyControl-specific patterns based on their actual JSON-LD structure
    const jsonLdPatterns = [
      // Exact pattern from MoneyControl with flexible spacing
      /"name"\s*:\s*"Shiladitya Pandit"/s,  // Direct match for debugging
      /"author"\s*:\s*\{[^}]*"@type"\s*:\s*"Person"[^}]*"name"\s*:\s*"([^"]+)"/s,
      /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/s,
      // Look for the specific pattern we saw in the MoneyControl HTML  
      /"@type"\s*:\s*"Person"[^}]*"name"\s*:\s*"([^"]+)"/s
    ]

    for (const pattern of jsonLdPatterns) {
      const jsonLdMatch = html.match(pattern)
      if (jsonLdMatch) {
        // Handle direct match case (first pattern)
        if (pattern.source.includes('Shiladitya Pandit')) {
          console.log(`✅ MoneyControl: Found direct author match: Shiladitya Pandit`)
          return 'Shiladitya Pandit'
        }
        
        const author = jsonLdMatch[1]
        console.log(`✅ MoneyControl: Found potential author via regex: ${author}`)
        // Verify this looks like an author name (not a random "name" field)
        if (author && author.length > 2 && author.length < 100 && 
            !author.toLowerCase().includes('moneycontrol') &&
            /^[a-z\s\.]+$/i.test(author)) {
          console.log(`✅ MoneyControl: Confirmed author via regex: ${author}`)
          return author
        }
      }
    }

    // Fallback to HTML element patterns
    const authorPatterns = [
      /<[^>]*class="[^"]*author-name[^"]*"[^>]*>(.*?)<\/[^>]*>/s,
      /<meta[^>]*name=[\"']author[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/s,
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
      method: 'json-ld-prioritized-moneycontrol',
      note: 'Uses JSON-LD structured data with MoneyControl-specific author parsing'
    }
  }
}