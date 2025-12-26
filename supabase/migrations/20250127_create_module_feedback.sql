-- Migration: Create module_feedback table
-- Purpose: Store user feedback and ratings for different modules
-- Date: 2025-01-27

-- ===========================================
-- 1. CREATE TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.module_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    module_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 2. CREATE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_feedback_module ON public.module_feedback(module_name);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.module_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.module_feedback(created_at DESC);

-- ===========================================
-- 3. ENABLE RLS
-- ===========================================

ALTER TABLE public.module_feedback ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. CREATE RLS POLICIES
-- ===========================================

-- Users can insert feedback (even anonymous)
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.module_feedback;
CREATE POLICY "Anyone can insert feedback"
ON public.module_feedback
FOR INSERT
WITH CHECK (true);

-- Users can only view their own feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.module_feedback;
CREATE POLICY "Users can view own feedback"
ON public.module_feedback
FOR SELECT
USING (user_id = auth.uid());

-- ===========================================
-- 5. GRANT PERMISSIONS
-- ===========================================

GRANT INSERT ON public.module_feedback TO authenticated;
GRANT INSERT ON public.module_feedback TO anon;
GRANT SELECT ON public.module_feedback TO authenticated;

-- ===========================================
-- 6. COMMENTS
-- ===========================================

COMMENT ON TABLE public.module_feedback IS
'Stores user feedback and ratings for ContaBot modules (nomina, calendario, ocr)';

COMMENT ON COLUMN public.module_feedback.module_name IS
'Module identifier: nomina | calendario | ocr';

COMMENT ON COLUMN public.module_feedback.rating IS
'User rating from 1 (very bad) to 5 (excellent)';
