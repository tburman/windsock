// ===== pages/api/fetch-content.js =====
import axios from 'axios'
import * as cheerio from 'cheerio'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
]

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5
      })
      
      return response.data
    } catch (error) {
      console.log(`Attempt ${i + 1} failed for ${url}:`, error.message)
      if (i === maxRetries - 1) throw error
      await delay(1000 * (i + 1)) // Exponential backoff
    }
  }
}

function extractContent(html, url) {
  const $ = cheerio.load(html)
  
  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, .sidebar').remove()
  
  // Try to find main content
  let content = ''
  
  // Common content selectors
  const contentSelectors = [
    'article', '[role="main"]', 'main', '.content', '.post-content', 
    '.entry-content', '.article-content', '.story-body', '.post-body'
  ]
  
  for (const selector of contentSelectors) {
    const element = $(selector).first()
    if (element.length && element.text().trim().length > 200) {
      content = element.text().trim()
      break
    }
  }
  
  // Fallback to body if no main content found
  if (!content) {
    content = $('body').text().trim()
  }
  
  // Clean up the content
  content = content
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .trim()
  
  // Limit content length
  if (content.length > 8000) {
    content = content.substring(0, 8000) + '...'
  }
  
  return content
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { url } = req.body
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }
  
  try {
    console.log(`Fetching content from: ${url}`)
    
    const html = await fetchWithRetry(url)
    const content = extractContent(html, url)
    
    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted')
    }
    
    console.log(`Successfully extracted ${content.length} characters from ${url}`)
    
    res.status(200).json({ content })
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message)
    res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}`,
      url 
    })
  }
}