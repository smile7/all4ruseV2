-- Add seriesId column to events table to support recurring event series.
-- All occurrences created from a single recurring submit share the same seriesId (UUID).
-- Existing single events keep seriesId = NULL.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS "seriesId" text DEFAULT NULL;

-- Index allows efficient lookup of all occurrences in a series (e.g. "edit all in series" in future).
CREATE INDEX IF NOT EXISTS idx_events_series_id ON events ("seriesId");
