'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, RotateCcw, Loader2, AlertTriangle, Clock, FileText, Users, Building2, Receipt, Calculator, ChevronDown, Search, Timer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface DeletedRecord {
    table_name: string;
    record_id: string;
    record_snapshot: Record<string, unknown> | null;
    created_at: string;
    user_email: string | null;
    reason: string | null;
}

const TABLE_ICONS: Record<string, React.ReactNode> = {
    clients: <Building2 className="w-5 h-5" />,
    employees: <Users className="w-5 h-5" />,
    ocr_results: <Receipt className="w-5 h-5" />,
    payroll_records: <Calculator className="w-5 h-5" />,
    liquidation_records: <FileText className="w-5 h-5" />,
};

const TABLE_LABELS: Record<string, string> = {
    clients: 'Clientes',
    employees: 'Empleados',
    ocr_results: 'Documentos OCR',
    payroll_records: 'Registros de Nomina',
    liquidation_records: 'Liquidaciones',
};

export default function PapeleraPage() {
    const supabase = createClient();
    const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
    const { addToast } = useToast();

    const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Filter records by search query
    const filteredRecords = useMemo(() => {
        if (!searchQuery.trim()) return deletedRecords;
        const query = searchQuery.toLowerCase();
        return deletedRecords.filter(record => {
            const displayName = getDisplayName(record).toLowerCase();
            const tableName = (TABLE_LABELS[record.table_name] || record.table_name).toLowerCase();
            return displayName.includes(query) || tableName.includes(query);
        });
    }, [deletedRecords, searchQuery]);

    // Calculate days remaining before permanent deletion (30 days retention)
    const getDaysRemaining = (deletedAt: string): number => {
        const deletedDate = new Date(deletedAt);
        const expirationDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    };

    const loadDeletedRecords = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        setError(null);
        try {
            let query = supabase
                .from('audit_log')
                .select('table_name, record_id, record_snapshot, created_at, user_email, reason')
                .eq('action', 'SOFT_DELETE')
                .order('created_at', { ascending: false })
                .limit(100);

            if (filter !== 'all') {
                query = query.eq('table_name', filter);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setDeletedRecords(data || []);
        } catch (err) {
            console.error('Error loading deleted records:', err);
            setError('Error al cargar registros eliminados');
        } finally {
            setLoading(false);
        }
    }, [supabase, isAuthenticated, filter]);

    useEffect(() => {
        if (!authLoading) {
            loadDeletedRecords();
        }
    }, [loadDeletedRecords, authLoading]);

    const handleRestore = async (tableName: string, recordId: string, displayName: string) => {
        setRestoring(recordId);
        setError(null);
        try {
            const { data, error: restoreError } = await supabase.rpc('restore_deleted_record', {
                p_table_name: tableName,
                p_record_id: recordId
            });

            if (restoreError) throw restoreError;

            const result = data as { success: boolean; error?: string };
            if (!result.success) {
                throw new Error(result.error || 'Error restaurando registro');
            }

            // Remove from list
            setDeletedRecords(prev => prev.filter(r => r.record_id !== recordId));

            // Show success toast
            addToast({
                type: 'success',
                title: 'Registro restaurado',
                description: `"${displayName}" ha sido restaurado correctamente`
            });
        } catch (err) {
            console.error('Error restoring:', err);
            setError('Error al restaurar el registro');
            addToast({
                type: 'error',
                title: 'Error al restaurar',
                description: 'No se pudo restaurar el registro. Intenta de nuevo.'
            });
        } finally {
            setRestoring(null);
        }
    };

    const getDisplayName = (record: DeletedRecord): string => {
        const snapshot = record.record_snapshot;
        if (!snapshot) return 'Registro eliminado';

        switch (record.table_name) {
            case 'clients':
            case 'employees':
                return (snapshot.name as string) || 'Sin nombre';
            case 'ocr_results':
                return (snapshot.filename as string) || (snapshot.vendor as string) || 'Documento';
            case 'payroll_records':
                return `Nomina ${snapshot.period_start || ''} - ${snapshot.period_end || ''}`;
            case 'liquidation_records':
                return `Liquidacion ${snapshot.termination_date || ''}`;
            default:
                return (snapshot.name as string) || record.record_id.slice(0, 8);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <Trash2 className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-400 mb-2">Papelera no disponible</h2>
                <p className="text-gray-400 mb-6">
                    Inicia sesion para acceder a la papelera y recuperar registros eliminados.
                </p>
                <Link
                    href="/login"
                    className="px-6 py-3 bg-[#002D44] text-white rounded-xl font-bold hover:bg-[#003d5c] transition-colors"
                >
                    Iniciar Sesion
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[#002D44] flex items-center gap-3">
                        <Trash2 className="w-7 h-7 text-red-500" />
                        Papelera de Reciclaje
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Registros eliminados recientemente. Puedes restaurarlos en cualquier momento.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar registros..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent w-full sm:w-56"
                        />
                    </div>

                    {/* Filter dropdown */}
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="appearance-none px-4 py-2.5 pr-10 border border-gray-200 rounded-xl bg-white font-medium text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent w-full"
                        >
                            <option value="all">Todos los tipos</option>
                            <option value="clients">Clientes</option>
                            <option value="employees">Empleados</option>
                            <option value="ocr_results">Documentos OCR</option>
                            <option value="payroll_records">Nominas</option>
                            <option value="liquidation_records">Liquidaciones</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Empty state */}
            {filteredRecords.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Trash2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">
                        {searchQuery ? 'Sin resultados' : 'Papelera vacia'}
                    </h3>
                    <p className="text-gray-400 text-sm mt-2">
                        {searchQuery
                            ? `No se encontraron registros que coincidan con "${searchQuery}"`
                            : filter === 'all'
                                ? 'No hay registros eliminados'
                                : `No hay ${TABLE_LABELS[filter]?.toLowerCase() || 'registros'} eliminados`}
                    </p>
                </div>
            ) : (
                /* Records table */
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Eliminado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Por</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Expira</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRecords.map((record) => {
                                    const daysRemaining = getDaysRemaining(record.created_at);
                                    const isUrgent = daysRemaining <= 7;
                                    const isWarning = daysRemaining <= 14 && daysRemaining > 7;

                                    return (
                                        <tr key={`${record.table_name}-${record.record_id}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">
                                                        {TABLE_ICONS[record.table_name] || <FileText className="w-5 h-5" />}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-500 hidden sm:inline">
                                                        {TABLE_LABELS[record.table_name] || record.table_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 truncate max-w-[200px]">
                                                    {getDisplayName(record)}
                                                </div>
                                                <div className="text-xs text-gray-400 md:hidden mt-1">
                                                    {formatDate(record.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {formatDate(record.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                                                <span className="truncate max-w-[150px] block">
                                                    {record.user_email || 'Sistema'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    isUrgent
                                                        ? 'bg-red-100 text-red-700'
                                                        : isWarning
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    <Timer className="w-3.5 h-3.5" />
                                                    {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRestore(record.table_name, record.record_id, getDisplayName(record))}
                                                    disabled={restoring === record.record_id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {restoring === record.record_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="w-4 h-4" />
                                                    )}
                                                    <span className="hidden sm:inline">Restaurar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Warning message */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-amber-800 font-medium">
                        Los registros en la papelera se eliminaran permanentemente despues de 30 dias.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                        Los datos eliminados permanentemente no podran ser recuperados. Restaura los registros importantes antes de que expire el plazo.
                    </p>
                </div>
            </div>
        </div>
    );
}
