import { BaseExtractor } from './base.js'

export class CarAndBikeExtractor extends BaseExtractor {
  constructor() {
    super()
    this.name = 'CarAndBikeExtractor'
    this.domains = ['carandbike.com']
  }

  async extract(html, url) {
    try {
      // Extract from Next.js __NEXT_DATA__ script
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
      if (!nextDataMatch) {
        console.log('❌ CarAndBike: No __NEXT_DATA__ script found')
        return null
      }
      
      const data = JSON.parse(nextDataMatch[1])
      const article = data?.props?.pageProps?.section?.[1]?.data?.[0]?.data?.[0]?.data?.[0]
      
      if (!article) {
        console.log('❌ CarAndBike: Article data not found in expected location')
        return null
      }

      const content = this.cleanHtmlContent(article.content || '')
      
      if (!this.validateContent(content)) {
        console.log('❌ CarAndBike: Extracted content failed validation')
        return null
      }

      console.log(`✅ CarAndBike: Extracted ${content.length} characters via Next.js API`)
      
      return {
        content,
        title: article.title || '',
        author: article.author_name || null,
        metadata: {
          excerpt: article.excerpt || article.short_excerpt || '',
          publishedDate: article.pubDate || '',
          categories: article.categories || [],
          readTime: article.minutes_read || null
        }
      }
      
    } catch (error) {
      console.log(`❌ CarAndBike extraction failed: ${error.message}`)
      return null
    }
  }

  extractMetadata(html, url) {
    // Additional metadata extraction specific to CarAndBike if needed
    return {
      extractorUsed: this.name,
      method: 'nextjs-data-api'
    }
  }
}