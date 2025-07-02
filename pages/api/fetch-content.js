// ===== pages/api/fetch-content.js =====
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

// Enhanced global cache configuration
const globalCache = new Map()
const MAX_CACHE_SIZE = 1000 // Maximum number of cached entries
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
  
  const entriesToRemove = entries.slice(0, globalCache.size - MAX_CACHE_SIZE + 100) // Remove extra to avoid frequent evictions
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
      console.log(`Error code: ${error.code}`)
      console.log(`Error type: ${error.constructor.name}`)
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`)
        console.log(`Status text: ${error.response.statusText}`)
        console.log(`Response headers: ${JSON.stringify(error.response.headers, null, 2)}`)
        if (error.response.data && typeof error.response.data === 'string' && error.response.data.length < 1000) {
          console.log(`Response data: ${error.response.data}`)
        }
      } else if (error.request) {
        console.log('No response received')
        console.log(`Request headers: ${JSON.stringify(error.request.getHeaders?.() || 'N/A')}`)
      } else {
        console.log('Error details:', {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
          code: error.code
        })
      }
      
      // Special handling for potential bot detection
      if (error.message.includes('Parse Error') || error.message.includes('Header overflow')) {
        console.log('⚠️  Confirmed: Bot detection via malformed headers from:', url)
        console.log('Yahoo Finance and similar sites use this anti-scraping technique')
        
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

function extractContent(html, url) {
  const $ = cheerio.load(html)
  
  // Remove unwanted elements and their content
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, .sidebar, form, noscript, iframe, svg, canvas, audio, video').remove()
  
  // Try to find main content using a broader set of selectors
  let content = ''
  
  const contentSelectors = [
    'article', 'main', '[role="main"]', '.post', '.entry', '.story', // Semantic and common class names
    '#content', '#main-content', '#article-content', // Common IDs
    '.content-area', '.post-area', '.entry-content', '.article-body', // More class names
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', // General text-containing elements
  ]
  
  for (const selector of contentSelectors) {
    $(selector).each((i, elem) => {
      const text = $(elem).text().trim()
      if (text.length > 100) { // Accumulate content if it's substantial
        content += text + '\n\n' // Add newlines for readability between blocks
      }
    })
    if (content.length > 500) break; // Stop if we have a good amount of content
  }

  // Fallback to body if still not enough content
  if (content.length < 500) {
    content = $('body').text().trim()
  }
  
  // Clean up the content
  content = content
    .replace(/\s\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\n+/g, '\n\n') // Replace multiple newlines with double newline
    .trim()
  
  // Limit content length
  if (content.length > 8000) {
    content = content.substring(0, 8000) + '...'
  } else if (content.length < 200) { // Increase minimum content length for valid extraction
    throw new Error('Insufficient content extracted after processing')
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { url } = req.body
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }
  
  // Periodic cache cleanup
  maybeCleanupCache()
  
  // Check if we have this URL cached
  const cachedEntry = globalCache.get(url)
  const now = Date.now()
  
  if (cachedEntry && (now - cachedEntry.timestamp) < cachedEntry.ttl) {
    // Update last accessed time for LRU
    cachedEntry.lastAccessed = now
    cachedEntry.hitCount = (cachedEntry.hitCount || 0) + 1
    
    const cacheAge = Math.round((now - cachedEntry.timestamp) / 1000 / 60) // minutes
    const ttlHours = Math.round(cachedEntry.ttl / 1000 / 60 / 60)
    console.log(`🚀 Cache HIT for ${url} (age: ${cacheAge}m, TTL: ${ttlHours}h, hits: ${cachedEntry.hitCount})`)
    
    return res.status(200).json({ 
      content: cachedEntry.content, 
      articleTitle: cachedEntry.articleTitle,
      cached: true,
      cacheAge: cacheAge,
      contentHash: cachedEntry.contentHash
    })
  }
  
  try {
    console.log(`💾 Cache MISS - fetching content from: ${url}`)
    
    const html = await fetchWithRetry(url)
    const content = extractContent(html, url)
    const articleTitle = extractTitle(html)
    
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
      contentHash,
      timestamp: now,
      lastAccessed: now,
      ttl,
      hitCount: 0,
      fetchCount: (cachedEntry?.fetchCount || 0) + 1
    })
    
    console.log(`✅ Cached ${url} (${content.length} chars, TTL: ${ttlHours}h, hash: ${contentHash.substring(0, 8)})`)
    console.log(`📊 Cache stats: ${globalCache.size}/${MAX_CACHE_SIZE} entries`)
    
    res.status(200).json({ 
      content, 
      articleTitle, 
      cached: false, 
      contentHash,
      contentChanged: cachedEntry ? contentChanged : undefined
    })
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message)
    res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}`,
      url 
    })
  }
}