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
    ArrowLeft,
    Settings,
    Mail,
    MessageCircle,
    Check,
    ShieldAlert,
    Info,
    Hourglass,
    User as UserIcon,
    UserCircle2,
    Layers,
    ShieldCheck,
    Calendar as CalendarIcon,
    Users,
    CloudUpload
} from 'lucide-react';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import { useFeedback } from '@/components/feedback';
import { useClient } from '@/lib/context/ClientContext';
import {
    getLocalClients,
    addLocalClient,
    deleteLocalClient,
    clearLocalClients,
    LocalClient
} from '@/lib/local-storage';
import { getLocalDataCount, migrateLocalDataToSupabase } from '@/lib/migrate-local-data';

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
    target_emails: string[] | null;
    // New 2026 taxes
    has_carbon_tax: boolean | null;
    has_beverage_tax: boolean | null;
    has_fuel_tax: boolean | null;
    has_plastic_tax: boolean | null;
    requires_rub: boolean | null;
    requires_transfer_pricing: boolean | null;
    requires_country_report: boolean | null;
}

const AVAILABLE_ALERT_DAYS = [30, 15, 7, 3, 1];

// Toggle component for notifications
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <label className={`flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} group`}>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
            <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-zinc-300'}`}></div>
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

export default function CalendarioPage() {
    const supabase = createClient();
    const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
    const isGuest = !isAuthenticated;
    const { trackAction } = useFeedback();

    // Global client context for sync - calendario has extended DBClient with more fields
    const {
        selectedClientId: globalSelectedClientId,
        setSelectedClientId: setGlobalSelectedClientId,
        refreshClients: refreshGlobalClients
    } = useClient();

    // View state - key change from original
    const [view, setView] = useState<'dashboard' | 'client_detail' | 'add_client'>('dashboard');

    // Extended client data specific to calendario (more fields than basic ClientInfo)
    const [clients, setClients] = useState<DBClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedClientId, setSelectedClientIdLocal] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sync local selectedClientId with global context
    const setSelectedClientId = useCallback((id: string | null) => {
        setSelectedClientIdLocal(id);
        // Also update global context so header shows the selected client
        if (isAuthenticated) {
            setGlobalSelectedClientId(id);
        }
    }, [isAuthenticated, setGlobalSelectedClientId]);

    // Sync from global on mount (if user selected client in another module)
    useEffect(() => {
        if (isAuthenticated && globalSelectedClientId && !selectedClientId) {
            setSelectedClientIdLocal(globalSelectedClientId);
        }
    }, [isAuthenticated, globalSelectedClientId, selectedClientId]);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<DBClient | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Migration state
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [localDataCount, setLocalDataCount] = useState(0);

    // Edit form state
    const [editConfig, setEditConfig] = useState({
        id: '',
        clientName: '',
        nit: '',
        classification: 'JURIDICA' as 'NATURAL' | 'JURIDICA',
        taxRegime: 'ORDINARIO' as string,
        ivaPeriodicity: 'BIMESTRAL' as string,
        alertDays: [15, 7, 1] as number[],
        emailEnabled: true,
        targetEmails: [] as string[],
        whatsappEnabled: false,
        targetPhone: '',
        // New 2026 taxes
        hasCarbonTax: false,
        hasBeverageTax: false,
        hasFuelTax: false,
        hasPlasticTax: false,
        requiresRUB: false,
        requiresTransferPricing: false,
        requiresCountryReport: false,
    });
    const [newEmail, setNewEmail] = useState('');

    // Load clients
    const loadClients = useCallback(async () => {
        if (authLoading) return;

        try {
            if (isAuthenticated) {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name, nit, classification, tax_regime, iva_periodicity, is_retention_agent, has_gmf, requires_exogena, has_patrimony_tax, alert_days, email_alert, whatsapp_alert, target_emails, has_carbon_tax, has_beverage_tax, has_fuel_tax, has_plastic_tax, requires_rub, requires_transfer_pricing, requires_country_report')
                    .order('name');

                if (error) throw error;
                setClients(data || []);
            } else {
                const localClients = getLocalClients();
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
                    target_emails: (c as any).target_emails || null,
                    has_carbon_tax: (c as any).has_carbon_tax || null,
                    has_beverage_tax: (c as any).has_beverage_tax || null,
                    has_fuel_tax: (c as any).has_fuel_tax || null,
                    has_plastic_tax: (c as any).has_plastic_tax || null,
                    requires_rub: (c as any).requires_rub || null,
                    requires_transfer_pricing: (c as any).requires_transfer_pricing || null,
                    requires_country_report: (c as any).requires_country_report || null,
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

    // Check for local data to migrate
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const count = getLocalDataCount();
            if (count > 0) {
                setLocalDataCount(count);
                setShowMigrationModal(true);
            }
        }
    }, [isAuthenticated, authLoading]);

    const handleMigration = async () => {
        setMigrating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const result = await migrateLocalDataToSupabase(user.id, supabase);
            if (result.success) {
                setShowMigrationModal(false);
                loadClients();
            } else {
                setError(`Error en migración: ${result.errors.join(', ')}`);
            }
        } catch (err) {
            setError('Error migrando datos');
        } finally {
            setMigrating(false);
        }
    };

    const skipMigration = () => {
        clearLocalClients();
        setShowMigrationModal(false);
    };

    // Reset form for new client
    const resetForm = () => {
        setEditConfig({
            id: '',
            clientName: '',
            nit: '',
            classification: 'JURIDICA',
            taxRegime: 'ORDINARIO',
            ivaPeriodicity: 'BIMESTRAL',
            alertDays: [15, 7, 1],
            emailEnabled: true,
            targetEmails: [],
            whatsappEnabled: false,
            targetPhone: '',
            hasCarbonTax: false,
            hasBeverageTax: false,
            hasFuelTax: false,
            hasPlasticTax: false,
            requiresRUB: false,
            requiresTransferPricing: false,
            requiresCountryReport: false,
        });
    };

    // Load client into form for editing
    const loadClientToForm = (client: DBClient) => {
        setEditConfig({
            id: client.id,
            clientName: client.name,
            nit: client.nit || '',
            classification: (client.classification as 'NATURAL' | 'JURIDICA') || 'JURIDICA',
            taxRegime: client.tax_regime || 'ORDINARIO',
            ivaPeriodicity: client.iva_periodicity || 'BIMESTRAL',
            alertDays: client.alert_days || [15, 7, 1],
            emailEnabled: client.email_alert || false,
            targetEmails: client.target_emails || [],
            whatsappEnabled: client.whatsapp_alert || false,
            targetPhone: '',
            hasCarbonTax: client.has_carbon_tax || false,
            hasBeverageTax: client.has_beverage_tax || false,
            hasFuelTax: client.has_fuel_tax || false,
            hasPlasticTax: client.has_plastic_tax || false,
            requiresRUB: client.requires_rub || false,
            requiresTransferPricing: client.requires_transfer_pricing || false,
            requiresCountryReport: client.requires_country_report || false,
        });
    };

    // Handle save client
    const handleSaveClient = async () => {
        if (!editConfig.clientName || !editConfig.nit) {
            setError('El nombre y NIT son obligatorios');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            if (isAuthenticated) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user');

                if (editConfig.id) {
                    // Update existing
                    const { error } = await supabase
                        .from('clients')
                        .update({
                            name: editConfig.clientName,
                            nit: editConfig.nit,
                            classification: editConfig.classification,
                            tax_regime: editConfig.taxRegime,
                            iva_periodicity: editConfig.ivaPeriodicity,
                            is_retention_agent: editConfig.taxRegime !== 'SIMPLE',
                            alert_days: editConfig.alertDays,
                            email_alert: editConfig.emailEnabled,
                            target_emails: editConfig.targetEmails,
                            whatsapp_alert: editConfig.whatsappEnabled,
                            // New 2026 taxes
                            has_carbon_tax: editConfig.hasCarbonTax,
                            has_beverage_tax: editConfig.hasBeverageTax,
                            has_fuel_tax: editConfig.hasFuelTax,
                            has_plastic_tax: editConfig.hasPlasticTax,
                            requires_rub: editConfig.requiresRUB,
                            requires_transfer_pricing: editConfig.requiresTransferPricing,
                            requires_country_report: editConfig.requiresCountryReport,
                        })
                        .eq('id', editConfig.id);

                    if (error) throw error;
                } else {
                    // Insert new
                    const { data, error } = await supabase
                        .from('clients')
                        .insert({
                            user_id: user.id,
                            name: editConfig.clientName,
                            nit: editConfig.nit,
                            classification: editConfig.classification,
                            tax_regime: editConfig.taxRegime,
                            iva_periodicity: editConfig.ivaPeriodicity,
                            is_retention_agent: editConfig.taxRegime !== 'SIMPLE',
                            has_gmf: true,
                            requires_exogena: false,
                            has_patrimony_tax: false,
                            alert_days: editConfig.alertDays,
                            email_alert: editConfig.emailEnabled,
                            target_emails: editConfig.targetEmails,
                            whatsapp_alert: editConfig.whatsappEnabled,
                            // New 2026 taxes
                            has_carbon_tax: editConfig.hasCarbonTax,
                            has_beverage_tax: editConfig.hasBeverageTax,
                            has_fuel_tax: editConfig.hasFuelTax,
                            has_plastic_tax: editConfig.hasPlasticTax,
                            requires_rub: editConfig.requiresRUB,
                            requires_transfer_pricing: editConfig.requiresTransferPricing,
                            requires_country_report: editConfig.requiresCountryReport,
                        })
                        .select()
                        .single();

                    if (error) throw error;
                }
            } else {
                // Anonymous: localStorage
                const newClient = addLocalClient({
                    name: editConfig.clientName,
                    nit: editConfig.nit,
                    classification: editConfig.classification,
                    tax_regime: editConfig.taxRegime,
                    iva_periodicity: editConfig.ivaPeriodicity,
                    is_retention_agent: editConfig.taxRegime !== 'SIMPLE',
                    has_gmf: true,
                    requires_exogena: false,
                    has_patrimony_tax: false,
                    alert_days: editConfig.alertDays,
                    email_alert: false,
                    whatsapp_alert: false,
                });
            }

            await loadClients();
            // Also refresh global clients so other modules see the new/updated client
            if (isAuthenticated) {
                await refreshGlobalClients();
            }
            setView('dashboard');
            resetForm();

            // Track para feedback después de guardar cliente exitosamente
            trackAction('calendario', 'save_client');
        } catch (err) {
            console.error('Error saving client:', err);
            setError('Error guardando calendario');
        } finally {
            setProcessing(false);
        }
    };

    // Delete client
    const handleDeleteClient = (client: DBClient, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteTarget(client);
        setDeleteConfirmText('');
    };

    const confirmDelete = async () => {
        if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;

        setProcessing(true);
        try {
            if (isAuthenticated) {
                // Use soft delete via RPC for safe deletion with audit trail
                const { error } = await supabase.rpc('soft_delete_record', {
                    p_table_name: 'clients',
                    p_record_id: deleteTarget.id,
                    p_reason: 'Usuario confirmo eliminacion desde calendario'
                });
                if (error) throw error;
            } else {
                deleteLocalClient(deleteTarget.id);
            }

            setClients(clients.filter(c => c.id !== deleteTarget.id));
            if (selectedClientId === deleteTarget.id) {
                setSelectedClientId(null);
                setView('dashboard');
            }
            // Also refresh global clients so other modules see the deletion
            if (isAuthenticated) {
                await refreshGlobalClients();
            }
            setDeleteTarget(null);
            setDeleteConfirmText('');
        } catch {
            setError('Error eliminando cliente');
        } finally {
            setProcessing(false);
        }
    };

    // Convert DB client to TaxClientConfig
    const toTaxConfig = (client: DBClient): TaxClientConfig => ({
        nit: client.nit || '',
        classification: (client.classification as any) || 'JURIDICA',
        taxRegime: (client.tax_regime as any) || 'ORDINARIO',
        ivaPeriodicity: (client.iva_periodicity as any) || 'BIMESTRAL',
        isRetentionAgent: client.is_retention_agent || false,
        hasGmf: client.has_gmf || false,
        requiresExogena: client.requires_exogena || false,
        hasPatrimonyTax: client.has_patrimony_tax || false,
        // New 2026 taxes
        hasCarbonTax: client.has_carbon_tax || false,
        hasBeverageTax: client.has_beverage_tax || false,
        hasFuelTax: client.has_fuel_tax || false,
        hasPlasticTax: client.has_plastic_tax || false,
        requiresRUB: client.requires_rub || false,
        requiresTransferPricing: client.requires_transfer_pricing || false,
        requiresCountryReport: client.requires_country_report || false,
    });

    const activeClient = useMemo(() =>
        clients.find(c => c.id === selectedClientId),
        [selectedClientId, clients]);

    const activeEvents = useMemo(() => {
        if (!activeClient) return [];
        const allEvents = getTaxDeadlines(toTaxConfig(activeClient));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allEvents
            .filter(event => new Date(event.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [activeClient]);

    const nextDeadline = useMemo(() => {
        if (!activeEvents.length) return null;
        return activeEvents[0];
    }, [activeEvents]);

    const daysUntilNext = useMemo(() => {
        if (!nextDeadline) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(nextDeadline.date);
        const diff = due.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }, [nextDeadline]);

    // Toggle alert day
    const toggleAlertDay = (day: number) => {
        const current = editConfig.alertDays;
        if (current.includes(day)) {
            setEditConfig({ ...editConfig, alertDays: current.filter(d => d !== day) });
        } else {
            setEditConfig({ ...editConfig, alertDays: [...current, day].sort((a, b) => b - a) });
        }
    };

    // Add email
    const addEmail = () => {
        if (!newEmail.includes('@')) return;
        if (editConfig.targetEmails.includes(newEmail)) return;
        setEditConfig({
            ...editConfig,
            targetEmails: [...editConfig.targetEmails, newEmail]
        });
        setNewEmail('');
    };

    const removeEmail = (email: string) => {
        setEditConfig({
            ...editConfig,
            targetEmails: editConfig.targetEmails.filter(e => e !== email)
        });
    };

    // Switch to Natural profile
    const switchToNatural = () => {
        setEditConfig({
            ...editConfig,
            classification: 'NATURAL',
            taxRegime: 'ORDINARIO',
            ivaPeriodicity: 'NONE'
        });
    };

    // Switch to Juridica profile
    const switchToJuridica = () => {
        setEditConfig({
            ...editConfig,
            classification: 'JURIDICA',
            taxRegime: 'ORDINARIO',
            ivaPeriodicity: 'BIMESTRAL'
        });
    };

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* GUEST BANNER */}
            {isGuest && (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-emerald-600 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-emerald-900 leading-tight">Registro necesario para activar notificaciones</h4>
                            <p className="text-sm text-emerald-700/80">Debes iniciar sesión para que Contabio pueda enviarte correos de alerta automáticos y guardar tus clientes permanentemente.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-500" /></button>
                </div>
            )}

            {/* ==================== DASHBOARD VIEW ==================== */}
            {view === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                                <CalendarDays className="w-8 h-8 text-emerald-600" />
                                Mis Calendarios Contables
                            </h2>
                            <p className="text-zinc-500 mt-1 font-medium">Gestión automatizada de vencimientos 2026.</p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setView('add_client'); }}
                            className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Agregar Calendario
                        </button>
                    </div>

                    {clients.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-zinc-200 p-20 text-center flex flex-col items-center">
                            <Users className="w-12 h-12 text-zinc-300 mb-4" />
                            <h3 className="text-xl font-bold text-zinc-900 mb-2">No hay calendarios</h3>
                            <p className="text-zinc-500 max-w-sm mb-8">Registra un cliente con su NIT para autogenerar su calendario de obligaciones.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                                        <tr>
                                            <th className="px-8 py-4">Nombre / Razón Social</th>
                                            <th className="px-8 py-4">NIT / Cédula</th>
                                            <th className="px-8 py-4">Alertas</th>
                                            <th className="px-8 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {clients.map(client => (
                                            <tr
                                                key={client.id}
                                                className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                                                onClick={() => { setSelectedClientId(client.id); setView('client_detail'); }}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${client.classification === 'NATURAL' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                            {client.classification === 'NATURAL' ? <UserIcon className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-zinc-900">{client.name}</span>
                                                            <span className="text-[10px] text-zinc-400 uppercase font-bold">{client.tax_regime}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-mono text-sm text-zinc-500">{client.nit}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg border ${client.email_alert ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-zinc-50 border-zinc-100 text-zinc-300'}`}>
                                                            <Mail className="w-4 h-4" />
                                                        </div>
                                                        <div className="ml-2 flex -space-x-1">
                                                            {(client.alert_days || [15, 7, 1]).slice(0, 3).map(day => (
                                                                <span key={day} className="w-5 h-5 rounded-full bg-zinc-100 border border-white text-[8px] flex items-center justify-center font-bold text-zinc-500">{day}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); loadClientToForm(client); setView('add_client'); }}
                                                            className="p-2 text-zinc-400 hover:text-emerald-600 rounded-lg transition-all"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteClient(client, e)}
                                                            className="p-2 text-zinc-300 hover:text-red-500 rounded-lg transition-all"
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

            {/* ==================== ADD/EDIT CLIENT VIEW ==================== */}
            {view === 'add_client' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Listado
                    </button>

                    <div className="bg-white rounded-2xl p-10 border border-zinc-100 shadow-xl relative overflow-hidden">
                        <h2 className="text-2xl font-bold text-zinc-900 mb-8">{editConfig.id ? 'Editar Calendario' : 'Nuevo Calendario Tributario'}</h2>

                        {isGuest && (
                            <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>Nota:</strong> Para activar las notificaciones automáticas por correo electrónico, es necesario <strong>crear una cuenta e iniciar sesión</strong>.
                                </p>
                            </div>
                        )}

                        <div className="space-y-8 mb-10">
                            {/* Profile Type Tabs */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-zinc-500 uppercase ml-1">Tipo de Perfil</label>
                                <div className="flex p-1 bg-zinc-100 rounded-xl w-full max-w-md">
                                    <button
                                        type="button"
                                        onClick={switchToNatural}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${editConfig.classification === 'NATURAL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                                            }`}
                                    >
                                        <UserCircle2 className="w-4 h-4" /> Persona Natural
                                    </button>
                                    <button
                                        type="button"
                                        onClick={switchToJuridica}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${editConfig.classification === 'JURIDICA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                                            }`}
                                    >
                                        <Building2 className="w-4 h-4" /> Empresa / Jurídica
                                    </button>
                                </div>
                            </div>

                            {/* Name and NIT */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase ml-1 flex items-center gap-1">
                                        Nombre o Razón Social <span className="text-red-500 font-black">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={editConfig.classification === 'NATURAL' ? "Ej: Juan Pérez" : "Ej: Inversiones ABC S.A.S"}
                                        className={`w-full px-5 py-4 bg-zinc-50 border rounded-xl outline-none font-medium focus:ring-4 focus:ring-emerald-500/10 transition-all ${editConfig.clientName ? 'border-emerald-200 bg-white' : 'border-zinc-200'}`}
                                        value={editConfig.clientName}
                                        onChange={e => setEditConfig({ ...editConfig, clientName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase ml-1 flex items-center gap-1">
                                        NIT / Cédula / Identificación <span className="text-red-500 font-black">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 1033724226"
                                        className={`w-full px-5 py-4 bg-zinc-50 border rounded-xl outline-none font-mono focus:ring-4 focus:ring-emerald-500/10 transition-all ${editConfig.nit ? 'border-emerald-200 bg-white' : 'border-zinc-200'}`}
                                        value={editConfig.nit}
                                        onChange={e => setEditConfig({ ...editConfig, nit: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                            </div>

                            {/* Regime and IVA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-100 pt-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <Layers className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Régimen Tributario</h3>
                                    </div>
                                    <select
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm font-medium"
                                        value={editConfig.taxRegime}
                                        onChange={e => setEditConfig({ ...editConfig, taxRegime: e.target.value })}
                                    >
                                        <option value="ORDINARIO">Régimen Ordinario</option>
                                        <option value="SIMPLE">Régimen SIMPLE (RST)</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <ShieldCheck className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Periodicidad IVA</h3>
                                    </div>
                                    <select
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-sm font-medium"
                                        value={editConfig.ivaPeriodicity}
                                        onChange={e => setEditConfig({ ...editConfig, ivaPeriodicity: e.target.value })}
                                    >
                                        <option value="NONE">No Responsable</option>
                                        <option value="BIMESTRAL">Bimestral</option>
                                        <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                    </select>
                                </div>

                                {/* Alert Days */}
                                <div className="space-y-4 md:col-span-2">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <Bell className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Personalizar Días de Alerta</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {AVAILABLE_ALERT_DAYS.map(day => {
                                            const isSelected = editConfig.alertDays.includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleAlertDay(day)}
                                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${isSelected
                                                            ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
                                                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-amber-100'
                                                        }`}
                                                >
                                                    {isSelected && <Check className="w-4 h-4" />}
                                                    {day} {day === 1 ? 'día' : 'días'} antes
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* New 2026 Special Taxes */}
                                <div className="space-y-4 md:col-span-2 pt-4 border-t border-zinc-100">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <Layers className="w-4 h-4" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Impuestos Especiales 2026</h3>
                                    </div>
                                    <p className="text-xs text-zinc-500 -mt-2">Selecciona los impuestos adicionales que aplican a este contribuyente.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {/* Carbon Tax */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.hasCarbonTax ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.hasCarbonTax}
                                                onChange={e => setEditConfig({ ...editConfig, hasCarbonTax: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Imp. Carbono</span>
                                                <p className="text-[10px] text-zinc-500">Bimestral</p>
                                            </div>
                                        </label>

                                        {/* Beverage Tax */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.hasBeverageTax ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.hasBeverageTax}
                                                onChange={e => setEditConfig({ ...editConfig, hasBeverageTax: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Bebidas Ultraprocesadas</span>
                                                <p className="text-[10px] text-zinc-500">Bimestral</p>
                                            </div>
                                        </label>

                                        {/* Fuel Tax */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.hasFuelTax ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.hasFuelTax}
                                                onChange={e => setEditConfig({ ...editConfig, hasFuelTax: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Gasolina / ACPM</span>
                                                <p className="text-[10px] text-zinc-500">Mensual</p>
                                            </div>
                                        </label>

                                        {/* Plastic Tax */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.hasPlasticTax ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.hasPlasticTax}
                                                onChange={e => setEditConfig({ ...editConfig, hasPlasticTax: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Plasticos Uso Unico</span>
                                                <p className="text-[10px] text-zinc-500">Anual (Feb)</p>
                                            </div>
                                        </label>

                                        {/* RUB */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.requiresRUB ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.requiresRUB}
                                                onChange={e => setEditConfig({ ...editConfig, requiresRUB: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">RUB</span>
                                                <p className="text-[10px] text-zinc-500">Beneficiarios Finales</p>
                                            </div>
                                        </label>

                                        {/* Transfer Pricing */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.requiresTransferPricing ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.requiresTransferPricing}
                                                onChange={e => setEditConfig({ ...editConfig, requiresTransferPricing: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Precios Transferencia</span>
                                                <p className="text-[10px] text-zinc-500">Anual (Sep)</p>
                                            </div>
                                        </label>

                                        {/* Country Report */}
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${editConfig.requiresCountryReport ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:border-emerald-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={editConfig.requiresCountryReport}
                                                onChange={e => setEditConfig({ ...editConfig, requiresCountryReport: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-zinc-900">Informe Pais por Pais</span>
                                                <p className="text-[10px] text-zinc-500">Anual (Dic)</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Channels */}
                            <div className="space-y-4 pt-8 border-t border-zinc-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Configurar Canales de Alerta</h3>
                                    {isGuest && (
                                        <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" /> Registro Requerido
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Email */}
                                    <div className={`bg-zinc-50 rounded-2xl p-6 border border-zinc-100 ${isGuest && 'opacity-60 grayscale cursor-not-allowed'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-emerald-500" />
                                                <span className="text-sm font-bold text-zinc-900">Notificación vía Email</span>
                                            </div>
                                            <Toggle
                                                checked={!isGuest && editConfig.emailEnabled}
                                                onChange={v => !isGuest && setEditConfig({ ...editConfig, emailEnabled: v })}
                                                disabled={isGuest}
                                            />
                                        </div>

                                        {!isGuest && editConfig.emailEnabled && (
                                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="email"
                                                        placeholder="correo@ejemplo.com"
                                                        className="flex-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none"
                                                        value={newEmail}
                                                        onChange={e => setNewEmail(e.target.value)}
                                                        onKeyPress={e => e.key === 'Enter' && addEmail()}
                                                    />
                                                    <button onClick={addEmail} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Añadir</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {editConfig.targetEmails.map(email => (
                                                        <div key={email} className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 flex items-center gap-2">
                                                            <span className="text-[10px] font-medium text-zinc-700">{email}</span>
                                                            <button onClick={() => removeEmail(email)} className="text-zinc-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* WhatsApp (Pro) */}
                                    <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 opacity-40 cursor-not-allowed relative overflow-hidden">
                                        <div className="absolute top-2 right-2">
                                            <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded text-[8px] font-bold uppercase">Pro</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <MessageCircle className="w-5 h-5 text-green-500" />
                                                <span className="text-sm font-bold text-zinc-900">WhatsApp</span>
                                            </div>
                                            <Toggle checked={false} onChange={() => { }} disabled />
                                        </div>
                                        <p className="text-[10px] text-zinc-400">Canal exclusivo para usuarios con plan profesional.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveClient}
                            disabled={processing}
                            className="w-full bg-zinc-900 text-white py-5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {editConfig.id ? 'Guardar Cambios' : 'Crear Calendario de Notificación'}
                        </button>

                        {isGuest && (
                            <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                                <ShieldAlert className="w-3.5 h-3.5" /> Vigilancia offline activa. Las alertas externas requieren registro.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== CLIENT DETAIL VIEW ==================== */}
            {view === 'client_detail' && activeClient && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase bg-white border border-zinc-200 px-3 py-1 rounded-full">NIT: {activeClient.nit}</span>
                            <button onClick={() => { loadClientToForm(activeClient); setView('add_client'); }} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left: Client Info Card */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-zinc-900 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-40 h-40 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Vigilando a</p>
                                            <h2 className="text-2xl font-bold truncate max-w-[180px]">{activeClient.name}</h2>
                                        </div>
                                        <div className="p-3 bg-white/10 rounded-2xl">
                                            {activeClient.classification === 'NATURAL' ? <UserIcon className="w-6 h-6 text-emerald-400" /> : <Building2 className="w-6 h-6 text-emerald-400" />}
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 space-y-3">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 font-bold uppercase">Régimen:</span>
                                            <span className="font-mono">{activeClient.tax_regime}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 font-bold uppercase">IVA:</span>
                                            <span className="font-mono">{activeClient.iva_periodicity === 'NONE' ? 'NO' : activeClient.iva_periodicity}</span>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 p-5 rounded-xl border border-white/10 text-center">
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            <Hourglass className="w-5 h-5 text-amber-400" />
                                            <span className="text-xs font-bold uppercase text-zinc-300">Próximo Vencimiento</span>
                                        </div>
                                        <div className="flex items-baseline justify-center gap-2">
                                            <span className="text-4xl font-black">{daysUntilNext ?? '-'}</span>
                                            <span className="text-sm font-bold text-zinc-400">días</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-2 italic truncate">{nextDeadline?.title || 'Sin vencimientos próximos'}</p>
                                    </div>
                                </div>
                            </div>

                            {isGuest && (
                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl flex items-start gap-4 shadow-sm animate-pulse">
                                    <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                                    <div>
                                        <h5 className="text-sm font-bold text-amber-900">Requiere Registro</h5>
                                        <p className="text-xs text-amber-800/80 leading-relaxed mt-1">Este calendario es temporal. Regístrate para activar las notificaciones automáticas.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Events Table */}
                        <div className="lg:col-span-8">
                            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5 text-zinc-500" /> Cronograma Tributario 2026
                                    </h3>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-md border-b border-zinc-100 tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Fecha</th>
                                                <th className="px-6 py-4 font-bold">Obligación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {activeEvents.length > 0 ? (
                                                activeEvents.map((evt, idx) => (
                                                    <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-zinc-900">
                                                                    {new Date(evt.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                                                                    {new Date(evt.date).getFullYear()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`w-2 h-2 rounded-full ${
                                                                    evt.type === 'RENTA' ? 'bg-emerald-500' :
                                                                    evt.type === 'IVA' ? 'bg-emerald-600' :
                                                                    evt.type === 'SIMPLE' ? 'bg-purple-500' :
                                                                    evt.type === 'RETEFUENTE' || evt.type === 'RETENCION' ? 'bg-orange-500' :
                                                                    evt.type === 'PATRIMONIO' ? 'bg-pink-500' :
                                                                    evt.type === 'EXOGENA' ? 'bg-cyan-500' :
                                                                    evt.type === 'CARBONO' ? 'bg-lime-500' :
                                                                    evt.type === 'BEBIDAS' ? 'bg-amber-500' :
                                                                    evt.type === 'GASOLINA' ? 'bg-red-500' :
                                                                    evt.type === 'PLASTICOS' ? 'bg-teal-500' :
                                                                    evt.type === 'RUB' ? 'bg-indigo-500' :
                                                                    evt.type === 'PRECIOS_TRANSFERENCIA' ? 'bg-violet-500' :
                                                                    evt.type === 'INFORME_PAIS' ? 'bg-rose-500' :
                                                                    'bg-zinc-500'
                                                                }`}></span>
                                                                <p className="font-bold text-zinc-900">{evt.title}</p>
                                                            </div>
                                                            <p className="text-xs text-zinc-500 truncate max-w-xs">{evt.description}</p>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-10 text-center text-zinc-500 italic">
                                                        No hay obligaciones pendientes registradas.
                                                    </td>
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

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-zinc-900">Eliminar Calendario</h3>
                                <p className="text-sm text-zinc-500">Esta acción no se puede deshacer</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                            <p className="text-sm text-red-800">
                                Se eliminará permanentemente el calendario de{' '}
                                <span className="font-bold">{deleteTarget.name}</span> junto con toda su configuración.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                Para confirmar, escribe: <span className="text-red-600">{deleteTarget.name}</span>
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Escribe el nombre exacto..."
                                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                                disabled={processing}
                                className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={processing || deleteConfirmText !== deleteTarget.name}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${deleteConfirmText === deleteTarget.name
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                    }`}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Migration Modal */}
            {showMigrationModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <CloudUpload className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-zinc-900">¡Datos Locales Encontrados!</h3>
                                <p className="text-sm text-zinc-500">Tienes {localDataCount} calendario(s) guardado(s) localmente</p>
                            </div>
                        </div>

                        <p className="text-zinc-600 mb-6">
                            ¿Deseas migrar tus calendarios guardados en este navegador a tu cuenta?
                            Así no los perderás y podrás acceder desde cualquier dispositivo.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={skipMigration}
                                disabled={migrating}
                                className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleMigration}
                                disabled={migrating}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                {migrating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Migrando...</>
                                ) : (
                                    <><CloudUpload className="w-5 h-5" /> Migrar a la Nube</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
