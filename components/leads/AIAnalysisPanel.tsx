import type { CarLead } from '@/lib/supabase/types'
import { formatCurrency, getDealScoreBg } from '@/lib/utils'
import { cn } from '@/lib/utils'

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.round((score / 100) * 100)
  const color =
    score >= 85 ? '#059669' : score >= 70 ? '#d97706' : '#dc2626'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct * 0.942} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
          <span className="text-xl font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
  )
}

export default function AIAnalysisPanel({ car }: { car: CarLead }) {
  const recColor =
    car.ai_recommendation?.startsWith('Strong Buy') ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
    : car.ai_recommendation?.startsWith('Buy') ? 'bg-blue-50 border-blue-300 text-blue-800'
    : car.ai_recommendation?.startsWith('Consider') ? 'bg-amber-50 border-amber-300 text-amber-800'
    : 'bg-gray-50 border-gray-300 text-gray-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <h2 className="font-semibold text-gray-900 text-sm">AI Market Analysis</h2>

      {/* Score gauges */}
      <div className="flex items-center justify-around py-2 bg-gray-50 rounded-lg">
        {car.deal_score != null && <ScoreGauge score={car.deal_score} label="Deal Score" />}
        {car.risk_score != null && <ScoreGauge score={car.risk_score} label="Risk Score" />}
        {car.deal_score == null && car.risk_score == null && (
          <p className="text-sm text-gray-400 py-4">No analysis yet</p>
        )}
      </div>

      {/* Market value breakdown */}
      {(car.price || car.estimated_market_value) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Market Comparison</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Listed price</span>
              <span className="font-medium text-gray-900">{formatCurrency(car.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Est. market value</span>
              <span className="font-medium text-gray-900">{formatCurrency(car.estimated_market_value)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-1" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Potential profit</span>
              <span className={cn(
                'font-bold',
                (car.potential_profit || 0) >= 2000 ? 'text-emerald-600' : 'text-gray-700'
              )}>
                {car.potential_profit && car.potential_profit > 0
                  ? '+' + formatCurrency(car.potential_profit)
                  : formatCurrency(car.potential_profit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {car.ai_summary && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Analysis</p>
          <p className="text-sm text-gray-700 leading-relaxed">{car.ai_summary}</p>
        </div>
      )}

      {/* Recommendation */}
      {car.ai_recommendation && (
        <div className={cn('border rounded-lg p-3 text-sm font-medium', recColor)}>
          <span className="text-xs uppercase tracking-wider block mb-0.5 opacity-70">Recommendation</span>
          {car.ai_recommendation}
        </div>
      )}
    </div>
  )
}
