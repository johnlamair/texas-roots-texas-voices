-- Add issue column to moments table for TX-23 key issue tracking
ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS issue TEXT;
