import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Contabio | IA para el Contador Moderno",
  description: "Financial OS para contadores colombianos. Automatiza nómina, facturas y calendario tributario con IA de última generación.",
  keywords: ["contabio", "nómina", "contabilidad", "colombia", "impuestos", "DIAN", "calendario tributario", "OCR", "digitación automática"],
  authors: [{ name: "Valueum" }],
  openGraph: {
    title: "Contabio | IA para el Contador Moderno",
    description: "Financial OS para contadores colombianos. Automatiza nómina, facturas y calendario tributario con IA de última generación.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
