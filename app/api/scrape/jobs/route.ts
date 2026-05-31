import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createScrapeJob } from '@/lib/scraper/jobs'

export async function POST() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const job = await createScrapeJob(user.id)
    return NextResponse.json({ jobId: job.id, job })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
