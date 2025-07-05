import { CarAndBikeExtractor } from './carandbike.js'
import { AutocarIndiaExtractor } from './autocarindia.js'
import { EvoIndiaExtractor } from './evoindia.js'
import { ZeeBizExtractor } from './zeebiz.js'
import { MoneyControlExtractor } from './moneycontrol.js'

class ExtractorRegistry {
  constructor() {
    this.extractors = []
    this.registerDefaultExtractors()
  }

  // Register all default extractors
  registerDefaultExtractors() {
    this.register(new CarAndBikeExtractor())
    this.register(new AutocarIndiaExtractor())
    this.register(new EvoIndiaExtractor())
    this.register(new ZeeBizExtractor())
    this.register(new MoneyControlExtractor())
    // Future extractors will be added here:
    // etc.
  }

  // Register a new extractor
  register(extractor) {
    if (!extractor.canHandle || typeof extractor.extract !== 'function') {
      throw new Error('Extractor must implement canHandle() and extract() methods')
    }
    
    this.extractors.push(extractor)
    console.log(`📝 Registered extractor: ${extractor.name} for domains: ${extractor.domains.join(', ')}`)
  }

  // Find the appropriate extractor for a URL
  findExtractor(url) {
    return this.extractors.find(extractor => extractor.canHandle(url))
  }

  // Extract content using the appropriate site-specific extractor
  async extractContent(html, url) {
    const extractor = this.findExtractor(url)
    
    if (!extractor) {
      console.log(`💡 No specific extractor found for ${new URL(url).hostname}`)
      return null
    }

    console.log(`🎯 Using ${extractor.name} for ${url}`)
    return await extractor.extract(html, url)
  }

  // Get list of supported domains
  getSupportedDomains() {
    const domains = new Set()
    this.extractors.forEach(extractor => {
      extractor.domains.forEach(domain => domains.add(domain))
    })
    return Array.from(domains).sort()
  }

  // Get extractor info for debugging
  getExtractorInfo() {
    return this.extractors.map(extractor => ({
      name: extractor.name,
      domains: extractor.domains,
      canHandle: typeof extractor.canHandle === 'function',
      hasExtract: typeof extractor.extract === 'function'
    }))
  }
}

// Create and export a singleton instance
export const extractorRegistry = new ExtractorRegistry()

// Export the class for testing
export { ExtractorRegistry }