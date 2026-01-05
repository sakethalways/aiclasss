-- ============================================================================
-- Migration: Add Subjects/Courses Table for Organizing Lectures
-- Purpose: Allow users to create multiple subjects and organize lectures by subject
-- ============================================================================

-- Step 1: Create the subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'BookOpen',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint: user can't have duplicate subject names
  UNIQUE(user_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_created_at ON subjects(created_at DESC);

-- ============================================================================
-- Step 2: Add subject_id column to lectures table (optional subject)
-- ============================================================================

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Create index on lectures for subject_id for faster queries
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id ON lectures(subject_id);

-- ============================================================================
-- Step 3: Enable Row Level Security (RLS) on subjects table
-- ============================================================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

-- Policy 1: Users can view their own subjects
CREATE POLICY "Users can view their own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can create subjects
CREATE POLICY "Users can create their own subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own subjects
CREATE POLICY "Users can update their own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own subjects
CREATE POLICY "Users can delete their own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Step 4: Create trigger to automatically update updated_at timestamp
-- ============================================================================

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
DROP FUNCTION IF EXISTS update_subjects_timestamp();

CREATE FUNCTION update_subjects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_subjects_timestamp();

-- ============================================================================
-- Step 5: Create a default "General" subject for each user (optional setup function)
-- You can call this after signup or manually
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_subject_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
  subject_id UUID;
BEGIN
  INSERT INTO subjects (user_id, name, description, color, icon)
  VALUES (
    user_id,
    'General',
    'Default subject for lectures without a specific category',
    '#6366F1',
    'BookOpen'
  )
  ON CONFLICT (user_id, name) DO NOTHING
  RETURNING id INTO subject_id;
  
  RETURN subject_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: Useful queries for the frontend
-- ============================================================================

-- Query 1: Get all subjects for the current user
-- SELECT id, name, description, color, icon, created_at
-- FROM subjects
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;

-- Query 2: Get lectures for a specific subject
-- SELECT id, title, description, transcript, duration_ms, created_at
-- FROM lectures
-- WHERE subject_id = $1 AND user_id = auth.uid()
-- ORDER BY created_at DESC;

-- Query 3: Get all lectures organized by subject
-- SELECT 
--   s.id as subject_id,
--   s.name as subject_name,
--   s.color,
--   s.icon,
--   COUNT(l.id) as lecture_count
-- FROM subjects s
-- LEFT JOIN lectures l ON s.id = l.subject_id
-- WHERE s.user_id = auth.uid()
-- GROUP BY s.id, s.name, s.color, s.icon
-- ORDER BY s.created_at DESC;

-- Query 4: Get lectures without a subject (useful for migration)
-- SELECT id, title, description, created_at
-- FROM lectures
-- WHERE subject_id IS NULL AND user_id = auth.uid()
-- ORDER BY created_at DESC;

-- ============================================================================
-- End of Migration Script
-- ============================================================================
