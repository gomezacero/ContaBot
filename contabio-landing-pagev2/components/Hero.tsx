
import React, { useState, useEffect } from 'react';

const Hero: React.FC = () => {
  const [index, setIndex] = useState(0);
  const messages = [
    "Recordarte todas las obligaciones tributarias de tus clientes para que nunca se te pasen.",
    "Liquidar y planificar nominas",
    "digitar todas tus facturas fisicas, pdf, imagenes etc. dejame el trabajo operativo ;)",
    "hacer toda la tarea manual y mucho más."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
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
                  <span className="text-emerald-600 font-extrabold uppercase tracking-tighter mr-2">Contabot</span> 
                  es tu asistente para:
                </p>
                <div className="h-24 md:h-16 relative w-full max-w-2xl overflow-hidden">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out transform ${
                        i === index 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 -translate-y-8'
                      }`}
                      style={{ visibility: i === index ? 'visible' : 'hidden' }}
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
            <button className="px-10 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 hover:shadow-2xl hover:shadow-emerald-200 transition-all text-xl lg:text-2xl active:scale-95 shadow-xl shadow-emerald-100">
              Soy Contabio, empecemos...
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
