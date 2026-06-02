-- Migration 003: Store valuation confidence and comparable evidence summary

ALTER TABLE car_leads
  ADD COLUMN IF NOT EXISTS valuation_confidence TEXT DEFAULT 'legacy'
    CHECK (valuation_confidence IN ('strong', 'moderate', 'weak', 'legacy')),
  ADD COLUMN IF NOT EXISTS comparable_count INTEGER,
  ADD COLUMN IF NOT EXISTS comparable_median_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS comparable_price_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS comparable_price_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valuation_method TEXT;

UPDATE car_leads
SET valuation_confidence = 'legacy'
WHERE valuation_confidence IS NULL;

ALTER TABLE car_leads
  ALTER COLUMN valuation_confidence SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_car_leads_valuation_confidence
  ON car_leads(valuation_confidence);
