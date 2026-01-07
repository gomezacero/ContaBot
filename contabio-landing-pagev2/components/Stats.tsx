
import React from 'react';

const Stats: React.FC = () => {
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

  return (
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
            <button className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap text-lg">
              Soy Contabio, empecemos...
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
