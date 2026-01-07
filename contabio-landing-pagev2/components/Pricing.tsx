
import React from 'react';

const Pricing: React.FC = () => {
  return (
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
            Estamos en fase de lanzamiento. Por tiempo limitado, todos los usuarios tienen acceso al plan <b>Contabio Full</b> sin pagar un solo peso.
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
              <p className="text-zinc-500 font-medium mb-10 italic">"Todo lo que tenemos, es tuyo ahora mismo."</p>
              
              <div className="flex items-baseline justify-center mb-12">
                <span className="text-7xl font-black text-zinc-900">$0</span>
                <div className="flex flex-col items-start ml-4 text-left">
                  <span className="text-zinc-900 font-bold uppercase tracking-widest text-xs">COP / MES</span>
                  <span className="text-emerald-600 font-black text-[10px] uppercase tracking-tighter">Oferta de Lanzamiento</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mb-12 text-left">
                {[
                  'Digitación de documentos ilimitada',
                  'Liquidación de nómina automática',
                  'Calendario tributario personalizado',
                  'Alertas de vencimientos vía correo',
                  'Exportación a Excel',
                  'Exportación a Software contable (En desarrollo)',
                  'Soporte técnico directo',
                  'Auditoría de exógena (Próximamente)',
                  'Múltiples empresas/clientes'
                ].map((item, i) => (
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

              <button className="w-full py-5 px-8 bg-emerald-600 text-white font-black text-xl lg:text-2xl rounded-[2rem] hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 transition-all active:scale-95 group/btn">
                Soy Contabio, empecemos...
                <span className="inline-block ml-2 transition-transform group-hover/btn:translate-x-1">→</span>
              </button>
              
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
  );
};

export default Pricing;
