import Exa from 'exa-js'
import { logSearchData } from '../../lib/analytics'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query, numResults = 100 } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' })
  }

  if (!process.env.EXA_API_KEY) {
    return res.status(500).json({ error: 'EXA_API_KEY not configured' })
  }

  try {
    const exa = new Exa(process.env.EXA_API_KEY)
    
    // Detect date constraints in the query
    const dateConstraints = extractDateConstraints(query)
    
    // Build search parameters using ONLY documented parameters
    const searchParams = {
      numResults: Math.min(numResults, 100),
      ...dateConstraints
      // Removed: useAutoprompt, type, category - these don't exist in the docs
    }
    
    console.log('Exa.ai search with correct parameters:', {
      query,
      searchParams,
      dateConstraints
    })
    
    // Use basic search (not searchAndContents since we just need URLs)
    const results = await exa.search(query, searchParams)

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
    
    // Extract URLs and titles - only use properties we know exist
    const urls = results.results.map(result => ({
      url: result.url,
      title: result.title,
      publishedDate: result.publishedDate
      // Removed id, author - we'll see what actually exists in the logs
    }))

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