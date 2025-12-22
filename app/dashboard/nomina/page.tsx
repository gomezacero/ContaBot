'use client';

import { useState, useEffect, useCallback } from 'react';
import { PayrollInput, RiskLevel } from '@/types/payroll';
import { calculatePayroll, formatCurrency, createDefaultEmployee } from '@/lib/calculations';
import { generatePayrollPDF, generateLiquidationPDF } from '@/lib/pdf-generator';
import { SMMLV_2025, RISK_LEVEL_LABELS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import {
    Plus,
    Trash2,
    UserCircle2,
    Info,
    Download,
    FileText,
    Building2,
    User,
    Wallet,
    Calendar,
    Save,
    CheckCircle2,
    Loader2,
    FolderOpen,
    AlertCircle
} from 'lucide-react';

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
}

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
}

// Convert DB employee to PayrollInput
function dbToPayrollInput(emp: DBEmployee): PayrollInput {
    return {
        id: emp.id,
        employerType: 'JURIDICA',
        companyName: emp.clients?.name,
        companyNit: emp.clients?.nit || '',
        name: emp.name,
        documentNumber: emp.document_number || '',
        jobTitle: emp.job_title || '',
        contractType: (emp.contract_type as 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR') || 'INDEFINIDO',
        baseSalary: emp.base_salary,
        riskLevel: (emp.risk_level as RiskLevel) || RiskLevel.I,
        isExempt: emp.is_exempt,
        includeTransportAid: emp.include_transport_aid,
        startDate: emp.start_date || '2025-01-01',
        endDate: emp.end_date || '2025-01-30',
        enableDeductions: false,
        deductionsParameters: (emp.deductions_config as {
            housingInterest: number;
            prepaidMedicine: number;
            voluntaryPension: number;
            voluntaryPensionExempt: number;
            afc: number;
            hasDependents: boolean;
        }) || {
            housingInterest: 0,
            prepaidMedicine: 0,
            voluntaryPension: 0,
            voluntaryPensionExempt: 0,
            afc: 0,
            hasDependents: false
        },
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

    // Determine which employees to show (DB if client selected, local otherwise)
    const employees = selectedClientId
        ? dbEmployees.map(dbToPayrollInput)
        : localEmployees;

    const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];
    const result = activeEmployee ? calculatePayroll(activeEmployee) : null;

    // Load clients on mount
    useEffect(() => {
        const loadClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name, nit')
                    .order('name');

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
            if (localEmployees.length > 0) {
                setActiveEmployeeId(localEmployees[0].id);
            }
            return;
        }

        const loadEmployees = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select(`
            *,
            clients (id, name, nit)
          `)
                    .eq('client_id', selectedClientId)
                    .order('name');

                if (error) throw error;
                setDbEmployees(data || []);
                if (data && data.length > 0) {
                    setActiveEmployeeId(data[0].id);
                }
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
            // Add to database
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
                console.error('Error adding employee');
                setError('Error agregando empleado');
            } finally {
                setSaving(false);
            }
        } else {
            // Add locally
            if (localEmployees.length >= 10) return;
            const newEmp = createDefaultEmployee(localEmployees.length + 1);
            setLocalEmployees([...localEmployees, newEmp]);
            setActiveEmployeeId(newEmp.id);
        }
    };

    // Handle updating employee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateEmployee = useCallback((field: keyof PayrollInput, value: unknown) => {
        if (selectedClientId) {
            // Update in database (debounced)
            setDbEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId
                    ? { ...emp, [field === 'documentNumber' ? 'document_number' : field === 'baseSalary' ? 'base_salary' : field === 'riskLevel' ? 'risk_level' : field === 'includeTransportAid' ? 'include_transport_aid' : field === 'isExempt' ? 'is_exempt' : field === 'startDate' ? 'start_date' : field === 'endDate' ? 'end_date' : field]: value }
                    : emp
            ));
        } else {
            setLocalEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId ? { ...emp, [field]: value } : emp
            ));
        }
    }, [activeEmployeeId, selectedClientId]);

    // Save changes to database
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
                })
                .eq('id', activeEmployeeId);

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            console.error('Error saving');
            setError('Error guardando cambios');
        } finally {
            setSaving(false);
        }
    };

    // Save payroll record
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
                    calculation_data: result,
                    net_pay: result.monthly.netPay,
                    total_employer_cost: result.monthly.employerCosts.totalEmployerCost,
                });

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            console.error('Error saving payroll');
            setError('Error guardando nómina');
        } finally {
            setSaving(false);
        }
    };

    // Handle deleting employee
    const handleDeleteEmployee = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (selectedClientId) {
            // Delete from database
            setSaving(true);
            try {
                const { error } = await supabase
                    .from('employees')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                const newList = dbEmployees.filter(emp => emp.id !== id);
                setDbEmployees(newList);
                if (activeEmployeeId === id && newList.length > 0) {
                    setActiveEmployeeId(newList[0].id);
                }
            } catch {
                console.error('Error deleting');
                setError('Error eliminando empleado');
            } finally {
                setSaving(false);
            }
        } else {
            if (localEmployees.length === 1) return;
            const newEmployees = localEmployees.filter(emp => emp.id !== id);
            setLocalEmployees(newEmployees);
            if (activeEmployeeId === id) {
                setActiveEmployeeId(newEmployees[0].id);
            }
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
                .insert({
                    user_id: user.id,
                    name: newClientName,
                    nit: newClientNit || null,
                    classification: 'JURIDICA',
                })
                .select()
                .single();

            if (error) throw error;
            setClients([...clients, data]);
            setSelectedClientId(data.id);
            setShowClientModal(false);
            setNewClientName('');
            setNewClientNit('');
        } catch {
            console.error('Error creating client');
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
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#002D44] mb-2">Calculadora de Nómina</h1>
                    <p className="text-gray-500">Cálculos automáticos bajo legislación colombiana 2025</p>
                </div>

                {/* Client Selector */}
                <div className="flex items-center gap-3">
                    {saved && (
                        <div className="flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" />
                            Guardado
                        </div>
                    )}
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value || null)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-[#1AB1B1]"
                    >
                        <option value="">📝 Modo Demo (sin guardar)</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                🏢 {client.name} {client.nit ? `(${client.nit})` : ''}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowClientModal(true)}
                        className="p-2 bg-[#1AB1B1] text-white rounded-xl hover:scale-105 transition-transform"
                        title="Agregar Cliente"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                        ✕
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel - Employee Form */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Info Box */}
                    <div className={`p-4 rounded-2xl flex gap-3 items-start ${selectedClientId ? 'bg-green-50 border border-green-100' : 'bg-indigo-50/50 border border-indigo-100'}`}>
                        <div className={`p-2 rounded-lg shadow-sm ${selectedClientId ? 'bg-white text-green-600' : 'bg-white text-indigo-600'}`}>
                            {selectedClientId ? <FolderOpen className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <p className={`text-sm font-medium ${selectedClientId ? 'text-green-900/80' : 'text-indigo-900/80'}`}>
                            {selectedClientId
                                ? '✅ Conectado a Supabase. Los cambios se guardan automáticamente.'
                                : 'Modo demo. Selecciona un cliente para guardar en la base de datos.'}
                        </p>
                    </div>

                    {/* Employee Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {employees.map((emp) => {
                            const isActive = emp.id === activeEmployeeId;
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setActiveEmployeeId(emp.id)}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 cursor-pointer transition-all group relative ${isActive
                                        ? 'bg-white border-blue-600 text-blue-900 shadow-sm'
                                        : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
                                        }`}
                                    style={{ minWidth: '140px' }}
                                >
                                    <UserCircle2 className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold truncate max-w-[90px]">{emp.name}</span>
                                        <span className="text-[10px] font-mono opacity-70 truncate max-w-[80px]">
                                            {emp.documentNumber || 'CC. ???'}
                                        </span>
                                    </div>

                                    {employees.length > 1 && isActive && (
                                        <button
                                            onClick={(e) => handleDeleteEmployee(emp.id, e)}
                                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 shadow-sm transition-opacity opacity-0 group-hover:opacity-100"
                                            title="Eliminar Empleado"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            onClick={handleAddEmployee}
                            disabled={!selectedClientId && localEmployees.length >= 10}
                            className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all ${(!selectedClientId && localEmployees.length >= 10)
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-500 hover:bg-blue-600 hover:text-white'
                                }`}
                            title="Agregar Empleado"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Employee Form */}
                    {activeEmployee && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                            <h3 className="font-bold text-[#002D44] flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Datos del Empleado
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={activeEmployee.name}
                                        onChange={(e) => handleUpdateEmployee('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Documento</label>
                                    <input
                                        type="text"
                                        value={activeEmployee.documentNumber || ''}
                                        onChange={(e) => handleUpdateEmployee('documentNumber', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                                        placeholder="1234567890"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Salario Base Mensual</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={activeEmployee.baseSalary}
                                        onChange={(e) => handleUpdateEmployee('baseSalary', Number(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">SMMLV 2025: {formatCurrency(SMMLV_2025)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nivel de Riesgo ARL</label>
                                <select
                                    value={activeEmployee.riskLevel}
                                    onChange={(e) => handleUpdateEmployee('riskLevel', e.target.value as RiskLevel)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent bg-white"
                                >
                                    {Object.entries(RISK_LEVEL_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={activeEmployee.includeTransportAid}
                                        onChange={(e) => handleUpdateEmployee('includeTransportAid', e.target.checked)}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">Auxilio de Transporte</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={activeEmployee.isExempt}
                                        onChange={(e) => handleUpdateEmployee('isExempt', e.target.checked)}
                                        className="rounded text-[#1AB1B1] focus:ring-[#1AB1B1]"
                                    />
                                    <span className="text-sm text-gray-700">Exento Parafiscales</span>
                                </label>
                            </div>

                            {/* Period Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={activeEmployee.startDate || ''}
                                        onChange={(e) => handleUpdateEmployee('startDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={activeEmployee.endDate || ''}
                                        onChange={(e) => handleUpdateEmployee('endDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Save Button (only when connected to DB) */}
                            {selectedClientId && (
                                <button
                                    onClick={handleSaveToDb}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 bg-[#1AB1B1] text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Guardar Cambios
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Results */}
                {result && (
                    <div className="lg:col-span-7 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-[#1AB1B1] to-teal-600 rounded-2xl p-6 text-white">
                                <p className="text-sm font-bold opacity-80 mb-1">Neto a Pagar</p>
                                <p className="text-2xl font-black">{formatCurrency(result.monthly.netPay)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                                <p className="text-sm font-bold text-gray-500 mb-1">Total Devengado</p>
                                <p className="text-2xl font-black text-[#002D44]">{formatCurrency(result.monthly.salaryData.totalAccrued)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                                <p className="text-sm font-bold text-gray-500 mb-1">Costo Total Empleador</p>
                                <p className="text-2xl font-black text-[#002D44]">{formatCurrency(result.monthly.employerCosts.totalEmployerCost)}</p>
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Devengado */}
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="font-bold text-[#002D44] mb-4 flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-green-500" />
                                    Devengado
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Salario Base</span>
                                        <span className="font-bold">{formatCurrency(result.monthly.salaryData.baseSalary)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Auxilio de Transporte</span>
                                        <span className="font-bold">{formatCurrency(result.monthly.salaryData.transportAid)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                                        <span className="font-bold text-[#002D44]">Total Devengado</span>
                                        <span className="font-black text-green-600">{formatCurrency(result.monthly.salaryData.totalAccrued)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deducciones */}
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="font-bold text-[#002D44] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-red-500" />
                                    Deducciones del Empleado
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Salud (4%)</span>
                                        <span className="font-bold text-red-500">-{formatCurrency(result.monthly.employeeDeductions.health)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Pensión (4%)</span>
                                        <span className="font-bold text-red-500">-{formatCurrency(result.monthly.employeeDeductions.pension)}</span>
                                    </div>
                                    {result.monthly.employeeDeductions.solidarityFund > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Fondo Solidaridad</span>
                                            <span className="font-bold text-red-500">-{formatCurrency(result.monthly.employeeDeductions.solidarityFund)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                                        <span className="font-bold text-[#002D44]">Total Deducciones</span>
                                        <span className="font-black text-red-600">-{formatCurrency(result.monthly.employeeDeductions.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Costos Empleador */}
                            <div className="p-6">
                                <h3 className="font-bold text-[#002D44] mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                    Costos del Empleador
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Salud (8.5%)</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.health)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Pensión (12%)</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.pension)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">ARL</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.arl)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Caja Compensación</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.compensationBox)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Cesantías</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.cesantias)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Int. Cesantías</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.interesesCesantias)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Prima</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.prima)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Vacaciones</span>
                                            <span className="font-bold">{formatCurrency(result.monthly.employerCosts.vacations)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm pt-4 mt-4 border-t border-gray-100">
                                    <span className="font-bold text-[#002D44]">Total Costo Empleador</span>
                                    <span className="font-black text-blue-600">{formatCurrency(result.monthly.employerCosts.totalEmployerCost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    if (activeEmployee && result) {
                                        const selectedClient = clients.find(c => c.id === selectedClientId);
                                        generatePayrollPDF({
                                            employee: activeEmployee,
                                            result,
                                            companyName: selectedClient?.name,
                                            companyNit: selectedClient?.nit || undefined,
                                            periodDescription: `Período: ${activeEmployee.startDate} - ${activeEmployee.endDate}`
                                        });
                                    }
                                }}
                                className="flex items-center gap-2 bg-[#002D44] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Descargar PDF
                            </button>
                            {selectedClientId && (
                                <button
                                    onClick={handleSavePayroll}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-[#1AB1B1] text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Guardar Cálculo
                                </button>
                            )}
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
                                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                            >
                                <Calendar className="w-5 h-5" />
                                Ver Liquidación
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Client Modal */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 animate-fade-in">
                        <h2 className="text-xl font-black text-[#002D44] mb-6">Crear Nuevo Cliente</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Cliente *</label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="Empresa S.A.S"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">NIT</label>
                                <input
                                    type="text"
                                    value={newClientNit}
                                    onChange={(e) => setNewClientNit(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]"
                                    placeholder="900123456-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowClientModal(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateClient}
                                disabled={!newClientName.trim() || saving}
                                className="flex-1 py-3 bg-[#1AB1B1] text-white rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Crear Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
