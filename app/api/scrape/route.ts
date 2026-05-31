import { NextResponse } from 'next/server'
import { createScrapeJob, runScrapeJobStep } from '@/lib/scraper/jobs'

function verifySecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const created = await createScrapeJob(null)
    const job = await runScrapeJobStep(created.id)
    return NextResponse.json({ jobId: job.id, job })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
