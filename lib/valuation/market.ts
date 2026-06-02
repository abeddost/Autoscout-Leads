import type { GeminiAnalysis } from '@/lib/gemini/analyze'
import type { RawListing } from '@/lib/scraper/types'
import type { ValuationConfidence } from '@/lib/valuation/confidence'

export type EvidenceStrength = Exclude<ValuationConfidence, 'legacy'>

interface ComparableEntry {
  listing: RawListing
  price: number
  weight: number
}

export interface MarketValuation extends GeminiAnalysis {
  valuation_confidence: ValuationConfidence
  comparable_count: number
  comparable_median_price: number | null
  comparable_price_min: number | null
  comparable_price_max: number | null
  discount_percentage: number
  valuation_method: string
}

function normalizeText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeTransmission(value: string | null | undefined): string {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  if (normalized.includes('autom') || normalized.includes('dsg') || normalized.includes('s tronic')) {
    return 'automatic'
  }
  if (normalized.includes('schalt') || normalized.includes('manual')) return 'manual'
  return normalized
}

function roundToHundreds(value: number): number {
  return Math.max(0, Math.round(value / 100) * 100)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function quantile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]

  const index = (sorted.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function weightedMedian(entries: ComparableEntry[]): number {
  const sorted = [...entries].sort((a, b) => a.price - b.price)
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0)
  const midpoint = totalWeight / 2
  let running = 0

  for (const entry of sorted) {
    running += entry.weight
    if (running >= midpoint) return entry.price
  }

  return sorted[sorted.length - 1]?.price ?? 0
}

function trimOutliers(entries: ComparableEntry[]): ComparableEntry[] {
  if (entries.length < 5) return entries

  const prices = entries.map((entry) => entry.price)
  const q1 = quantile(prices, 0.25)
  const q3 = quantile(prices, 0.75)
  const iqr = q3 - q1

  if (iqr <= 0) return entries

  const lower = q1 - iqr * 1.5
  const upper = q3 + iqr * 1.5
  const trimmed = entries.filter((entry) => entry.price >= lower && entry.price <= upper)

  return trimmed.length >= 3 ? trimmed : entries
}

function modelFamily(value: string | null | undefined): string {
  const normalized = normalizeText(value)
  if (!normalized) return ''

  const tokens = normalized
    .split(' ')
    .filter((token) => token && !['klasse', 'class', 'series', 'serie', 'avant', 'touring', 'sportback'].includes(token))

  return tokens[0] || normalized
}

function sameComparableModel(target: RawListing, candidate: RawListing): boolean {
  const targetBrand = normalizeText(target.brand)
  const candidateBrand = normalizeText(candidate.brand)
  if (!targetBrand || targetBrand !== candidateBrand) return false

  const targetModel = normalizeText(target.model) || normalizeText(target.vehicle_title)
  const candidateModel = normalizeText(candidate.model) || normalizeText(candidate.vehicle_title)
  if (!targetModel || !candidateModel) return false

  const targetFamily = modelFamily(target.model || target.vehicle_title)
  const candidateFamily = modelFamily(candidate.model || candidate.vehicle_title)

  return targetModel === candidateModel ||
    targetModel.includes(candidateModel) ||
    candidateModel.includes(targetModel) ||
    (!!targetFamily && targetFamily === candidateFamily)
}

function getComparableEntry(target: RawListing, candidate: RawListing): ComparableEntry | null {
  if (candidate.listing_url === target.listing_url) return null
  if (!candidate.price || candidate.price < 5000) return null
  if (!sameComparableModel(target, candidate)) return null

  let weight = 1

  if (target.year && candidate.year) {
    const delta = Math.abs(candidate.year - target.year)
    if (delta > 4) return null
    weight += delta <= 1 ? 1.2 : delta <= 2 ? 0.9 : 0.45
  } else {
    weight += 0.15
  }

  if (target.mileage && candidate.mileage) {
    const delta = Math.abs(candidate.mileage - target.mileage)
    const allowedMileageDelta = Math.max(45000, target.mileage * 0.55)
    if (delta > allowedMileageDelta) return null

    const tightMileageDelta = Math.max(20000, target.mileage * 0.25)
    weight += delta <= tightMileageDelta ? 1.2 : 0.55
  } else {
    weight += 0.15
  }

  if (target.fuel_type && candidate.fuel_type) {
    if (normalizeText(target.fuel_type) !== normalizeText(candidate.fuel_type)) return null
    weight += 0.8
  } else {
    weight += 0.15
  }

  if (target.transmission && candidate.transmission) {
    if (normalizeTransmission(target.transmission) !== normalizeTransmission(candidate.transmission)) return null
    weight += 0.55
  } else {
    weight += 0.1
  }

  if (target.horsepower && candidate.horsepower) {
    const delta = Math.abs(candidate.horsepower - target.horsepower)
    const allowedPowerDelta = Math.max(45, target.horsepower * 0.25)
    if (delta > allowedPowerDelta) return null

    const tightPowerDelta = Math.max(25, target.horsepower * 0.15)
    weight += delta <= tightPowerDelta ? 0.65 : 0.3
  } else {
    weight += 0.1
  }

  return {
    listing: candidate,
    price: candidate.price,
    weight,
  }
}

function getComparableEntries(target: RawListing, listings: RawListing[]): ComparableEntry[] {
  return listings
    .map((candidate) => getComparableEntry(target, candidate))
    .filter((entry): entry is ComparableEntry => Boolean(entry))
}

function getFallbackMarketValue(listing: RawListing): number {
  const rating = listing.market_price_rating
  const multiplier = rating === 1 ? 1.1 : rating === 2 ? 1.05 : 1.02
  return roundToHundreds(listing.price * multiplier)
}

function getValuationConfidence(entries: ComparableEntry[]): EvidenceStrength {
  const highQualityCount = entries.filter((entry) => entry.weight >= 4).length

  if (entries.length >= 6 && highQualityCount >= 4) return 'strong'
  if (entries.length >= 3) return 'moderate'
  return 'weak'
}

function scoreDeal(listing: RawListing, estimatedMarketValue: number, confidence: EvidenceStrength): number {
  const profit = estimatedMarketValue - listing.price
  const discount = estimatedMarketValue > 0 ? profit / estimatedMarketValue : 0

  let score =
    discount >= 0.3 ? 96 :
    discount >= 0.2 ? 90 :
    discount >= 0.15 ? 86 :
    discount >= 0.1 ? 80 :
    discount >= 0.08 ? 76 :
    discount >= 0 ? 66 :
    discount >= -0.08 ? 50 :
    35

  if (profit >= 8000) score += 3
  else if (profit >= 5000) score += 2
  else if (profit >= 3000) score += 1

  if (listing.market_price_rating === 1) score += 2
  if (listing.market_price_rating && listing.market_price_rating > 2) score -= 8

  if (listing.mileage && listing.mileage > 120000) score -= 8
  else if (listing.mileage && listing.mileage > 90000) score -= 4

  if (listing.year && listing.year < 2017) score -= 6
  else if (listing.year && listing.year < 2019) score -= 3

  if (listing.number_of_owners && listing.number_of_owners > 2) score -= 4

  const accidentLower = (listing.accident_info || '').toLowerCase()
  if (
    accidentLower.includes('unfallschaden') ||
    accidentLower.includes('accident reported') ||
    accidentLower.includes('damaged')
  ) {
    score -= 20
  }

  const confidenceCap = confidence === 'strong' ? 94 : confidence === 'moderate' ? 88 : 74
  const ratingCap = listing.market_price_rating === 2 ? 86 : 100
  return Math.min(100, Math.max(0, Math.round(Math.min(score, confidenceCap, ratingCap))))
}

function scoreRisk(listing: RawListing, confidence: EvidenceStrength): number {
  let risk = confidence === 'weak' ? 48 : confidence === 'moderate' ? 32 : 24

  if (listing.mileage && listing.mileage > 120000) risk += 18
  else if (listing.mileage && listing.mileage > 90000) risk += 10
  else if (listing.mileage && listing.mileage < 40000) risk -= 4

  if (listing.year && listing.year < 2017) risk += 14
  else if (listing.year && listing.year < 2019) risk += 8
  else if (listing.year && listing.year >= 2022) risk -= 4

  if (listing.number_of_owners && listing.number_of_owners > 2) risk += 8

  const accidentLower = (listing.accident_info || '').toLowerCase()
  if (
    accidentLower.includes('unfallschaden') ||
    accidentLower.includes('accident reported') ||
    accidentLower.includes('damaged')
  ) {
    risk += 30
  }

  return Math.min(100, Math.max(0, Math.round(risk)))
}

export function estimateMarketValuation(listing: RawListing, allListings: RawListing[]): MarketValuation {
  const matchedComparables = getComparableEntries(listing, allListings)
  const comparables = trimOutliers(matchedComparables)
  const comparablePrices = comparables.map((candidate) => candidate.price).sort((a, b) => a - b)
  const comparableMedian = comparablePrices.length > 0
    ? roundToHundreds(weightedMedian(comparables))
    : null
  const valuationConfidence = getValuationConfidence(comparables)
  const estimatedMarketValue = comparableMedian ?? getFallbackMarketValue(listing)
  const potentialProfit = estimatedMarketValue - listing.price
  const discountPercentage = estimatedMarketValue > 0
    ? Math.round((potentialProfit / estimatedMarketValue) * 1000) / 10
    : 0
  const dealScore = scoreDeal(listing, estimatedMarketValue, valuationConfidence)
  const riskScore = scoreRisk(listing, valuationConfidence)
  const method = comparableMedian
    ? `${valuationConfidence} weighted comparable median from ${comparablePrices.length} scraped AutoScout listings`
    : `weak fallback from AutoScout price rating ${listing.market_price_rating ?? 'unknown'}`

  return {
    estimated_market_value: estimatedMarketValue,
    potential_profit: Math.round(potentialProfit),
    deal_score: dealScore,
    risk_score: riskScore,
    ai_summary: '',
    ai_recommendation: '',
    valuation_confidence: valuationConfidence,
    comparable_count: comparablePrices.length,
    comparable_median_price: comparableMedian,
    comparable_price_min: comparablePrices[0] ?? null,
    comparable_price_max: comparablePrices[comparablePrices.length - 1] ?? null,
    discount_percentage: discountPercentage,
    valuation_method: method,
  }
}

export function meetsValuationThreshold(valuation: MarketValuation, price: number): boolean {
  if (price < 10000 || price > 70000) return false
  if (valuation.potential_profit < 2000) return false

  if (valuation.valuation_confidence === 'weak') {
    return true
  }

  return valuation.deal_score >= 80
}
