'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CarLeadStatus } from '@/lib/supabase/types'

const STATUSES: CarLeadStatus[] = ['new', 'reviewed', 'contacted', 'closed']

const STATUS_STYLES: Record<CarLeadStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewed: 'bg-violet-50 text-violet-700 border-violet-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function StatusDropdown({
  id,
  current,
}: {
  id: string
  current: CarLeadStatus
}) {
  const [status, setStatus] = useState<CarLeadStatus>(current)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleChange(next: CarLeadStatus) {
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('car_leads').update({ status: next } as any).eq('id', id)
    setStatus(next)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as CarLeadStatus)}
        disabled={saving}
        className={`border rounded-lg text-sm font-medium px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize transition ${STATUS_STYLES[status]}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900">
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}
