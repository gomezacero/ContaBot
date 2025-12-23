-- Migration: Create OCR Results table for persistent storage
-- This allows authenticated users to save and retrieve OCR processing results

-- ===========================================
-- 1. CREATE OCR_RESULTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.ocr_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Document info
    filename text NOT NULL,
    file_type text, -- 'image' or 'text'
    
    -- Extracted data
    vendor text,
    invoice_number text,
    invoice_date text,
    
    -- Financial data
    subtotal numeric DEFAULT 0,
    iva numeric DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    
    -- Detailed items (JSON array)
    items jsonb DEFAULT '[]'::jsonb,
    
    -- Processing metadata
    confidence numeric DEFAULT 0,
    raw_response text, -- Original API response for debugging
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ===========================================
-- 2. CREATE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_ocr_results_user_id ON public.ocr_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_client_id ON public.ocr_results(client_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON public.ocr_results(created_at DESC);

-- ===========================================
-- 3. ENABLE RLS
-- ===========================================

ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. CREATE RLS POLICY
-- ===========================================

DROP POLICY IF EXISTS "Users can manage their own OCR results" ON public.ocr_results;

CREATE POLICY "Users can manage their own OCR results"
ON public.ocr_results
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 5. GRANT PERMISSIONS
-- ===========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_results TO authenticated;

-- ===========================================
-- 6. COMMENTS
-- ===========================================

COMMENT ON TABLE public.ocr_results IS 'Stores OCR processing results from the Digitador module';
COMMENT ON COLUMN public.ocr_results.items IS 'JSON array of line items: [{description, quantity, unit_price, total}]';
COMMENT ON COLUMN public.ocr_results.confidence IS 'AI confidence score from 0 to 1';
