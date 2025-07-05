// ===== pages/api/fetch-content-batch.js =====
import axios from 'axios'
import * as cheerio from 'cheerio'
import { Agent } from 'https'
import { Agent as HttpAgent } from 'http'
import crypto from 'crypto'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
]

// Configure HTTP agents with increased header size limits
const httpsAgent = new Agent({
  maxHeaderSize: 80 * 1024, // 80KB max headers
  keepAlive: true
})

const httpAgent = new HttpAgent({
  maxHeaderSize: 80 * 1024, // 80KB max headers
  keepAlive: true
})

// Enhanced global cache configuration (shared with single endpoint)
const globalCache = new Map()
const MAX_CACHE_SIZE = 2500 // Maximum number of cached entries (~125MB at 50KB avg)
const DEFAULT_CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours default
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000 // Clean up every 30 minutes

// Domain-specific TTL configurations
const DOMAIN_TTL_CONFIG = {
  'news': 2 * 60 * 60 * 1000,     // 2 hours for news sites
  'finance': 1 * 60 * 60 * 1000,   // 1 hour for financial sites
  'social': 30 * 60 * 1000,        // 30 minutes for social media
  'blog': 12 * 60 * 60 * 1000,     // 12 hours for blogs
  'default': DEFAULT_CACHE_TTL      // 6 hours for everything else
}

// News and financial domains (shorter TTL)
const NEWS_DOMAINS = ['news.', 'cnn.com', 'bbc.com', 'reuters.com', 'bloomberg.com', 'cnbc.com', 'ap.com', 'nbc.com', 'cbs.com', 'abc.com']
const FINANCE_DOMAINS = ['finance.yahoo.com', 'marketwatch.com', 'fool.com', 'seeking', 'morningstar.com', 'barrons.com', 'wsj.com']
const SOCIAL_DOMAINS = ['twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'reddit.com', 'medium.com']
const BLOG_DOMAINS = ['wordpress.com', 'blogspot.com', 'substack.com', 'ghost.']

// Generate content hash for cache validation
const generateContentHash = (content) => {
  // Use first 1KB + content length for fast hashing
  const sample = content.substring(0, 1024) + content.length
  return crypto.createHash('md5').update(sample, 'utf8').digest('hex')
}

// Determine TTL based on domain
const getDomainTTL = (url) => {
  const hostname = new URL(url).hostname.toLowerCase()
  
  if (NEWS_DOMAINS.some(domain => hostname.includes(domain))) return DOMAIN_TTL_CONFIG.news
  if (FINANCE_DOMAINS.some(domain => hostname.includes(domain))) return DOMAIN_TTL_CONFIG.finance
  if (SOCIAL_DOMAINS.some(domain => hostname.includes(domain))) return DOMAIN_TTL_CONFIG.social
  if (BLOG_DOMAINS.some(domain => hostname.includes(domain))) return DOMAIN_TTL_CONFIG.blog
  
  return DOMAIN_TTL_CONFIG.default
}

// LRU eviction - remove least recently used entries when cache is full
const evictLRUEntries = () => {
  if (globalCache.size <= MAX_CACHE_SIZE) return
  
  // Sort by last accessed time and remove oldest entries
  const entries = Array.from(globalCache.entries())
  entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
  
  const entriesToRemove = entries.slice(0, globalCache.size - MAX_CACHE_SIZE + 250) // Remove extra to avoid frequent evictions
  entriesToRemove.forEach(([url]) => globalCache.delete(url))
  
  console.log(`Cache eviction: removed ${entriesToRemove.length} LRU entries`)
}

// Clean up expired entries and manage memory
const cleanupCache = () => {
  const now = Date.now()
  let removedCount = 0
  
  for (const [url, entry] of globalCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      globalCache.delete(url)
      removedCount++
    }
  }
  
  if (removedCount > 0) {
    console.log(`Cache cleanup: removed ${removedCount} expired entries`)
  }
  
  // Perform LRU eviction if cache is still too large
  evictLRUEntries()
}

// Periodic cache cleanup
let lastCleanup = Date.now()
const maybeCleanupCache = () => {
  const now = Date.now()
  if (now - lastCleanup > CACHE_CLEANUP_INTERVAL) {
    cleanupCache()
    lastCleanup = now
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
      
      console.log(`Attempting to fetch: ${url} with User-Agent: ${userAgent}`)
      
      // Enhanced headers for better bot detection evasion
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
      }
      
      // Add referer for Yahoo Finance specifically to appear more legitimate
      if (url.includes('yahoo.com') || url.includes('finance.yahoo.com')) {
        headers['Referer'] = 'https://finance.yahoo.com/'
      }
      
      const response = await axios.get(url, {
        headers,
        timeout: 20000, // Increased timeout for slower responses
        maxRedirects: 10, // More redirects allowed
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
        httpsAgent: httpsAgent,
        httpAgent: httpAgent,
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses
      })
      
      return response.data
    } catch (error) {
      console.log(`Attempt ${i + 1} failed for ${url}:`, error.message)
      
      // Special handling for potential bot detection
      if (error.message.includes('Parse Error') || error.message.includes('Header overflow')) {
        console.log('⚠️  Confirmed: Bot detection via malformed headers from:', url)
        
        // For the final attempt, suggest alternative approach
        if (i === maxRetries - 1) {
          const domain = new URL(url).hostname
          throw new Error(`Site ${domain} is blocking automated access using anti-bot protection. This content cannot be scraped automatically.`)
        }
      }
      
      if (i === maxRetries - 1) throw error
      await delay(1000 * (i + 1)) // Exponential backoff
    }
  }
}

// Import the extractor registry
import { extractorRegistry } from '../../lib/extractors/registry.js'

async function extractContent(html, url) {
  // First, try site-specific extractors
  try {
    const extractorResult = await extractorRegistry.extractContent(html, url)
    if (extractorResult && extractorResult.content) {
      console.log(`🎯 Site-specific extraction successful: ${extractorResult.content.length} characters`)
      return extractorResult.content
    }
  } catch (error) {
    console.log(`⚠️  Site-specific extraction failed: ${error.message}`)
  }

  // Fall back to generic extraction
  console.log('🔄 Falling back to generic content extraction')
  return extractContentGeneric(html, url)
}

function extractContentGeneric(html, url) {
  const $ = cheerio.load(html)
  
  // Remove unwanted elements and their content more aggressively
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, .sidebar, form, noscript, iframe, svg, canvas, audio, video').remove()
  
  // Remove common navigation and clutter elements
  $('.nav, .navigation, .menu, .breadcrumb, .breadcrumbs, .related, .trending, .popular, .most-read').remove()
  $('.tags, .tag-list, .category, .categories, .share, .sharing, .social, .subscribe').remove()
  $('.widget, .widgets, .ad, .banner, .promo, .promotion, .newsletter').remove()
  $('.search, .search-box, .search-form, .login, .signup, .register').remove()
  
  // Remove elements that look like noise (common patterns)
  $('[class*="ad-"], [class*="advertisement"], [id*="ad-"], [id*="advertisement"]').remove()
  $('[class*="popup"], [class*="modal"], [class*="overlay"], [class*="cookie"]').remove()
  
  let content = ''
  let bestContent = ''
  let maxContentLength = 0
  
  // Enhanced content selectors with priority ordering
  const prioritySelectors = [
    // High priority - semantic article content
    'article .content, article .article-content, article .post-content',
    'article .entry-content, article .story-content, article .text',
    '.article-body, .story-body, .post-body, .entry-body',
    '.article-text, .story-text, .post-text, .content-text',
    
    // Medium priority - general semantic containers
    'article, main, [role="main"]',
    '.content, .main-content, #main-content',
    '.post, .entry, .story, .article',
    
    // Site-specific selectors for common news sites
    '.story-content, .article-content, .post-content',
    '.entry-content, .content-area, .text-content',
    '[class*="story"], [class*="article"], [class*="content"]',
    
    // JSON-LD structured data
    'script[type="application/ld+json"]'
  ]
  
  // Try each selector and find the one with the most substantial content
  for (const selector of prioritySelectors) {
    let selectorContent = ''
    
    if (selector === 'script[type="application/ld+json"]') {
      // Extract from structured data
      $(selector).each((i, elem) => {
        try {
          const jsonData = JSON.parse($(elem).html())
          if (jsonData.articleBody) {
            selectorContent += jsonData.articleBody + '\n\n'
          } else if (jsonData.description && jsonData.description.length > 200) {
            selectorContent += jsonData.description + '\n\n'
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      })
    } else {
      // Extract from HTML elements
      $(selector).each((i, elem) => {
        const $elem = $(elem)
        
        // Skip if this element seems to be navigation or clutter
        const classNames = $elem.attr('class') || ''
        const id = $elem.attr('id') || ''
        const combinedAttrs = (classNames + ' ' + id).toLowerCase()
        
        const skipPatterns = ['nav', 'menu', 'sidebar', 'widget', 'ad', 'promo', 'related', 'trending', 'popular', 'subscribe', 'newsletter', 'comment', 'social', 'share', 'tag']
        const shouldSkip = skipPatterns.some(pattern => combinedAttrs.includes(pattern))
        
        if (shouldSkip) return
        
        // Get paragraphs and headings for better content structure
        const paragraphs = $elem.find('p').map((i, p) => $(p).text().trim()).get()
        const headings = $elem.find('h1, h2, h3, h4, h5, h6').map((i, h) => $(h).text().trim()).get()
        
        // Combine meaningful paragraphs
        const meaningfulParagraphs = paragraphs.filter(p => 
          p.length > 50 && 
          !p.toLowerCase().includes('subscribe') &&
          !p.toLowerCase().includes('newsletter') &&
          !p.toLowerCase().includes('click here') &&
          !p.toLowerCase().includes('read more') &&
          !/^\s*(tags?|categories?|share|follow)\s*:?/i.test(p)
        )
        
        if (meaningfulParagraphs.length > 2) {
          // This looks like article content
          selectorContent += headings.concat(meaningfulParagraphs).join('\n\n') + '\n\n'
        } else {
          // Fallback to element text
          const text = $elem.text().trim()
          if (text.length > 200 && !text.toLowerCase().includes('subscribe') && !text.toLowerCase().includes('newsletter')) {
            selectorContent += text + '\n\n'
          }
        }
      })
    }
    
    // Keep track of the best content found so far
    if (selectorContent.length > maxContentLength && selectorContent.length > 300) {
      maxContentLength = selectorContent.length
      bestContent = selectorContent
    }
    
    // If we found substantial content, we can stop looking
    if (maxContentLength > 1000) break
  }
  
  content = bestContent
  
  // Final fallback - extract paragraphs from anywhere in the body
  if (content.length < 500) {
    const allParagraphs = $('body p').map((i, p) => $(p).text().trim()).get()
    const goodParagraphs = allParagraphs.filter(p => 
      p.length > 100 && 
      !p.toLowerCase().includes('cookie') &&
      !p.toLowerCase().includes('subscribe') &&
      !p.toLowerCase().includes('newsletter') &&
      !/^(tags?|categories?|share|follow|related|trending)/i.test(p)
    )
    
    if (goodParagraphs.length > 3) {
      content = goodParagraphs.join('\n\n')
    }
  }
  
  // Ultimate fallback to body text (but filter out obvious noise)
  if (content.length < 500) {
    content = $('body').text().trim()
  }
  
  // Enhanced content cleaning
  content = content
    .replace(/\s\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\n+/g, '\n\n') // Replace multiple newlines with double newline
    .replace(/^\s*(advertisement|sponsored|promoted content|subscribe|newsletter).*$/gmi, '') // Remove promotional lines
    .replace(/^\s*(tags?|categories?):\s*.*$/gmi, '') // Remove tag/category lines
    .replace(/^\s*(share|follow us|connect with us).*$/gmi, '') // Remove social sharing lines
    .replace(/\b(click here|read more|continue reading|view gallery|see also)\b.*$/gmi, '') // Remove call-to-action noise
    .trim()
  
  // Content quality validation - be less strict but still filter obvious noise
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15)
  const avgSentenceLength = sentences.length > 0 ? content.length / sentences.length : 0
  
  // Check if content looks like article text vs navigation/noise
  const strongNoiseIndicators = [
    /^(search results|no results found|page not found)/i,
    /^(404|error|access denied)/i,
    /^\s*(menu|navigation)\s*$/i,
    /^(home\s+about\s+contact|privacy\s+terms)/i, // Multiple nav items in sequence
    /^[A-Z\s]{40,}$/, // Very long all caps text (likely headers/navigation)
  ]
  
  // Check for content that's mostly navigation links or short phrases
  const shortPhrases = content.split(/[.!?\n]+/).filter(s => s.trim().length > 5)
  const veryShortPhrases = shortPhrases.filter(s => s.trim().length < 30)
  const shortPhraseRatio = veryShortPhrases.length / shortPhrases.length
  
  const hasStrongNoise = strongNoiseIndicators.some(pattern => pattern.test(content.substring(0, 300)))
  const isMostlyShortPhrases = shortPhraseRatio > 0.7 && shortPhrases.length > 10
  
  // More lenient validation - only reject if clearly navigation/noise
  if (hasStrongNoise || (avgSentenceLength < 10 && sentences.length < 2) || isMostlyShortPhrases) {
    throw new Error('Extracted content appears to be navigation/noise rather than article content')
  }
  
  // Limit content length but ensure we have substantial content
  if (content.length > 12000) {
    content = content.substring(0, 12000) + '...'
  } else if (content.length < 300) {
    throw new Error('Insufficient article content extracted after processing')
  }
  
  return content
}

function extractTitle(html) {
  const $ = cheerio.load(html);
  let title = $('title').text();

  // Try to find a more specific article title if the <title> is generic
  const titleSelectors = [
    'h1.title', 'h1.article-title', 'h1.entry-title',
    'h1[itemprop="headline"]',
    'h1', // Fallback to any h1
  ];

  for (const selector of titleSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 10) {
      title = element.text().trim();
      break;
    }
  }

  return title.replace(/\s\s+/g, ' ').trim();
}

function extractAuthor(html) {
  const $ = cheerio.load(html);
  let author = '';

  // Try multiple approaches to find author information
  const authorSelectors = [
    // Meta tags
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[name="article:author"]',
    'meta[property="og:article:author"]',
    
    // JSON-LD structured data
    'script[type="application/ld+json"]',
    
    // Common author selectors
    '.author', '.by-author', '.byline', '.article-author',
    '[itemprop="author"]', '[rel="author"]',
    '.author-name', '.writer', '.post-author',
    '.article-byline', '.story-byline',
    
    // Specific patterns
    '.meta .author', '.post-meta .author',
    'p.byline', 'span.byline', 'div.byline'
  ];

  // Try meta tags first
  for (const selector of authorSelectors.slice(0, 4)) {
    const content = $(selector).attr('content');
    if (content && content.trim().length > 2) {
      author = content.trim();
      break;
    }
  }

  // Try JSON-LD structured data
  if (!author) {
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonData = JSON.parse($(elem).html());
        if (jsonData.author) {
          if (typeof jsonData.author === 'string') {
            author = jsonData.author;
          } else if (jsonData.author.name) {
            author = jsonData.author.name;
          }
        }
        if (author) return false; // Break the loop
      } catch (e) {
        // Invalid JSON, continue
      }
    });
  }

  // Try CSS selectors for author elements
  if (!author) {
    for (const selector of authorSelectors.slice(5)) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.text().trim();
        
        // Clean up common prefixes
        text = text.replace(/^(by|author|written by|published by|posted by):?\s*/i, '');
        text = text.replace(/\s*\|.*$/, ''); // Remove everything after |
        text = text.replace(/\s*-.*$/, ''); // Remove everything after -
        
        if (text.length > 2 && text.length < 100) {
          author = text;
          break;
        }
      }
    }
  }

  // Final cleanup
  if (author) {
    author = author.replace(/\s\s+/g, ' ').trim();
    // Remove common suffixes
    author = author.replace(/,?\s*(editor|reporter|correspondent|staff writer)$/i, '');
  }

  return author || null;
}

// Process a single URL (extracted from original endpoint)
async function processSingleUrl(url) {
  const now = Date.now()
  
  // Check if we have this URL cached
  const cachedEntry = globalCache.get(url)
  
  if (cachedEntry && (now - cachedEntry.timestamp) < cachedEntry.ttl) {
    // Update last accessed time for LRU
    cachedEntry.lastAccessed = now
    cachedEntry.hitCount = (cachedEntry.hitCount || 0) + 1
    
    const cacheAge = Math.round((now - cachedEntry.timestamp) / 1000 / 60) // minutes
    const ttlHours = Math.round(cachedEntry.ttl / 1000 / 60 / 60)
    console.log(`🚀 Cache HIT for ${url} (age: ${cacheAge}m, TTL: ${ttlHours}h, hits: ${cachedEntry.hitCount})`)
    
    return { 
      url,
      content: cachedEntry.content, 
      articleTitle: cachedEntry.articleTitle,
      author: cachedEntry.author,
      status: 'success',
      cached: true,
      cacheAge: cacheAge,
      contentHash: cachedEntry.contentHash
    }
  }
  
  try {
    console.log(`💾 Cache MISS - fetching content from: ${url}`)
    
    const html = await fetchWithRetry(url)
    const content = await extractContent(html, url)
    const articleTitle = extractTitle(html)
    const author = extractAuthor(html)
    
    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted')
    }
    
    // Generate content hash and determine TTL
    const contentHash = generateContentHash(content)
    const ttl = getDomainTTL(url)
    const ttlHours = Math.round(ttl / 1000 / 60 / 60)
    
    // Check if content changed (for existing cache entries)
    let contentChanged = true
    if (cachedEntry) {
      contentChanged = cachedEntry.contentHash !== contentHash
      console.log(`🔍 Content ${contentChanged ? 'CHANGED' : 'UNCHANGED'} for ${url}`)
    }
    
    // Cache the successful result
    globalCache.set(url, {
      content,
      articleTitle,
      author,
      contentHash,
      timestamp: now,
      lastAccessed: now,
      ttl,
      hitCount: 0,
      fetchCount: (cachedEntry?.fetchCount || 0) + 1
    })
    
    console.log(`✅ Cached ${url} (${content.length} chars, TTL: ${ttlHours}h, hash: ${contentHash.substring(0, 8)})`)
    
    return { 
      url,
      content, 
      articleTitle,
      author, 
      status: 'success',
      cached: false, 
      contentHash,
      contentChanged: cachedEntry ? contentChanged : undefined
    }
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message)
    
    // Classify error types for better user messaging
    let errorMessage = error.message
    let errorType = 'general'
    
    if (error.message.includes('blocking automated access') || 
        error.message.includes('anti-bot protection') ||
        error.message.includes('Parse Error: Header overflow')) {
      errorType = 'bot-detection'
      errorMessage = 'Site blocked automated access (anti-bot protection)'
    } else if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      errorType = 'network'
      errorMessage = 'Network timeout or connection issue'
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorType = 'not-found'
      errorMessage = 'Page not found (404)'
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorType = 'forbidden'
      errorMessage = 'Access forbidden (403)'
    } else if (error.message.includes('Insufficient content')) {
      errorType = 'content'
      errorMessage = 'Unable to extract meaningful content from page'
    }
    
    return { 
      url, 
      content: '', 
      articleTitle: '',
      author: null,
      status: 'error', 
      error: errorMessage,
      errorType: errorType
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { urls, concurrency = 5 } = req.body
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs array is required' })
  }
  
  if (urls.length === 0) {
    return res.status(400).json({ error: 'At least one URL is required' })
  }
  
  // Validate concurrency parameter
  const maxConcurrency = 10 // Reasonable upper limit
  const actualConcurrency = Math.min(Math.max(1, concurrency), maxConcurrency)
  
  console.log(`🔄 Processing ${urls.length} URLs with concurrency: ${actualConcurrency}`)
  
  // Periodic cache cleanup
  maybeCleanupCache()
  
  try {
    const results = []
    
    // Process URLs in batches to control concurrency
    for (let i = 0; i < urls.length; i += actualConcurrency) {
      const batch = urls.slice(i, i + actualConcurrency)
      console.log(`📦 Processing batch ${Math.floor(i / actualConcurrency) + 1}: URLs ${i + 1}-${Math.min(i + actualConcurrency, urls.length)}`)
      
      const batchPromises = batch.map(url => processSingleUrl(url))
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Extract results from Promise.allSettled
      const processedResults = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          // Handle unexpected promise rejection
          console.error(`Unexpected error processing URL ${batch[index]}:`, result.reason)
          return {
            url: batch[index],
            content: '',
            articleTitle: '',
            author: null,
            status: 'error',
            error: `Unexpected error: ${result.reason?.message || 'Unknown error'}`,
            errorType: 'general'
          }
        }
      })
      
      results.push(...processedResults)
      
      // Small delay between batches to be respectful
      if (i + actualConcurrency < urls.length) {
        await delay(100)
      }
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length
    const cached = results.filter(r => r.cached).length
    
    console.log(`📊 Batch processing complete: ${successful} successful, ${failed} failed, ${cached} from cache`)
    console.log(`📊 Cache stats: ${globalCache.size}/${MAX_CACHE_SIZE} entries`)
    
    res.status(200).json({
      results,
      stats: {
        total: urls.length,
        successful,
        failed,
        cached,
        concurrency: actualConcurrency
      }
    })
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error)
    res.status(500).json({ 
      error: `Batch processing failed: ${error.message}`,
      processed: 0,
      total: urls.length
    })
  }
}