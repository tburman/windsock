// ===== pages/api/fetch-content.js =====
import axios from 'axios'
import * as cheerio from 'cheerio'
import { Agent } from 'https'
import { Agent as HttpAgent } from 'http'

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

// Session-level cache to prevent duplicate fetches
const sessionCache = new Map()

// Clean up old cache entries (older than 1 hour)
const CACHE_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const cleanupCache = () => {
  const now = Date.now()
  for (const [url, entry] of sessionCache.entries()) {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      sessionCache.delete(url)
    }
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
  
  // Clean up old cache entries periodically
  cleanupCache()
  
  // Check if we have this URL cached
  const cachedEntry = sessionCache.get(url)
  if (cachedEntry) {
    console.log(`Cache hit for ${url} (cached ${Math.round((Date.now() - cachedEntry.timestamp) / 1000)}s ago)`)
    return res.status(200).json({ 
      content: cachedEntry.content, 
      articleTitle: cachedEntry.articleTitle,
      cached: true
    })
  }
  
  try {
    console.log(`Cache miss - fetching content from: ${url}`)
    
    const html = await fetchWithRetry(url)
    const content = extractContent(html, url)
    const articleTitle = extractTitle(html)
    
    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted')
    }
    
    // Cache the successful result
    sessionCache.set(url, {
      content,
      articleTitle,
      timestamp: Date.now()
    })
    
    console.log(`Successfully extracted ${content.length} characters from ${url} (cached for future requests)`)
    
    res.status(200).json({ content, articleTitle, cached: false })
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message)
    res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}`,
      url 
    })
  }
}