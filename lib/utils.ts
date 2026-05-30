import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatMileage(km: number | null | undefined): string {
  if (km == null) return '—'
  return new Intl.NumberFormat('de-DE').format(km) + ' km'
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function getDealScoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400'
  if (score >= 85) return 'text-emerald-600'
  if (score >= 70) return 'text-amber-500'
  return 'text-red-500'
}

export function getDealScoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-100 text-gray-500'
  if (score >= 85) return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (score >= 70) return 'bg-amber-50 text-amber-700 border border-amber-200'
  return 'bg-red-50 text-red-700 border border-red-200'
}
