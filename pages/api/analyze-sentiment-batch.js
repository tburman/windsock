// ===== pages/api/analyze-sentiment-batch.js =====
import axios from 'axios'

// Process a single content item for sentiment analysis
async function analyzeSingleContent(contentItem) {
  const { content, url } = contentItem
  
  if (!content) {
    return {
      url,
      status: 'error',
      error: 'Content is required',
      errorType: 'validation'
    }
  }
  
  try {
    const prompt = `Analyze the following web content for sentiment analysis. Respond with ONLY a valid JSON object in this exact format:

{
  "sentiment": "positive/negative/neutral",
  "confidence": 0.85,
  "tone": "professional/excited/cautious/critical/optimistic/pessimistic/etc",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "reasoning": "explanation of why this sentiment was determined",
  "themes": ["theme1", "theme2", "theme3"],
  "emotionalIntensity": "low/medium/high"
}

URL: ${url}
Content: ${JSON.stringify(content.substring(0, 4000))}`

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-flash-lite-preview-06-17',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )
    
    const aiResponse = response.data.choices[0].message.content.trim()
    
    // Try to parse the JSON response
    let analysis
    try {
      // Remove any markdown code blocks if present
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleanResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response for', url, ':', aiResponse)
      // Fallback analysis
      analysis = {
        sentiment: 'neutral',
        confidence: 0.5,
        tone: 'unknown',
        keyMessages: ['Analysis parsing failed'],
        reasoning: 'Unable to parse AI response',
        themes: ['parsing_error'],
        emotionalIntensity: 'low'
      }
    }
    
    return {
      url,
      status: 'success',
      analysis
    }
    
  } catch (error) {
    console.error('Sentiment analysis error for', url, ':', error.message)
    
    // Classify error types
    let errorType = 'general'
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      errorType = 'network'
    } else if (error.response?.status === 429) {
      errorType = 'rate_limit'
    } else if (error.response?.status === 401) {
      errorType = 'authentication'
    } else if (error.response?.status >= 500) {
      errorType = 'server'
    }
    
    return {
      url,
      status: 'error',
      error: `Sentiment analysis failed: ${error.message}`,
      errorType
    }
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { contents, concurrency = 3 } = req.body
  
  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Contents array is required' })
  }
  
  if (contents.length === 0) {
    return res.status(400).json({ error: 'At least one content item is required' })
  }
  
  // Validate that each content item has the required fields
  for (const item of contents) {
    if (!item.content || !item.url) {
      return res.status(400).json({ error: 'Each content item must have "content" and "url" fields' })
    }
  }
  
  // Validate concurrency parameter (lower for AI API calls due to rate limits)
  const maxConcurrency = 5 // Conservative limit for AI API calls
  const actualConcurrency = Math.min(Math.max(1, concurrency), maxConcurrency)
  
  console.log(`🧠 Analyzing ${contents.length} content items with concurrency: ${actualConcurrency}`)
  
  try {
    const results = []
    
    // Process content items in batches to control concurrency
    for (let i = 0; i < contents.length; i += actualConcurrency) {
      const batch = contents.slice(i, i + actualConcurrency)
      console.log(`🔍 Processing analysis batch ${Math.floor(i / actualConcurrency) + 1}: items ${i + 1}-${Math.min(i + actualConcurrency, contents.length)}`)
      
      const batchPromises = batch.map(contentItem => analyzeSingleContent(contentItem))
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Extract results from Promise.allSettled
      const processedResults = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          // Handle unexpected promise rejection
          console.error(`Unexpected error analyzing content for URL ${batch[index].url}:`, result.reason)
          return {
            url: batch[index].url,
            status: 'error',
            error: `Unexpected error: ${result.reason?.message || 'Unknown error'}`,
            errorType: 'general'
          }
        }
      })
      
      results.push(...processedResults)
      
      // Delay between batches to respect API rate limits
      if (i + actualConcurrency < contents.length) {
        await delay(500) // 500ms delay between batches
      }
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length
    
    console.log(`📊 Batch analysis complete: ${successful} successful, ${failed} failed`)
    
    res.status(200).json({
      results,
      stats: {
        total: contents.length,
        successful,
        failed,
        concurrency: actualConcurrency
      }
    })
    
  } catch (error) {
    console.error('❌ Batch analysis failed:', error)
    res.status(500).json({ 
      error: `Batch analysis failed: ${error.message}`,
      processed: 0,
      total: contents.length
    })
  }
}