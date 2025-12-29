# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContaBot is a "Financial OS" for Colombian accountants built with Next.js 16. It automates three core processes:
- **Nómina (Payroll)** - Automatic payroll calculations under Colombian law 2025
- **Calendario Tributario (Tax Calendar)** - Tax deadline monitoring and alerts for DIAN compliance
- **Digitador OCR (Expense Digitizer)** - AI-powered document scanning using Google Gemini

## Development Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Build for production
npm start        # Run production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16.1.0 (App Router), React 19, TypeScript 5
- **Database**: Supabase (PostgreSQL) with Auth
- **AI**: Google Gemini API for OCR
- **Styling**: Tailwind CSS 4
- **PDF**: jsPDF with jspdf-autotable

## Architecture

```
app/
├── api/
│   ├── health/route.ts         # System health endpoint
│   ├── ocr/route.ts             # Gemini OCR processing
│   └── cron/check-deadlines/    # Tax deadline cron job
├── dashboard/
│   ├── nomina/page.tsx          # Payroll calculator
│   ├── calendario/page.tsx      # Tax calendar
│   ├── gastos/page.tsx          # OCR expense scanner
│   └── status/page.tsx          # System status
lib/
├── calculations.ts              # Payroll calculation engine (SMMLV, UVT, withholding)
├── constants.ts                 # 2025 Colombian tax/payroll constants
├── tax-deadlines.ts             # Tax calendar generator
├── pdf-generator.ts             # Payroll PDF generation
├── supabase/
│   ├── client.ts                # Client-side Supabase
│   ├── server.ts                # Server-side Supabase
│   └── middleware.ts            # Auth session handling
types/
├── payroll.ts                   # Payroll types & enums
├── ocr.ts                       # OCR result types
└── database.ts                  # Supabase schema types
```

## Key Domain Knowledge

### Colombian Payroll Constants (2025)
- SMMLV: 1,423,500 COP
- UVT: 49,799 COP
- Transport Aid: 200,000 COP
- Employer contributions: Health (8.5%), Pension (12%), SENA (2%), ICBF (3%), Caja (4%)
- Provisions: Vacations (4.17%), Severance (8.33%), Prima (8.33%)

### Tax Calendar
- Supports: ICA, ReteICA, Impoconsumo, Carbon Tax, Cultural Stamp, Tourism Contribution
- IVA periodicity: Bimonthly, Quarterly, or None
- Classification by NIT (Colombian tax ID)

### OCR Categories (PUC Codes)
The expense module uses Colombian PUC (Plan Único de Cuentas) codes for categorization:
- Equipment (152405), Office supplies (519530), Utilities (513505)
- Rent (512010), Professional fees (511025), Software (516515)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

## Code Patterns

- Client components marked with `'use client'`
- Server actions in `lib/actions/`
- Path alias: `@/*` maps to root directory
- Color scheme: Primary (#002D44), Accent (#1AB1B1)

## Database Tables

- **profiles** - User accounts with role and membership
- **clients** - Companies with tax regime configuration
- **employees** - Employee records with salary and deductions
- **payroll_records** - Historical payroll calculations (JSON + PDF)
- **expense_documents** - Scanned documents with confidence scores
- **expense_items** - Line items with PUC categories
- **tax_calendar_configs** - Alert settings per client
