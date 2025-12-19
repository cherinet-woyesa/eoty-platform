-- Migration: Add color column to content_tags table
-- Date: 2025-12-19
-- Description: Add color field for tag visualization

ALTER TABLE content_tags 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Add check constraint to ensure valid hex color format
ALTER TABLE content_tags
ADD CONSTRAINT IF NOT EXISTS check_color_format 
CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- Add comment for documentation
COMMENT ON COLUMN content_tags.color IS 'Hex color code for tag badge display (e.g., #3B82F6)';
