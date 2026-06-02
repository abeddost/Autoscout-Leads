export const VALUATION_CONFIDENCES = ['strong', 'moderate', 'weak', 'legacy'] as const

export type ValuationConfidence = (typeof VALUATION_CONFIDENCES)[number]

export function getValuationConfidenceLabel(confidence: ValuationConfidence | null | undefined): string {
  switch (confidence) {
    case 'strong':
      return 'Strong'
    case 'moderate':
      return 'Moderate'
    case 'weak':
      return 'Weak'
    case 'legacy':
      return 'Legacy valuation'
    default:
      return 'Legacy valuation'
  }
}

export function getValuationConfidenceBadgeClass(confidence: ValuationConfidence | null | undefined): string {
  switch (confidence) {
    case 'strong':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'moderate':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'weak':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'legacy':
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

export function getValuationConfidenceDescription(
  confidence: ValuationConfidence | null | undefined,
  comparableCount: number | null | undefined
): string {
  if (confidence === 'legacy' || !confidence) return 'Legacy valuation'
  const count = comparableCount ?? 0
  return `${getValuationConfidenceLabel(confidence)} · ${count} comp${count === 1 ? '' : 's'}`
}
