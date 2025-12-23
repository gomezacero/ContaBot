import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ContaBot - Asistente Contable Inteligente",
  description: "Financial OS para contadores colombianos. Automatiza nómina, facturas y calendario tributario con IA.",
  keywords: ["contabot", "nómina", "contabilidad", "colombia", "impuestos", "DIAN", "calendario tributario"],
  authors: [{ name: "ContaBot" }],
  openGraph: {
    title: "ContaBot - Asistente Contable Inteligente",
    description: "Financial OS para contadores colombianos. Automatiza nómina, facturas y calendario tributario con IA.",
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
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
