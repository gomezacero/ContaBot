
import React, { useState, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, 
    Bell, 
    Search, 
    Clock, 
    Building2, 
    CalendarDays, 
    Settings, 
    Plus, 
    X, 
    Save, 
    FolderOpen, 
    Trash2, 
    Mail, 
    MessageCircle, 
    ExternalLink, 
    ArrowLeft,
    CheckCircle2,
    CalendarPlus,
    ChevronRight,
    Users,
    ShieldAlert,
    Info,
    Smartphone,
    Hourglass,
    Briefcase,
    User as UserIcon,
    Crown,
    Trash,
    Layers,
    ShieldCheck,
    Coins,
    Gem,
    Check,
    UserCircle2,
    Phone,
    AlertCircle,
    Sparkles,
    LogIn
} from 'lucide-react';
import { getTaxDeadlines, TaxEvent, calculateAlerts } from '../utils/taxCalendarLogic';
import ModuleFeedback from './ModuleFeedback';
import { CalendarClientConfig, TaxClientClassification, TaxIvaPeriodicity } from '../types';

const PREDEFINED_SPECIAL_TAXES = [
    "ICA (Anual)",
    "ICA (Bimestral)",
    "ReteICA",
    "Impoconsumo",
    "Impuesto al Carbono",
    "Sobretasa Bomberil",
    "Estampilla Pro-Cultura",
    "Contribución Turismo"
];

const AVAILABLE_ALERT_DAYS = [30, 15, 7, 3, 1];

interface Props {
    onActionTrigger?: () => void;
    savedConfigs?: CalendarClientConfig[];
    onSaveConfig?: (config: CalendarClientConfig) => void;
    onDeleteConfig?: (id: string) => void;
    isUserLoggedIn?: boolean;
}

const TaxCalendarView: React.FC<Props> = ({ 
    onActionTrigger, 
    savedConfigs = [], 
    onSaveConfig, 
    onDeleteConfig,
    isUserLoggedIn = false 
}) => {
    const [view, setView] = useState<'dashboard' | 'client_detail' | 'add_client'>('dashboard');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newSpecialTax, setNewSpecialTax] = useState('');

    const [editConfig, setEditConfig] = useState<CalendarClientConfig>({
        id: '',
        clientName: '',
        nit: '',
        classification: 'JURIDICA', 
        ivaPeriodicity: 'BIMESTRAL', 
        isSimpleRegime: false,
        taxRegime: 'ORDINARIO',
        isRetentionAgent: false,
        wealthSituation: 'DECLARANTE_RENTA',
        sectoralTaxes: [],
        alertDays: [15, 5, 1],
        lastUpdated: '',
        notifications: {
            emailEnabled: true,
            whatsappEnabled: false,
            targetEmails: [],
            targetPhone: ''
        }
    });

    const isNatural = editConfig.classification === 'NATURAL';

    const activeClient = useMemo(() => 
        savedConfigs.find(c => c.id === selectedClientId), 
    [selectedClientId, savedConfigs]);

    const activeEvents = useMemo(() => {
        if (!activeClient) return [];
        const baseEvents = getTaxDeadlines(activeClient);
        return baseEvents.map(evt => ({
            ...evt,
            alertDates: calculateAlertDates(evt.date, activeClient.alertDays || [15, 5, 1])
        }));
    }, [activeClient]);

    function calculateAlertDates(dueDate: string, daysBeforeList: number[]) {
        return calculateAlerts(dueDate, daysBeforeList);
    }

    const nextDeadline = useMemo(() => {
        if (!activeEvents.length) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return activeEvents.find(evt => new Date(evt.date) >= now) || activeEvents[0];
    }, [activeEvents]);

    const daysUntilNext = useMemo(() => {
        if (!nextDeadline) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(nextDeadline.date);
        const diff = due.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }, [nextDeadline]);

    const handleSaveClient = () => {
        if (!editConfig.clientName || !editConfig.nit) {
            alert("El nombre y la identificación (NIT/Cédula) son obligatorios.");
            return;
        }

        const configToSave: CalendarClientConfig = {
            ...editConfig,
            id: editConfig.id || crypto.randomUUID(),
            lastUpdated: new Date().toISOString()
        };
        
        onSaveConfig?.(configToSave);
        if (isUserLoggedIn) setView('dashboard');
        if (onActionTrigger) onActionTrigger();
    };

    const switchToNatural = () => {
        setEditConfig({
            ...editConfig,
            classification: 'NATURAL',
            taxRegime: 'SIMPLIFICADO', 
            ivaPeriodicity: 'NONE', 
            isRetentionAgent: false 
        });
    };

    const switchToJuridica = () => {
        setEditConfig({
            ...editConfig,
            classification: 'JURIDICA',
            taxRegime: 'ORDINARIO',
            ivaPeriodicity: 'BIMESTRAL',
            isRetentionAgent: true
        });
    };

    const toggleAlertDay = (day: number) => {
        const current = editConfig.alertDays || [];
        if (current.includes(day)) {
            setEditConfig({ ...editConfig, alertDays: current.filter(d => d !== day) });
        } else {
            setEditConfig({ ...editConfig, alertDays: [...current, day].sort((a, b) => b - a) });
        }
    };

    const addEmail = () => {
        if (!newEmail.includes('@')) {
            alert("Ingresa un correo válido");
            return;
        }
        const currentEmails = editConfig.notifications.targetEmails || [];
        if (currentEmails.includes(newEmail)) return;
        
        setEditConfig({
            ...editConfig,
            notifications: {
                ...editConfig.notifications,
                targetEmails: [...currentEmails, newEmail]
            }
        });
        setNewEmail('');
    };

    const removeEmail = (email: string) => {
        const currentEmails = editConfig.notifications.targetEmails || [];
        setEditConfig({
            ...editConfig,
            notifications: {
                ...editConfig.notifications,
                targetEmails: currentEmails.filter(e => e !== email)
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* REGISTER REQUIRED BANNER */}
            {!isUserLoggedIn && (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 mb-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-indigo-900 leading-tight">Registro necesario para activar notificaciones</h4>
                            <p className="text-sm text-indigo-700/80">Debes iniciar sesión para que ContaBot pueda enviarte correos de alerta automáticos y guardar tus clientes permanentemente.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
                    </div>
                </div>
            )}

            {/* 1. DASHBOARD VIEW */}
            {view === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                                <CalendarDays className="w-8 h-8 text-blue-600" />
                                Mis Calendarios Contables
                            </h2>
                            <p className="text-gray-500 mt-1">Gestión automatizada de vencimientos 2025.</p>
                        </div>
                        <button 
                            onClick={() => {
                                setEditConfig({ id: '', clientName: '', nit: '', classification: 'JURIDICA', ivaPeriodicity: 'BIMESTRAL', isSimpleRegime: false, taxRegime: 'ORDINARIO', isRetentionAgent: false, wealthSituation: 'DECLARANTE_RENTA', sectoralTaxes: [], alertDays: [15, 5, 1], lastUpdated: '', notifications: { emailEnabled: true, whatsappEnabled: false, targetEmails: [], targetPhone: '' } });
                                setView('add_client');
                            }}
                            className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Agregar Calendario
                        </button>
                    </div>

                    {savedConfigs.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 p-20 text-center flex flex-col items-center">
                            <Users className="w-12 h-12 text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No hay calendarios</h3>
                            <p className="text-gray-500 max-w-sm mb-8">Registra un cliente con su NIT para autogenerar su calendario de obligaciones.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-4">Nombre / Razón Social</th>
                                            <th className="px-8 py-4">NIT / Cédula</th>
                                            <th className="px-8 py-4">Alertas</th>
                                            <th className="px-8 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {savedConfigs.map(client => (
                                            <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => { setSelectedClientId(client.id); setView('client_detail'); }}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                                            client.classification === 'JURIDICA' || client.classification === 'GRAN_CONTRIBUYENTE' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                            {client.classification === 'NATURAL' ? <UserIcon className="w-5 h-5"/> : <Building2 className="w-5 h-5"/>}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900">{client.clientName}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{client.taxRegime}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-mono text-sm text-gray-500">{client.nit}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg border ${client.notifications.emailEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-300'}`} title="Email">
                                                            <Mail className="w-4 h-4" />
                                                        </div>
                                                        <div className="ml-2 flex -space-x-1">
                                                            {(client.alertDays || [15, 5, 1]).map(day => (
                                                                <span key={day} className="w-5 h-5 rounded-full bg-gray-100 border border-white text-[8px] flex items-center justify-center font-bold text-gray-500">{day}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setEditConfig(client); setView('add_client'); }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar calendario?')) onDeleteConfig?.(client.id); }}
                                                            className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 2. ADD / EDIT CLIENT VIEW */}
            {view === 'add_client' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Listado
                    </button>
                    
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">{editConfig.id ? 'Editar Calendario' : 'Nuevo Calendario Tributario'}</h2>
                        
                        {!isUserLoggedIn && (
                            <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>Nota:</strong> Para activar las notificaciones automáticas por correo electrónico y WhatsApp, es necesario <strong>crear una cuenta e iniciar sesión</strong>. De lo contrario, la vigilancia será solo visual durante esta sesión.
                                </p>
                            </div>
                        )}

                        <div className="space-y-8 mb-10">
                            
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Tipo de Perfil</label>
                                <div className="flex p-1 bg-gray-100 rounded-2xl w-full max-w-md">
                                    <button 
                                        type="button"
                                        onClick={switchToNatural}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
                                            editConfig.classification === 'NATURAL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <UserCircle2 className="w-4 h-4" /> Persona Natural
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={switchToJuridica}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
                                            (editConfig.classification === 'JURIDICA' || editConfig.classification === 'GRAN_CONTRIBUYENTE') ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4" /> Empresa / Jurídica
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1">
                                        Nombre o Razón Social <span className="text-red-500 font-black">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder={editConfig.classification === 'NATURAL' ? "Ej: Juan Pérez" : "Ej: Inversiones ABC S.A.S"} 
                                        className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none font-medium focus:ring-4 focus:ring-blue-500/10 transition-all ${!editConfig.clientName && 'border-gray-200'} ${editConfig.clientName && 'border-blue-200 bg-white'}`} 
                                        value={editConfig.clientName} 
                                        onChange={e => setEditConfig({...editConfig, clientName: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1">
                                        NIT / Cédula / Identificación <span className="text-red-500 font-black">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: 1033724226" 
                                        className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none font-mono focus:ring-4 focus:ring-blue-500/10 transition-all ${!editConfig.nit && 'border-gray-200'} ${editConfig.nit && 'border-blue-200 bg-white'}`} 
                                        value={editConfig.nit} 
                                        onChange={e => setEditConfig({...editConfig, nit: e.target.value.replace(/\D/g, '')})} 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <Layers className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Régimen Tributario</h3>
                                    </div>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium"
                                        value={editConfig.taxRegime}
                                        onChange={e => setEditConfig({...editConfig, taxRegime: e.target.value as any})}
                                    >
                                        <option value="ORDINARIO">Régimen Ordinario</option>
                                        <option value="SIMPLE">Régimen SIMPLE (RST)</option>
                                        {isNatural ? (
                                            <option value="SIMPLIFICADO">Régimen Simplificado</option>
                                        ) : (
                                            <option value="ESPECIAL">Régimen Especial (ESAL)</option>
                                        )}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <ShieldCheck className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Periodicidad IVA</h3>
                                    </div>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium"
                                        value={editConfig.ivaPeriodicity}
                                        onChange={e => setEditConfig({...editConfig, ivaPeriodicity: e.target.value as any})}
                                    >
                                        <option value="NONE">No Responsable</option>
                                        <option value="BIMESTRAL">Bimestral</option>
                                        <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-4 md:col-span-2">
                                    <div className="flex items-center gap-2 text-red-600">
                                        <Bell className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Personalizar Días de Alerta</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {AVAILABLE_ALERT_DAYS.map(day => {
                                            const isSelected = (editConfig.alertDays || []).includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleAlertDay(day)}
                                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                                                        isSelected 
                                                        ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' 
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-red-100'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-4 h-4" />}
                                                    {day} {day === 1 ? 'día' : 'días'} antes
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-8 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configurar Canales de Alerta</h3>
                                     {!isUserLoggedIn && (
                                         <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                             <ShieldAlert className="w-3 h-3" /> Registro Requerido
                                         </span>
                                     )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`bg-gray-50 rounded-3xl p-6 border border-gray-100 ${!isUserLoggedIn && 'opacity-60 grayscale cursor-not-allowed'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-blue-500"/>
                                                <span className="text-sm font-bold text-gray-900 block">Notificación vía Email</span>
                                            </div>
                                            <Toggle checked={isUserLoggedIn && editConfig.notifications.emailEnabled} onChange={v => isUserLoggedIn && setEditConfig({...editConfig, notifications: {...editConfig.notifications, emailEnabled: v}})} disabled={!isUserLoggedIn} />
                                        </div>

                                        {isUserLoggedIn && editConfig.notifications.emailEnabled && (
                                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="email" 
                                                        placeholder="correo@ejemplo.com"
                                                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none"
                                                        value={newEmail}
                                                        onChange={e => setNewEmail(e.target.value)}
                                                        onKeyPress={e => e.key === 'Enter' && addEmail()}
                                                    />
                                                    <button onClick={addEmail} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Añadir</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {editConfig.notifications.targetEmails?.map(email => (
                                                        <div key={email} className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-2">
                                                            <span className="text-[10px] font-medium text-gray-700">{email}</span>
                                                            <button onClick={() => removeEmail(email)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 opacity-40 cursor-not-allowed relative overflow-hidden">
                                        <div className="absolute top-2 right-2">
                                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[8px] font-bold uppercase">Pro</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <MessageCircle className="w-5 h-5 text-green-500"/>
                                                <span className="text-sm font-bold text-gray-900 block">WhatsApp</span>
                                            </div>
                                            <Toggle checked={false} onChange={() => {}} disabled />
                                        </div>
                                        <p className="text-[10px] text-gray-400">Canal exclusivo para usuarios con plan profesional.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveClient} className="w-full bg-black text-white py-5 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-xl transition-all active:scale-95">
                            <Save className="w-5 h-5" /> {editConfig.id ? 'Guardar Cambios' : 'Crear Calendario de Notificación'}
                        </button>
                        
                        {!isUserLoggedIn && (
                            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                                <ShieldAlert className="w-3.5 h-3.5" /> Vigilancia offline activa. Las alertas externas requieren registro.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 3. CLIENT DETAIL VIEW */}
            {view === 'client_detail' && activeClient && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                         <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-black transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase bg-white border border-gray-200 px-3 py-1 rounded-full">NIT: {activeClient.nit}</span>
                             <button onClick={() => { setEditConfig(activeClient); setView('add_client'); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Settings className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-indigo-950 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-40 h-40 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Vigilando a</p>
                                            <h2 className="text-2xl font-bold truncate max-w-[180px]">{activeClient.clientName}</h2>
                                        </div>
                                        <div className="p-3 bg-white/10 rounded-2xl">
                                            {activeClient.classification === 'NATURAL' ? <UserIcon className="w-6 h-6 text-emerald-400"/> : <Building2 className="w-6 h-6 text-blue-400"/>}
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-indigo-300 font-bold uppercase">Régimen:</span>
                                            <span className="font-mono">{activeClient.taxRegime}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-indigo-300 font-bold uppercase">IVA:</span>
                                            <span className="font-mono">{activeClient.ivaPeriodicity === 'NONE' ? 'NO' : activeClient.ivaPeriodicity}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="bg-white/10 p-5 rounded-3xl border border-white/10 text-center">
                                            <div className="flex items-center justify-center gap-3 mb-2">
                                                <Hourglass className="w-5 h-5 text-yellow-400" />
                                                <span className="text-xs font-bold uppercase text-indigo-200">Próximo Vencimiento</span>
                                            </div>
                                            <div className="flex items-baseline justify-center gap-2">
                                                <span className="text-4xl font-black">{daysUntilNext}</span>
                                                <span className="text-sm font-bold text-indigo-300">días</span>
                                            </div>
                                            <p className="text-[10px] text-indigo-300 mt-2 italic truncate">{nextDeadline?.title}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!isUserLoggedIn && (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-pulse">
                                    <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                                    <div>
                                        <h5 className="text-sm font-bold text-amber-900">Requiere Registro</h5>
                                        <p className="text-xs text-amber-800/80 leading-relaxed mt-1">Este calendario es temporal. Regístrate para activar las notificaciones automáticas y vigilancia permanente en la nube.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8">
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-gray-500" /> Cronograma Tributario 2025</h3>
                                </div>
                                <div className="overflow-y-auto flex-1 custom-scrollbar">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md border-b border-gray-100 tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Fecha</th>
                                                <th className="px-6 py-4 font-bold">Obligación</th>
                                                <th className="px-6 py-4 font-bold text-center">Sync</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {activeEvents.length > 0 ? (
                                                activeEvents.map(evt => (
                                                    <tr key={evt.id} className="hover:bg-gray-50/80 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-900">{new Date(evt.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                                                                <span className="text-[10px] font-mono text-gray-400 uppercase">{new Date(evt.date).getFullYear()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`w-2 h-2 rounded-full ${
                                                                    evt.type === 'RENTA' ? 'bg-emerald-500' :
                                                                    evt.type === 'IVA' ? 'bg-blue-500' :
                                                                    evt.type === 'SIMPLE' ? 'bg-purple-500' :
                                                                    evt.type === 'EXTERIOR' ? 'bg-amber-500' :
                                                                    evt.type === 'RETEFUENTE' ? 'bg-orange-500' : 'bg-gray-500'
                                                                }`}></span>
                                                                <p className="font-bold text-gray-900">{evt.title}</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate max-w-xs">{evt.description}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <CalendarPlus className="w-5 h-5 text-gray-200 inline-block" />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay obligaciones pendientes registradas.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <ModuleFeedback moduleName="Calendario Tributario Inteligente" />
        </div>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} group`}>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
            <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

export default TaxCalendarView;
