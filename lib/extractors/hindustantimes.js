import { BaseExtractor } from './base.js'
import * as cheerio from 'cheerio'

export class HindustanTimesExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'HindustanTimesExtractor'
    this.domains = ['hindustantimes.com', 'www.hindustantimes.com']
  }

  async extract(html, url) {
    try {
      const $ = cheerio.load(html)

      // Extract content using HindustanTimes-specific selectors
      const content = this.extractContent($, html)
      
      if (!content || !this.validateContent(content)) {
        console.log('❌ HindustanTimes: Content validation failed')
        return null
      }

      const title = this.extractTitle($)
      const author = this.extractAuthor($, html)
      const publishedDate = this.extractPublishedDate(html)

      console.log(`✅ HindustanTimes: Extracted ${content.length} characters`)
      
      return {
        content,
        title: title || '',
        author: author || null,
        publishedDate: publishedDate || null,
        metadata: {
          extractionMethod: 'HindustanTimesExtractor',
          source: url
        }
      }
      
    } catch (error) {
      console.log(`❌ HindustanTimes extraction failed: ${error.message}`)
      return null
    }
  }

  extractContent($, html) {
    // Try JSON-LD structured data first
    const jsonLdContent = this.extractFromJsonLd($)
    if (jsonLdContent) {
      return jsonLdContent
    }

    // Fall back to DOM-based extraction
    return this.extractFromDom($)
  }

  extractFromJsonLd($) {
    try {
      const scripts = $('script[type="application/ld+json"]')
      for (let i = 0; i < scripts.length; i++) {
        try {
          const jsonData = JSON.parse($(scripts[i]).html())
          
          if (jsonData['@type'] === 'NewsArticle' && jsonData.articleBody) {
            return this.cleanContent(jsonData.articleBody)
          }
        } catch (e) {
          // Continue to next script tag
        }
      }
    } catch (error) {
      console.log('HindustanTimes: JSON-LD extraction failed:', error.message)
    }
    return null
  }

  extractFromDom($) {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, .sidebar, form, noscript, iframe').remove()
    $('.nav, .navigation, .menu, .breadcrumb, .related, .trending, .popular').remove()
    $('.tags, .tag-list, .share, .sharing, .social, .subscribe, .newsletter').remove()

    // HindustanTimes-specific content selectors
    const contentSelectors = [
      '.storyDetails',
      '.story-details', 
      '.article-content',
      '.story-content',
      '.detail-story',
      'div[data-vars-pagetype="story"]',
      '.main-content article',
      'main article'
    ]

    for (const selector of contentSelectors) {
      const contentElement = $(selector).first()
      if (contentElement.length > 0) {
        // Extract paragraphs from the content
        const paragraphs = contentElement.find('p').map((i, p) => $(p).text().trim()).get()
        
        // Filter out short or promotional paragraphs
        const meaningfulParagraphs = paragraphs.filter(p => 
          p.length > 50 && 
          !p.toLowerCase().includes('subscribe') &&
          !p.toLowerCase().includes('newsletter') &&
          !p.toLowerCase().includes('read more') &&
          !p.toLowerCase().includes('also read') &&
          !p.toLowerCase().includes('follow us')
        )

        if (meaningfulParagraphs.length > 2) {
          return this.cleanContent(meaningfulParagraphs.join('\n\n'))
        }
      }
    }

    // Final fallback to article body
    const articleContent = $('article').text().trim()
    if (articleContent && articleContent.length > 500) {
      return this.cleanContent(articleContent)
    }

    return null
  }

  extractTitle($) {
    const titleSelectors = [
      'h1.hdg1',
      'h1.main-heading',
      'h1.story-title',
      'h1.headline',
      'meta[property="og:title"]',
      'title'
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          return title
        }
      }
    }
    return null
  }

  extractAuthor($, html) {
    // Try JSON-LD structured data first
    try {
      const scripts = $('script[type="application/ld+json"]')
      for (let i = 0; i < scripts.length; i++) {
        try {
          const jsonData = JSON.parse($(scripts[i]).html())
          
          if (jsonData['@type'] === 'NewsArticle' && jsonData.author) {
            if (Array.isArray(jsonData.author)) {
              // Find the first valid author in the array
              for (const author of jsonData.author) {
                if (typeof author === 'string' && author.trim()) {
                  return author.trim()
                } else if (typeof author === 'object' && author.name && author.name.trim()) {
                  return author.name.trim()
                }
              }
            } else if (typeof jsonData.author === 'object' && jsonData.author.name) {
              return jsonData.author.name
            } else if (typeof jsonData.author === 'string') {
              return jsonData.author
            }
          }
        } catch (e) {
          // Continue to next script tag
          console.log('HindustanTimes: JSON-LD parsing error:', e.message)
        }
      }
    } catch (error) {
      console.log('HindustanTimes: JSON-LD extraction error:', error.message)
    }

    // Try analytics data in JavaScript
    const analyticsMatch = html.match(/window\._sf_async_config\.authors\s*=\s*["']([^"']+)["']/)
    if (analyticsMatch && analyticsMatch[1]) {
      return analyticsMatch[1]
    }

    // Try dataLayer
    const dataLayerMatch = html.match(/"author_name":\s*"([^"]+)"/)
    if (dataLayerMatch && dataLayerMatch[1]) {
      return dataLayerMatch[1]
    }

    // Fallback to DOM selectors
    const authorSelectors = [
      '.author-name',
      '.byline',
      '.author-info .name',
      '.story-byline',
      '.writer-name',
      'meta[name="author"]'
    ]

    for (const selector of authorSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        const author = element.attr('content') || element.text().trim()
        if (author && author.length > 2 && author.length < 100) {
          return author.replace(/^(by|author|written by):?\s*/i, '').trim()
        }
      }
    }

    return null
  }

  extractPublishedDate(html) {
    // Try JSON-LD structured data first
    try {
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/s)
      if (jsonLdMatch) {
        const jsonData = JSON.parse(jsonLdMatch[1])
        if (jsonData.datePublished) {
          return new Date(jsonData.datePublished).toISOString()
        }
      }
    } catch (error) {
      // Continue to other methods
    }

    // Try meta tags
    const metaPatterns = [
      /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']article:modified_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']publish-date["'][^>]*content=["']([^"']+)["'][^>]*>/i
    ]

    for (const pattern of metaPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        try {
          return new Date(match[1]).toISOString()
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Try dataLayer
    const dataLayerMatch = html.match(/"published_date":\s*"([^"]+)"/)
    if (dataLayerMatch && dataLayerMatch[1]) {
      try {
        return new Date(dataLayerMatch[1]).toISOString()
      } catch (e) {
        // Continue
      }
    }

    // Fallback to base class method
    return super.extractPublishedDate(html)
  }

  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^(subscribe|newsletter|follow us|also read).*$/gmi, '')
      .trim()
  }
}