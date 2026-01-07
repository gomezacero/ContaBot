# Contabio: IA para el Contador Moderno

[![Next.js](https://img.shields.io/badge/next.js_16-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

**Contabio** es un sistema operativo financiero de alto rendimiento diseñado específicamente para el mercado contable colombiano. Combina estética web moderna con herramientas críticas para nómina, automatización tributaria y procesamiento de documentos.

---

## Core Features

### Real-Time Dashboard
Un centro de comando centralizado con métricas en vivo desde tu instancia de Supabase.
- **Stats Dinámicos:** Clientes activos, empleados gestionados y tendencias mensuales de documentos.
- **Alertas Inteligentes:** Avisos automáticos de vencimientos tributarios derivados de los NITs de cada cliente.

### Nómina Pro & Liquidación
Una calculadora de nómina premium que transforma las complejas regulaciones colombianas en una experiencia fluida.
- **Lógica Inteligente:** Cálculo automático de Auxilio de Transporte, exenciones de Parafiscales (Ley 1607) y niveles de riesgo ARL.
- **UX Premium:** Totales animados y tooltips contextuales que explican términos legales mientras escribes.
- **Export Listo:** Guarda y rastrea registros históricos de nómina con un solo clic.

### OCR Digitador (Motor IA)
Detén la digitación manual. Nuestro motor de alta precisión impulsado por **Gemini 2.0 Flash** extrae datos de facturas con increíble exactitud.
- **Extracción Completa:** Entidad, NIT, Moneda, Subtotal, IVA, e incluso **Impoconsumo** y **Propinas**.
- **Procesamiento por Lotes:** Agrupa y gestiona múltiples facturas simultáneamente.

### Calendario Tributario 2026
Nunca pierdas un vencimiento. Nuestro sistema calcula fechas exactas para Renta, IVA y Retención basándose en el calendario DIAN 2026.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Runtime:** Node.js / npm
- **Database / Auth:** Supabase (PostgreSQL + Auth)
- **AI Core:** Google Gemini 2.0 Flash API
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React

---

## Quick Start (Modo Desarrollador)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/gomezacero/ContaBot.git
   cd ContaBot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crear un archivo `.env.local` con:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

4. **Ejecutar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

---

## Filosofía Visual

Contabio sigue el **Lenguaje de Diseño 2026**:
- **Glassmorphism:** Superficies ligeras y translúcidas con blur.
- **Gradientes Emerald:** Paleta enfocada en verde esmeralda y teal.
- **Micro-interacciones:** Cada interacción debe sentirse viva (animaciones, hovers y pulsos).
- **Fuente:** Plus Jakarta Sans para un look moderno y profesional.

---

## Paleta de Colores

| Elemento | Color | Código |
|----------|-------|--------|
| Primary | Emerald | `#16a34a` |
| Dark | Zinc | `#18181b` |
| Background | Light | `#fafafa` |
| Accent | Teal | `#0d9488` |
| Stats | Rose | `#f43f5e` |

---

Desarrollado con por **Valueum** para contadores que valoran su tiempo y el diseño.
