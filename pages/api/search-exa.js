import Exa from 'exa-js'
import { logSearchData } from '../../lib/analytics'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    query, 
    numResults = 100,
    includeDomains = [],
    excludeDomains = [],
    searchType = 'auto' // 'auto', 'neural', 'keyword'
  } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' })
  }

  if (!process.env.EXA_API_KEY) {
    return res.status(500).json({ error: 'EXA_API_KEY not configured' })
  }

  try {
    const exa = new Exa(process.env.EXA_API_KEY)
    
    // Preprocess and optimize query for better results
    const optimizedQuery = preprocessQuery(query)
    
    // Detect date constraints in the query
    const dateConstraints = extractDateConstraints(query)
    
    // Build search parameters with all available options
    const searchParams = {
      numResults: Math.min(numResults, 100),
      ...dateConstraints
    }
    
    // Add domain filtering if provided
    if (includeDomains.length > 0) {
      searchParams.includeDomains = includeDomains
    }
    if (excludeDomains.length > 0) {
      searchParams.excludeDomains = excludeDomains
    }
    
    // Add search type if not auto
    if (searchType !== 'auto') {
      searchParams.type = searchType
    }
    
    console.log('Exa.ai search with correct parameters:', {
      query,
      searchParams,
      dateConstraints
    })
    
    // Use searchAndContents for better result quality with highlights and summaries
    const results = await exa.searchAndContents(optimizedQuery, {
      ...searchParams,
      text: { maxCharacters: 1000 }, // Get text snippets for better result ranking
      highlights: true,
      summary: true
    })

    console.log('Exa.ai search results:', {
      query,
      resultCount: results.results?.length || 0,
      fullResponseKeys: Object.keys(results), // See what's actually in the response
      firstFewResults: results.results?.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
        publishedDate: r.publishedDate,
        allResultKeys: Object.keys(r) // See what's in each result
      }))
    })
    
    // Extract URLs and enhanced metadata for better result quality
    const urls = results.results
      .map(result => ({
        url: result.url,
        title: result.title,
        publishedDate: result.publishedDate,
        summary: result.summary,
        highlights: result.highlights,
        text: result.text,
        score: result.score || 0, // Relevance score if available
        qualityScore: calculateQualityScore(result)
      }))
      .filter(result => result.qualityScore > 0.3) // Filter out low-quality results
      .sort((a, b) => (b.qualityScore * (b.score || 1)) - (a.qualityScore * (a.score || 1))) // Sort by combined quality and relevance

    // Log search analytics (async, don't wait for completion)
    logSearchData({
      queryType: 'semantic_search',
      queryLength: query.length,
      resultsCount: results.results.length,
      successfulScrapes: results.results.length, // All results are successful at this point
      avgSentiment: 0, // No sentiment analysis yet
      timestamp: new Date()
    }).catch(err => console.error('Search analytics logging failed:', err));

    res.status(200).json({
      success: true,
      query,
      urls,
      totalResults: results.results.length
    })

  } catch (error) {
    console.error('Exa search error:', error)
    
    if (error.message?.includes('rate limit')) {
      return res.status(429).json({ error: 'Search rate limit exceeded. Please try again later.' })
    }
    
    if (error.message?.includes('quota')) {
      return res.status(429).json({ error: 'Search quota exceeded. Please check your Exa.ai account.' })
    }
    
    res.status(500).json({ 
      error: 'Search failed',
      details: error.message 
    })
  }
}

function extractDateConstraints(query) {
  const constraints = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Common date patterns in queries
  const patterns = [
    { regex: /\b(?:today|today's)\b/i, days: 0 },
    { regex: /\b(?:yesterday|yesterday's)\b/i, days: 1 },
    { regex: /\b(?:this week|past week|last week)\b/i, days: 7 },
    { regex: /\b(?:this month|past month|last month)\b/i, days: 30 },
    { regex: /\b(?:past (\d+) days?)\b/i, extract: true },
    { regex: /\b(?:last (\d+) days?)\b/i, extract: true },
    { regex: /\b(?:recent|recently|latest)\b/i, days: 7 }
  ]
  
  for (const pattern of patterns) {
    const match = query.match(pattern.regex)
    if (match) {
      let days = pattern.days
      
      if (pattern.extract && match[1]) {
        days = parseInt(match[1], 10)
      }
      
      if (days !== undefined) {
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - days)
        // Use correct Exa.ai parameter names
        constraints.startPublishedDate = startDate.toISOString().split('T')[0]
        break
      }
    }
  }
  
  // Look for specific date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
  const dateMatch = query.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/)
  if (dateMatch) {
    const dateStr = dateMatch[1].replace(/\//g, '-')
    constraints.startPublishedDate = dateStr
  }
  
  // Look for month/year patterns like "june 2025", "june and july 2025"
  const monthYearPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:and\s+\w+\s+)?(\d{4})\b/i
  const monthYearMatch = query.match(monthYearPattern)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase()
    const year = parseInt(monthYearMatch[2])
    
    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    }
    
    if (monthMap[monthName] !== undefined) {
      // Set start date to beginning of the specified month/year
      const startDate = new Date(year, monthMap[monthName], 1)
      constraints.startPublishedDate = startDate.toISOString().split('T')[0]
      
      // If it mentions multiple months like "june and july", set end date to end of second month
      const multiMonthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+and\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i
      const multiMonthMatch = query.match(multiMonthPattern)
      if (multiMonthMatch) {
        const secondMonth = multiMonthMatch[2].toLowerCase()
        if (monthMap[secondMonth] !== undefined) {
          // Set end date to end of the second month
          const endDate = new Date(year, monthMap[secondMonth] + 1, 0) // Last day of the month
          constraints.endPublishedDate = endDate.toISOString().split('T')[0]
        }
      }
    }
  }
  
  return constraints
}

function preprocessQuery(query) {
  // Clean and optimize the query for better Exa results
  let optimized = query.trim()
  
  // Remove redundant words that don't add semantic value
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  const words = optimized.split(' ')
  
  // Don't remove stop words if query is very short
  if (words.length > 3) {
    optimized = words
      .filter(word => !stopWords.includes(word.toLowerCase()) || word.toLowerCase() === words[0].toLowerCase())
      .join(' ')
  }
  
  // Add context for news/article searches if not already specified
  if (!optimized.toLowerCase().includes('news') && 
      !optimized.toLowerCase().includes('article') && 
      !optimized.toLowerCase().includes('report') &&
      optimized.length < 50) {
    optimized = `${optimized} news articles analysis`
  }
  
  // Ensure minimum query length for semantic search
  if (optimized.length < 10) {
    optimized = `latest news about ${optimized}`
  }
  
  return optimized
}

function calculateQualityScore(result) {
  let score = 0.5 // Base score
  
  // Check for title quality
  if (result.title && result.title.length > 10 && result.title.length < 200) {
    score += 0.2
  }
  
  // Check for summary/text content
  if (result.summary && result.summary.length > 50) {
    score += 0.2
  }
  if (result.text && result.text.length > 100) {
    score += 0.1
  }
  
  // Check for highlights (indicates relevant content)
  if (result.highlights && result.highlights.length > 0) {
    score += 0.2
  }
  
  // Check for publication date (recent content gets slight boost)
  if (result.publishedDate) {
    const pubDate = new Date(result.publishedDate)
    const now = new Date()
    const daysAgo = (now - pubDate) / (1000 * 60 * 60 * 24)
    
    if (daysAgo < 30) score += 0.1 // Recent content
    else if (daysAgo < 365) score += 0.05 // Somewhat recent
  }
  
  // Penalize URLs that look like low-quality domains
  const url = result.url?.toLowerCase() || ''
  if (url.includes('spam') || url.includes('ad') || url.includes('popup')) {
    score -= 0.3
  }
  
  // Boost trusted news domains
  const trustedDomains = ['reuters.com', 'ap.org', 'bbc.com', 'cnn.com', 'nytimes.com', 'washingtonpost.com', 'wsj.com']
  if (trustedDomains.some(domain => url.includes(domain))) {
    score += 0.2
  }
  
  return Math.max(0, Math.min(1, score)) // Clamp between 0 and 1
}