// ===== pages/api/analyze-sentiment.js =====
import axios from 'axios'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { content, url } = req.body
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' })
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
      console.error('Failed to parse AI response:', aiResponse)
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
    
    res.status(200).json(analysis)
  } catch (error) {
    console.error('Sentiment analysis error:', error.message)
    if (error.response) {
      console.error('OpenRouter Error Status:', error.response.status);
      console.error('OpenRouter Error Data:', error.response.data);
      console.error('OpenRouter Error Headers:', error.response.headers);
    } else if (error.request) {
      console.error('OpenRouter No response received:', error.request);
    } else {
      console.error('OpenRouter Error', error.message);
    }
    res.status(500).json({ 
      error: `Sentiment analysis failed: ${error.message}` 
    })
  }
}