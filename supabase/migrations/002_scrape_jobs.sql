-- Background scrape jobs and chunked Gemini analysis

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_by        UUID,
  source_website    TEXT DEFAULT 'autoscout24',
  status            TEXT DEFAULT 'queued' CHECK (status IN ('queued','scraping','analyzing','completed','failed')),
  checked_count     INTEGER DEFAULT 0,
  candidate_count   INTEGER DEFAULT 0,
  processed_count   INTEGER DEFAULT 0,
  saved_count       INTEGER DEFAULT 0,
  failed_count      INTEGER DEFAULT 0,
  latest_error      TEXT,
  errors            JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS scrape_job_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  job_id          UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  listing_url     TEXT NOT NULL,
  raw_listing     JSONB NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','skipped','saved','failed')),
  saved_lead_id   UUID REFERENCES car_leads(id) ON DELETE SET NULL,
  error           TEXT,
  analyzed_at     TIMESTAMPTZ,
  UNIQUE (job_id, listing_url)
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_created_at ON scrape_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_by_created_at ON scrape_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_job_items_job_status ON scrape_job_items(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_job_items_listing_url ON scrape_job_items(listing_url);

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_job_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_users_own_scrape_jobs" ON scrape_jobs
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "auth_users_own_scrape_job_items" ON scrape_job_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scrape_jobs
      WHERE scrape_jobs.id = scrape_job_items.job_id
        AND (scrape_jobs.created_by = auth.uid() OR scrape_jobs.created_by IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scrape_jobs
      WHERE scrape_jobs.id = scrape_job_items.job_id
        AND (scrape_jobs.created_by = auth.uid() OR scrape_jobs.created_by IS NULL)
    )
  );
