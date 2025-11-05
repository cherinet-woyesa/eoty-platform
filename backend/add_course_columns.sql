-- Add level and cover_image columns to courses table if they don't exist

-- Add level column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'level'
    ) THEN
        ALTER TABLE courses ADD COLUMN level VARCHAR(255);
        RAISE NOTICE 'Added level column to courses table';
    ELSE
        RAISE NOTICE 'level column already exists in courses table';
    END IF;
END $$;

-- Add cover_image column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image VARCHAR(255);
        RAISE NOTICE 'Added cover_image column to courses table';
    ELSE
        RAISE NOTICE 'cover_image column already exists in courses table';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
AND column_name IN ('level', 'cover_image');
