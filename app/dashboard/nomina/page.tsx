'use client';

import { useState, useEffect, useMemo } from 'react';
import { PayrollInput, RiskLevel, LiquidationResult } from '@/types/payroll';
import { calculatePayroll, formatCurrency, createDefaultEmployee, calculateLiquidation } from '@/lib/calculations';
import { generatePayrollPDF, generateLiquidationPDF } from '@/lib/pdf-generator';
import { SMMLV_2025 } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import {
    Plus,
    Trash2,
    UserCircle2,
    Download,
    Calendar,
    Save,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Calculator,
    DollarSign,
    UserCog,
    Briefcase,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    Building2,
    BadgePercent,
    Wallet,
    FileText,
    User,
    Eye,
    X,
    Star,
    MessageSquare,
    Send,
    ThumbsUp
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
    // Asegurar que base_salary sea un número válido
    const baseSalary = Number(emp.base_salary) || SMMLV_2025;

    // Extraer deductions_config con tipo seguro
    const dbDeductions = (emp.deductions_config || {}) as {
        housingInterest?: number;
        prepaidMedicine?: number;
        voluntaryPension?: number;
        voluntaryPensionExempt?: number;
        afc?: number;
        hasDependents?: boolean;
    };

    // Validar y normalizar riskLevel
    const validRiskLevels = ['I', 'II', 'III', 'IV', 'V'];
    const riskLevel = validRiskLevels.includes(emp.risk_level)
        ? (emp.risk_level as RiskLevel)
        : RiskLevel.I;

    return {
        id: emp.id,
        employerType: 'JURIDICA',
        companyName: emp.clients?.name || '',
        companyNit: emp.clients?.nit || '',
        name: emp.name || 'Empleado',
        documentNumber: emp.document_number || '',
        jobTitle: emp.job_title || '',
        contractType: (emp.contract_type as 'INDEFINIDO' | 'FIJO' | 'OBRA_LABOR') || 'INDEFINIDO',
        baseSalary: baseSalary,
        riskLevel: riskLevel,
        isExempt: emp.is_exempt ?? true,
        includeTransportAid: emp.include_transport_aid ?? true,
        startDate: emp.start_date || '2025-01-01',
        endDate: emp.end_date || '2025-01-30',
        enableDeductions: false,
        deductionsParameters: {
            housingInterest: dbDeductions.housingInterest ?? 0,
            prepaidMedicine: dbDeductions.prepaidMedicine ?? 0,
            voluntaryPension: dbDeductions.voluntaryPension ?? 0,
            voluntaryPensionExempt: dbDeductions.voluntaryPensionExempt ?? 0,
            afc: dbDeductions.afc ?? 0,
            hasDependents: dbDeductions.hasDependents ?? false,
        },
        hedHours: 0,
        henHours: 0,
        rnHours: 0,
        domFestHours: 0,
        heddfHours: 0,
        hendfHours: 0,
        commissions: 0,
        salaryBonuses: 0,
        nonSalaryBonuses: 0,
        loans: 0,
        otherDeductions: 0
    };
}

// UI Components
const Section: React.FC<{ title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, icon, isOpen, onToggle, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                    {icon}
                </div>
                <span className="font-semibold text-gray-800 text-sm">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && <div className="p-5 border-t border-gray-100 animate-in slide-in-from-top-1">{children}</div>}
    </div>
);

const Input: React.FC<{ label: string; type: 'text' | 'number' | 'money' | 'date'; value: any; onChange: (val: any) => void }> = ({ label, type, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</label>
        <div className="relative">
            {type === 'money' && <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>}
            <input
                type={type === 'money' ? 'text' : type}
                value={type === 'money' ? Number(value).toLocaleString('es-CO') : value}
                onChange={e => {
                    const v = type === 'money' ? e.target.value.replace(/\D/g, '') : e.target.value;
                    onChange(type === 'number' || type === 'money' ? Number(v) : v);
                }}
                className={`w-full bg-white border border-gray-200 rounded-lg py-2 ${type === 'money' ? 'pl-6' : 'pl-3'} pr-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
            />
        </div>
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer group">
        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`w-9 h-5 rounded-full shadow-inner transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

const ResultRow: React.FC<{ label: string; value: number; isBold?: boolean; color?: string }> = ({ label, value, isBold, color = 'text-gray-900' }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">{label}</span>
        <span className={`${isBold ? 'font-bold' : 'font-medium'} ${color}`}>{formatCurrency(value)}</span>
    </div>
);

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
    const [activeSection, setActiveSection] = useState<string | null>('section1');

    // Preview and Feedback states
    const [showPreviewModal, setShowPreviewModal] = useState<'nomina' | 'liquidacion' | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    // Determine which employees to show
    const employees = selectedClientId
        ? dbEmployees.map(dbToPayrollInput)
        : localEmployees;

    const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

    // Memoized Result Calculation
    const result = useMemo(() => activeEmployee ? calculatePayroll(activeEmployee) : null, [activeEmployee]);

    // Memoized Liquidation Calculation
    const liquidationResult = useMemo(() => {
        if (activeEmployee && result) {
            return calculateLiquidation(activeEmployee, result);
        }
        return null;
    }, [activeEmployee, result]);

    // Toggle Section Helper
    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

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

    // Mapeo de campos PayrollInput -> DBEmployee
    const fieldMapping: Record<string, string> = {
        baseSalary: 'base_salary',
        includeTransportAid: 'include_transport_aid',
        riskLevel: 'risk_level',
        isExempt: 'is_exempt',
        startDate: 'start_date',
        endDate: 'end_date',
        documentNumber: 'document_number',
        jobTitle: 'job_title',
        contractType: 'contract_type',
    };

    // Handle input change for active employee
    const handleInputChange = (field: keyof PayrollInput, value: any) => {
        if (selectedClientId) {
            const dbField = fieldMapping[field] || field;
            // Asegurar que los valores numéricos sean números
            const processedValue = ['base_salary'].includes(dbField) ? Number(value) || 0 : value;

            setDbEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId
                    ? { ...emp, [dbField]: processedValue }
                    : emp
            ));
        } else {
            setLocalEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId ? { ...emp, [field]: value } : emp
            ));
        }
    };

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
                    calculation_data: result,
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

    // Handle feedback submission
    const handleSubmitFeedback = async () => {
        if (feedbackRating === 0) return;
        setSubmittingFeedback(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await supabase.from('module_feedback').insert({
                user_id: user?.id || null,
                module_name: 'nomina',
                rating: feedbackRating,
                comment: feedbackComment.trim() || null,
            });

            setFeedbackSubmitted(true);
            setTimeout(() => {
                setShowFeedbackModal(false);
                setFeedbackSubmitted(false);
                setFeedbackRating(0);
                setFeedbackComment('');
            }, 2000);
        } catch {
            setError('Error enviando feedback');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    if (loading && clients.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Calculadora Pro 2025</h1>
                        <p className="text-sm text-gray-500">Control total de variables para liquidaciones complejas.</p>
                    </div>
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
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none min-w-[200px]"
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
                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        title="Agregar Cliente"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {/* Employee Horizontal List */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex items-center overflow-x-auto no-scrollbar">
                {employees.map((emp) => {
                    const isActive = emp.id === activeEmployeeId;
                    return (
                        <div
                            key={emp.id}
                            onClick={() => setActiveEmployeeId(emp.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all group relative border ${isActive
                                ? 'bg-purple-50 border-purple-200 text-purple-800 font-medium'
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
                    className="ml-2 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* LEFT PANEL: FORM INPUTS (7 cols) */}
                <div className="xl:col-span-7 space-y-4">
                    {activeEmployee && (
                        <>
                            {/* I. DATOS GENERALES */}
                            <Section title="I. Datos Generales y Periodo" icon={<Calendar className="w-4 h-4" />} isOpen={activeSection === 'section1'} onToggle={() => toggleSection('section1')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Inicio Periodo" type="date" value={activeEmployee.startDate} onChange={v => handleInputChange('startDate', v)} />
                                    <Input label="Fin Periodo" type="date" value={activeEmployee.endDate} onChange={v => handleInputChange('endDate', v)} />
                                    <Input label="Nombre Empleado" type="text" value={activeEmployee.name} onChange={v => handleInputChange('name', v)} />
                                    <Input label="Salario Básico" type="money" value={activeEmployee.baseSalary} onChange={v => handleInputChange('baseSalary', v)} />
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo Contrato</label>
                                        <select
                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            value={activeEmployee.contractType}
                                            onChange={e => handleInputChange('contractType', e.target.value)}
                                        >
                                            <option value="INDEFINIDO">Indefinido</option>
                                            <option value="FIJO">Término Fijo</option>
                                            <option value="OBRA_LABOR">Obra o Labor</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <Toggle label="Aplica Aux. Transporte" checked={activeEmployee.includeTransportAid} onChange={v => handleInputChange('includeTransportAid', v)} />
                                    </div>
                                </div>
                            </Section>

                            {/* II. SEGURIDAD SOCIAL */}
                            <Section title="II. Seguridad Social y Configuración" icon={<UserCog className="w-4 h-4" />} isOpen={activeSection === 'section2'} onToggle={() => toggleSection('section2')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Riesgo ARL</label>
                                        <select
                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            value={activeEmployee.riskLevel}
                                            onChange={e => handleInputChange('riskLevel', e.target.value as RiskLevel)}
                                        >
                                            <option value="I">Nivel I (0.522%)</option>
                                            <option value="II">Nivel II (1.044%)</option>
                                            <option value="III">Nivel III (2.436%)</option>
                                            <option value="IV">Nivel IV (4.350%)</option>
                                            <option value="V">Nivel V (6.960%)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-center gap-2 pt-4">
                                        <Toggle label="Exento Parafiscales (Ley 1607)" checked={activeEmployee.isExempt} onChange={v => handleInputChange('isExempt', v)} />
                                    </div>
                                </div>
                            </Section>

                            {/* III. HORAS EXTRAS */}
                            <Section title="III. Horas Extras y Variables" icon={<DollarSign className="w-4 h-4" />} isOpen={activeSection === 'section3'} onToggle={() => toggleSection('section3')}>
                                <div className="grid grid-cols-3 gap-3">
                                    <Input label="H.E. Diurna (1.25)" type="number" value={activeEmployee.hedHours} onChange={v => handleInputChange('hedHours', v)} />
                                    <Input label="H.E. Nocturna (1.75)" type="number" value={activeEmployee.henHours} onChange={v => handleInputChange('henHours', v)} />
                                    <Input label="Recargo Noct. (0.35)" type="number" value={activeEmployee.rnHours} onChange={v => handleInputChange('rnHours', v)} />
                                    <Input label="H.E.D Festiva (2.00)" type="number" value={activeEmployee.heddfHours} onChange={v => handleInputChange('heddfHours', v)} />
                                    <Input label="H.E.N Festiva (2.50)" type="number" value={activeEmployee.hendfHours} onChange={v => handleInputChange('hendfHours', v)} />
                                    <div className="col-span-3 h-px bg-gray-100 my-2"></div>
                                    <Input label="Comisiones" type="money" value={activeEmployee.commissions} onChange={v => handleInputChange('commissions', v)} />
                                    <Input label="Bonif. Salariales" type="money" value={activeEmployee.salaryBonuses} onChange={v => handleInputChange('salaryBonuses', v)} />
                                </div>
                            </Section>

                            {/* IV. NO SALARIAL */}
                            <Section title="IV. Pagos No Salariales" icon={<Briefcase className="w-4 h-4" />} isOpen={activeSection === 'section4'} onToggle={() => toggleSection('section4')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Bonos No Salariales" type="money" value={activeEmployee.nonSalaryBonuses} onChange={v => handleInputChange('nonSalaryBonuses', v)} />
                                </div>
                            </Section>

                            {/* V. DEDUCCIONES */}
                            <Section title="V. Deducciones y Retenciones" icon={<TrendingDown className="w-4 h-4" />} isOpen={activeSection === 'section5'} onToggle={() => toggleSection('section5')}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Préstamos Empresa" type="money" value={activeEmployee.loans} onChange={v => handleInputChange('loans', v)} />
                                        <Input label="Otras Deducciones" type="money" value={activeEmployee.otherDeductions} onChange={v => handleInputChange('otherDeductions', v)} />
                                    </div>

                                    {/* Toggle Deducciones Retefuente */}
                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <div className="flex items-center gap-2">
                                                <BadgePercent className="w-4 h-4 text-purple-600" />
                                                <span className="text-sm font-medium text-purple-800">¿Activar deducciones Retefuente?</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${!activeEmployee.enableDeductions ? 'text-purple-700' : 'text-gray-400'}`}>NO</span>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={activeEmployee.enableDeductions}
                                                        onChange={e => handleInputChange('enableDeductions', e.target.checked)}
                                                    />
                                                    <div
                                                        onClick={() => handleInputChange('enableDeductions', !activeEmployee.enableDeductions)}
                                                        className={`w-10 h-5 rounded-full shadow-inner transition-colors cursor-pointer ${activeEmployee.enableDeductions ? 'bg-purple-600' : 'bg-gray-300'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${activeEmployee.enableDeductions ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-bold ${activeEmployee.enableDeductions ? 'text-purple-700' : 'text-gray-400'}`}>SI</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Campos Condicionales de Retefuente */}
                                    {activeEmployee.enableDeductions && (
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200 animate-in slide-in-from-top-2">
                                            <p className="text-xs text-gray-500 font-medium">Configure los beneficios tributarios para reducir la base de retención en la fuente (Art. 383 E.T.)</p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="Intereses Vivienda (max 100 UVT)"
                                                    type="money"
                                                    value={activeEmployee.deductionsParameters?.housingInterest || 0}
                                                    onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, housingInterest: v })}
                                                />
                                                <Input
                                                    label="Medicina Prepagada (max 16 UVT)"
                                                    type="money"
                                                    value={activeEmployee.deductionsParameters?.prepaidMedicine || 0}
                                                    onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, prepaidMedicine: v })}
                                                />
                                                <Input
                                                    label="Aporte Vol. Pensión RAIS"
                                                    type="money"
                                                    value={activeEmployee.deductionsParameters?.voluntaryPension || 0}
                                                    onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, voluntaryPension: v })}
                                                />
                                                <Input
                                                    label="Aporte Vol. Renta Exenta (max 316 UVT)"
                                                    type="money"
                                                    value={activeEmployee.deductionsParameters?.voluntaryPensionExempt || 0}
                                                    onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, voluntaryPensionExempt: v })}
                                                />
                                                <Input
                                                    label="AFC (Ahorro Fomento Construcción)"
                                                    type="money"
                                                    value={activeEmployee.deductionsParameters?.afc || 0}
                                                    onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, afc: v })}
                                                />
                                                <div className="flex items-center pt-5">
                                                    <Toggle
                                                        label="Tiene dependientes (10% ing. neto)"
                                                        checked={activeEmployee.deductionsParameters?.hasDependents || false}
                                                        onChange={v => handleInputChange('deductionsParameters', { ...activeEmployee.deductionsParameters, hasDependents: v })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Section>

                            {/* Save Actions */}
                            {selectedClientId && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveToDb}
                                        disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Empleado
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT PANEL: RESULTS DASHBOARD (5 cols) */}
                <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-28">
                    {result && (
                        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
                            <div className="bg-purple-900 p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12">
                                    <DollarSign className="w-32 h-32" />
                                </div>
                                <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Neto a Pagar</p>
                                <h2 className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(result.monthly.netPay)}</h2>

                                <div className="grid grid-cols-2 gap-4 border-t border-purple-700/50 pt-4">
                                    <div>
                                        <p className="text-xs text-purple-300">Total Devengado</p>
                                        <p className="font-semibold">{formatCurrency(result.monthly.salaryData.totalAccrued)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-300">Total Deducciones</p>
                                        <p className="font-semibold">{formatCurrency(result.monthly.employeeDeductions.totalDeductions)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* SS Detail */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Detalle Seguridad Social</h3>
                                    <div className="space-y-2 text-sm">
                                        <ResultRow label="Salud (Empleado)" value={result.monthly.employeeDeductions.health} />
                                        <ResultRow label="Pensión (Empleado)" value={result.monthly.employeeDeductions.pension} />
                                        <ResultRow label="Fondo Solidaridad" value={result.monthly.employeeDeductions.solidarityFund} isBold={result.monthly.employeeDeductions.solidarityFund > 0} />
                                    </div>
                                </div>

                                {/* Employer Costs */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Costo Empleador</h3>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                                        <ResultRow label="Salud (Patrono)" value={result.monthly.employerCosts.health} />
                                        <ResultRow label="Pensión (Patrono)" value={result.monthly.employerCosts.pension} />
                                        <ResultRow label="ARL" value={result.monthly.employerCosts.arl} />
                                        <ResultRow label="Parafiscales (CCF+ICBF+SENA)" value={result.monthly.employerCosts.compensationBox + result.monthly.employerCosts.sena + result.monthly.employerCosts.icbf} />
                                        <div className="border-t border-gray-200 my-2 pt-2 font-bold text-gray-900 flex justify-between">
                                            <span>Total Provisiones</span>
                                            <span>{formatCurrency(result.monthly.employerCosts.cesantias + result.monthly.employerCosts.interesesCesantias + result.monthly.employerCosts.prima + result.monthly.employerCosts.vacations)}</span>
                                        </div>
                                        <div className="pt-2 text-right">
                                            <span className="text-xs text-gray-500 mr-2">Costo Total Nómina:</span>
                                            <span className="font-bold text-purple-700">{formatCurrency(result.monthly.totals.grandTotalCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center gap-2 text-xs text-purple-700">
                                    <Building2 className="w-4 h-4" />
                                    <span>IBC Calculado: <strong>{formatCurrency(result.monthly.salaryData.baseSalary)}</strong></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LIQUIDATION SECTION */}
                    {liquidationResult && activeEmployee && (
                        <div className="bg-white rounded-3xl shadow-xl border border-amber-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12">
                                    <Wallet className="w-32 h-32" />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-5 h-5 text-amber-200" />
                                    <p className="text-amber-100 text-xs font-bold uppercase tracking-widest">2. Liquidación a la Fecha</p>
                                </div>
                                <p className="text-amber-200 text-xs mb-1">Prestaciones Acumuladas</p>
                                <h2 className="text-4xl font-bold tracking-tight mb-2">{formatCurrency(liquidationResult.netToPay)}</h2>
                                <p className="text-amber-200 text-xs">
                                    <User className="w-3 h-3 inline mr-1" />
                                    Total a Pagar al Empleado
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Días Trabajados */}
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-medium">Días Trabajados (Sistema 360)</span>
                                    </div>
                                    <span className="text-amber-800 font-bold">{liquidationResult.daysWorked} días</span>
                                </div>

                                {/* Prestaciones Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Cesantías + Int.</p>
                                        <p className="text-sm font-bold text-gray-800">{formatCurrency(liquidationResult.cesantias + liquidationResult.interesesCesantias)}</p>
                                        <p className="text-[9px] text-gray-400 mt-1">
                                            Ces: {formatCurrency(liquidationResult.cesantias)}
                                        </p>
                                        <p className="text-[9px] text-gray-400">
                                            Int: {formatCurrency(liquidationResult.interesesCesantias)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Prima Servicios</p>
                                        <p className="text-sm font-bold text-gray-800">{formatCurrency(liquidationResult.prima)}</p>
                                        <p className="text-[9px] text-gray-400 mt-1">Proporcional</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Vacaciones</p>
                                        <p className="text-sm font-bold text-gray-800">{formatCurrency(liquidationResult.vacaciones)}</p>
                                        <p className="text-[9px] text-gray-400 mt-1">Proporcional</p>
                                    </div>
                                </div>

                                {/* Total Prestaciones */}
                                <div className="flex justify-between items-center py-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-600">Total Prestaciones Sociales</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(liquidationResult.totalPrestaciones)}</span>
                                </div>

                                {/* Deducciones (si hay) */}
                                {liquidationResult.deductions.total > 0 && (
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Deducciones</p>
                                        <div className="space-y-1 text-sm">
                                            {liquidationResult.deductions.loans > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Préstamos</span>
                                                    <span className="font-medium text-red-700">-{formatCurrency(liquidationResult.deductions.loans)}</span>
                                                </div>
                                            )}
                                            {liquidationResult.deductions.retefuente > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Retención Fuente</span>
                                                    <span className="font-medium text-red-700">-{formatCurrency(liquidationResult.deductions.retefuente)}</span>
                                                </div>
                                            )}
                                            {liquidationResult.deductions.voluntaryContributions > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Aportes Voluntarios</span>
                                                    <span className="font-medium text-red-700">-{formatCurrency(liquidationResult.deductions.voluntaryContributions)}</span>
                                                </div>
                                            )}
                                            {liquidationResult.deductions.other > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Otras Deducciones</span>
                                                    <span className="font-medium text-red-700">-{formatCurrency(liquidationResult.deductions.other)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Base Info */}
                                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
                                    <p><strong>Base Liquidación:</strong> {formatCurrency(liquidationResult.baseLiquidation)}</p>
                                    <p><strong>Período:</strong> {activeEmployee.startDate} a {activeEmployee.endDate}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export Actions */}
                    <div className="space-y-4">
                        {/* Nómina Actions */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Comprobante de Nómina</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPreviewModal('nomina')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Vista Previa
                                </button>
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
                                    className="flex-1 flex items-center justify-center gap-2 bg-purple-900 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar PDF
                                </button>
                            </div>
                        </div>

                        {/* Liquidación Actions */}
                        <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-3">
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Liquidación de Prestaciones</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPreviewModal('liquidacion')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-amber-100 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Vista Previa
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeEmployee && result && liquidationResult) {
                                            const selectedClient = clients.find(c => c.id === selectedClientId);
                                            generateLiquidationPDF({
                                                employee: activeEmployee,
                                                result,
                                                liquidationResult,
                                                companyName: selectedClient?.name,
                                                companyNit: selectedClient?.nit || undefined,
                                            });
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar PDF
                                </button>
                            </div>
                        </div>

                        {/* Save to History */}
                        {selectedClientId && (
                            <button
                                onClick={handleSavePayroll}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar en Histórico
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Client Modal */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-gray-900 mb-4">Crear Nuevo Cliente</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Cliente *</label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Empresa S.A.S"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">NIT</label>
                                <input
                                    type="text"
                                    value={newClientNit}
                                    onChange={(e) => setNewClientNit(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
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
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:brightness-110 disabled:opacity-50"
                                >
                                    {saving ? 'Creando...' : 'Crear Cliente'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreviewModal && activeEmployee && result && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className={`p-4 flex items-center justify-between ${showPreviewModal === 'nomina' ? 'bg-purple-900' : 'bg-amber-600'} text-white`}>
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5" />
                                <h2 className="font-bold">
                                    {showPreviewModal === 'nomina' ? 'Vista Previa - Comprobante de Nómina' : 'Vista Previa - Liquidación de Prestaciones'}
                                </h2>
                            </div>
                            <button onClick={() => setShowPreviewModal(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
                                {showPreviewModal === 'nomina' ? (
                                    <>
                                        {/* Nómina Preview */}
                                        <div className="text-center border-b-2 border-purple-900 pb-4 mb-4">
                                            <h1 className="text-xl font-bold text-purple-900">COMPROBANTE DE NÓMINA</h1>
                                            <p className="text-sm text-gray-600">Período: {activeEmployee.startDate} - {activeEmployee.endDate}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-xs text-gray-500 font-bold">EMPRESA</p>
                                                <p className="font-medium">{clients.find(c => c.id === selectedClientId)?.name || 'ContaBot S.A.S'}</p>
                                                <p className="text-gray-600">NIT: {clients.find(c => c.id === selectedClientId)?.nit || '900.123.456-7'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-xs text-gray-500 font-bold">EMPLEADO</p>
                                                <p className="font-medium">{activeEmployee.name}</p>
                                                <p className="text-gray-600">CC: {activeEmployee.documentNumber || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm mb-4">
                                            <thead>
                                                <tr className="bg-teal-600 text-white">
                                                    <th className="text-left p-2 rounded-tl">Concepto</th>
                                                    <th className="text-right p-2 rounded-tr">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b"><td className="p-2">Salario Base</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.baseSalary)}</td></tr>
                                                <tr className="border-b bg-gray-50"><td className="p-2">Auxilio de Transporte</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.transportAid)}</td></tr>
                                                {(result.monthly.salaryData.overtime ?? 0) > 0 && <tr className="border-b"><td className="p-2">Horas Extra</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.overtime ?? 0)}</td></tr>}
                                                <tr className="bg-teal-50 font-bold"><td className="p-2">TOTAL DEVENGADO</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.totalAccrued)}</td></tr>
                                            </tbody>
                                        </table>

                                        <table className="w-full text-sm mb-4">
                                            <thead>
                                                <tr className="bg-red-600 text-white">
                                                    <th className="text-left p-2 rounded-tl">Deducciones</th>
                                                    <th className="text-right p-2 rounded-tr">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b"><td className="p-2">Salud (4%)</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.health)}</td></tr>
                                                <tr className="border-b bg-gray-50"><td className="p-2">Pensión (4%)</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.pension)}</td></tr>
                                                {result.monthly.employeeDeductions.solidarityFund > 0 && <tr className="border-b"><td className="p-2">Fondo Solidaridad</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.solidarityFund)}</td></tr>}
                                                <tr className="bg-red-50 font-bold"><td className="p-2">TOTAL DEDUCCIONES</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.totalDeductions)}</td></tr>
                                            </tbody>
                                        </table>

                                        <div className="bg-teal-600 text-white p-4 rounded-lg flex justify-between items-center">
                                            <span className="font-bold">NETO A PAGAR</span>
                                            <span className="text-2xl font-bold">{formatCurrency(result.monthly.netPay)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Liquidación Preview */}
                                        <div className="text-center border-b-2 border-amber-600 pb-4 mb-4">
                                            <h1 className="text-xl font-bold text-gray-900">LIQUIDACIÓN DE PRESTACIONES SOCIALES</h1>
                                            <p className="text-sm text-gray-500 italic">(Colombia – Código Sustantivo del Trabajo)</p>
                                        </div>

                                        <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <p><span className="text-gray-500">Trabajador:</span> <strong>{activeEmployee.name}</strong></p>
                                                <p><span className="text-gray-500">Documento:</span> {activeEmployee.documentNumber || 'N/A'}</p>
                                                <p><span className="text-gray-500">Fecha ingreso:</span> {activeEmployee.startDate}</p>
                                                <p><span className="text-gray-500">Fecha retiro:</span> {activeEmployee.endDate}</p>
                                                <p><span className="text-gray-500">Días laborados:</span> <strong>{liquidationResult?.daysWorked}</strong></p>
                                                <p><span className="text-gray-500">Salario base:</span> {formatCurrency(activeEmployee.baseSalary)}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm mb-4">
                                            <thead>
                                                <tr className="bg-gray-200">
                                                    <th className="text-left p-2">Concepto</th>
                                                    <th className="text-right p-2">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b"><td className="p-2">Cesantías</td><td className="text-right p-2">{formatCurrency(liquidationResult?.cesantias || 0)}</td></tr>
                                                <tr className="border-b bg-gray-50"><td className="p-2">Intereses de Cesantías (12%)</td><td className="text-right p-2">{formatCurrency(liquidationResult?.interesesCesantias || 0)}</td></tr>
                                                <tr className="border-b"><td className="p-2">Prima de Servicios</td><td className="text-right p-2">{formatCurrency(liquidationResult?.prima || 0)}</td></tr>
                                                <tr className="border-b bg-gray-50"><td className="p-2">Vacaciones</td><td className="text-right p-2">{formatCurrency(liquidationResult?.vacaciones || 0)}</td></tr>
                                                <tr className="bg-amber-50 font-bold"><td className="p-2">TOTAL PRESTACIONES</td><td className="text-right p-2">{formatCurrency(liquidationResult?.totalPrestaciones || 0)}</td></tr>
                                            </tbody>
                                        </table>

                                        {liquidationResult && liquidationResult.deductions.total > 0 && (
                                            <div className="bg-red-50 p-3 rounded mb-4 text-sm">
                                                <p className="font-bold text-red-700 mb-2">Descuentos:</p>
                                                {liquidationResult.deductions.loans > 0 && <p className="flex justify-between"><span>Préstamos</span><span>-{formatCurrency(liquidationResult.deductions.loans)}</span></p>}
                                                {liquidationResult.deductions.retefuente > 0 && <p className="flex justify-between"><span>Retención Fuente</span><span>-{formatCurrency(liquidationResult.deductions.retefuente)}</span></p>}
                                                <p className="flex justify-between font-bold border-t mt-2 pt-2"><span>Total Descuentos</span><span>-{formatCurrency(liquidationResult.deductions.total)}</span></p>
                                            </div>
                                        )}

                                        <div className="bg-green-100 border-2 border-green-500 p-4 rounded-lg flex justify-between items-center">
                                            <span className="font-bold text-green-800">NETO A PAGAR AL TRABAJADOR</span>
                                            <span className="text-2xl font-bold text-green-700">{formatCurrency(liquidationResult?.netToPay || 0)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowPreviewModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    const selectedClient = clients.find(c => c.id === selectedClientId);
                                    if (showPreviewModal === 'nomina') {
                                        generatePayrollPDF({
                                            employee: activeEmployee,
                                            result,
                                            companyName: selectedClient?.name,
                                            companyNit: selectedClient?.nit || undefined,
                                            periodDescription: `Período: ${activeEmployee.startDate} - ${activeEmployee.endDate}`
                                        });
                                    } else if (liquidationResult) {
                                        generateLiquidationPDF({
                                            employee: activeEmployee,
                                            result,
                                            liquidationResult,
                                            companyName: selectedClient?.name,
                                            companyNit: selectedClient?.nit || undefined,
                                        });
                                    }
                                    setShowPreviewModal(null);
                                }}
                                className={`px-6 py-2 text-white rounded-lg font-bold flex items-center gap-2 ${showPreviewModal === 'nomina' ? 'bg-purple-900 hover:bg-purple-800' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                                <Download className="w-4 h-4" />
                                Descargar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        {feedbackSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ThumbsUp className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">¡Gracias por tu feedback!</h2>
                                <p className="text-gray-600">Tu opinión nos ayuda a mejorar ContaBot.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-xl">
                                            <MessageSquare className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-900">Califica el módulo de Nómina</h2>
                                    </div>
                                    <button onClick={() => setShowFeedbackModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    {/* Star Rating */}
                                    <div>
                                        <p className="text-sm text-gray-600 mb-3">¿Qué tan útil te parece este módulo?</p>
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setFeedbackRating(star)}
                                                    className="p-1 transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        className={`w-10 h-10 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-center text-sm text-gray-500 mt-2">
                                            {feedbackRating === 0 && 'Selecciona una calificación'}
                                            {feedbackRating === 1 && 'Muy malo'}
                                            {feedbackRating === 2 && 'Malo'}
                                            {feedbackRating === 3 && 'Regular'}
                                            {feedbackRating === 4 && 'Bueno'}
                                            {feedbackRating === 5 && '¡Excelente!'}
                                        </p>
                                    </div>

                                    {/* Comment */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Comentarios (opcional)
                                        </label>
                                        <textarea
                                            value={feedbackComment}
                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                            placeholder="¿Qué podríamos mejorar? ¿Qué te gustaría ver?"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={feedbackRating === 0 || submittingFeedback}
                                        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submittingFeedback ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar Feedback
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Feedback Button */}
            <button
                onClick={() => setShowFeedbackModal(true)}
                className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-105 z-40 flex items-center gap-2 group"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
                    Calificar módulo
                </span>
            </button>
        </div>
    );
}
