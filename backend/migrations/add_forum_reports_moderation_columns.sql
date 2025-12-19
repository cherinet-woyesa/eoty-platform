-- Migration: Add missing columns to forum_reports table
-- Date: 2025-12-19
-- Description: Add moderation tracking columns to forum_reports

ALTER TABLE forum_reports 
ADD COLUMN IF NOT EXISTS moderated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_forum_reports_moderated_by ON forum_reports(moderated_by);
CREATE INDEX IF NOT EXISTS idx_forum_reports_moderated_at ON forum_reports(moderated_at);

-- Add comment for documentation
COMMENT ON COLUMN forum_reports.moderated_by IS 'User ID of the moderator who handled this report';
COMMENT ON COLUMN forum_reports.moderated_at IS 'Timestamp when the report was moderated';
COMMENT ON COLUMN forum_reports.moderation_notes IS 'Notes added by the moderator';
