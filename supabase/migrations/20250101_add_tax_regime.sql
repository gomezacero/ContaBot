-- Add tax_regime column if it doesn't exist
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tax_regime text DEFAULT 'ORDINARIO';

-- Add notification preferences
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS email_alert boolean DEFAULT false;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS whatsapp_alert boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.clients.tax_regime IS 'ORDINARIO, SIMPLE, or ESPECIAL';
