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
      
      console.log(`Attempting to fetch: ${url} with User-Agent: ${userAgent}`)
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
      if (error.response) {
        console.log(`Status: ${error.response.status}`)
        console.log(`Headers: ${JSON.stringify(error.response.headers)}`)
        console.log(`Data: ${JSON.stringify(error.response.data)}`)
      } else if (error.request) {
        console.log('No response received')
      } else {
        console.log('Error', error.message)
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
  
  try {
    console.log(`Fetching content from: ${url}`)
    
    const html = await fetchWithRetry(url)
    const content = extractContent(html, url)
    const articleTitle = extractTitle(html)
    
    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted')
    }
    
    console.log(`Successfully extracted ${content.length} characters from ${url}`)
    
    res.status(200).json({ content, articleTitle })
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message)
    res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}`,
      url 
    })
  }
}