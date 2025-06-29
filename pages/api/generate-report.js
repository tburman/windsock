// ===== pages/api/generate-report.js =====
import axios from 'axios'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { results } = req.body
  
  if (!results || results.length === 0) {
    return res.status(400).json({ error: 'Results are required' })
  }
  
  try {
    const analysisData = results.map(r => ({
      url: r.url,
      sentiment: r.analysis.sentiment,
      confidence: r.analysis.confidence,
      tone: r.analysis.tone,
      themes: r.analysis.themes,
      keyMessages: r.analysis.keyMessages
    }))
    
    const prompt = `Based on the following sentiment analyses from ${results.length} URLs, create a comprehensive summary report. Respond with ONLY a valid JSON object in this exact format:

{
  "overallSentiment": "positive/negative/neutral/mixed",
  "sentimentDistribution": {"positive": 0.6, "negative": 0.2, "neutral": 0.2},
  "dominantTone": "professional/excited/cautious/etc",
  "coreThemes": ["theme1", "theme2", "theme3"],
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "windDirection": "how the overall narrative/sentiment is trending - this is the key insight about momentum",
  "summary": "2-3 sentence executive summary of the collective story these URLs tell",
  "confidence": 0.85
}

Analysis data: ${JSON.stringify(analysisData, null, 2)}`

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-flash-1.5-8b',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://windsock.vercel.app',
          'X-Title': 'Windsock'
        }
      }
    )
    
    const aiResponse = response.data.choices[0].message.content.trim()
    
    // Try to parse the JSON response
    let report
    try {
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      report = JSON.parse(cleanResponse)
    } catch (parseError) {
      console.error('Failed to parse report response:', aiResponse)
      // Fallback report
      const sentiments = results.map(r => r.analysis.sentiment)
      const positiveCount = sentiments.filter(s => s === 'positive').length
      const negativeCount = sentiments.filter(s => s === 'negative').length
      const neutralCount = sentiments.filter(s => s === 'neutral').length
      const total = sentiments.length
      
      report = {
        overallSentiment: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'mixed',
        sentimentDistribution: {
          positive: positiveCount / total,
          negative: negativeCount / total,
          neutral: neutralCount / total
        },
        dominantTone: 'mixed',
        coreThemes: ['analysis', 'content', 'reporting'],
        keyInsights: ['Analysis completed successfully', `Processed ${total} URLs`, 'Mixed sentiment distribution found'],
        windDirection: 'The overall narrative shows mixed signals with varied perspectives across sources',
        summary: `Analysis of ${total} URLs reveals a diverse range of sentiments and perspectives across the content.`,
        confidence: 0.7
      }
    }
    
    res.status(200).json(report)
  } catch (error) {
    console.error('Report generation error:', error.message)
    res.status(500).json({ 
      error: `Report generation failed: ${error.message}` 
    })
  }
}