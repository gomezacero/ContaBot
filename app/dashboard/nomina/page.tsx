'use client';

import { useState, useEffect, useCallback } from 'react';
import { PayrollInput, RiskLevel } from '@/types/payroll';
import { calculatePayroll, formatCurrency, createDefaultEmployee } from '@/lib/calculations';
import { generatePayrollPDF, generateLiquidationPDF } from '@/lib/pdf-generator';
import { SMMLV_2025 } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import {
    Plus,
    Trash2,
    UserCircle2,
    Info,
    Download,
    Calendar,
    Save,
    CheckCircle2,
    Loader2,
    FolderOpen,
    AlertCircle,
    Eye,
    LayoutDashboard
} from 'lucide-react';

// New Components
import { PayrollInputForm } from '@/components/payroll/PayrollInputForm';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { DocumentPreview } from '@/components/payroll/DocumentPreview';

interface DBEmployee {
    id: string;
    client_id: string;
    name: string;
    document_number: string | null;
    job_title: string | null;
    contract_type: string | null;
    base_salary: number;
    risk_level: string;
    include_transport_aid: boolean;
    is_exempt: boolean;
    start_date: string | null;
    end_date: string | null;
    deductions_config: Record<string, unknown>;
    clients?: {
        id: string;
        name: string;
        nit: string | null;
    };
    // Additional fields for new inputs would be mapped here if stored in JSONb or columns
    // For now assuming we map them from JSONb or ignore persistence of overtime for MVP
}

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
}

// Convert DB employee to PayrollInput
function dbToPayrollInput(emp: DBEmployee): PayrollInput {
    // Note: If we added overtime columns to DB, we would map them here.
    // Assuming they might be in a flexible jsonb column or just default to 0 for now.
    return {
        id: emp.id,
        employerType: 'JURIDICA',
        companyName: emp.clients?.name,
        companyNit: emp.clients?.nit || '',
        name: emp.name,
        documentNumber: emp.document_number || '',
        jobTitle: emp.job_title || '',
        contractType: (emp.contract_type as any) || 'INDEFINIDO',
        baseSalary: emp.base_salary,
        riskLevel: (emp.risk_level as RiskLevel) || RiskLevel.I,
        isExempt: emp.is_exempt,
        includeTransportAid: emp.include_transport_aid,
        startDate: emp.start_date || '2025-01-01',
        endDate: emp.end_date || '2025-01-30',
        enableDeductions: false,
        deductionsParameters: (emp.deductions_config as any) || {
            housingInterest: 0,
            prepaidMedicine: 0,
            voluntaryPension: 0,
            voluntaryPensionExempt: 0,
            afc: 0,
            hasDependents: false
        },
        // Defaults for non-persisted fields (yet)
        hedHours: 0, henHours: 0, rnHours: 0, domFestHours: 0, heddfHours: 0, hendfHours: 0,
        commissions: 0, salaryBonuses: 0, nonSalaryBonuses: 0, loans: 0, otherDeductions: 0
    };
}

export default function NominaPage() {
    const supabase = createClient();

    // State
    const [clients, setClients] = useState<DBClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [dbEmployees, setDbEmployees] = useState<DBEmployee[]>([]);
    const [localEmployees, setLocalEmployees] = useState<PayrollInput[]>([createDefaultEmployee(1)]);
    const [activeEmployeeId, setActiveEmployeeId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientNit, setNewClientNit] = useState('');
    const [error, setError] = useState<string | null>(null);

    // View Mode for Right Panel
    const [viewMode, setViewMode] = useState<'SUMMARY' | 'DOCUMENT'>('SUMMARY');

    // Determine which employees to show (DB if client selected, local otherwise)
    const employees = selectedClientId
        ? dbEmployees.map(dbToPayrollInput)
        : localEmployees;

    const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

    // Memoized Result Calculation
    const result = activeEmployee ? calculatePayroll(activeEmployee) : null;

    // Load clients on mount
    useEffect(() => {
        const loadClients = async () => {
            try {
                const { data, error } = await supabase.from('clients').select('id, name, nit').order('name');
                if (error) throw error;
                setClients(data || []);
            } catch {
                console.error('Error loading clients');
            } finally {
                setLoading(false);
            }
        };
        loadClients();
    }, [supabase]);

    // Load employees when client changes
    useEffect(() => {
        if (!selectedClientId) {
            setDbEmployees([]);
            if (localEmployees.length > 0) setActiveEmployeeId(localEmployees[0].id);
            return;
        }

        const loadEmployees = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select(`*, clients (id, name, nit)`)
                    .eq('client_id', selectedClientId)
                    .order('name');

                if (error) throw error;
                setDbEmployees(data || []);
                if (data && data.length > 0) setActiveEmployeeId(data[0].id);
            } catch {
                console.error('Error loading employees');
                setError('Error cargando empleados');
            } finally {
                setLoading(false);
            }
        };

        loadEmployees();
    }, [selectedClientId, supabase]);

    // Set initial active employee
    useEffect(() => {
        if (employees.length > 0 && !activeEmployeeId) {
            setActiveEmployeeId(employees[0].id);
        }
    }, [employees, activeEmployeeId]);

    // Handle adding employee
    const handleAddEmployee = async () => {
        if (selectedClientId) {
            setSaving(true);
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .insert({
                        client_id: selectedClientId,
                        name: `Empleado ${dbEmployees.length + 1}`,
                        base_salary: SMMLV_2025,
                        risk_level: 'I',
                        include_transport_aid: true,
                        is_exempt: true,
                        start_date: '2025-01-01',
                        end_date: '2025-01-30',
                    })
                    .select(`*, clients (id, name, nit)`)
                    .single();

                if (error) throw error;
                setDbEmployees([...dbEmployees, data]);
                setActiveEmployeeId(data.id);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch {
                setError('Error agregando empleado');
            } finally {
                setSaving(false);
            }
        } else {
            if (localEmployees.length >= 10) return;
            const newEmp = createDefaultEmployee(localEmployees.length + 1);
            setLocalEmployees([...localEmployees, newEmp]);
            setActiveEmployeeId(newEmp.id);
        }
    };

    // Handle Full Object Update from Form
    const handleEmployeeChange = (updated: PayrollInput) => {
        if (selectedClientId) {
            // Optimistic update for UI smoothness
            // We need to map PayrollInput back to DBEmployee partial structure for state
            setDbEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId
                    ? {
                        ...emp,
                        name: updated.name,
                        document_number: updated.documentNumber || null,
                        base_salary: updated.baseSalary,
                        risk_level: updated.riskLevel,
                        include_transport_aid: updated.includeTransportAid,
                        is_exempt: updated.isExempt,
                        start_date: updated.startDate || null,
                        end_date: updated.endDate || null,
                        deductions_config: updated.deductionsParameters as unknown as Record<string, unknown>
                        // Note: Overtime fields are not persisted in this MVP DB schema yet, strictly UI state for DB employees unless we add columns
                    }
                    : emp
            ));
        } else {
            setLocalEmployees(prev => prev.map(emp => emp.id === activeEmployeeId ? updated : emp));
        }
    };

    // Save changes to database (Explicit Save)
    const handleSaveToDb = async () => {
        if (!selectedClientId || !activeEmployee) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('employees')
                .update({
                    name: activeEmployee.name,
                    document_number: activeEmployee.documentNumber,
                    base_salary: activeEmployee.baseSalary,
                    risk_level: activeEmployee.riskLevel,
                    include_transport_aid: activeEmployee.includeTransportAid,
                    is_exempt: activeEmployee.isExempt,
                    start_date: activeEmployee.startDate,
                    end_date: activeEmployee.endDate,
                    deductions_config: activeEmployee.deductionsParameters as unknown as Record<string, unknown>
                })
                .eq('id', activeEmployeeId);

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setError('Error guardando cambios');
        } finally {
            setSaving(false);
        }
    };

    // Save payroll record history
    const handleSavePayroll = async () => {
        if (!selectedClientId || !activeEmployee || !result) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('payroll_records')
                .insert({
                    employee_id: activeEmployeeId,
                    period_start: activeEmployee.startDate,
                    period_end: activeEmployee.endDate,
                    calculation_data: result, // This stores the full JSON result including overtime breakdown
                    net_pay: result.monthly.netPay,
                    total_employer_cost: result.monthly.totals.grandTotalCost,
                });

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setError('Error guardando nómina');
        } finally {
            setSaving(false);
        }
    };

    // Handle deleting employee
    const handleDeleteEmployee = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedClientId) {
            setSaving(true);
            try {
                const { error } = await supabase.from('employees').delete().eq('id', id);
                if (error) throw error;
                const newList = dbEmployees.filter(emp => emp.id !== id);
                setDbEmployees(newList);
                if (activeEmployeeId === id && newList.length > 0) setActiveEmployeeId(newList[0].id);
            } catch {
                setError('Error eliminando empleado');
            } finally {
                setSaving(false);
            }
        } else {
            if (localEmployees.length === 1) return;
            const newEmployees = localEmployees.filter(emp => emp.id !== id);
            setLocalEmployees(newEmployees);
            if (activeEmployeeId === id) setActiveEmployeeId(newEmployees[0].id);
        }
    };

    // Handle creating client
    const handleCreateClient = async () => {
        if (!newClientName.trim()) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('clients')
                .insert({ user_id: user.id, name: newClientName, nit: newClientNit || null, classification: 'JURIDICA' })
                .select()
                .single();

            if (error) throw error;
            setClients([...clients, data]);
            setSelectedClientId(data.id);
            setShowClientModal(false);
            setNewClientName('');
            setNewClientNit('');
        } catch {
            setError('Error creando cliente');
        } finally {
            setSaving(false);
        }
    };

    if (loading && clients.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1AB1B1]" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#002D44] mb-1">Calculadora de Nómina 2025</h1>
                    <p className="text-sm text-gray-500 font-medium">Motor de cálculo en tiempo real • Art. 383 E.T. • UGPP</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    {saved && (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold animate-fade-in px-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Guardado
                        </div>
                    )}
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value || null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-[#1AB1B1] outline-none min-w-[200px]"
                    >
                        <option value="">📝 Modo Demo (Local)</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                🏢 {client.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowClientModal(true)}
                        className="p-2 bg-[#1AB1B1] text-white rounded-lg hover:bg-[#159C9C] transition-colors"
                        title="Agregar Cliente"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT PANEL: INPUTS (5 cols) */}
                <div className="lg:col-span-5 space-y-6 sticky top-6">
                    {/* Employee Horizontal List */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex items-center overflow-x-auto no-scrollbar">
                        {employees.map((emp) => {
                            const isActive = emp.id === activeEmployeeId;
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setActiveEmployeeId(emp.id)}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all group relative border ${isActive
                                            ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
                                            : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <UserCircle2 className="w-4 h-4" />
                                    <span className="text-xs truncate max-w-[80px]">{emp.name}</span>
                                    {isActive && employees.length > 1 && (
                                        <button
                                            onClick={(e) => handleDeleteEmployee(emp.id, e)}
                                            className="ml-1 p-0.5 text-red-400 hover:text-red-600 rounded bg-white"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <button
                            onClick={handleAddEmployee}
                            className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Input Form */}
                    {activeEmployee && (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <PayrollInputForm
                                input={activeEmployee}
                                onChange={handleEmployeeChange}
                            />

                            {/* Save Actions */}
                            {selectedClientId && (
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={handleSaveToDb}
                                        disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-900 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Empleado
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: OUTPUTS (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setViewMode('SUMMARY')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'SUMMARY' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutDashboard size={16} />
                            Impacto Financiero
                        </button>
                        <button
                            onClick={() => setViewMode('DOCUMENT')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'DOCUMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Eye size={16} />
                            Previsualizar Desprendible
                        </button>
                    </div>

                    {/* Content */}
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {viewMode === 'SUMMARY' ? (
                            <PayrollSummary result={result} />
                        ) : (
                            <DocumentPreview input={activeEmployee} result={result} />
                        )}
                    </div>

                    {/* Export Actions Bar */}
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => {
                                if (activeEmployee && result) {
                                    const selectedClient = clients.find(c => c.id === selectedClientId);
                                    generatePayrollPDF({
                                        employee: activeEmployee,
                                        result,
                                        companyName: selectedClient?.name,
                                        companyNit: selectedClient?.nit || undefined,
                                        periodDescription: `Período: ${activeEmployee.startDate || '2025-01-01'} - ${activeEmployee.endDate || '2025-01-30'}`
                                    });
                                }
                            }}
                            className="flex items-center gap-2 bg-[#002D44] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            <Download className="w-4 h-4" />
                            Descargar Nómina (PDF)
                        </button>

                        <button
                            onClick={() => {
                                if (activeEmployee && result) {
                                    const selectedClient = clients.find(c => c.id === selectedClientId);
                                    generateLiquidationPDF({
                                        employee: activeEmployee,
                                        result,
                                        companyName: selectedClient?.name,
                                        companyNit: selectedClient?.nit || undefined,
                                    });
                                }
                            }}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            <Calendar className="w-4 h-4" />
                            Descargar Liquidación
                        </button>

                        {selectedClientId && (
                            <button
                                onClick={handleSavePayroll}
                                disabled={saving}
                                className="flex items-center gap-2 bg-[#1AB1B1] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all ml-auto"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Histórico
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Client Modal */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-black text-[#002D44] mb-4">Crear Nuevo Cliente</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Cliente *</label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="Empresa S.A.S"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">NIT</label>
                                <input
                                    type="text"
                                    value={newClientNit}
                                    onChange={(e) => setNewClientNit(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="900123456-1"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowClientModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateClient}
                                    disabled={!newClientName.trim() || saving}
                                    className="px-4 py-2 bg-[#1AB1B1] text-white rounded-lg font-bold hover:brightness-110 disabled:opacity-50"
                                >
                                    {saving ? 'Creando...' : 'Crear Cliente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
