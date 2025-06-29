// ===== app/page.js =====
'use client'

import React, { useState } from 'react'
import { Globe, AlertCircle, CheckCircle, Clock, BarChart3, TrendingUp, TrendingDown, FileText, Copy, Link2 } from 'lucide-react'

export default function Home() {
  const [urls, setUrls] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0, status: '' })
  const [finalReport, setFinalReport] = useState(null)
  const [error, setError] = useState('')

  // Validate URL format
  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // Parse URLs from input
  const parseUrls = (urlText) => {
    return urlText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
  }

  // Process URLs
  const processUrls = async () => {
    const urlList = parseUrls(urls)
    
    if (urlList.length === 0) {
      setError('Please enter at least one URL')
      return
    }

    const invalidUrls = urlList.filter(url => !isValidUrl(url))
    if (invalidUrls.length > 0) {
      setError(`Invalid URLs found:\n${invalidUrls.join('\n')}`)
      return
    }

    setIsProcessing(true)
    setResults([])
    setFinalReport(null)
    setError('')
    setCurrentProgress({ current: 0, total: urlList.length, status: 'Starting analysis...' })

    const processedResults = []

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i]
      setCurrentProgress({ 
        current: i + 1, 
        total: urlList.length, 
        status: `Processing ${url.substring(0, 50)}...` 
      })

      try {
        // Fetch content
        const fetchResponse = await fetch('/api/fetch-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })

        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch: ${fetchResponse.statusText}`)
        }

        const { content } = await fetchResponse.json()

        // Analyze sentiment
        setCurrentProgress({ 
          current: i + 1, 
          total: urlList.length, 
          status: `Analyzing sentiment for ${url.substring(0, 50)}...` 
        })

        const analysisResponse = await fetch('/api/analyze-sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, url })
        })

        if (!analysisResponse.ok) {
          throw new Error(`Analysis failed: ${analysisResponse.statusText}`)
        }

        const analysis = await analysisResponse.json()

        const result = {
          url,
          content: content.substring(0, 300) + '...',
          analysis,
          status: 'success',
          timestamp: new Date().toISOString()
        }

        processedResults.push(result)
        setResults([...processedResults])

      } catch (error) {
        console.error(`Error processing ${url}:`, error)
        const result = {
          url,
          content: '',
          analysis: null,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        }
        processedResults.push(result)
        setResults([...processedResults])
      }
    }

    // Generate final report
    setCurrentProgress({ 
      current: urlList.length, 
      total: urlList.length, 
      status: 'Generating comprehensive report...' 
    })

    try {
      const successfulResults = processedResults.filter(r => r.status === 'success')
      if (successfulResults.length > 0) {
        const reportResponse = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: successfulResults })
        })

        if (reportResponse.ok) {
          const report = await reportResponse.json()
          setFinalReport(report)
        }
      }
    } catch (error) {
      console.error('Report generation failed:', error)
    }

    setIsProcessing(false)
    setCurrentProgress({ current: 0, total: 0, status: 'Analysis complete!' })
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200'
      case 'negative': return 'text-red-600 bg-red-50 border-red-200'
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <TrendingUp className="w-4 h-4" />
      case 'negative': return <TrendingDown className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-blue-600" />
            <div>
              <h1 class="text-3xl font-bold text-gray-800">Windsock</h1>
              <p class="text-gray-600">See which way the wind is blowing</p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter URLs to analyze (one per line):
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="https://example.com/article1&#10;https://example.com/article2&#10;https://example.com/article3"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-500 mt-2">
              Supports news articles, blog posts, and most public web content
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={processUrls}
            disabled={isProcessing || !urls.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Analyze Sentiment
              </>
            )}
          </button>
        </div>

        {/* Progress Section */}
        {isProcessing && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              <h2 className="text-xl font-semibold">Processing Progress</h2>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{currentProgress.current} of {currentProgress.total} URLs</span>
              <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{currentProgress.status}</p>
          </div>
        )}

        {/* Final Report */}
        {finalReport && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold">Sentiment Analysis Report</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Overall Sentiment</h3>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getSentimentColor(finalReport.overallSentiment)}`}>
                    {getSentimentIcon(finalReport.overallSentiment)}
                    <span className="capitalize">{finalReport.overallSentiment}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Sentiment Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(finalReport.sentimentDistribution || {}).map(([sentiment, value]) => (
                      <div key={sentiment} className="flex justify-between items-center">
                        <span className="capitalize text-sm">{sentiment}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${sentiment === 'positive' ? 'bg-green-500' : sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'}`}
                              style={{ width: `${value * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{Math.round(value * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Core Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {finalReport.coreThemes?.map((theme, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Key Insights</h3>
                  <ul className="space-y-2">
                    {finalReport.keyInsights?.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Confidence Score</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${(finalReport.confidence || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{Math.round((finalReport.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Wind Direction
                </h3>
                <p className="text-blue-700">{finalReport.windDirection}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Executive Summary</h3>
                <p className="text-gray-700">{finalReport.summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Individual Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Individual URL Analysis</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <h3 className="font-medium text-sm truncate">{result.url}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-xs ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {result.status === 'success' ? 'Analyzed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    
                    {result.analysis && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getSentimentColor(result.analysis.sentiment)}`}>
                        {getSentimentIcon(result.analysis.sentiment)}
                        <span className="capitalize">{result.analysis.sentiment}</span>
                      </div>
                    )}
                  </div>
                  
                  {result.content && (
                    <div className="mb-3 p-3 bg-gray-50 rounded text-sm border">
                      <strong className="text-gray-700">Content Preview:</strong>
                      <p className="mt-1 text-gray-600">{result.content}</p>
                    </div>
                  )}
                  
                  {result.analysis && (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p><strong>Tone:</strong> <span className="capitalize">{result.analysis.tone}</span></p>
                        <p><strong>Confidence:</strong> {Math.round((result.analysis.confidence || 0) * 100)}%</p>
                        <p><strong>Intensity:</strong> <span className="capitalize">{result.analysis.emotionalIntensity}</span></p>
                        {result.analysis.themes && (
                          <p><strong>Themes:</strong> {result.analysis.themes.join(', ')}</p>
                        )}
                      </div>
                      <div>
                        {result.analysis.keyMessages && (
                          <>
                            <p className="font-medium mb-1">Key Messages:</p>
                            <ul className="space-y-1">
                              {result.analysis.keyMessages.map((message, msgIndex) => (
                                <li key={msgIndex} className="text-xs text-gray-600 flex items-start gap-1">
                                  <span className="text-blue-500 mt-0.5">•</span>
                                  <span>{message}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {result.analysis.reasoning && (
                          <div className="mt-2">
                            <p className="font-medium mb-1">Analysis Reasoning:</p>
                            <p className="text-xs text-gray-600">{result.analysis.reasoning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-700 text-sm"><strong>Error:</strong> {result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}