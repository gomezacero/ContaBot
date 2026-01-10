'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Recordarte todas las obligaciones tributarias de tus clientes para que nunca se te pasen.",
    "Liquidar y planificar nóminas",
    "Digitar todas tus facturas físicas, PDFs, imágenes etc. Déjame el trabajo operativo ;)",
    "hacer toda la tarea manual y mucho más."
  ];

  const stats = [
    {
      label: 'Tiempo perdido',
      value: '80 Horas',
      detail: 'Al mes dedicadas únicamente a digitación manual.'
    },
    {
      label: 'Agotamiento Crónico',
      value: '74% de Burnout',
      detail: 'De los contadores reportan estrés extremo y problemas de salud por sobrecarga en cierres tributarios.'
    },
    {
      label: 'Picos de trabajo',
      value: '14 Horas',
      detail: 'Jornada laboral promedio diaria durante cierres tributarios.'
    },
    {
      label: 'Riesgo sancionatorio',
      value: '$11.8 Millones',
      detail: 'Sanción promedio por errores en reportes e información exógena (Art. 651 E.T.).'
    },
    {
      label: 'Techo Operativo',
      value: '85% Estancados',
      detail: 'De los contadores independientes rechazan nuevos clientes por no tener capacidad de procesar más información manualmente.'
    },
  ];

  const features = [
    {
      title: 'Adiós a la Digitación',
      desc: 'Importa fotos, PDFs o archivos Excel. Contabio detecta cada dato, estructura la información y te entrega archivos listos para descargar en segundos.',
      icon: '✨',
      color: 'bg-amber-100 text-amber-600',
      borderColor: 'border-t-amber-500',
      shadowColor: 'hover:shadow-amber-100/50',
      gradient: 'from-amber-500/10 to-transparent',
    },
    {
      title: 'Nómina Inteligente',
      desc: 'Ejecuta liquidaciones y validaciones automáticas integrando todos los parámetros de ley. Contabio asegura el cumplimiento normativo en cada cálculo.',
      icon: '🛡️',
      color: 'bg-emerald-100 text-emerald-600',
      borderColor: 'border-t-emerald-500',
      shadowColor: 'hover:shadow-emerald-100/50',
      gradient: 'from-emerald-500/10 to-transparent',
    },
    {
      title: 'Tranquilidad Tributaria',
      desc: 'Calendarios inteligentes que nunca olvidan. Contabio gestiona los vencimientos, enviándote alertas proactivas mucho antes de cada obligación.',
      icon: '📅',
      color: 'bg-blue-100 text-blue-600',
      borderColor: 'border-t-blue-500',
      shadowColor: 'hover:shadow-blue-100/50',
      gradient: 'from-blue-500/10 to-transparent',
    },
    {
      title: 'Auditor de Exógena',
      desc: 'Blindaje total en tus reportes. Nuestra IA analiza bases de datos masivas para detectar discrepancias, errores de terceros e inconsistencias que el ojo humano suele omitir.',
      icon: '🔍',
      color: 'bg-indigo-100 text-indigo-600',
      borderColor: 'border-t-indigo-500',
      shadowColor: 'hover:shadow-indigo-100/50',
      gradient: 'from-indigo-500/10 to-transparent',
      badge: 'En desarrollo'
    }
  ];

  const pricingFeatures = [
    'Digitación de documentos ilimitada',
    'Liquidación de nómina automática',
    'Calendario tributario personalizado',
    'Alertas de vencimientos vía correo',
    'Exportación a Excel',
    'Exportación a Software contable (En desarrollo)',
    'Soporte técnico directo',
    'Auditoría de exógena (Próximamente)',
    'Múltiples empresas/clientes'
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex items-center justify-center ${
          scrolled
            ? 'glass-header py-3 shadow-sm border-b border-zinc-100/50'
            : 'bg-transparent py-6'
        }`}
      >
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Contabio Home"
        >
          <div className="w-10 h-10 lg:w-11 lg:h-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-all group-hover:scale-105 group-hover:rotate-3">
            <span className="text-white font-black text-xl lg:text-2xl">C</span>
          </div>
          <span className="text-xl lg:text-2xl font-extrabold tracking-tight text-zinc-900 group-hover:text-emerald-700 transition-colors">
            Contabio
          </span>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center animate-reveal">
              <div className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/50 rounded-full text-orange-600 text-[13px] font-bold mb-8 animate-float shadow-sm shadow-orange-100/50">
                <span className="flex h-2 w-2 mr-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Construido por contadores para contadores
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold text-zinc-900 tracking-tight leading-[1.1] mb-12">
                Multiplica tus clientes, <br />
                <span className="text-gradient">no tus horas de trabajo.</span>
              </h1>

              <div className="mb-12 px-4">
                <div className="flex flex-col items-center">
                  <p className="text-xl md:text-2xl text-zinc-600 font-medium leading-relaxed mb-4">
                    <span className="text-emerald-600 font-extrabold uppercase tracking-tighter mr-2">Contabio</span>
                    es tu asistente para:
                  </p>
                  <div className="h-24 md:h-16 relative w-full max-w-2xl overflow-hidden">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out transform ${
                          i === messageIndex
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 -translate-y-8'
                        }`}
                        style={{ visibility: i === messageIndex ? 'visible' : 'hidden' }}
                      >
                        <p className="text-xl md:text-2xl text-zinc-900 font-bold underline decoration-emerald-200 decoration-4 underline-offset-4 text-center">
                          {msg}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="px-10 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 transition-all text-xl lg:text-2xl active:scale-95 shadow-xl shadow-emerald-100 inline-flex items-center justify-center gap-2"
                >
                  Soy Contabio, empecemos...
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-zinc-50/50 border-y border-zinc-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <p className="text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                La realidad que estamos <span className="text-gradient">transformando</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="group bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-rose-100/20 hover:border-rose-100 transition-all duration-500"
                >
                  <div className="flex flex-col h-full">
                    <span className="text-3xl lg:text-4xl font-black text-rose-500 tracking-tighter mb-4 group-hover:text-rose-600 transition-colors">
                      {stat.value}
                    </span>
                    <div className="h-1 w-12 bg-rose-400 rounded-full mb-6 transform origin-left group-hover:scale-x-150 transition-transform duration-500"></div>
                    <span className="text-[13px] font-extrabold text-zinc-900 uppercase tracking-widest mb-3">
                      {stat.label}
                    </span>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                      {stat.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 p-8 bg-zinc-900 rounded-[3rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-600/20 transition-colors duration-700"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                <div>
                  <p className="text-emerald-400 font-bold mb-2">¿Listo para cambiar estas cifras?</p>
                  <h3 className="text-2xl text-white font-bold">Automatiza hoy y recupera tu calidad de vida.</h3>
                </div>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap text-lg"
                >
                  Soy Contabio, empecemos...
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 bg-white relative overflow-hidden">
          {/* Background decoration elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50/30 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[120px]"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-24">
              <h2 className="text-5xl lg:text-7xl font-black text-zinc-900 tracking-tight mb-8 leading-[1.1]">
                Menos archivos,<br />
                <span className="text-gradient">más estrategia.</span>
              </h2>
              <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed">
                Diseñamos herramientas que eliminan el &quot;trabajo pesado&quot; para que puedas enfocarte en lo que realmente aporta valor a tus clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`group relative p-12 rounded-[3rem] bg-white border-x border-b border-zinc-100 border-t-8 ${f.borderColor} shadow-lg shadow-zinc-200/50 ${f.shadowColor} hover:-translate-y-2 transition-all duration-500 flex flex-col items-start overflow-hidden`}
                >
                  {/* Feature Badge for development status */}
                  {f.badge && (
                    <div className="absolute top-8 right-8 z-20">
                      <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-200">
                        {f.badge}
                      </span>
                    </div>
                  )}

                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

                  <div className="relative z-10 w-full">
                    {/* XL Icon */}
                    <div className={`w-24 h-24 ${f.color} rounded-[2rem] flex items-center justify-center text-5xl mb-12 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      {f.icon}
                    </div>

                    <h3 className="text-3xl font-black text-zinc-900 mb-6 tracking-tight group-hover:text-emerald-600 transition-colors">
                      {f.title}
                    </h3>

                    <p className="text-zinc-600 text-lg leading-relaxed font-semibold mb-12 group-hover:text-zinc-800 transition-colors">
                      {f.desc}
                    </p>

                    <div className="pt-8 border-t border-zinc-100 w-full">
                      <Link
                        href="/dashboard"
                        className="group/btn text-lg lg:text-xl font-black text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center tracking-tighter uppercase"
                      >
                        Soy Contabio, empecemos...
                        <span className="ml-2 transform group-hover/btn:translate-x-2 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>

                  {/* Interactive subtle highlight */}
                  <div className="absolute inset-0 border border-transparent group-hover:border-emerald-100/50 rounded-[3rem] transition-colors pointer-events-none"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 bg-zinc-950 relative overflow-hidden">
          {/* Background Glows for Depth */}
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">
                Acceso Total <span className="text-emerald-500">Sin Costo</span>
              </h2>
              <p className="text-xl text-zinc-400 font-medium leading-relaxed">
                Estamos en fase de lanzamiento. Por tiempo limitado, todos los usuarios tienen acceso al plan <b className="text-white">Contabio Full</b> sin pagar un solo peso.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {/* Main Plan Card */}
              <div className="relative group">
                {/* Animated Glow behind the card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative p-10 lg:p-16 rounded-[3rem] bg-white border border-white/10 shadow-2xl flex flex-col items-center text-center overflow-hidden">
                  <div className="mb-8">
                    <span className="px-5 py-2 bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-200">
                      Plan Beta Unificado
                    </span>
                  </div>

                  <h3 className="text-4xl font-black text-zinc-900 mb-2">Contabio Full Access</h3>
                  <p className="text-zinc-500 font-medium mb-10 italic">&quot;Todo lo que tenemos, es tuyo ahora mismo.&quot;</p>

                  <div className="flex items-baseline justify-center mb-12">
                    <span className="text-7xl font-black text-zinc-900">$0</span>
                    <div className="flex flex-col items-start ml-4 text-left">
                      <span className="text-zinc-900 font-bold uppercase tracking-widest text-xs">COP / MES</span>
                      <span className="text-emerald-600 font-black text-[10px] uppercase tracking-tighter">Oferta de Lanzamiento</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mb-12 text-left">
                    {pricingFeatures.map((item, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <div className="mt-1 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-zinc-700 leading-tight">{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/dashboard"
                    className="w-full py-5 px-8 bg-emerald-600 text-white font-black text-xl lg:text-2xl rounded-[2rem] hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 transition-all active:scale-95 group/btn inline-flex items-center justify-center"
                  >
                    Soy Contabio, empecemos...
                    <span className="inline-block ml-2 transition-transform group-hover/btn:translate-x-1">→</span>
                  </Link>

                  <p className="mt-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Sin tarjetas de crédito · Sin compromisos · Solo productividad
                  </p>
                </div>
              </div>

              <div className="mt-16 text-center">
                <div className="relative inline-block">
                  <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2.5rem] blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative text-base lg:text-lg text-emerald-50 font-medium bg-zinc-900/80 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] border border-emerald-500/30 max-w-2xl shadow-2xl">
                    <span className="block text-emerald-400 font-black uppercase tracking-widest text-sm mb-3">
                      💡 ¿Por qué es gratis?
                    </span>
                    Queremos escuchar a <span className="text-white font-bold underline decoration-emerald-500 decoration-2 underline-offset-4">más contadores como tú.</span> Tu retroalimentación es la clave para perfeccionar a Contabio y que realmente transforme tu día a día y se convierta en tu mejor asistente.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="full" />
    </div>
  );
}
