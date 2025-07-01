// pages/dashboard.js
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { LogOut, Globe, AlertCircle, CheckCircle, Clock, BarChart3, TrendingUp, TrendingDown, FileText, Link2, Zap, Wind, BrainCircuit, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'

// Skeleton Loader Components
const Skeleton = ({ className }) => <div className={`bg-gray-200 rounded animate-pulse ${className}`} />

const ResultSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
    <Skeleton className="h-12 w-full" />
  </div>
)

export default function Dashboard() {
  const [urls, setUrls] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0, status: '' })
  const [finalReport, setFinalReport] = useState(null)
  const [error, setError] = useState('')
  const [openResult, setOpenResult] = useState(null)
  const [copiedMessage, setCopiedMessage] = useState('')
  const [isReportUpdating, setIsReportUpdating] = useState(false)
  const router = useRouter()

  const extractUrls = (text) => {
    if (!text) return [];
    // A more robust regex to find URLs and avoid capturing trailing punctuation.
    const urlRegex = /https?:\/\/[^\s<>"()]+/g;
    const matches = text.match(urlRegex) || [];
    // Clean and get unique URLs
    const cleanedUrls = matches.map(url => url.replace(/[.,!?:;)]+$/, '').replace(/\.$/, ''));
    const uniqueUrls = [...new Set(cleanedUrls)];
    return uniqueUrls;
  };

  const regenerateReport = async (currentResults) => {
    setIsReportUpdating(true);
    const successfulResults = currentResults.filter(r => r.status === 'success');
    if (successfulResults.length === 0) {
      setFinalReport(null);
      setIsReportUpdating(false);
      return;
    }

    setCurrentProgress({ current: successfulResults.length, total: successfulResults.length, status: '[3/3] Generating comprehensive report...' });
    try {
      const allKeyMessages = successfulResults.flatMap(r => r.analysis?.keyMessages || []);
      const allThemes = successfulResults.flatMap(r => r.analysis?.themes || []);

      const headlineResponse = await fetch('/api/generate-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allKeyMessages, allThemes }),
      });

      let generatedHeadline = 'Overall Sentiment Analysis Report';
      if (headlineResponse.ok) {
        const { headline } = await headlineResponse.json();
        generatedHeadline = headline;
      }

      const reportResponse = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: successfulResults }),
      });

      if (reportResponse.ok) {
        const report = await reportResponse.json();
        setFinalReport({ ...report, headline: generatedHeadline });
      } else {
        const errorData = await reportResponse.json().catch(() => ({}));
        throw new Error(`Report generation failed: ${reportResponse.status} ${reportResponse.statusText}. ${errorData.error || ''}`);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      setError('Failed to generate the final report.');
    } finally {
      setIsReportUpdating(false);
    }
  };

  const handleRemoveResult = (indexToRemove) => {
    const updatedResults = results.filter((_, index) => index !== indexToRemove);
    setResults(updatedResults);
    regenerateReport(updatedResults);
  };

  const processUrls = async () => {
    const urlList = extractUrls(urls);
    if (urlList.length === 0) {
      setError('No valid URLs found in the provided text. Make sure URLs start with http:// or https://');
      return;
    }

    setIsProcessing(true);
    setError('');
    setCurrentProgress({ current: 0, total: urlList.length, status: 'Starting analysis...' });

    const newProcessedResults = [];

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      setCurrentProgress({ current: i + 1, total: urlList.length, status: `[1/3] Fetching content for ${url.substring(0, 50)}...` });

      try {
        const fetchResponse = await fetch('/api/fetch-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({}))
          throw new Error(`Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}. ${errorData.error || ''}`);
        }
        const { content, articleTitle } = await fetchResponse.json();

        setCurrentProgress({ current: i + 1, total: urlList.length, status: `[2/3] Analyzing sentiment for ${url.substring(0, 50)}...` });
        const analysisResponse = await fetch('/api/analyze-sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, url })
        });

        if (!analysisResponse.ok) {
          const errorData = await analysisResponse.json().catch(() => ({}))
          throw new Error(`Analysis failed: ${analysisResponse.status} ${analysisResponse.statusText}. ${errorData.error || ''}`);
        }
        const analysis = await analysisResponse.json();

        const result = { url, content: content.substring(0, 300) + '...', analysis, status: 'success', timestamp: new Date().toISOString(), articleTitle };
        newProcessedResults.push(result);

      } catch (error) {
        console.error(`Error processing ${url}:`, error);
        const result = { url, content: '', analysis: null, status: 'error', error: error.message, timestamp: new Date().toISOString(), articleTitle: '' };
        newProcessedResults.push(result);
      }
    }

    const allResults = [...results, ...newProcessedResults];
    setResults(allResults);

    if (allResults.filter(r => r.status === 'success').length > 0) {
      await regenerateReport(allResults);
    }

    setIsProcessing(false);
    setCurrentProgress({ current: 0, total: 0, status: 'Analysis complete!' });
    setUrls(''); // Clear the input box
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-700 bg-green-100 border-green-200'
      case 'negative': return 'text-red-700 bg-red-100 border-red-200'
      case 'neutral': return 'text-gray-700 bg-gray-100 border-gray-200'
      default: return 'text-blue-700 bg-blue-100 border-blue-200'
    }
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <TrendingUp className="w-4 h-4" />
      case 'negative': return <TrendingDown className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const toggleResult = (index) => setOpenResult(openResult === index ? null : index)

  const handleCopy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessage(message)
      setTimeout(() => setCopiedMessage(''), 3000)
    } catch (err) {
      console.error('Failed to copy: ', err)
      setCopiedMessage('Failed to copy!')
      setTimeout(() => setCopiedMessage(''), 3000)
    }
  }

  const formatOverallReport = (report) => {
    if (!report) return ''
    let formatted = `--- ${report.headline || 'Overall Sentiment Analysis Report'} ---\n\n`
    formatted += `Overall Sentiment: ${report.overallSentiment}\n`
    formatted += `Confidence: ${Math.round((report.confidence || 0) * 100)}%\n\n`
    formatted += `Sentiment Distribution:\n`
    for (const [sentiment, value] of Object.entries(report.sentimentDistribution || {})) {
      formatted += `  ${sentiment}: ${Math.round(value * 100)}%\n`
    n}
    formatted += `\nCore Themes: ${report.coreThemes?.join(', ') || 'N/A'}\n\n`
    formatted += `Key Insights:\n`
    report.keyInsights?.forEach((insight, i) => {
      formatted += `  ${i + 1}. ${insight}\n`
    })
    formatted += `\nWind Direction: ${report.windDirection}\n\n`
    formatted += `Executive Summary:\n${report.summary}\n`
    formatted += `\n--- End of Report ---`
    return formatted
  }

  const formatIndividualResult = (result) => {
    if (!result) return ''
    let formatted = `--- Headline: ${result.articleTitle || result.url} ---\n`
    formatted += `URL: ${result.url}\n`
    formatted += `Status: ${result.status === 'success' ? 'Analyzed' : 'Failed'}\n`
    if (result.error) {
      formatted += `Error: ${result.error}\n`
    }
    if (result.analysis) {
      formatted += `Sentiment: ${result.analysis.sentiment}\n`
      formatted += `Confidence: ${Math.round((result.analysis.confidence || 0) * 100)}%\n`
      formatted += `Tone: ${result.analysis.tone}\n`
      formatted += `Intensity: ${result.analysis.emotionalIntensity}\n`
      formatted += `Themes: ${result.analysis.themes?.join(', ') || 'N/A'}\n\n`
      formatted += `Key Messages:\n`
      result.analysis.keyMessages?.forEach((message, i) => {
        formatted += `  ${i + 1}. ${message}\n`
      })
      formatted += `\nReasoning:\n${result.analysis.reasoning}\n`
    }
    formatted += `\n--- End of URL Analysis ---`
    return formatted
  }

  const formatAllIndividualResults = (results) => {
    if (!results || results.length === 0) return ''
    return results.map(result => formatIndividualResult(result)).join('\n\n')
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans text-gray-800">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-8 sm:mb-10 border border-blue-100">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg">
                <Wind className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">Windsock</h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">See which way the wind is blowing for any URL.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors duration-150 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
          
          <div className="mb-6">
            <label htmlFor="url-input" className="block text-sm font-semibold text-gray-700 mb-2">
              Paste text containing URLs to analyze:
            </label>
            <textarea
              id="url-input"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full h-40 p-4 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 resize-y shadow-sm transition duration-200 ease-in-out text-base placeholder-gray-400"
              placeholder="Paste any text here, and we'll find the URLs. For example: \nCheck out this article: https://example.com/news/article-one. It's great."
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 mt-2">
              Supports news articles, blog posts, and most public web content.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl shadow-sm">
              <p className="text-red-800 text-sm font-medium whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <button
            onClick={processUrls}
            disabled={isProcessing || !urls.trim()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isProcessing ? <Clock className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {isProcessing ? 'Processing...' : (results.length > 0 ? 'Analyze More URLs' : 'Analyze Sentiment')}
          </button>
        </header>

        {isReportUpdating && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="flex flex-col items-center text-white">
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h2 className="text-xl font-bold mt-4">UPDATING REPORT...</h2>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-8 sm:mb-10 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="w-6 h-6 text-blue-600 animate-pulse" />
              <h2 className="text-xl font-semibold text-gray-800">Analysis in Progress</h2>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>URL {currentProgress.current} of {currentProgress.total}</span>
              <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
            </div>
            <p className="text-sm text-gray-500 truncate">{currentProgress.status}</p>
          </div>
        )}

        {finalReport && (
          <div className="relative bg-white rounded-3xl shadow-xl p-6 sm:p-8 mb-8 sm:mb-10 border border-green-100">
            {isReportUpdating && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-3xl">
                <div className="flex flex-col items-center text-gray-700">
                  <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h2 className="text-xl font-bold mt-4">UPDATING REPORT...</h2>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-7 h-7 text-green-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{finalReport.headline || 'Sentiment Analysis Report'}</h2>
              </div>
              <button
                onClick={() => handleCopy(formatOverallReport(finalReport), 'Overall report copied!')}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-150 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-gray-800">Overall Sentiment</h3>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-medium border ${getSentimentColor(finalReport.overallSentiment)}`}>
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
                        <div className="flex items-center gap-2 w-2/3">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${sentiment === 'positive' ? 'bg-green-500' : sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'}`}
                              style={{ width: `${value * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-10 text-right">{Math.round(value * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Core Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {finalReport.coreThemes?.map((theme, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full shadow-sm">
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
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Wind Direction
                </h3>
                <p className="text-blue-700 text-sm leading-relaxed">{finalReport.windDirection}</p>
              </div>
              
              <div className="p-4 bg-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Executive Summary</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{finalReport.summary}</p>
              </div>
            </div>
          </div>
        )}

        {(results.length > 0 || isProcessing) && (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Individual URL Analysis</h2>
            <button
              onClick={() => handleCopy(formatAllIndividualResults(results), 'All individual reports copied!')}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-150 shadow-sm mb-6"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <div className="space-y-4">
              {isProcessing && results.length === 0 && Array.from({ length: extractUrls(urls).length }).map((_, i) => <ResultSkeleton key={i} />)}
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-xl transition-shadow hover:shadow-lg overflow-hidden">
                  <button onClick={() => toggleResult(index)} className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <h3 className="font-medium text-sm sm:text-base truncate">{result.articleTitle || 'No Title Available'}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{result.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className={`text-xs sm:text-sm ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {result.status === 'success' ? 'Analyzed' : `Failed: ${result.error}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {result.analysis && (
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getSentimentColor(result.analysis.sentiment)}`}>
                          {getSentimentIcon(result.analysis.sentiment)}
                          <span className="capitalize">{result.analysis.sentiment}</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent accordion from toggling
                          handleCopy(formatIndividualResult(result), 'Individual report copied!');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors duration-150 shadow-sm"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveResult(index);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200 transition-colors duration-150 shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                      {openResult === index ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </div>
                  </button>
                  
                  {openResult === index && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      {result.content && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm border border-gray-200">
                          <strong className="text-gray-700 block mb-1">Content Preview:</strong>
                          <p className="mt-1 text-gray-600 leading-relaxed text-xs sm:text-sm">{result.content}</p>
                        </div>
                      )}
                      
                      {result.analysis && (
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p><strong>Tone:</strong> <span className="capitalize">{result.analysis.tone}</span></p>
                            <p><strong>Confidence:</strong> {Math.round((result.analysis.confidence || 0) * 100)}%</p>
                            <p><strong>Intensity:</strong> <span className="capitalize">{result.analysis.emotionalIntensity}</span></p>
                            {result.analysis.themes && <p><strong>Themes:</strong> {result.analysis.themes.join(', ')}</p>}
                          </div>
                          <div>
                            {result.analysis.keyMessages && (
                              <>
                                <p className="font-medium mb-1">Key Messages:</p>
                                <ul className="space-y-1 list-disc list-inside">
                                  {result.analysis.keyMessages.map((message, msgIndex) => (
                                    <li key={msgIndex} className="text-xs text-gray-600 leading-snug">
                                      {message}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {result.analysis.reasoning && (
                              <div className="mt-3">
                                <p className="font-medium mb-1">Analysis Reasoning:</p>
                                <p className="text-xs text-gray-600 leading-snug">{result.analysis.reasoning}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {result.error && (
                        <div className="p-3 bg-red-100 border border-red-300 rounded-lg mt-4">
                          <p className="text-red-800 text-sm font-medium"><strong>Error:</strong> {result.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {copiedMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full shadow-lg text-sm z-50 animate-fade-in-out">
            {copiedMessage}
          </div>
        )}
      </main>

      <footer className="w-full text-center mt-12 py-4 text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Tushar Burman. All rights reserved.
      </footer>
    </div>
  )
}