-- Migration: Add sources column to articles table
-- Description: Stores JSON array of source URLs for articles
-- Date: 2025-11-17

-- Add sources column as TEXT (to store JSON array)
ALTER TABLE articles
ADD COLUMN sources TEXT NULL
COMMENT 'JSON array of source URLs for the article';

-- Create index for better performance when querying
-- (Optional, but recommended if you plan to search/filter by sources)
-- CREATE INDEX idx_articles_sources ON articles (sources(255));

-- Example: Update existing articles to include empty sources array
-- UPDATE articles SET sources = '[]' WHERE sources IS NULL;

-- Verify the change
DESCRIBE articles;
