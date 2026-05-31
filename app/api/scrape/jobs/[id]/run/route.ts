import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runScrapeJobStep, userCanAccessScrapeJob } from '@/lib/scraper/jobs'

function verifySecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  return Boolean(process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const isCron = verifySecret(request)

  if (!isCron) {
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await userCanAccessScrapeJob(id, user.id))) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
  }

  try {
    const job = await runScrapeJobStep(id)
    return NextResponse.json({ job })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
