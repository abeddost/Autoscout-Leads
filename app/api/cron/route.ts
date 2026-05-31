import { NextResponse } from 'next/server'
import { createScrapeJob, findRunnableScrapeJob, runScrapeJobStep } from '@/lib/scraper/jobs'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const existingJobId = await findRunnableScrapeJob()
    const job = existingJobId
      ? await runScrapeJobStep(existingJobId)
      : await runScrapeJobStep((await createScrapeJob(null)).id)

    return NextResponse.json({ cron: 'complete', job })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
