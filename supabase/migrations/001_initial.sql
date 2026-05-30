-- AutoLead AI — Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Table: car_leads
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS car_leads (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  date_found              DATE DEFAULT CURRENT_DATE,
  seller_name             TEXT,
  seller_mobile           TEXT,
  seller_email            TEXT,
  plz                     TEXT,
  city                    TEXT,
  vehicle_title           TEXT NOT NULL,
  brand                   TEXT NOT NULL,
  model                   TEXT NOT NULL,
  year                    INTEGER,
  mileage                 INTEGER,
  fuel_type               TEXT,
  transmission            TEXT,
  horsepower              INTEGER,
  price                   NUMERIC(10,2) NOT NULL,
  estimated_market_value  NUMERIC(10,2),
  potential_profit        NUMERIC(10,2),
  deal_score              INTEGER CHECK (deal_score BETWEEN 0 AND 100),
  risk_score              INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  seller_type             TEXT DEFAULT 'private',
  accident_info           TEXT,
  number_of_owners        INTEGER,
  equipment               JSONB DEFAULT '[]',
  listing_url             TEXT UNIQUE NOT NULL,
  image_urls              JSONB DEFAULT '[]',
  ai_summary              TEXT,
  ai_recommendation       TEXT,
  pdf_url                 TEXT,
  source_website          TEXT DEFAULT 'autoscout24',
  status                  TEXT DEFAULT 'new' CHECK (status IN ('new','reviewed','contacted','closed'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_car_leads_date_found ON car_leads(date_found DESC);
CREATE INDEX IF NOT EXISTS idx_car_leads_deal_score ON car_leads(deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_car_leads_brand ON car_leads(brand);
CREATE INDEX IF NOT EXISTS idx_car_leads_status ON car_leads(status);
CREATE INDEX IF NOT EXISTS idx_car_leads_listing_url ON car_leads(listing_url);

-- ─────────────────────────────────────────────
-- Table: search_logs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  search_date             DATE DEFAULT CURRENT_DATE,
  source_website          TEXT DEFAULT 'autoscout24',
  total_listings_checked  INTEGER DEFAULT 0,
  total_leads_saved       INTEGER DEFAULT 0,
  errors                  JSONB DEFAULT '[]'
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE car_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) can read/write all rows
CREATE POLICY "auth_users_all_car_leads" ON car_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_users_all_search_logs" ON search_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Storage bucket: car-reports
-- (Run in Supabase dashboard or via supabase client)
-- ─────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('car-reports', 'car-reports', false)
-- ON CONFLICT (id) DO NOTHING;
