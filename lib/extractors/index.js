// Central export for the extractor system
export { extractorRegistry } from './registry.js'
export { BaseExtractor } from './base.js'
export { CarAndBikeExtractor } from './carandbike.js'
export { AutocarIndiaExtractor } from './autocarindia.js'
export { EvoIndiaExtractor } from './evoindia.js'
export { ZeeBizExtractor } from './zeebiz.js'

import { extractorRegistry } from './registry.js'

// Convenience function to get supported domains
export function getSupportedDomains() {
  return extractorRegistry.getSupportedDomains()
}

// Convenience function to get extractor info for debugging
export function getExtractorInfo() {
  return extractorRegistry.getExtractorInfo()
}