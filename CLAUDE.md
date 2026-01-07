# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rol y Expertise Requerido

Al trabajar en Contabio (anteriormente ContaBot), debes actuar como un equipo de expertos combinados:

### 1. Experto en Stack Tecnológico
- **Next.js 16 / React 19**: App Router, Server Components, Server Actions, Suspense
- **TypeScript 5**: Tipado estricto, inferencia, generics, utility types
- **Supabase**: PostgreSQL, Row Level Security (RLS), Auth, Real-time, Edge Functions
- **Tailwind CSS 4**: Diseño responsive, theming, animaciones, componentes reutilizables
- **Google Gemini API**: Prompts optimizados para OCR, extracción estructurada de datos

### 2. Experto en Normativa DIAN y Contabilidad Colombiana
- **Retención en la Fuente**: Tabla Art. 383 E.T., procedimientos 1 y 2, UVT actualizado
- **IVA**: Periodicidades (bimestral, cuatrimestral), tarifas (0%, 5%, 19%), regímenes
- **Nómina**: SMMLV, auxilio transporte, aportes parafiscales, prestaciones sociales
- **Calendario Tributario**: Fechas según último dígito NIT, grandes contribuyentes
- **Información Exógena**: Formatos 1001-1012, cruces de información, sanciones
- **PUC**: Plan Único de Cuentas para comerciantes (Decreto 2650)
- **Facturación Electrónica**: Resolución DIAN, validación previa, documento soporte

### 3. Diseñador UX/UI Experto
- **Principios de Diseño**:
  - Claridad sobre creatividad: interfaces que el contador entienda inmediatamente
  - Feedback visual constante: estados de carga, éxito, error
  - Accesibilidad: contraste, tamaños táctiles, navegación por teclado
  - Responsive first: móvil → tablet → desktop

- **Patrones UX para Contadores**:
  - Formularios divididos en secciones colapsables (reducir carga cognitiva)
  - Validación en tiempo real con mensajes claros en español
  - Tooltips explicativos en campos técnicos (UVT, IBC, etc.)
  - Tablas con totales destacados y export a Excel/PDF
  - Confirmaciones antes de acciones destructivas
  - Indicadores de progreso en procesos largos (OCR, cálculos)

- **Paleta de Colores (Contabio 2026)**:
  - Primary: #16a34a (emerald-600 para CTAs y brand)
  - Dark: #18181b (zinc-900 para textos principales)
  - Background: #fafafa (fondos claros)
  - Accent Gradient: emerald-600 → teal-600 (para efectos especiales)
  - Stats/Pain points: rose-500 (para métricas de impacto)
  - Success: emerald-500 para validaciones correctas
  - Warning: amber-500 para alertas no críticas
  - Error: red-500 para errores y vencimientos

- **Componentes UI Preferidos**:
  - Cards con sombras sutiles para agrupar información
  - Badges/Pills para estados (Pendiente, Pagado, Vencido)
  - Modales para confirmaciones, no para formularios largos
  - Tabs para alternar vistas relacionadas (Nómina/Liquidación)
  - Empty states informativos con CTAs claros

### 4. Mejores Prácticas de Código
- Componentes pequeños y reutilizables
- Separación clara: UI components vs business logic vs data fetching
- Manejo de errores con try/catch y feedback al usuario
- Optimización de re-renders con useMemo/useCallback donde sea necesario
- Comentarios en español para lógica de negocio colombiana

## Project Overview

Contabio es un "Financial OS" para contadores colombianos construido con Next.js 16. Automatiza tres procesos principales:
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

### Colombian Payroll Constants (2026)
- SMMLV: 1,750,905 COP
- UVT: 49,799 COP
- Transport Aid: 249,095 COP
- Employer contributions: Health (8.5%), Pension (12%), SENA (2%), ICBF (3%), Caja (4%)
- Provisions: Vacations (4.17%), Severance (8.33%), Prima (8.33%)

### Historical Payroll Constants (for liquidations)
| Año  | SMMLV       | Aux. Transporte |
|------|-------------|-----------------|
| 2024 | 1,300,000   | 162,000         |
| 2025 | 1,423,500   | 200,000         |
| 2026 | 1,750,905   | 249,095         |

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
- Color scheme: Primary (emerald-600 #16a34a), Dark (zinc-900 #18181b)

## Database Tables

- **profiles** - User accounts with role and membership
- **clients** - Companies with tax regime configuration
- **employees** - Employee records with salary and deductions
- **payroll_records** - Historical payroll calculations (JSON + PDF)
- **expense_documents** - Scanned documents with confidence scores
- **expense_items** - Line items with PUC categories
- **tax_calendar_configs** - Alert settings per client
- **ocr_results** - Scanned invoices with validation data

## Recent Features (Estado Actual)

### Payroll Override System (2026-01-06)
Allows accountants to calculate payroll/liquidations using historical SMMLV values.

**Files:**
- `lib/constants.ts` - Added `PARAMETROS_NOMINA` with 2024-2026 values
- `lib/calculations.ts` - `calculatePayroll()` and `calculateLiquidation()` accept overrides
- `app/dashboard/nomina/page.tsx` - UI section "Parámetros Base de Cálculo"
- DB columns: `employees.ano_base`, `employees.smmlv_override`, `employees.aux_transporte_override`

### OCR Improvements (2026-01-06)
- **Cafeteria/Restaurant Rule**: Handles impoconsumo 8% structure (SOMOS MASA, Juan Valdez, etc.)
- **Deduplication Rule**: Prevents duplicate invoice extraction from same image
- **IVA Incluido Rule**: Detects when retail receipts have tax-inclusive prices
- **Fuel Station Rule**: Correctly identifies vendor vs client in EDS receipts
- **COP Format Rule**: Interprets Colombian peso thousands separators correctly

**Files:**
- `app/api/ocr/route.ts` - EXTRACTION_PROMPT rules 11-13
- `lib/services/ocr-validation-service.ts` - Calculation validation
- `lib/services/excel-export-service.ts` - Accounting Excel export

### Soft Delete System
All deletions use soft-delete with `deleted_at` timestamp. Papelera (recycle bin) available at `/dashboard/papelera`.

## Pending Migrations

Run these if database is out of sync:
```sql
-- Payroll overrides (2026-01-06)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ano_base integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS smmlv_override numeric;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aux_transporte_override numeric;
```

## Testing Strategy

**Estado actual**: No hay framework de testing configurado.

### Recomendaciones Futuras
- **Unit tests**: Vitest para `lib/calculations.ts` (lógica de nómina)
- **Integration tests**: Testing de API routes con MSW
- **E2E tests**: Playwright para flujos críticos (OCR, nómina)

### Testing Manual Actual
- Verificar cálculos con casos conocidos (SMMLV, retención)
- Probar OCR con facturas reales de diferentes proveedores
- Validar PDFs generados contra formato esperado

## Security Practices

### Supabase RLS (Row Level Security)
- Todas las tablas tienen RLS habilitado
- Políticas basadas en `auth.uid()` para acceso por usuario
- Service role key solo en server-side

### Validación de Inputs
- Sanitizar datos de OCR antes de guardar
- Validar NITs con dígito de verificación
- Escapar HTML en campos de texto

### API Keys
- `GEMINI_API_KEY`: Solo en server (API routes)
- `SUPABASE_SERVICE_ROLE_KEY`: Solo en server
- `NEXT_PUBLIC_*`: Solo claves públicas seguras

### Headers de Seguridad
- CORS configurado en API routes
- Content-Type validation en uploads
- Rate limiting en OCR (usage-limits.ts)

## Performance Optimization

### Estrategias Implementadas
- **Lazy loading**: Componentes pesados con `dynamic()`
- **Image optimization**: Next.js Image component
- **Memoization**: `useMemo` para cálculos costosos en nómina

### Caching
- LocalStorage para datos de empleados en edición
- SWR/React Query patterns para fetching (pendiente)

### Bundle Size
- Tree-shaking de lucide-react icons
- Dynamic imports para jsPDF y xlsx

## Extended Architecture

### components/
```
components/
├── payroll/           # Componentes de nómina
├── tax-calendar/      # Calendario tributario
├── usage/             # Métricas de uso
└── ui/                # Componentes reutilizables
    ├── Toast.tsx      # Sistema de notificaciones
    ├── Tooltip.tsx    # Tooltips informativos
    └── DeleteConfirmationModal.tsx
```

### lib/services/
```
lib/services/
├── ocr-validation-service.ts   # Validación de facturas
├── soft-delete-service.ts      # Auditoría y papelera
├── trm-service.ts              # Conversión USD/COP
├── usage-service.ts            # Tracking de uso
└── excel-export-service.ts     # Exportación XLSX
```

### lib/hooks/
```
lib/hooks/
└── useAuthStatus.ts    # Estado de autenticación
```

## Code Conventions

### Naming
- **Componentes**: PascalCase (`PayrollSummary.tsx`)
- **Funciones/variables**: camelCase (`calculatePayroll`)
- **Constantes**: SCREAMING_SNAKE_CASE (`SMMLV_2026`)
- **Tipos**: PascalCase (`PayrollInput`)
- **Archivos**: kebab-case (`ocr-validation-service.ts`)

### Estructura de Archivos
```typescript
// 1. Imports externos
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 2. Imports internos (alias @/)
import { calculatePayroll } from '@/lib/calculations';
import { SMMLV_2026 } from '@/lib/constants';

// 3. Types locales
interface Props { ... }

// 4. Componente/función principal
export default function Component() { ... }
```

### Comentarios
- Español para lógica de negocio colombiana
- JSDoc para funciones públicas exportadas
- TODO/FIXME con contexto específico

## Git Workflow

### Branches
- `main`: Producción estable
- `testing`: QA y pruebas
- `feature/*`: Nuevas funcionalidades
- `fix/*`: Correcciones de bugs

### Commits
Formato: `tipo: descripción breve`

Tipos:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización sin cambio funcional
- `docs`: Documentación
- `style`: Formato, sin cambio de código
- `chore`: Tareas de mantenimiento

### Pull Requests
- Descripción clara del cambio
- Screenshots para cambios de UI
- Checklist de testing manual

## Error Handling

### Toast System (Principal)
```typescript
import { useToast } from '@/components/ui/Toast';

const { addToast } = useToast();

// Éxito
addToast({ type: 'success', title: 'Guardado', description: 'Empleado actualizado' });

// Error
addToast({ type: 'error', title: 'Error', description: 'No se pudo procesar' });

// Warning
addToast({ type: 'warning', title: 'Atención', description: 'Datos incompletos' });

// Info
addToast({ type: 'info', title: 'Info', description: 'Procesando...' });
```

### API Routes
```typescript
try {
  // lógica
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { success: false, error: 'Mensaje para usuario' },
    { status: 500 }
  );
}
```

### Validación de Formularios
- Validación en tiempo real con feedback visual
- Mensajes de error en español
- Estados de loading durante submit

## Database Schema Detail

### Relaciones Principales
```
profiles (1) ─── (N) clients
clients (1) ─── (N) employees
employees (1) ─── (N) payroll_records
clients (1) ─── (N) expense_documents
expense_documents (1) ─── (N) expense_items
clients (1) ─── (1) tax_calendar_configs
```

### Campos de Auditoría (Todas las tablas)
- `created_at`: Timestamp de creación
- `updated_at`: Timestamp de última modificación
- `deleted_at`: Soft delete (NULL = activo)
- `created_by`: UUID del usuario creador

### RLS Policies Pattern
```sql
-- Lectura: Solo registros del usuario
CREATE POLICY "Users can view own records"
ON table_name FOR SELECT
USING (auth.uid() = user_id);

-- Escritura: Solo propios, no eliminados
CREATE POLICY "Users can update own records"
ON table_name FOR UPDATE
USING (auth.uid() = user_id AND deleted_at IS NULL);
```

## Localization (i18n)

### Idioma Principal
- **Español (Colombia)**: Todo el UI está en español
- Mensajes de error, labels, tooltips en español
- Términos técnicos contables en español (SMMLV, UVT, IBC)

### Formato de Moneda (COP)
```typescript
new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
}).format(1750905); // "$1.750.905"
```

### Formato de Fechas
```typescript
// Formato colombiano: DD/MM/YYYY
new Intl.DateTimeFormat('es-CO').format(date); // "06/01/2026"

// ISO para base de datos: YYYY-MM-DD
date.toISOString().split('T')[0]; // "2026-01-06"
```

### Separadores Numéricos
- **Miles**: Punto (.) → 1.750.905
- **Decimales**: Coma (,) → 1.750.905,50

## Troubleshooting

### Error: "SMMLV undefined"
**Causa**: Falta importar constantes
**Solución**: `import { SMMLV_2026 } from '@/lib/constants'`

### Error: "Cannot read property of null" en Supabase
**Causa**: Usuario no autenticado
**Solución**: Verificar sesión con `useAuthStatus()` hook

### OCR no extrae datos correctamente
**Causas comunes**:
1. Imagen borrosa o muy pequeña
2. Factura en formato no estándar
3. Texto manuscrito

**Solución**: Subir imagen de mayor resolución, preferir PDFs

### PDF no se genera
**Causa**: jsPDF no cargado
**Solución**: Usar dynamic import:
```typescript
const jsPDF = (await import('jspdf')).default;
```

### Build falla con "Module not found"
**Causa**: Path alias mal configurado
**Solución**: Verificar `tsconfig.json` paths:
```json
"paths": { "@/*": ["./*"] }
```

### Supabase RLS bloquea queries
**Causa**: Política RLS restrictiva
**Solución**:
1. Verificar que `auth.uid()` coincide con `user_id`
2. Revisar políticas en Supabase Dashboard
