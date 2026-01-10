'use client';

import React, { useState } from 'react';
import { Loader2, Calendar, Lock, AlertCircle, Mail, MessageCircle, Sparkles } from 'lucide-react';

interface TaxCalendarFormProps {
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
    isGuest?: boolean;
}

export const TaxCalendarForm: React.FC<TaxCalendarFormProps> = ({ onSubmit, onCancel, isLoading, isGuest = false }) => {
    const [formData, setFormData] = useState({
        classification: 'JURIDICA' as 'NATURAL' | 'JURIDICA',
        name: '',
        nit: '',
        taxRegime: 'ORDINARIO',
        ivaPeriodicity: 'BIMESTRAL',
        alertDays: [15, 1],
        emailAlert: false,
        whatsappAlert: false,
    });

    const [touched, setTouched] = useState({ name: false, nit: false });
    const [submitAttempted, setSubmitAttempted] = useState(false);

    // Validar formato de NIT colombiano (solo números, 9-10 dígitos sin DV o con DV)
    const validateNit = (nit: string): { valid: boolean; message?: string } => {
        const cleanNit = nit.replace(/[.\-\s]/g, ''); // Remover puntos, guiones, espacios
        if (!cleanNit) return { valid: false, message: 'Campo requerido' };
        if (!/^\d+$/.test(cleanNit)) return { valid: false, message: 'Solo se permiten números' };
        if (cleanNit.length < 6 || cleanNit.length > 11) {
            return { valid: false, message: 'NIT debe tener entre 6 y 11 dígitos' };
        }
        return { valid: true };
    };

    // Validar nombre (mínimo 2 caracteres, sin caracteres peligrosos)
    const validateName = (name: string): { valid: boolean; message?: string } => {
        const trimmed = name.trim();
        if (!trimmed) return { valid: false, message: 'Campo requerido' };
        if (trimmed.length < 2) return { valid: false, message: 'Mínimo 2 caracteres' };
        if (trimmed.length > 200) return { valid: false, message: 'Máximo 200 caracteres' };
        // Prevenir inyección de caracteres peligrosos
        if (/[<>{}]/.test(trimmed)) return { valid: false, message: 'Caracteres no permitidos' };
        return { valid: true };
    };

    const toggleAlertDay = (day: number) => {
        setFormData(prev => ({
            ...prev,
            alertDays: prev.alertDays.includes(day)
                ? prev.alertDays.filter(d => d !== day)
                : [...prev.alertDays, day]
        }));
    };

    const handleSubmit = () => {
        setSubmitAttempted(true);
        const nameValidation = validateName(formData.name);
        const nitValidation = validateNit(formData.nit);
        if (!nameValidation.valid || !nitValidation.valid) return;
        // Sanitizar datos antes de enviar
        onSubmit({
            ...formData,
            name: formData.name.trim(),
            nit: formData.nit.replace(/[.\-\s]/g, ''), // Limpiar formato
        });
    };

    const nameValidation = validateName(formData.name);
    const nitValidation = validateNit(formData.nit);
    const showNameError = (touched.name || submitAttempted) && !nameValidation.valid;
    const showNitError = (touched.nit || submitAttempted) && !nitValidation.valid;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[30px] w-full max-w-3xl p-8 shadow-2xl overflow-y-auto max-h-[85vh] animate-in zoom-in-95 duration-200">
                <h2 className="text-2xl font-black text-zinc-900 mb-6">Nuevo Calendario Tributario</h2>

                {/* Warning Note */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex gap-3 text-sm text-amber-800">
                    <span className="font-bold">Nota:</span>
                    <p>
                        Para activar las notificaciones automáticas por correo electrónico y WhatsApp, es necesario
                        <span className="font-bold"> crear una cuenta e iniciar sesión</span>.
                        De lo contrario, la vigilancia será solo visual durante esta sesión.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* TYPE OF PROFILE */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Tipo de Perfil</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, classification: 'NATURAL' })}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${formData.classification === 'NATURAL'
                                    ? 'border-zinc-200 bg-zinc-100 text-zinc-800 shadow-inner'
                                    : 'border-transparent bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                                    }`}
                            >
                                Persona Natural
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, classification: 'JURIDICA' })}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${formData.classification === 'JURIDICA'
                                    ? 'border-emerald-100 bg-white text-emerald-600 shadow-sm ring-2 ring-emerald-50'
                                    : 'border-transparent bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                                    }`}
                            >
                                Empresa / Jurídica
                            </button>
                        </div>
                    </div>

                    {/* BASIC INFO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Nombre o Razón Social <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                placeholder="Ej: Inversiones ABC S.A.S"
                                className={`w-full px-4 py-3 bg-zinc-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-colors ${showNameError ? 'border-red-300 bg-red-50' : 'border-zinc-200'
                                    }`}
                            />
                            {showNameError && (
                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {nameValidation.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                NIT / Cédula / Identificación <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nit}
                                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                                onBlur={() => setTouched(prev => ({ ...prev, nit: true }))}
                                placeholder="Ej: 1033724226"
                                className={`w-full px-4 py-3 bg-zinc-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-700 transition-colors ${showNitError ? 'border-red-300 bg-red-50' : 'border-zinc-200'
                                    }`}
                            />
                            {showNitError && (
                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {nitValidation.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* TAX CONFIG */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="text-emerald-600">❖</span> Régimen Tributario
                            </label>
                            <select
                                value={formData.taxRegime}
                                onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium text-zinc-700"
                            >
                                <option value="ORDINARIO">Régimen Ordinario</option>
                                <option value="SIMPLE">Régimen Simple (RST)</option>
                                <option value="ESPECIAL">Régimen Especial</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="text-emerald-600">🛡</span> Periodicidad IVA
                            </label>
                            <select
                                value={formData.ivaPeriodicity}
                                onChange={(e) => setFormData({ ...formData, ivaPeriodicity: e.target.value })}
                                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium text-zinc-700"
                            >
                                <option value="BIMESTRAL">Bimestral</option>
                                <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                <option value="NONE">No responsable</option>
                            </select>
                        </div>
                    </div>

                    {/* ALERTS */}
                    <div>
                        <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <span className="text-orange-500">🔔</span> Personalizar Días de Alerta
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {[30, 15, 7, 3, 1].map((day) => {
                                const isSelected = formData.alertDays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleAlertDay(day)}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold border transition-all ${isSelected
                                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
                                            }`}
                                    >
                                        {isSelected && '✓ '}
                                        {day === 1 ? '1 día antes' : `${day} días antes`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* CHANNELS */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Canales de Alerta
                            </label>
                            {isGuest && (
                                <span className="text-[10px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                                    <Lock className="w-3 h-3" />
                                    REQUIERE CUENTA
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Email Channel */}
                            <div className={`p-4 rounded-2xl border-2 transition-all ${isGuest
                                    ? 'bg-zinc-50 border-zinc-200'
                                    : formData.emailAlert
                                        ? 'bg-emerald-50 border-emerald-300 shadow-md'
                                        : 'bg-white border-zinc-200 hover:border-emerald-200'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${formData.emailAlert && !isGuest ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'
                                        }`}>
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-zinc-800 text-sm">Email</p>
                                        <p className="text-xs text-zinc-400 truncate">Alertas en tu correo</p>
                                    </div>
                                    {isGuest ? (
                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                                            <Lock className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, emailAlert: !formData.emailAlert })}
                                            className={`w-12 h-7 rounded-full p-1 transition-all flex-shrink-0 ${formData.emailAlert ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.emailAlert ? 'translate-x-5' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* WhatsApp Channel */}
                            <div className="p-4 rounded-2xl border-2 bg-zinc-50 border-zinc-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-green-50 text-green-400 flex items-center justify-center flex-shrink-0">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-zinc-500 text-sm">WhatsApp</p>
                                        <p className="text-xs text-zinc-400 truncate">Próximamente</p>
                                    </div>
                                    <span className="text-[9px] bg-zinc-800 text-white px-2 py-1 rounded-md font-bold flex items-center gap-1 flex-shrink-0">
                                        <Sparkles className="w-2.5 h-2.5" /> PRO
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isGuest && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-xs text-emerald-700 font-medium">
                                    Inicia sesión para configurar alertas y recibir recordatorios de vencimientos
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="pt-4 space-y-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${isLoading
                                ? 'bg-zinc-400 text-white cursor-wait'
                                : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creando calendario...
                                </>
                            ) : (
                                <>
                                    <Calendar className="w-5 h-5" />
                                    Crear Calendario de Notificación
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="w-full text-center text-zinc-400 text-sm font-medium hover:text-zinc-600 py-2"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
