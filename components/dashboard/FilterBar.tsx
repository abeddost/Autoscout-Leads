'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'

const BRANDS = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche',
  'Lexus', 'Jaguar', 'Volvo', 'Volkswagen', 'CUPRA',
  'Maserati', 'MINI', 'SEAT', 'Skoda', 'Toyota', 'Kia', 'Ford', 'Opel',
]
const STATUSES = ['new', 'reviewed', 'contacted', 'closed']

export default function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else params.delete(k)
      })
      params.delete('page')
      return params.toString()
    },
    [searchParams]
  )

  const update = useCallback(
    (key: string, value: string) => {
      router.push(`${pathname}?${buildParams({ [key]: value })}`)
    },
    [router, pathname, buildParams]
  )

  const brand = searchParams.get('brand') || ''
  const status = searchParams.get('status') || ''
  const minScore = searchParams.get('minScore') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const modelSearch = searchParams.get('modelSearch') || ''

  // Local state for debounced text/number inputs
  const [minPriceLocal, setMinPriceLocal] = useState(minPrice)
  const [maxPriceLocal, setMaxPriceLocal] = useState(maxPrice)
  const [modelLocal, setModelLocal] = useState(modelSearch)

  // Sync local state when URL changes externally (e.g. clear)
  useEffect(() => { setMinPriceLocal(minPrice) }, [minPrice])
  useEffect(() => { setMaxPriceLocal(maxPrice) }, [maxPrice])
  useEffect(() => { setModelLocal(modelSearch) }, [modelSearch])

  // Apply price/model on blur or Enter
  function applyTextFilters() {
    router.push(`${pathname}?${buildParams({
      minPrice: minPriceLocal,
      maxPrice: maxPriceLocal,
      modelSearch: modelLocal,
    })}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') applyTextFilters()
  }

  const hasFilters = brand || status || minScore || minPrice || maxPrice || modelSearch

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Model search */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Model</label>
        <input
          type="text"
          value={modelLocal}
          onChange={(e) => setModelLocal(e.target.value)}
          onBlur={applyTextFilters}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 320d, A4…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
        />
      </div>

      {/* Brand filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Brand</label>
        <select
          value={brand}
          onChange={(e) => update('brand', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Brands</option>
          {BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Min Price (€)</label>
        <input
          type="number"
          value={minPriceLocal}
          onChange={(e) => setMinPriceLocal(e.target.value)}
          onBlur={applyTextFilters}
          onKeyDown={handleKeyDown}
          placeholder="20000"
          min={0}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Max Price (€)</label>
        <input
          type="number"
          value={maxPriceLocal}
          onChange={(e) => setMaxPriceLocal(e.target.value)}
          onBlur={applyTextFilters}
          onKeyDown={handleKeyDown}
          placeholder="70000"
          min={0}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
        />
      </div>

      {/* Min deal score */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Deal Score</label>
        <select
          value={minScore}
          onChange={(e) => update('minScore', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Scores</option>
          <option value="90">≥ 90</option>
          <option value="85">≥ 85</option>
          <option value="80">≥ 80</option>
        </select>
      </div>

      {/* Status filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Status</label>
        <select
          value={status}
          onChange={(e) => update('status', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors pb-2"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
