'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { TaxEvent } from '@/types/payroll';
import { getTaxDeadlines, TaxClientConfig } from '@/lib/tax-deadlines';
import { createClient } from '@/lib/supabase/client';
import {
    CalendarDays,
    Bell,
    Search,
    Clock,
    Building2,
    Plus,
    X,
    Save,
    Loader2,
    Trash2,
    Filter,
    ArrowRight,
    Cloud,
    HardDrive,
    CloudUpload
} from 'lucide-react';
import { TaxCalendarEmptyState } from '@/components/tax-calendar/EmptyState';
import { TaxCalendarForm } from '@/components/tax-calendar/TaxCalendarForm';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import { GuestBanner } from '@/components/ui/GuestBanner';
import {
    getLocalClients,
    addLocalClient,
    deleteLocalClient,
    clearLocalClients,
    LocalClient
} from '@/lib/local-storage';
import { hasLocalDataToMigrate, getLocalDataCount, migrateLocalDataToSupabase } from '@/lib/migrate-local-data';

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
    classification: string | null;
    tax_regime: string | null;
    iva_periodicity: string | null;
    is_retention_agent: boolean | null;
    has_gmf: boolean | null;
    requires_exogena: boolean | null;
    has_patrimony_tax: boolean | null;
    alert_days: number[] | null;
    email_alert: boolean | null;
    whatsapp_alert: boolean | null;
}

type TaxType = 'ALL' | 'RENTA' | 'IVA' | 'RETENCION' | 'GMF' | 'EXOGENA' | 'PATRIMONIO';

export default function CalendarioPage() {
    const supabase = createClient();
    const { isAuthenticated, isLoading: authLoading } = useAuthStatus();

    const [clients, setClients] = useState<DBClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TaxType>('ALL');
    const [error, setError] = useState<string | null>(null);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<DBClient | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Migration state
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [localDataCount, setLocalDataCount] = useState(0);

    // Load clients - from Supabase if authenticated, localStorage if not
    const loadClients = useCallback(async () => {
        // Wait until auth state is determined
        if (authLoading) return;

        try {
            if (isAuthenticated) {
                // Authenticated: Load from Supabase
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name, nit, classification, tax_regime, iva_periodicity, is_retention_agent, has_gmf, requires_exogena, has_patrimony_tax, alert_days, email_alert, whatsapp_alert')
                    .order('name');

                if (error) throw error;
                setClients(data || []);
            } else {
                // Anonymous: Load from localStorage
                const localClients = getLocalClients();
                // Map LocalClient to DBClient format
                const mappedClients: DBClient[] = localClients.map(c => ({
                    id: c.id,
                    name: c.name,
                    nit: c.nit,
                    classification: c.classification,
                    tax_regime: c.tax_regime,
                    iva_periodicity: c.iva_periodicity,
                    is_retention_agent: c.is_retention_agent,
                    has_gmf: c.has_gmf,
                    requires_exogena: c.requires_exogena,
                    has_patrimony_tax: c.has_patrimony_tax,
                    alert_days: c.alert_days,
                    email_alert: c.email_alert,
                    whatsapp_alert: c.whatsapp_alert,
                }));
                setClients(mappedClients);
            }
        } catch {
            console.error('Error loading clients');
            setError('Error cargando clientes');
        } finally {
            setLoading(false);
        }
    }, [supabase, isAuthenticated, authLoading]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    // Check for local data to migrate when authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const count = getLocalDataCount();
            if (count > 0) {
                setLocalDataCount(count);
                setShowMigrationModal(true);
            }
        }
    }, [isAuthenticated, authLoading]);

    // Handle migration of local data to Supabase
    const handleMigration = async () => {
        setMigrating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const result = await migrateLocalDataToSupabase(user.id, supabase);

            if (result.success) {
                setShowMigrationModal(false);
                // Reload clients from Supabase
                loadClients();
            } else {
                setError(`Error en migración: ${result.errors.join(', ')}`);
            }
        } catch (err) {
            setError('Error migrando datos');
            console.error(err);
        } finally {
            setMigrating(false);
        }
    };

    // Skip migration and clear local data
    const skipMigration = () => {
        clearLocalClients();
        setShowMigrationModal(false);
    };

    const handleCreateCalendar = async (formData: any) => {
        setProcessing(true);
        setError(null);
        try {
            if (isAuthenticated) {
                // Authenticated: Save to Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user');

                const { data, error } = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        name: formData.name,
                        nit: formData.nit,
                        classification: formData.classification,
                        tax_regime: formData.taxRegime,
                        iva_periodicity: formData.ivaPeriodicity,
                        is_retention_agent: formData.taxRegime !== 'SIMPLE',
                        has_gmf: true,
                        requires_exogena: false,
                        has_patrimony_tax: false,
                        alert_days: formData.alertDays,
                        email_alert: formData.emailAlert,
                        whatsapp_alert: formData.whatsappAlert
                    })
                    .select()
                    .single();

                if (error) throw error;
                setClients([...clients, data]);
                setSelectedClientId(data.id);
            } else {
                // Anonymous: Save to localStorage
                const newClient = addLocalClient({
                    name: formData.name,
                    nit: formData.nit,
                    classification: formData.classification,
                    tax_regime: formData.taxRegime,
                    iva_periodicity: formData.ivaPeriodicity,
                    is_retention_agent: formData.taxRegime !== 'SIMPLE',
                    has_gmf: true,
                    requires_exogena: false,
                    has_patrimony_tax: false,
                    alert_days: formData.alertDays,
                    email_alert: false, // Disabled for anonymous
                    whatsapp_alert: false,
                });

                // Map to DBClient and add to state
                const mappedClient: DBClient = {
                    id: newClient.id,
                    name: newClient.name,
                    nit: newClient.nit,
                    classification: newClient.classification,
                    tax_regime: newClient.tax_regime,
                    iva_periodicity: newClient.iva_periodicity,
                    is_retention_agent: newClient.is_retention_agent,
                    has_gmf: newClient.has_gmf,
                    requires_exogena: newClient.requires_exogena,
                    has_patrimony_tax: newClient.has_patrimony_tax,
                    alert_days: newClient.alert_days,
                    email_alert: newClient.email_alert,
                    whatsapp_alert: newClient.whatsapp_alert,
                };
                setClients([...clients, mappedClient]);
                setSelectedClientId(newClient.id);
            }
            setShowForm(false);
        } catch (err) {
            console.error('Error adding client:', err);
            setError('Error agregando calendario');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteClient = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const client = clients.find(c => c.id === id);
        if (client) {
            setDeleteTarget(client);
            setDeleteConfirmText('');
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;

        setProcessing(true);
        try {
            if (isAuthenticated) {
                // Authenticated: Delete from Supabase
                const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
                if (error) throw error;
            } else {
                // Anonymous: Delete from localStorage
                deleteLocalClient(deleteTarget.id);
            }

            setClients(clients.filter(c => c.id !== deleteTarget.id));
            if (selectedClientId === deleteTarget.id) setSelectedClientId(null);
            setDeleteTarget(null);
            setDeleteConfirmText('');
        } catch {
            setError('Error eliminando cliente');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (date: string) => {
        const today = new Date();
        const dueDate = new Date(date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'bg-gray-50 border-gray-200 text-gray-400 grayscale'; // Expired
        if (diffDays <= 5) return 'bg-red-50 border-red-200 text-red-700 shadow-red-100'; // Critical
        if (diffDays <= 15) return 'bg-orange-50 border-orange-200 text-orange-700 shadow-orange-100'; // Warning
        return 'bg-green-50 border-green-200 text-green-700 shadow-green-100'; // Safe
    };

    // Helper: Convert DB client to TaxClientConfig (approximated for now)
    const toTaxConfig = (client: DBClient): TaxClientConfig => ({
        nit: client.nit || '',
        classification: (client.classification as any) || 'JURIDICA',
        taxRegime: (client.tax_regime as any) || 'ORDINARIO',
        ivaPeriodicity: (client.iva_periodicity as any) || 'BIMESTRAL',
        isRetentionAgent: client.is_retention_agent || false,
        hasGmf: client.has_gmf || false,
        requiresExogena: client.requires_exogena || false,
        hasPatrimonyTax: client.has_patrimony_tax || false,
    });

    const activeEvents = useMemo(() => {
        if (!selectedClientId) return [];
        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return [];
        const allEvents = getTaxDeadlines(toTaxConfig(client));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter to only show future events (or events happening today)
        return allEvents
            .filter(event => new Date(event.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [clients, selectedClientId]);

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-black" />
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50/50 p-8 pb-20 font-sans animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#002D44] flex items-center gap-3">
                            <CalendarDays className="w-8 h-8 text-[#4B6BFB]" />
                            Mis Calendarios Contables
                        </h1>
                        <p className="text-gray-500 font-medium ml-11">Gestión automatizada de vencimientos 2025.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-black/10"
                    >
                        <Plus className="w-5 h-5" />
                        Agregar Calendario
                    </button>
                </div>

                {clients.length === 0 ? (
                    <div className="h-[60vh]">
                        <TaxCalendarEmptyState />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left List - Clients */}
                        <div className="lg:col-span-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 bg-white shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`group p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${selectedClientId === client.id
                                            ? 'bg-white border-black ring-1 ring-black shadow-lg'
                                            : 'bg-white border-gray-100 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-[#002D44] text-lg leading-tight">{client.name}</h3>
                                                <p className="text-xs font-mono text-gray-400 mt-1">{client.nit}</p>
                                            </div>
                                            {selectedClientId === client.id && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">
                                                {client.classification}
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteClient(client.id, e)}
                                                className="ml-auto p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Panel - Timeline */}
                        <div className="lg:col-span-8">
                            {selectedClientId ? (
                                <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm p-8 min-h-[600px]">
                                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Próximo Vencimiento</p>
                                            <h2 className="text-3xl font-black text-[#002D44]">
                                                {activeEvents[0]?.title || 'Al día'}
                                            </h2>
                                        </div>
                                        {activeEvents[0] && (() => {
                                            const daysLeft = Math.ceil((new Date(activeEvents[0].date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            const isUrgent = daysLeft <= 5;
                                            const isWarning = daysLeft <= 15;
                                            return (
                                                <div className={`text-center px-6 py-3 rounded-2xl border ${isUrgent ? 'bg-red-50 border-red-100' :
                                                    isWarning ? 'bg-orange-50 border-orange-100' :
                                                        'bg-green-50 border-green-100'
                                                    }`}>
                                                    <p className={`font-bold text-3xl ${isUrgent ? 'text-red-600' :
                                                        isWarning ? 'text-orange-600' :
                                                            'text-green-600'
                                                        }`}>
                                                        {daysLeft}
                                                    </p>
                                                    <p className={`text-[10px] font-bold uppercase ${isUrgent ? 'text-red-400' :
                                                        isWarning ? 'text-orange-400' :
                                                            'text-green-400'
                                                        }`}>Días Restantes</p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Timeline */}
                                    <div className="space-y-4">
                                        {activeEvents.map((event, idx) => {
                                            const date = new Date(event.date);
                                            const statusClasses = getStatusColor(event.date);

                                            return (
                                                <div key={idx} className={`flex items-center gap-6 p-5 rounded-2xl border hover:scale-[1.01] transition-transform ${statusClasses} bg-opacity-40`}>
                                                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm flex-shrink-0">
                                                        <span className="text-xs font-bold text-gray-400 uppercase">{date.toLocaleDateString('es-CO', { month: 'short' })}</span>
                                                        <span className="text-2xl font-black text-slate-800">{date.getDate()}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-lg mb-1">{event.title}</h4>
                                                        <p className="text-xs opacity-80 font-medium">{event.description}</p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-white/50 rounded-full border border-black/5">
                                                            {event.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center">
                                    <Clock className="w-16 h-16 text-gray-200 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-400">Selecciona un cliente</h3>
                                    <p className="text-gray-400">Visualiza el calendario de obligaciones detallado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showForm && (
                    <TaxCalendarForm
                        onSubmit={handleCreateCalendar}
                        onCancel={() => setShowForm(false)}
                        isLoading={processing}
                        isGuest={!isAuthenticated}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Eliminar Calendario</h3>
                                    <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                                <p className="text-sm text-red-800">
                                    Se eliminará permanentemente el calendario de{' '}
                                    <span className="font-bold">{deleteTarget.name}</span> junto con toda su configuración.
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Para confirmar, escribe: <span className="text-red-600">{deleteTarget.name}</span>
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="Escribe el nombre exacto..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none font-medium"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setDeleteTarget(null);
                                        setDeleteConfirmText('');
                                    }}
                                    disabled={processing}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={processing || deleteConfirmText !== deleteTarget.name}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${deleteConfirmText === deleteTarget.name
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {processing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Migration Modal */}
            {showMigrationModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                                <CloudUpload className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#002D44]">¡Datos Locales Encontrados!</h3>
                                <p className="text-sm text-gray-500">Tienes {localDataCount} calendario(s) guardado(s) localmente</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-6">
                            ¿Deseas migrar tus calendarios guardados en este navegador a tu cuenta?
                            Así no los perderás y podrás acceder desde cualquier dispositivo.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={skipMigration}
                                disabled={migrating}
                                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleMigration}
                                disabled={migrating}
                                className="flex-1 py-3 rounded-xl bg-[#1AB1B1] text-white font-bold hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
                            >
                                {migrating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Migrando...
                                    </>
                                ) : (
                                    <>
                                        <CloudUpload className="w-5 h-5" />
                                        Migrar a la Nube
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Guest Banner for anonymous users */}
            {!isAuthenticated && <GuestBanner />}
        </>
    );
}
