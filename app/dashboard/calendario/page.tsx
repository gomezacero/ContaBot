'use client';

import { useState, useMemo } from 'react';
import { CalendarClientConfig, TaxEvent } from '@/types/payroll';
import {
    CalendarDays,
    Bell,
    Search,
    Clock,
    Building2,
    Plus,
    X,
    Save
} from 'lucide-react';

// Simplified tax deadline calculator
const getTaxDeadlines = (nit: string, classification: string): TaxEvent[] => {
    const cleanNit = nit.replace(/\D/g, '');
    const lastDigit = parseInt(cleanNit.slice(-1)) || 0;
    const year = 2025;

    const events: TaxEvent[] = [];

    // Sample deadlines based on classification
    if (classification === 'JURIDICA') {
        const days = ['23', '12', '13', '14', '15', '16', '19', '20', '21', '22'];
        events.push({
            id: 'renta-pj-1',
            title: 'Renta PJ - Cuota 1',
            date: `${year}-05-${days[lastDigit]}`,
            type: 'RENTA',
            status: 'PENDING',
            description: 'Declaración y pago primera cuota'
        });
        events.push({
            id: 'renta-pj-2',
            title: 'Renta PJ - Cuota 2',
            date: `${year}-07-${days[lastDigit]}`,
            type: 'RENTA',
            status: 'PENDING',
            description: 'Pago segunda cuota'
        });
    }

    if (classification === 'NATURAL') {
        events.push({
            id: 'renta-pn',
            title: 'Renta Persona Natural',
            date: `${year}-08-12`,
            type: 'RENTA',
            status: 'PENDING',
            description: 'Declaración anual de renta'
        });
    }

    // IVA Bimestral sample
    const ivaDays = ['25', '11', '12', '13', '14', '17', '18', '19', '20', '21'];
    events.push({
        id: 'iva-1',
        title: 'IVA Bimestral P1',
        date: `${year}-03-${ivaDays[lastDigit]}`,
        type: 'IVA',
        status: 'PENDING',
        description: 'IVA enero-febrero'
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export default function CalendarioPage() {
    const [clients, setClients] = useState<CalendarClientConfig[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedClient, setSelectedClient] = useState<CalendarClientConfig | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        clientName: '',
        nit: '',
        classification: 'JURIDICA' as 'NATURAL' | 'JURIDICA' | 'GRAN_CONTRIBUYENTE',
        ivaPeriodicity: 'BIMESTRAL' as 'BIMESTRAL' | 'CUATRIMESTRAL' | 'NONE',
        isRetentionAgent: true,
        alertDays: [7, 3, 1],
    });

    const handleAddClient = () => {
        const newClient: CalendarClientConfig = {
            id: crypto.randomUUID(),
            clientName: formData.clientName,
            nit: formData.nit,
            classification: formData.classification,
            ivaPeriodicity: formData.ivaPeriodicity,
            isSimpleRegime: false,
            taxRegime: 'ORDINARIO',
            isRetentionAgent: formData.isRetentionAgent,
            wealthSituation: 'DECLARANTE_RENTA',
            sectoralTaxes: [],
            alertDays: formData.alertDays,
            lastUpdated: new Date().toISOString(),
            notifications: {
                emailEnabled: true,
                whatsappEnabled: false,
            }
        };

        setClients([...clients, newClient]);
        setShowForm(false);
        setFormData({
            clientName: '',
            nit: '',
            classification: 'JURIDICA',
            ivaPeriodicity: 'BIMESTRAL',
            isRetentionAgent: true,
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

    const allEvents = useMemo(() => {
        return clients.flatMap(client =>
            getTaxDeadlines(client.nit, client.classification).map(event => ({
                ...event,
                clientName: client.clientName,
                clientNit: client.nit
            }))
        );
    }, [clients]);

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
                            {clients.filter(c =>
                                c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                c.nit.includes(searchTerm)
                            ).map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${selectedClient?.id === client.id
                                        ? 'border-[#1AB1B1] shadow-lg'
                                        : 'border-gray-100 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-[#002D44]">{client.clientName}</p>
                                            <p className="text-sm text-gray-400 font-mono">{client.nit}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${client.classification === 'GRAN_CONTRIBUYENTE' ? 'bg-purple-100 text-purple-700' :
                                            client.classification === 'JURIDICA' ? 'bg-blue-100 text-blue-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                            {client.classification}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Bell className="w-3 h-3" />
                                        Alertas: {client.alertDays.join(', ')} días antes
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel - Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-[#002D44] flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                Próximos Vencimientos
                            </h3>
                        </div>

                        {allEvents.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-400">Agrega clientes para ver sus vencimientos</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                {allEvents.slice(0, 10).map((event) => (
                                    <div
                                        key={`${event.id}-${event.clientNit}`}
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
                                        <div className="flex-1">
                                            <p className="font-bold text-[#002D44]">{event.title}</p>
                                            <p className="text-sm text-gray-500">{event.clientName} • {event.clientNit}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${event.type === 'RENTA' ? 'bg-blue-100 text-blue-700' :
                                            event.type === 'IVA' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
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
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 animate-fade-in">
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
                                    onChange={(e) => setFormData({ ...formData, classification: e.target.value as any })}
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
                                    onChange={(e) => setFormData({ ...formData, ivaPeriodicity: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] bg-white"
                                >
                                    <option value="BIMESTRAL">Bimestral</option>
                                    <option value="CUATRIMESTRAL">Cuatrimestral</option>
                                    <option value="NONE">No aplica</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isRetentionAgent}
                                    onChange={(e) => setFormData({ ...formData, isRetentionAgent: e.target.checked })}
                                    className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                />
                                <span className="text-sm text-gray-700">Es agente retenedor</span>
                            </label>
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
                                disabled={!formData.clientName || !formData.nit}
                                className="flex-1 py-3 bg-[#1AB1B1] text-white rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
