import Link from 'next/link'
import type { CarLead } from '@/lib/supabase/types'
import { formatCurrency, formatMileage, formatDate, getDealScoreBg } from '@/lib/utils'
import {
  getValuationConfidenceBadgeClass,
  getValuationConfidenceDescription,
} from '@/lib/valuation/confidence'

interface Props {
  leads: CarLead[]
  page: number
  totalCount: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  currentParams: string
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 text-gray-300 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return dir === 'asc' ? (
    <svg className="w-3 h-3 text-blue-600 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-blue-600 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SortableHeader({
  col,
  label,
  sortBy,
  sortDir,
  searchParams,
}: {
  col: string
  label: string
  sortBy: string
  sortDir: 'asc' | 'desc'
  searchParams: string
}) {
  const active = sortBy === col
  const nextDir = active && sortDir === 'desc' ? 'asc' : 'desc'
  const params = new URLSearchParams(searchParams)
  params.set('sortBy', col)
  params.set('sortDir', nextDir)
  params.delete('page')

  return (
    <Link
      href={`?${params.toString()}`}
      className={`flex items-center gap-0.5 whitespace-nowrap hover:text-blue-700 transition-colors ${active ? 'text-blue-600' : 'text-gray-500'}`}
    >
      {label}
      <SortIcon active={active} dir={sortDir} />
    </Link>
  )
}

export default function LeadsTable({ leads, page, totalCount, pageSize, sortBy, sortDir, currentParams }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="created_at" label="Date Found" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="listing_date" label="Date Listed" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Mobile</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">PLZ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="model" label="Vehicle" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="price" label="Price" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Est. Market Value</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="mileage" label="Mileage" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">
                  <SortableHeader col="deal_score" label="Deal Score" sortBy={sortBy} sortDir={sortDir} searchParams={currentParams} />
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm">No leads found</span>
                    </div>
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                    {formatDate(lead.date_found)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {lead.listing_date
                      ? <span className="text-gray-700">{formatDate(lead.listing_date)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                    {lead.seller_name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {lead.seller_mobile ? (
                      <a href={`tel:${lead.seller_mobile}`} className="text-blue-600 hover:underline">
                        {lead.seller_mobile}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {lead.plz || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 min-w-[180px]">
                    <div className="font-medium text-gray-900 leading-tight text-sm">
                      {lead.vehicle_title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {[lead.year, lead.fuel_type].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(lead.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    <div className="font-medium">{formatCurrency(lead.estimated_market_value)}</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getValuationConfidenceBadgeClass(lead.valuation_confidence)}`}>
                        {getValuationConfidenceDescription(lead.valuation_confidence, lead.comparable_count)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {formatMileage(lead.mileage)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.deal_score != null ? (
                      <span className={`inline-flex items-center justify-center w-10 h-7 rounded-full text-xs font-bold ${getDealScoreBg(lead.deal_score)}`}>
                        {lead.deal_score}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Details
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} leads
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                    p === page
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
