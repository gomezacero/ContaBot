
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-zinc-100 py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo & Description */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
                <span className="text-white font-black text-sm">C</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-zinc-900">Contabio</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium max-w-[280px] leading-relaxed">
              Redefiniendo el flujo de trabajo contable en Colombia con IA de última generación.
            </p>
          </div>
          
          {/* Simplified Menu */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
            <a href="#" className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]">
              Políticas de Privacidad
            </a>
            <a href="#" className="text-[11px] font-bold text-zinc-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.15em]">
              Términos y Condiciones
            </a>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-zinc-50 flex flex-col items-center text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">
          <p>© {new Date().getFullYear()} by Valueum</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
