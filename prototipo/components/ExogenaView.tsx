
import React from 'react';
import { FileSpreadsheet, Construction, Clock, Bell, ShieldCheck, ShieldAlert } from 'lucide-react';
import ModuleFeedback from './ModuleFeedback';

interface Props {
    onActionTrigger?: () => void;
    isUserLoggedIn?: boolean;
}

const ExogenaView: React.FC<Props> = ({ onActionTrigger, isUserLoggedIn = false }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* REGISTER REQUIRED BANNER */}
      {!isUserLoggedIn && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                      <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
                  </div>
                  <div>
                      <h4 className="text-lg font-bold text-indigo-900 leading-tight">Auditoría Masiva de Medios</h4>
                      <p className="text-sm text-indigo-700/80">Regístrate para habilitar la subida masiva de archivos XML y el cruce automático con declaraciones de renta enviadas anteriormente.</p>
                  </div>
              </div>
              <div className="flex gap-3 shrink-0">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
              </div>
          </div>
      )}

      <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-8 py-10">
          <div className="relative">
             <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center relative z-10">
                <FileSpreadsheet className="w-14 h-14 text-orange-500" />
             </div>
             <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-white p-3 rounded-full shadow-lg z-20 border border-gray-100">
                <Clock className="w-6 h-6 text-orange-400 animate-pulse" />
             </div>
             <div className="absolute inset-0 rounded-full border-2 border-orange-100 scale-110"></div>
             <div className="absolute inset-0 rounded-full border border-orange-50 scale-125"></div>
          </div>
          
          <div className="max-w-xl space-y-4">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Auditoría Exógena Pro</h2>
              
              <div className="flex justify-center">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wide">
                    <Construction className="w-3.5 h-3.5" />
                    Módulo en Construcción
                 </div>
              </div>
              
              <p className="text-gray-500 text-lg leading-relaxed">
                  Estamos entrenando a ContaBot con la <strong>Normativa DIAN 2025</strong>. 
                  Pronto podrás cruzar tus formatos 1001, 1003, 1005 y 1006 contra tus declaraciones de renta e IVA en segundos.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
               <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShieldCheck className="w-5 h-5"/></div>
                    <p className="text-xs font-bold text-gray-900">Validación Módulo 11</p>
                    <p className="text-[10px] text-gray-400">Dígitos de verificación en NITs</p>
               </div>
               <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FileSpreadsheet className="w-5 h-5"/></div>
                    <p className="text-xs font-bold text-gray-900">Cruce 1001 vs 110</p>
                    <p className="text-[10px] text-gray-400">Costos y Gastos deducibles</p>
               </div>
               <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Bell className="w-5 h-5"/></div>
                    <p className="text-xs font-bold text-gray-900">Alertas Preventivas</p>
                    <p className="text-[10px] text-gray-400">Antes de enviar a la DIAN</p>
               </div>
          </div>
      </div>
      
      <ModuleFeedback moduleName="Auditoría Exógena" />
    </div>
  );
};

export default ExogenaView;
