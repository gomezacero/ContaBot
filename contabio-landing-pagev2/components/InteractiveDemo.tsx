
import React from 'react';

const InteractiveDemo: React.FC = () => {
  return (
    <div className="container mx-auto px-6">
      <div className="flex flex-col lg:flex-row items-center gap-16 py-12">
        <div className="lg:w-1/2">
          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-emerald-400 mb-6">
            Procesamiento en tiempo real
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-8 leading-tight tracking-tight">
            La IA que <br />
            <span className="text-emerald-400 underline decoration-emerald-600 underline-offset-8">lee facturas</span> por ti
          </h2>
          <p className="text-emerald-100/70 text-lg font-medium leading-relaxed mb-10">
            Nuestro motor propietario de Computer Vision identifica campos contables en segundos, incluso en fotos de baja calidad enviadas por WhatsApp.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            <div>
              <h4 className="font-bold text-white mb-2">99.8% Precisión</h4>
              <p className="text-sm text-emerald-100/50">Validación automática contra bases de la DIAN.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-2">Seguridad Bancaria</h4>
              <p className="text-sm text-emerald-100/50">Cifrado de datos de punta a punta.</p>
            </div>
          </div>
          <button className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-400 transition-all active:scale-95">
            Probar con mi factura
          </button>
        </div>
        
        <div className="lg:w-1/2 w-full">
          <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-2xl overflow-hidden relative group">
            <div className="flex items-center space-x-2 mb-6 border-b border-white/5 pb-4">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
              </div>
              <span className="ml-4 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Contabio Analyzer v1.2</span>
            </div>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex space-x-3">
                <span className="text-zinc-600">$</span>
                <span className="text-emerald-400">uploading invoice_scan_7.png</span>
              </div>
              <div className="flex space-x-3 items-center">
                <span className="text-zinc-600">$</span>
                <span className="text-zinc-300">OCR detection active...</span>
                <span className="w-2 h-4 bg-emerald-500 animate-pulse"></span>
              </div>
              
              <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 animate-reveal">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Resultado de Análisis</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded font-bold uppercase">Validado</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-400">Proveedor</span>
                    <span className="text-white font-medium">ALKOSTO S.A.</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-400">NIT</span>
                    <span className="text-white font-medium">890.900.943-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Factura</span>
                    <span className="text-emerald-400 font-bold">$1.450.000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Float Badge */}
            <div className="absolute -bottom-4 -right-4 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm hidden sm:block animate-float">
               +124 facturas hoy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDemo;
