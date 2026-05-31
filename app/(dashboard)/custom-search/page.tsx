'use client'

import { useState } from 'react'
import Link from 'next/link'

const KNOWN_BRANDS = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche',
  'Lexus', 'Jaguar', 'Volvo', 'Volkswagen', 'CUPRA',
  'Maserati', 'MINI', 'SEAT', 'Skoda', 'Toyota', 'Kia', 'Ford', 'Opel',
]

interface ScrapeResult {
  success?: boolean
  error?: string
  checked: number
  candidates: number
  saved: number
  skipCounts: Record<string, number>
  errors?: string[]
}

export default function CustomSearchPage() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!brand.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/scrape/custom', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brand: brand.trim(), model: model.trim() || undefined }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Request failed', checked: 0, candidates: 0, saved: 0, skipCounts: {} })
    } finally {
      setLoading(false)
    }
  }

  const brandSlug = brand.trim().toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Custom Search</h1>
        <p className="text-sm text-gray-500 mt-1">
          Search AutoScout24 for a specific brand or exact model. Results are scored with Gemini AI and saved to your leads.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1.5">
            Brand <span className="text-red-500">*</span>
          </label>
          <input
            id="brand"
            type="text"
            list="brand-list"
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. BMW, Audi, Skoda…"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <datalist id="brand-list">
            {KNOWN_BRANDS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <p className="text-xs text-gray-400 mt-1">Start typing to see suggestions, or enter any brand.</p>
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1.5">
            Model <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. 320d, C-Class, Golf GTI, A4…"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank to search all models for the brand.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !brand.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching AutoScout24… (this may take 1–2 minutes)
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              Search & Scrape
            </>
          )}
        </button>

        {loading && (
          <p className="text-xs text-center text-gray-400 -mt-2">
            AutoScout24 is being scraped and listings are being analysed with Gemini AI. Please wait…
          </p>
        )}
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6">
          {result.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Scrape failed
              </div>
              <p className="text-sm text-red-600">{result.error}</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-semibold text-gray-900">Search complete</h2>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.checked}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Listings checked</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.candidates}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Analysed</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${result.saved > 0 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${result.saved > 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {result.saved}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Leads saved</p>
                </div>
              </div>

              {/* Skip breakdown */}
              {result.skipCounts && Object.values(result.skipCounts).some((v) => v > 0) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skip breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.skipCounts)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => (
                        <span key={key} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full border border-gray-200">
                          {key.replace(/_/g, ' ')}: {val}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {result.saved > 0 && (
                <Link
                  href={`/?brand=${encodeURIComponent(brand)}`}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
                >
                  View {result.saved} new lead{result.saved !== 1 ? 's' : ''} in dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              {result.saved === 0 && (
                <p className="text-sm text-center text-gray-400">
                  No qualifying leads found for <strong>{brand}{model ? ` ${model}` : ''}</strong> at this time.
                  {brandSlug && (
                    <> Try <Link href={`/?brand=${encodeURIComponent(brand)}`} className="text-blue-600 hover:underline">viewing existing leads</Link> for this brand.</>
                  )}
                </p>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">
                    {result.errors.length} scraper warning{result.errors.length !== 1 ? 's' : ''}
                  </summary>
                  <ul className="mt-2 space-y-1 pl-3">
                    {result.errors.map((e, i) => <li key={i} className="truncate">{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
