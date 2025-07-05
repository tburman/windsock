import { BaseExtractor } from './base.js'
import * as cheerio from 'cheerio'

export class CarDekhoExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'CarDekhoExtractor'
    this.domains = ['cardekho.com']
  }

  async extract(html, url) {
    try {
      const $ = cheerio.load(html)

      // Remove known noise elements first
      this.removeNoiseElements($)

      const title = this.extractTitle($)
      const author = this.extractAuthor($)
      const content = this.extractContent($)
      const publishedDate = this.extractPublishedDate(html)

      if (!content || !this.validateContent(content)) {
        console.log('❌ CarDekho: Content validation failed')
        return null
      }

      console.log(`✅ CarDekho: Extracted ${content.length} characters`)
      
      return {
        content,
        title: title || '',
        author: author || null,
        publishedDate: publishedDate || null,
        metadata: {
          extractionMethod: 'CarDekhoExtractor',
          source: url
        }
      }
      
    } catch (error) {
      console.log(`❌ CarDekho extraction failed: ${error.message}`)
      return null
    }
  }

  removeNoiseElements($) {
    const noiseSelectors = [
      '.article-right',
      '.article-left-datatbl',
      '.commentbox',
      '.gsc-comments-container',
      '.tags',
      '.share-it',
      '.related-articles',
      '.trending-cars',
      '#rhs-ad-container',
      '#sticky-ad-container',
      '.similar-cars-container',
      '.latest-news-container',
      '.author-bio',
      'script',
      'style',
      'noscript',
      'iframe',
      '.ad-container',
      '.ad-wrapper',
      '.ad-slot'
    ]

    noiseSelectors.forEach(selector => {
      $(selector).remove()
    })
  }

  extractTitle($) {
    const titleSelectors = [
      'h1.article-title',
      'h1.article-heading',
      'meta[property="og:title"]',
      'title'
    ]

    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        let title = element.attr('content') || element.text().trim()
        if (title && title.length > 5) {
          return title
        }
      }
    }
    return null
  }

  extractAuthor($) {
    const authorSelectors = [
      'a.author',
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      '.author-info-block .name a',
      '.author-info-block .name',
      'span[itemprop="author"]',
      '.author-name',
      '.byline'
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

  extractContent($) {
    // Extract all paragraphs after noise removal
    let paragraphs = $('p').map((i, el) => $(el).text().trim()).get()

    // Filter out short or noisy paragraphs
    paragraphs = paragraphs.filter(p => 
      p.length > 100 && 
      !p.toLowerCase().includes('read more') &&
      !p.toLowerCase().includes('also read') &&
      !p.toLowerCase().includes('image source') &&
      !p.toLowerCase().includes('disclaimer') &&
      !p.toLowerCase().includes('copyright') &&
      !p.toLowerCase().includes('privacy policy')
    )

    if (paragraphs.length === 0) {
      console.log('CarDekhoExtractor: No meaningful paragraphs found after aggressive filtering.')
      return null
    }

    const content = paragraphs.join('\n\n')

    if (content && this.validateContent(content)) {
      return this.cleanContent(content)
    }
    return null
  }

  extractPublishedDate(html) {
    // Try to extract published date from various sources
    const patterns = [
      /"datePublished":\s*"([^"]+)"/,
      /"publishedTime":\s*"([^"]+)"/,
      /Published on:\s*([^<\n]+)/i,
      /Published:\s*([^<\n]+)/i,
      /Date:\s*([^<\n]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        try {
          let dateStr = match[1].trim()
          
          // Handle CarDekho's malformed date format (G instead of T)
          if (dateStr.includes('G')) {
            dateStr = dateStr.replace('G', 'T')
          }
          
          // Fix timezone format from +0530 to +05:30 and remove space before timezone
          dateStr = dateStr.replace(/\s+([+-])(\d{2})(\d{2})$/, '$1$2:$3')
          
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

  cleanContent(content) {
    // Additional cleaning specific to CarDekho if needed
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  }
}