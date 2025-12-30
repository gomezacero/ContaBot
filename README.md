# 🤖 ContaBot: Financial OS for Colombian Accountants

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

**ContaBot** is a high-performance Financial Operating System designed specifically for the Colombian accounting landscape. It combines modern web aesthetics with mission-critical tools for payroll, tax automation, and document processing.

---

## 🚀 Core Features

### 📊 Real-Time Dashboard
A centralized command center that pulls live metrics directly from your Supabase instance.
- **Dynamic Stats:** Active clients, managed employees, and monthly document trends.
- **Smart Alerts:** Automated tax deadline warnings derived from individual client NITs.

### 🧾 Nómina Pro & Liquidación
A premium payroll calculator that turns complex Colombian regulations into a smooth experience.
- **Smart Logic:** Automatic Transport Aid calculation, Parafiscale exemptions (Ley 1607), and ARL risk levels.
- **Premium UX:** Animated totals and contextual tooltips explaining legal terms as you type.
- **Export Ready:** Save and track historical payroll records with a single click.

### 👁️ OCR Digitador (AI Engine)
Stop manual data entry. Our high-precision engine powered by **Gemini 2.0 Flash** extracts data from invoices with incredible accuracy.
- **Full Extraction:** Entity, NIT, Currency, Subtotal, IVA, and even **Impoconsumo** and **Tips**.
- **Batch Processing:** Group and manage multiple invoices simultaneously.

### 📅 2025 Tax Calendar
Never miss a deadline. Our system calculates exact dates for Renta, IVA, and Retención based on the DIAN 2025 schedule.

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Runtime:** [Bun](https://bun.sh) (Selected for speed)
- **Database / Auth:** Supabase
- **AI Core:** Google Gemini 2.0 Flash API
- **Styling:** Tailwind CSS + Framer Motion
- **Icons:** Lucide React

---

## ⚙️ Quick Start (Developer Mode)

ContaBot is optimized for the **Bun** ecosystem.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gomezacero/ContaBot.git
   cd ContaBot
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`

4. **Run development server:**
   ```bash
   bun dev
   ```

---

## 🎨 Visual Philosophy
ContaBot follows the **2025 Design Language**:
- **Glassmorphism:** Light, translucent surfaces.
- **Vibrant Gradients:** Focused on purple and indigo palettes.
- **Micro-interactions:** Every interaction should feel alive (animations, hovers, and pulses).

---

Developed with ❤️ for accountants who value time and design.
