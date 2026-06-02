'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordModal from './PasswordModal'

type SkipCounts = {
  duplicate?: number
  no_analysis?: number
  below_threshold?: number
  accident?: number
  insert_error?: number
  no_phone?: number
  not_profitable?: number
  weak_evidence?: number
}

type ScrapeResult = {
  saved?: number
  checked?: number
  candidates?: number
  error?: string
  skipCounts?: SkipCounts
  valuationConfidenceCounts?: {
    strong?: number
    moderate?: number
    weak?: number
  }
}

export default function ScrapeButton() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)

  async function handleConfirm(password: string) {
    setLoading(true)
    setPasswordError(null)
    try {
      const res = await fetch('/api/scrape/manual', {
        method: 'POST',
        headers: { 'x-scrape-password': password },
      })
      const text = await res.text()
      let data: ScrapeResult
      try { data = text ? JSON.parse(text) : {} }
      catch { data = { error: text || `Failed with status ${res.status}` } }

      if (res.status === 401 && data.error === 'Incorrect password') {
        setPasswordError('Incorrect password')
        setLoading(false)
        return
      }

      setShowModal(false)
      setResult(data)
      if (data.saved && data.saved > 0) router.refresh()
    } catch {
      setPasswordError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  const skipDetails = result?.skipCounts
    ? [
        result.skipCounts.below_threshold ? `${result.skipCounts.below_threshold} below threshold` : null,
        result.skipCounts.not_profitable ? `${result.skipCounts.not_profitable} not profitable` : null,
        result.skipCounts.weak_evidence ? `${result.skipCounts.weak_evidence} weak evidence` : null,
        result.skipCounts.no_phone ? `${result.skipCounts.no_phone} no phone` : null,
        result.skipCounts.duplicate ? `${result.skipCounts.duplicate} duplicates` : null,
        result.skipCounts.accident ? `${result.skipCounts.accident} accident` : null,
        result.skipCounts.no_analysis ? `${result.skipCounts.no_analysis} no analysis` : null,
        result.skipCounts.insert_error ? `${result.skipCounts.insert_error} insert errors` : null,
      ].filter(Boolean).join(', ')
    : ''

  const confidenceDetails = result?.valuationConfidenceCounts
    ? [
        result.valuationConfidenceCounts.strong ? `${result.valuationConfidenceCounts.strong} strong` : null,
        result.valuationConfidenceCounts.moderate ? `${result.valuationConfidenceCounts.moderate} moderate` : null,
        result.valuationConfidenceCounts.weak ? `${result.valuationConfidenceCounts.weak} weak` : null,
      ].filter(Boolean).join(', ')
    : ''

  return (
    <>
      {showModal && (
        <PasswordModal
          onConfirm={handleConfirm}
          onCancel={() => { setShowModal(false); setPasswordError(null) }}
          loading={loading}
          error={passwordError}
        />
      )}

      <div className="flex items-center gap-3">
        {result && !result.error && (
          <span className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            Saved {result.saved} of {result.candidates ?? result.checked} candidates
            {typeof result.checked === 'number' ? ` (${result.checked} checked)` : ''}
            {confidenceDetails ? `; confidence: ${confidenceDetails}` : ''}
            {skipDetails ? `; ${skipDetails}` : ''}
          </span>
        )}
        {result?.error && (
          <span className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {result.error}
          </span>
        )}
        <button
          onClick={() => { setResult(null); setPasswordError(null); setShowModal(true) }}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Run Scrape Now
        </button>
      </div>
    </>
  )
}
