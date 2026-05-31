'use client'

import { useEffect, useRef, useState } from 'react'

type JobStatus = 'queued' | 'scraping' | 'analyzing' | 'completed' | 'failed'

interface ScrapeJob {
  id: string
  status: JobStatus
  checked: number
  candidates: number
  processed: number
  saved: number
  failed: number
  latestError: string | null
}

const ACTIVE_JOB_KEY = 'autolead-active-scrape-job'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return (text ? JSON.parse(text) : {}) as T
  } catch {
    return { error: text || `Request failed with status ${response.status}` } as T
  }
}

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState<ScrapeJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const runnerActive = useRef(false)

  async function fetchJob(jobId: string) {
    const res = await fetch(`/api/scrape/jobs/${jobId}`)
    const data = await readJson<{ job?: ScrapeJob; error?: string }>(res)
    if (!res.ok || !data.job) throw new Error(data.error || `Request failed with status ${res.status}`)
    setJob(data.job)
    return data.job
  }

  async function runJob(jobId: string) {
    const res = await fetch(`/api/scrape/jobs/${jobId}/run`, { method: 'POST' })
    const data = await readJson<{ job?: ScrapeJob; error?: string }>(res)
    if (!res.ok || !data.job) throw new Error(data.error || `Request failed with status ${res.status}`)
    setJob(data.job)
    return data.job
  }

  async function driveJob(jobId: string) {
    if (runnerActive.current) return
    runnerActive.current = true
    setLoading(true)
    setError(null)

    try {
      let current = await fetchJob(jobId)

      while (current.status !== 'completed' && current.status !== 'failed') {
        current = await runJob(jobId)
        if (current.status === 'completed' || current.status === 'failed') break
        await sleep(1500)
      }

      if (current.status === 'completed' || current.status === 'failed') {
        localStorage.removeItem(ACTIVE_JOB_KEY)
      }
    } catch (err) {
      localStorage.removeItem(ACTIVE_JOB_KEY)
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      runnerActive.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    const jobId = localStorage.getItem(ACTIVE_JOB_KEY)
    if (jobId) void driveJob(jobId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScrape() {
    setLoading(true)
    setJob(null)
    setError(null)
    try {
      const res = await fetch('/api/scrape/jobs', {
        method: 'POST',
      })
      const data = await readJson<{ jobId?: string; job?: ScrapeJob; error?: string }>(res)

      if (!res.ok || !data.jobId) {
        setError(data.error || `Request failed with status ${res.status}`)
        return
      }

      if (data.job) setJob(data.job)
      localStorage.setItem(ACTIVE_JOB_KEY, data.jobId)
      await driveJob(data.jobId)
    } catch {
      setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = job
    ? job.status === 'queued'
      ? 'Queued'
      : job.status === 'scraping'
      ? `Scraping AutoScout (${job.checked} checked)`
      : job.status === 'analyzing'
      ? `Analyzing ${job.processed} of ${job.candidates} candidates`
      : job.status === 'completed'
      ? `Completed: saved ${job.saved} of ${job.candidates} candidates (${job.checked} checked)`
      : `Failed: ${job.latestError || 'Scrape job failed'}`
    : null

  return (
    <div className="flex items-center gap-3">
      {statusLabel && job?.status !== 'failed' && (
        <span className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
          {statusLabel}
        </span>
      )}
      {(error || job?.status === 'failed') && (
        <span className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          {error || statusLabel}
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
