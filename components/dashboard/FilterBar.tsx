'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const BRANDS = ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Jaguar', 'Volvo', 'Volkswagen', 'CUPRA']
const STATUSES = ['new', 'reviewed', 'contacted', 'closed']

export default function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete('page') // reset to page 1 on filter change
      return params.toString()
    },
    [searchParams]
  )

  function update(key: string, value: string) {
    router.push(`${pathname}?${createQueryString(key, value)}`)
  }

  const brand = searchParams.get('brand') || ''
  const status = searchParams.get('status') || ''
  const minScore = searchParams.get('minScore') || ''

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Brand filter */}
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

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => update('status', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>

      {/* Min deal score */}
      <select
        value={minScore}
        onChange={(e) => update('minScore', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Scores</option>
        <option value="90">Score ≥ 90</option>
        <option value="85">Score ≥ 85</option>
        <option value="80">Score ≥ 80</option>
      </select>

      {/* Clear filters */}
      {(brand || status || minScore) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
