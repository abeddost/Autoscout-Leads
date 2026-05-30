'use client'

import { useState } from 'react'

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ saved?: number; checked?: number; error?: string } | null>(null)

  async function handleScrape() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/scrape/manual', {
        method: 'POST',
      })
      const text = await res.text()
      let data: { saved?: number; checked?: number; error?: string }
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { error: text || `Request failed with status ${res.status}` }
      }

      if (!res.ok) {
        setResult({ error: data.error || `Request failed with status ${res.status}` })
        return
      }

      setResult(data)
    } catch {
      setResult({ error: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && !result.error && (
        <span className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
          Saved {result.saved} of {result.checked} leads
        </span>
      )}
      {result?.error && (
        <span className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          {result.error}
        </span>
      )}
      <button
        onClick={handleScrape}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Scraping…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Run Scrape Now
          </>
        )}
      </button>
    </div>
  )
}
