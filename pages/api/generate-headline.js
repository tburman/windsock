// ===== pages/api/generate-headline.js =====
import axios from 'axios'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { allKeyMessages, allThemes } = req.body

  if (!allKeyMessages && !allThemes) {
    return res.status(400).json({ error: 'Key messages or themes are required' })
  }

  try {
    const prompt = `Given the following key messages and themes extracted from multiple web pages, generate a single, concise, and compelling headline (max 15 words) that captures the common thread or main topic. The headline should be suitable as a report name. Do not use any markdown formatting.

Key Messages: ${allKeyMessages.join('; ')}
Themes: ${allThemes.join(', ')}

Headline:`

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
        temperature: 0.7,
        max_tokens: 50,
        stop: ['\n'] // Stop at the first newline to keep it a single line
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const headline = response.data.choices[0].message.content.trim()
    res.status(200).json({ headline })

  } catch (error) {
    console.error('Headline generation error:', error.message)
    res.status(500).json({ error: `Headline generation failed: ${error.message}` })
  }
}