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
    Filter
} from 'lucide-react';

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
    classification: string | null;
    iva_periodicity: string | null;
    is_retention_agent: boolean | null;
    has_gmf: boolean | null;
    requires_exogena: boolean | null;
    has_patrimony_tax: boolean | null;
    alert_days: number[] | null;
}

type TaxType = 'ALL' | 'RENTA' | 'IVA' | 'RETENCION' | 'GMF' | 'EXOGENA' | 'PATRIMONIO';

export default function CalendarioPage() {
    const supabase = createClient();
    const [clients, setClients] = useState<DBClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TaxType>('ALL');
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        clientName: '',
        nit: '',
        classification: 'JURIDICA' as 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE',
        ivaPeriodicity: 'BIMESTRAL' as 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE',
        isRetentionAgent: true,
        hasGmf: false,
        requiresExogena: false,
        hasPatrimonyTax: false,
        alertDays: [7, 3, 1],
    });

    // Load clients from Supabase
    const loadClients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, nit, classification, iva_periodicity, is_retention_agent, has_gmf, requires_exogena, has_patrimony_tax, alert_days')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch {
            console.error('Error loading clients');
            setError('Error cargando clientes');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    const handleAddClient = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { data, error } = await supabase
                .from('clients')
                .insert({
                    user_id: user.id,
                    name: formData.clientName,
                    nit: formData.nit,
                    classification: formData.classification,
                    iva_periodicity: formData.ivaPeriodicity,
                    is_retention_agent: formData.isRetentionAgent,
                    has_gmf: formData.hasGmf,
                    requires_exogena: formData.requiresExogena,
                    has_patrimony_tax: formData.hasPatrimonyTax,
                    alert_days: formData.alertDays,
                })
                .select()
                .single();

            if (error) throw error;
            setClients([...clients, data]);
            setShowForm(false);
            resetForm();
        } catch (err) {
            console.error('Error adding client:', err);
            setError('Error agregando cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm('¿Eliminar este cliente?')) return;
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            setClients(clients.filter(c => c.id !== id));
            if (selectedClientId === id) setSelectedClientId(null);
        } catch {
            setError('Error eliminando cliente');
        }
    };

    const resetForm = () => {
        setFormData({
            clientName: '',
            nit: '',
            classification: 'JURIDICA',
            ivaPeriodicity: 'BIMESTRAL',
            isRetentionAgent: true,
            hasGmf: false,
            requiresExogena: false,
            hasPatrimonyTax: false,
            alertDays: [7, 3, 1],
        });
    };

    const getStatusColor = (date: string) => {
        const today = new Date();
        const dueDate = new Date(date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'bg-gray-100 text-gray-500 border-gray-200';
        if (diffDays <= 5) return 'bg-red-50 text-red-700 border-red-200';
        if (diffDays <= 15) return 'bg-orange-50 text-orange-700 border-orange-200';
        return 'bg-green-50 text-green-700 border-green-200';
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'RENTA': 'bg-blue-100 text-blue-700',
            'IVA': 'bg-purple-100 text-purple-700',
            'RETENCION': 'bg-orange-100 text-orange-700',
            'GMF': 'bg-pink-100 text-pink-700',
            'EXOGENA': 'bg-teal-100 text-teal-700',
            'PATRIMONIO': 'bg-indigo-100 text-indigo-700',
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    // Convert DB client to TaxClientConfig
    const toTaxConfig = (client: DBClient): TaxClientConfig => ({
        nit: client.nit || '',
        classification: (client.classification as TaxClientConfig['classification']) || 'JURIDICA',
        ivaPeriodicity: (client.iva_periodicity as TaxClientConfig['ivaPeriodicity']) || 'BIMESTRAL',
        isRetentionAgent: client.is_retention_agent || false,
        hasGmf: client.has_gmf || false,
        requiresExogena: client.requires_exogena || false,
        hasPatrimonyTax: client.has_patrimony_tax || false,
    });

    // Calculate all events
    const allEvents = useMemo(() => {
        const clientsToUse = selectedClientId
            ? clients.filter(c => c.id === selectedClientId)
            : clients;

        const events = clientsToUse.flatMap(client =>
            getTaxDeadlines(toTaxConfig(client)).map(event => ({
                ...event,
                clientName: client.name,
                clientNit: client.nit,
                clientId: client.id,
            }))
        );

        // Apply type filter
        if (filterType !== 'ALL') {
            return events.filter(e => e.type === filterType);
        }
        return events;
    }, [clients, selectedClientId, filterType]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nit && c.nit.includes(searchTerm))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#1AB1B1]" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#002D44] mb-2">Calendario Tributario</h1>
                    <p className="text-gray-500">Vigilancia de vencimientos DIAN por NIT</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-[#1AB1B1] text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-teal-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Agregar Cliente
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-red-700">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-500" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel - Client List */}
                <div className="space-y-6">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por NIT o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                        />
                    </div>

                    {/* Client Cards */}
                    {clients.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-bold text-gray-400 mb-2">Sin clientes</p>
                            <p className="text-sm text-gray-400">Agrega un cliente para ver su calendario tributario</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* All clients button */}
                            <button
                                onClick={() => setSelectedClientId(null)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedClientId === null
                                        ? 'border-[#1AB1B1] bg-teal-50'
                                        : 'border-gray-100 bg-white hover:shadow-md'
                                    }`}
                            >
                                <p className="font-bold text-[#002D44]">📊 Todos los clientes</p>
                                <p className="text-sm text-gray-500">{clients.length} clientes registrados</p>
                            </button>

                            {filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => setSelectedClientId(client.id)}
                                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${selectedClientId === client.id
                                        ? 'border-[#1AB1B1] shadow-lg'
                                        : 'border-gray-100 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-[#002D44]">{client.name}</p>
                                            <p className="text-sm text-gray-400 font-mono">{client.nit}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${client.classification === 'GRAN_CONTRIBUYENTE' ? 'bg-purple-100 text-purple-700' :
                                                    client.classification === 'JURIDICA' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                {client.classification}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                                className="p-1 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Bell className="w-3 h-3" />
                                        {client.is_retention_agent && <span className="bg-orange-50 px-2 py-0.5 rounded">Retenedor</span>}
                                        {client.has_gmf && <span className="bg-pink-50 px-2 py-0.5 rounded">GMF</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel - Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-4 h-4 text-gray-400" />
                        {(['ALL', 'RENTA', 'IVA', 'RETENCION', 'GMF', 'EXOGENA', 'PATRIMONIO'] as TaxType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${filterType === type
                                        ? 'bg-[#1AB1B1] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {type === 'ALL' ? 'Todos' : type}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-[#002D44] flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                Próximos Vencimientos
                                {selectedClientId && (
                                    <span className="text-sm font-normal text-gray-500">
                                        - {clients.find(c => c.id === selectedClientId)?.name}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {allEvents.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-400">
                                    {clients.length === 0
                                        ? 'Agrega clientes para ver sus vencimientos'
                                        : 'No hay vencimientos para el filtro seleccionado'}
                                </p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                                {allEvents.slice(0, 50).map((event, idx) => (
                                    <div
                                        key={`${event.id}-${(event as TaxEvent & { clientId: string }).clientId}-${idx}`}
                                        className={`flex items-center gap-4 p-4 rounded-xl border ${getStatusColor(event.date)}`}
                                    >
                                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm">
                                            <span className="text-xs font-bold text-gray-400">
                                                {new Date(event.date).toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()}
                                            </span>
                                            <span className="text-lg font-black text-[#002D44]">
                                                {new Date(event.date).getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[#002D44] truncate">{event.title}</p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {(event as TaxEvent & { clientName: string }).clientName} • {(event as TaxEvent & { clientNit: string }).clientNit}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${getTypeColor(event.type)}`}>
                                            {event.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Client Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-[#002D44]">Agregar Cliente</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Cliente</label>
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="Empresa S.A.S"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">NIT</label>
                                <input
                                    type="text"
                                    value={formData.nit}
                                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="900123456-1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Clasificación</label>
                                <select
                                    value={formData.classification}
                                    onChange={(e) => setFormData({ ...formData, classification: e.target.value as typeof formData.classification })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] bg-white"
                                >
                                    <option value="NATURAL">Persona Natural</option>
                                    <option value="JURIDICA">Persona Jurídica</option>
                                    <option value="GRAN_CONTRIBUYENTE">Gran Contribuyente</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Periodicidad IVA</label>
                                <select
                                    value={formData.ivaPeriodicity}
                                    onChange={(e) => setFormData({ ...formData, ivaPeriodicity: e.target.value as typeof formData.ivaPeriodicity })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] bg-white"
                                >
                                    <option value="BIMESTRAL">Bimestral</option>
                                    <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                    <option value="NONE">No aplica</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRetentionAgent}
                                        onChange={(e) => setFormData({ ...formData, isRetentionAgent: e.target.checked })}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">Agente retenedor</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasGmf}
                                        onChange={(e) => setFormData({ ...formData, hasGmf: e.target.checked })}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">GMF (4x1000)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresExogena}
                                        onChange={(e) => setFormData({ ...formData, requiresExogena: e.target.checked })}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">Info Exógena</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasPatrimonyTax}
                                        onChange={(e) => setFormData({ ...formData, hasPatrimonyTax: e.target.checked })}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">Imp. Patrimonio</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddClient}
                                disabled={!formData.clientName || !formData.nit || saving}
                                className="flex-1 py-3 bg-[#1AB1B1] text-white rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
