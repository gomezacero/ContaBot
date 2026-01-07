-- Migration: Add target_emails column for email notification recipients
-- Date: 2026-01-07
-- Description: Adds target_emails column to clients table for storing email addresses
--              that should receive tax calendar notifications via Resend

-- Add target_emails column for storing notification recipients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_emails text[] DEFAULT '{}';

-- Ensure alert_days column exists and has proper default
-- This column determines which days before a deadline to send alerts (e.g., 15, 7, 1 days before)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'alert_days'
    ) THEN
        ALTER TABLE clients ADD COLUMN alert_days integer[] DEFAULT '{15, 7, 1}';
    END IF;
END $$;

-- Add index for faster queries on clients with email alerts enabled
CREATE INDEX IF NOT EXISTS idx_clients_email_alert ON clients(email_alert) WHERE email_alert = true;

-- Add comment for documentation
COMMENT ON COLUMN clients.target_emails IS 'Array of email addresses to receive tax calendar notifications';
COMMENT ON COLUMN clients.alert_days IS 'Array of days before deadline to send alerts (e.g., [15, 7, 1] means 15, 7, and 1 day before)';
