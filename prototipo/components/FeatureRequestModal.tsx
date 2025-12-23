
import React, { useState, useEffect } from 'react';
import { X, Sparkles, MessageSquare, User, Mail, Phone, Send, Lightbulb, ThumbsUp } from 'lucide-react';

interface ContactData {
  name: string;
  email: string;
  phone: string;
}

export type RequestType = 'feature' | 'feedback';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  existingContact?: ContactData | null;
  onSubmit: (data: { contact: ContactData; suggestion: string; type: RequestType }) => void;
}

const FeatureRequestModal: React.FC<FeatureRequestModalProps> = ({
  isOpen,
  onClose,
  moduleName,
  existingContact,
  onSubmit,
}) => {
  const [requestType, setRequestType] = useState<RequestType>('feature');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill data if available
  useEffect(() => {
    if (existingContact) {
      setName(existingContact.name);
      setEmail(existingContact.email);
      setPhone(existingContact.phone);
    }
  }, [existingContact, isOpen]);

  // Reset type on open
  useEffect(() => {
      if (isOpen) setRequestType('feature');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) {
        alert("Por favor completa el campo de texto.");
        return;
    }
    
    setLoading(true);
    
    // Simulate network delay for UX
    setTimeout(() => {
        onSubmit({
            contact: { name, email, phone },
            suggestion,
            type: requestType
        });
        setSuggestion(''); 
        setLoading(false);
    }, 800);
  };

  const hasContactInfo = !!existingContact;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* 1. Header (Dynamic Style) */}
        <div className={`p-6 relative overflow-hidden text-white transition-colors duration-500 ${requestType === 'feature' ? 'bg-gradient-to-br from-indigo-900 via-blue-900 to-black' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'}`}>
             {/* Decoration */}
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-white" />
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20">
                <X className="w-5 h-5"/>
             </button>

             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10 ${requestType === 'feature' ? 'bg-indigo-500/30' : 'bg-emerald-500/30'}`}>
                        {requestType === 'feature' ? <Lightbulb className="w-3 h-3 text-yellow-300" /> : <ThumbsUp className="w-3 h-3 text-emerald-300" />}
                        {requestType === 'feature' ? 'Beta Feedback' : 'Mejora Continua'}
                    </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight leading-tight">
                    {requestType === 'feature' ? 'Solicitar Nuevas Funciones' : 'Danos tu Feedback'}
                </h2>
                <p className="text-white/70 text-xs mt-1">
                    {requestType === 'feature' ? 'Ayúdanos a construir la herramienta perfecta para ti.' : '¿Encontraste un error o tienes una idea de mejora?'}
                </p>
             </div>
        </div>

        {/* 2. Context Indicator (Current Module) */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulo Activo:</span>
            <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                {moduleName}
            </span>
        </div>

        {/* 3. Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* TYPE SELECTOR */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                    type="button"
                    onClick={() => setRequestType('feature')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${requestType === 'feature' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Lightbulb className="w-3.5 h-3.5" /> Nueva Función
                </button>
                <button
                    type="button"
                    onClick={() => setRequestType('feedback')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${requestType === 'feedback' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare className="w-3.5 h-3.5" /> Feedback / Mejora
                </button>
            </div>

            {/* A. Contact Info Fields (Only if not saved/logged in) */}
            {!hasContactInfo ? (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
                        <strong>👋 ¡Hola!</strong> Para responder a tu solicitud, necesitamos tus datos <span className="underline">por única vez</span>.
                    </div>
                    
                    <div className="space-y-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500"><User className="w-4 h-4"/></div>
                            <input 
                                type="text" 
                                placeholder="Tu Nombre Completo" 
                                required
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500"><Mail className="w-4 h-4"/></div>
                            <input 
                                type="email" 
                                placeholder="Correo Electrónico" 
                                required
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all outline-none"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500"><Phone className="w-4 h-4"/></div>
                            <input 
                                type="tel" 
                                placeholder="WhatsApp" 
                                required
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all outline-none"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                // If info exists, just show a compact read-only view
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {existingContact.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{existingContact.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{existingContact.email}</p>
                    </div>
                    <div className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        Identificado
                    </div>
                </div>
            )}

            {/* B. Suggestion Text Area (Always Visible) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 transition-all">
                    {requestType === 'feature' ? '¿Qué función te gustaría agregar?' : '¿Qué podemos mejorar o corregir?'}
                </label>
                <textarea 
                    className="w-full p-4 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm outline-none" 
                    placeholder={requestType === 'feature' ? "Ej: Me gustaría que el sistema genere automáticamente el Certificado de Ingresos y Retenciones..." : "Ej: Encontré un error al calcular las horas extras festivas, o me gustaría que el botón de exportar fuera más visible..."}
                    rows={4}
                    required
                    value={suggestion}
                    onChange={e => setSuggestion(e.target.value)}
                    autoFocus={hasContactInfo} 
                ></textarea>
            </div>

            {/* 4. Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <button 
                    type="button"
                    onClick={onClose} 
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:bg-gray-900 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Enviando...' : (
                        <>
                            {requestType === 'feature' ? 'Solicitar Función' : 'Enviar Feedback'} <Send className="w-3.5 h-3.5" />
                        </>
                    )}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
};

export default FeatureRequestModal;
