-- Migration 002: Add listing_date column to car_leads
-- Run this in Supabase SQL Editor

ALTER TABLE car_leads ADD COLUMN IF NOT EXISTS listing_date DATE;
CREATE INDEX IF NOT EXISTS idx_car_leads_listing_date ON car_leads(listing_date DESC);
