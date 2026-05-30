import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { CarLead } from '@/lib/supabase/types'
import ImageGallery from '@/components/leads/ImageGallery'
import AIAnalysisPanel from '@/components/leads/AIAnalysisPanel'
import StatusDropdown from '@/components/leads/StatusDropdown'
import PDFButton from '@/components/leads/PDFButton'
import { formatCurrency, formatMileage, formatDate, getDealScoreBg } from '@/lib/utils'
import type { CarLeadStatus } from '@/lib/supabase/types'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: carRow } = await supabase
    .from('car_leads')
    .select('*')
    .eq('id', id)
    .single()

  const car = carRow as CarLead | null
  if (!car) notFound()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{car.vehicle_title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {[car.year, car.fuel_type, car.transmission, car.horsepower ? car.horsepower + ' PS' : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusDropdown id={car.id} current={car.status as CarLeadStatus} />
          <PDFButton id={car.id} />
          {car.listing_url && (
            <a
              href={car.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 hover:border-gray-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on AutoScout24
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ImageGallery images={car.image_urls as string[]} />
          </div>

          {/* Price overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Pricing</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Listed Price</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(car.price)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Market Value</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(car.estimated_market_value)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Potential Profit</p>
                <p className="text-lg font-bold text-emerald-700">
                  {car.potential_profit && car.potential_profit > 0 ? '+' : ''}{formatCurrency(car.potential_profit)}
                </p>
              </div>
              <div className={`rounded-lg p-3 text-center ${getDealScoreBg(car.deal_score)}`}>
                <p className="text-xs mb-1 opacity-70">Deal Score</p>
                <p className="text-2xl font-bold">{car.deal_score ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Vehicle Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Field label="Brand" value={car.brand} />
              <Field label="Model" value={car.model} />
              <Field label="Year" value={car.year} />
              <Field label="Mileage" value={formatMileage(car.mileage)} />
              <Field label="Fuel Type" value={car.fuel_type} />
              <Field label="Transmission" value={car.transmission} />
              <Field label="Horsepower" value={car.horsepower ? car.horsepower + ' PS' : null} />
              <Field label="Risk Score" value={car.risk_score != null ? car.risk_score + '/100' : null} />
              <Field label="Accident Info" value={car.accident_info} />
              <Field label="Previous Owners" value={car.number_of_owners} />
            </dl>
          </div>

          {/* Seller & Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Seller & Location</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Field label="Seller Name" value={car.seller_name} />
              <Field
                label="Mobile"
                value={
                  car.seller_mobile ? (
                    <a href={`tel:${car.seller_mobile}`} className="text-blue-600 hover:underline">
                      {car.seller_mobile}
                    </a>
                  ) : null
                }
              />
              <Field
                label="Email"
                value={
                  car.seller_email ? (
                    <a href={`mailto:${car.seller_email}`} className="text-blue-600 hover:underline">
                      {car.seller_email}
                    </a>
                  ) : null
                }
              />
              <Field label="Seller Type" value={car.seller_type || 'Private'} />
              <Field label="PLZ" value={car.plz} />
              <Field label="City" value={car.city} />
              <Field label="Date Found" value={formatDate(car.date_found)} />
              <Field label="Source" value={car.source_website} />
            </dl>
          </div>

          {/* Equipment */}
          {Array.isArray(car.equipment) && car.equipment.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Equipment & Options</h2>
              <div className="flex flex-wrap gap-2">
                {(car.equipment as string[]).map((item, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full border border-gray-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AIAnalysisPanel car={car} />

          {/* Listing URL card */}
          {car.listing_url && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Listing URL
              </p>
              <a
                href={car.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all"
              >
                {car.listing_url}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
