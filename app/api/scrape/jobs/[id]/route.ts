import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScrapeJob, userCanAccessScrapeJob } from '@/lib/scraper/jobs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await userCanAccessScrapeJob(id, user.id))) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const job = await getScrapeJob(id)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ job })
}
