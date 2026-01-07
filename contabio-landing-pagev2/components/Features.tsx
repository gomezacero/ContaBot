
import React from 'react';

const Features: React.FC = () => {
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

  return (
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
            Diseñamos herramientas que eliminan el "trabajo pesado" para que puedas enfocarte en lo que realmente aporta valor a tus clientes.
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
                  <button className="group/btn text-lg lg:text-xl font-black text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center tracking-tighter uppercase">
                    Soy Contabio, empecemos...
                    <span className="ml-2 transform group-hover/btn:translate-x-2 transition-transform">→</span>
                  </button>
                </div>
              </div>

              {/* Interactive subtle highlight */}
              <div className="absolute inset-0 border border-transparent group-hover:border-emerald-100/50 rounded-[3rem] transition-colors pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
