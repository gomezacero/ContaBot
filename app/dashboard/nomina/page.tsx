'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    PayrollInput,
    RiskLevel,
    LiquidationResult,
    AnticiposPrestaciones,
    DeduccionPersonalizada,
    LiquidationAdvancesInput,
    DEFAULT_ANTICIPOS,
    PrimaAnticipada,
    TipoPrimaAnticipada
} from '@/types/payroll';
import { calculatePayroll, formatCurrency, createDefaultEmployee, calculateLiquidation } from '@/lib/calculations';
import { generatePayrollPDF, generateLiquidationPDF } from '@/lib/pdf-generator';
import { SMMLV_2026, PARAMETROS_NOMINA, AnoBase } from '@/lib/constants';
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
    ThumbsUp,
    HelpCircle, // Added
    Settings,
    MinusCircle,
    ListMinus,
    Gift,
    Palmtree,
    PiggyBank,
    Percent
} from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Tooltip } from '@/components/ui/Tooltip';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { useToast } from '@/components/ui/Toast';

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
    // Campos para override de parámetros base
    ano_base: number | null;
    smmlv_override: number | null;
    aux_transporte_override: number | null;
    // Persistencia de anticipos y deducciones personalizadas
    advances_data: {
        anticipos?: AnticiposPrestaciones;
        deduccionesPersonalizadas?: DeduccionPersonalizada[];
    } | null;
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
    const baseSalary = Number(emp.base_salary) || SMMLV_2026;

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
        name: emp.name ?? 'Empleado',
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
        otherDeductions: 0,
        // Override de parámetros base
        anoBase: (emp.ano_base as 2024 | 2025 | 2026) || 2026,
        smmlvOverride: emp.smmlv_override || undefined,
        auxTransporteOverride: emp.aux_transporte_override || undefined,
        // Anticipos y deducciones personalizadas guardados
        advancesData: emp.advances_data || undefined
    };
}

// UI Components
const Section: React.FC<{ title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, icon, isOpen, onToggle, children }) => (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-200 text-zinc-500'}`}>
                    {icon}
                </div>
                <span className="font-semibold text-zinc-800 text-sm">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>
        {isOpen && <div className="p-4 lg:p-5 border-t border-zinc-100 animate-in slide-in-from-top-1">{children}</div>}
    </div>
);

const Input: React.FC<{ label: string; type: 'text' | 'number' | 'money' | 'date'; value: any; onChange: (val: any) => void; placeholder?: string }> = ({ label, type, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{label}</label>
        <div className="relative">
            {type === 'money' && <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">$</span>}
            <input
                type={type === 'money' ? 'text' : type}
                value={type === 'money' ? (value ? Number(value).toLocaleString('es-CO') : '') : (value ?? '')}
                placeholder={placeholder}
                onChange={e => {
                    const v = type === 'money' ? e.target.value.replace(/\D/g, '') : e.target.value;
                    onChange(type === 'number' || type === 'money' ? Number(v) : v);
                }}
                className={`w-full bg-white border border-zinc-200 rounded-lg py-2 ${type === 'money' ? 'pl-6' : 'pl-3'} pr-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`}
            />
        </div>
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer group w-full">
        <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 whitespace-nowrap">{label}</span>
        <div className="relative flex-shrink-0">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`w-9 h-5 rounded-full shadow-inner transition-colors ${checked ? 'bg-emerald-600' : 'bg-zinc-300'}`}></div>
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </label>
);

const ResultRow: React.FC<{ label: string; value: number; isBold?: boolean; color?: string }> = ({ label, value, isBold, color = 'text-zinc-900' }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-zinc-600">{label}</span>
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
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['section1']));
    const [activeTab, setActiveTab] = useState<'nomina' | 'liquidacion'>('nomina');

    // Estados para override de parámetros base (SMMLV y Auxilio)
    const [anoBase, setAnoBase] = useState<AnoBase>(2026);
    const [smmlvOverride, setSmmlvOverride] = useState<number>(PARAMETROS_NOMINA[2026].smmlv);
    const [auxOverride, setAuxOverride] = useState<number>(PARAMETROS_NOMINA[2026].auxTransporte);

    // Estados para anticipos de prestaciones (liquidación)
    const [anticipos, setAnticipos] = useState<AnticiposPrestaciones>({ ...DEFAULT_ANTICIPOS });
    const [deduccionesPersonalizadas, setDeduccionesPersonalizadas] = useState<DeduccionPersonalizada[]>([]);

    // Preview and Feedback states
    const [showPreviewModal, setShowPreviewModal] = useState<'nomina' | 'liquidacion' | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; employeeId: string; employeeName: string }>({
        isOpen: false,
        employeeId: '',
        employeeName: ''
    });
    const { addToast } = useToast();

    // Determine which employees to show
    const employees = selectedClientId
        ? dbEmployees.map(dbToPayrollInput)
        : localEmployees;

    const activeEmployee = employees.find(e => e.id === activeEmployeeId) || employees[0];

    // Empleado activo con los overrides aplicados
    const activeEmployeeWithOverrides = useMemo(() => {
        if (!activeEmployee) return null;
        return {
            ...activeEmployee,
            smmlvOverride,
            auxTransporteOverride: auxOverride,
            anoBase
        };
    }, [activeEmployee, smmlvOverride, auxOverride, anoBase]);

    // Memoized Result Calculation
    const result = useMemo(() => activeEmployeeWithOverrides ? calculatePayroll(activeEmployeeWithOverrides) : null, [activeEmployeeWithOverrides]);

    // Memoized Liquidation Calculation (incluye anticipos)
    const liquidationResult = useMemo(() => {
        if (activeEmployeeWithOverrides && result) {
            const advancesInput: LiquidationAdvancesInput = {
                anticipos,
                deduccionesPersonalizadas
            };
            return calculateLiquidation(activeEmployeeWithOverrides, result, advancesInput);
        }
        return null;
    }, [activeEmployeeWithOverrides, result, anticipos, deduccionesPersonalizadas]);

    // Helper: Actualizar campo de prima anticipada
    const updatePrima = (field: keyof PrimaAnticipada, value: TipoPrimaAnticipada | boolean | number) => {
        setAnticipos(prev => ({
            ...prev,
            prima: { ...prev.prima, [field]: value }
        }));
    };

    // Helper: Agregar deducción personalizada (máx 5)
    const addDeduccionPersonalizada = () => {
        if (deduccionesPersonalizadas.length >= 5) return;
        setDeduccionesPersonalizadas(prev => [...prev, {
            id: crypto.randomUUID(),
            nombre: '',
            valor: 0
        }]);
    };

    // Helper: Eliminar deducción personalizada
    const removeDeduccion = (id: string) => {
        setDeduccionesPersonalizadas(prev => prev.filter(d => d.id !== id));
    };

    // Helper: Actualizar deducción personalizada
    const updateDeduccion = (id: string, field: 'nombre' | 'valor', value: string | number) => {
        setDeduccionesPersonalizadas(prev => prev.map(d =>
            d.id === id ? { ...d, [field]: value } : d
        ));
    };

    // Helper: Resetear anticipos cuando cambia el empleado
    const resetAnticipos = () => {
        setAnticipos({ ...DEFAULT_ANTICIPOS });
        setDeduccionesPersonalizadas([]);
    };

    // Toggle Section Helper (permite múltiples secciones abiertas)
    const toggleSection = (section: string) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    // Sincronizar estados de override cuando cambia el empleado activo
    useEffect(() => {
        if (activeEmployee) {
            const year = (activeEmployee.anoBase as AnoBase) || 2026;
            setAnoBase(year);
            // Si el empleado tiene valores guardados, usarlos; sino usar los del año
            setSmmlvOverride(activeEmployee.smmlvOverride || PARAMETROS_NOMINA[year].smmlv);
            setAuxOverride(activeEmployee.auxTransporteOverride || PARAMETROS_NOMINA[year].auxTransporte);

            // Cargar anticipos guardados del empleado (si existen)
            if (activeEmployee.advancesData) {
                const saved = activeEmployee.advancesData;
                if (saved.anticipos) {
                    setAnticipos(saved.anticipos);
                } else {
                    setAnticipos({ ...DEFAULT_ANTICIPOS });
                }
                if (saved.deduccionesPersonalizadas && saved.deduccionesPersonalizadas.length > 0) {
                    setDeduccionesPersonalizadas(saved.deduccionesPersonalizadas);
                } else {
                    setDeduccionesPersonalizadas([]);
                }
            } else {
                // Solo resetea si no hay datos guardados
                resetAnticipos();
            }
        }
    }, [activeEmployee?.id]); // Solo cuando cambia el ID del empleado

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
                        base_salary: SMMLV_2026,
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
            // Determinar si los valores son custom o son los defaults del año
            const defaultParams = PARAMETROS_NOMINA[anoBase];
            const smmlvToSave = smmlvOverride !== defaultParams.smmlv ? smmlvOverride : null;
            const auxToSave = auxOverride !== defaultParams.auxTransporte ? auxOverride : null;

            // Preparar datos de anticipos para guardar
            const advancesDataToSave = {
                anticipos,
                deduccionesPersonalizadas
            };

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
                    deductions_config: activeEmployee.deductionsParameters as unknown as Record<string, unknown>,
                    // Parámetros base de cálculo
                    ano_base: anoBase,
                    smmlv_override: smmlvToSave,
                    aux_transporte_override: auxToSave,
                    // Anticipos y deducciones personalizadas
                    advances_data: advancesDataToSave
                })
                .eq('id', activeEmployeeId);

            if (error) throw error;

            // Actualizar también el estado local del empleado en dbEmployees
            setDbEmployees(prev => prev.map(emp =>
                emp.id === activeEmployeeId
                    ? {
                        ...emp,
                        ano_base: anoBase,
                        smmlv_override: smmlvToSave,
                        aux_transporte_override: auxToSave,
                        advances_data: advancesDataToSave
                    }
                    : emp
            ));

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

    // Save liquidation record with advances (anticipos)
    const handleSaveLiquidation = async () => {
        if (!selectedClientId || !activeEmployee || !liquidationResult) return;
        setSaving(true);
        try {
            // Prepare advances data to save
            const advancesData: LiquidationAdvancesInput = {
                anticipos,
                deduccionesPersonalizadas
            };

            const { error } = await supabase
                .from('liquidation_records')
                .insert({
                    employee_id: activeEmployeeId,
                    hire_date: activeEmployee.startDate,
                    termination_date: activeEmployee.endDate,
                    days_worked: liquidationResult.daysWorked,
                    calculation_data: liquidationResult,
                    net_pay: liquidationResult.netToPay,
                    advances_data: advancesData,
                });

            if (error) throw error;
            setSaved(true);
            addToast({
                type: 'success',
                title: 'Liquidación guardada',
                description: 'La liquidación ha sido guardada en el histórico'
            });
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error guardando liquidación:', err);
            setError('Error guardando liquidación');
            addToast({
                type: 'error',
                title: 'Error',
                description: 'No se pudo guardar la liquidación'
            });
        } finally {
            setSaving(false);
        }
    };

    // Handle opening delete modal
    const openDeleteModal = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, employeeId: id, employeeName: name });
    };

    // Handle deleting employee (soft delete - can be restored from papelera)
    const handleDeleteEmployee = async () => {
        const { employeeId: id, employeeName } = deleteModal;

        if (selectedClientId) {
            try {
                // Use soft delete via RPC for safe deletion with audit trail
                const { error } = await supabase.rpc('soft_delete_record', {
                    p_table_name: 'employees',
                    p_record_id: id,
                    p_reason: 'Usuario elimino empleado desde nomina'
                });
                if (error) throw error;
                const newList = dbEmployees.filter(emp => emp.id !== id);
                setDbEmployees(newList);
                if (activeEmployeeId === id && newList.length > 0) setActiveEmployeeId(newList[0].id);

                addToast({
                    type: 'success',
                    title: 'Empleado eliminado',
                    description: `"${employeeName}" ha sido movido a la papelera`,
                    action: {
                        label: 'Ver papelera',
                        onClick: () => window.location.href = '/dashboard/papelera'
                    }
                });
            } catch {
                setError('Error eliminando empleado');
                addToast({
                    type: 'error',
                    title: 'Error',
                    description: 'No se pudo eliminar el empleado'
                });
            }
        } else {
            // Local employees (guest mode) - no soft delete needed
            if (localEmployees.length === 1) return;
            const newEmployees = localEmployees.filter(emp => emp.id !== id);
            setLocalEmployees(newEmployees);
            if (activeEmployeeId === id) setActiveEmployeeId(newEmployees[0].id);
            addToast({
                type: 'info',
                title: 'Empleado eliminado',
                description: 'El empleado ha sido eliminado (modo invitado)'
            });
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
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Calculadora Pro 2025</h1>
                        <p className="text-sm text-zinc-500">Control total de variables para liquidaciones complejas.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-zinc-100">
                    {saved && (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold animate-fade-in px-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Guardado
                        </div>
                    )}
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value || null)}
                        className="px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium bg-zinc-50 focus:ring-2 focus:ring-emerald-500 outline-none min-w-[200px]"
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
                        className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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

            {/* Employee Horizontal List + Tab Switcher */}
            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-zinc-100 flex items-center justify-between">
                {/* Employee Tabs - Left Side */}
                <div className="flex items-center overflow-x-auto no-scrollbar flex-1 pl-2">
                    {employees.map((emp) => {
                        const isActive = emp.id === activeEmployeeId;
                        return (
                            <div
                                key={emp.id}
                                onClick={() => setActiveEmployeeId(emp.id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all group relative border select-none ${isActive
                                    ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-zinc-50'
                                    }`}
                            >
                                <UserCircle2 className="w-4 h-4" />
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-xs truncate max-w-[100px] font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{emp.name}</span>
                                    {isActive && <span className="h-0.5 w-full bg-emerald-500 rounded-full mt-0.5 animate-in zoom-in"></span>}
                                </div>

                                {employees.length > 1 && (
                                    <button
                                        onClick={(e) => openDeleteModal(emp.id, emp.name, e)}
                                        className={`ml-1 p-1 rounded-md transition-all duration-200
                                            ${isActive
                                                ? 'text-red-400 hover:text-red-600 hover:bg-red-50 opacity-100'
                                                : 'text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'
                                            }`}
                                        title="Eliminar empleado"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <button
                        onClick={handleAddEmployee}
                        className={`ml-2 p-2 rounded-lg transition-all ${employees.length === 0
                            ? 'bg-emerald-600 text-white shadow-lg animate-pulse ring-4 ring-emerald-100'
                            : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher - Right Side (mismo ancho que panel derecho: 1/3 - gap) */}
                <div className="hidden lg:flex items-center gap-1 ml-4 flex-shrink-0 bg-zinc-50 p-1.5 rounded-xl w-[calc(33.333%-24px)]">
                    <button
                        onClick={() => setActiveTab('nomina')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'nomina' ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Nómina
                    </button>
                    <button
                        onClick={() => setActiveTab('liquidacion')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'liquidacion' ? 'bg-white text-amber-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Wallet className="w-4 h-4" />
                        Liquidación
                    </button>
                </div>
                {/* Tab Switcher - Mobile */}
                <div className="flex lg:hidden items-center gap-1 ml-4 flex-shrink-0 bg-zinc-50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('nomina')}
                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'nomina' ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Nómina
                    </button>
                    <button
                        onClick={() => setActiveTab('liquidacion')}
                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'liquidacion' ? 'bg-white text-amber-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Wallet className="w-4 h-4" />
                        Liquidación
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-w-[1800px] mx-auto lg:h-[calc(100vh-180px)]">

                {/* LEFT PANEL: FORM INPUTS (2/3) - Scroll independiente */}
                <div className="lg:col-span-2 lg:h-full lg:overflow-y-auto lg:pr-3 space-y-4 scrollbar-thin">
                    {activeEmployee && (
                        <>
                            {/* I. DATOS GENERALES */}
                            <Section title="I. Datos Generales y Periodo" icon={<Calendar className="w-4 h-4" />} isOpen={openSections.has('section1')} onToggle={() => toggleSection('section1')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Inicio Periodo" type="date" value={activeEmployee.startDate} onChange={v => handleInputChange('startDate', v)} />
                                    <Input label="Fin Periodo" type="date" value={activeEmployee.endDate} onChange={v => handleInputChange('endDate', v)} />
                                    <Input label="Nombre Empleado" type="text" value={activeEmployee.name} onChange={v => handleInputChange('name', v)} placeholder="" />
                                    <Input label="Salario Básico" type="money" value={activeEmployee.baseSalary} onChange={v => handleInputChange('baseSalary', v)} />
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Tipo Contrato</label>
                                        <select
                                            className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                                            value={activeEmployee.contractType}
                                            onChange={e => handleInputChange('contractType', e.target.value)}
                                        >
                                            <option value="INDEFINIDO">Indefinido</option>
                                            <option value="FIJO">Término Fijo</option>
                                            <option value="OBRA_LABOR">Obra o Labor</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-6 gap-3">
                                        <div className="flex-1 max-w-[200px]">
                                            <Toggle label="Aplica Aux. Transporte" checked={activeEmployee.includeTransportAid} onChange={v => handleInputChange('includeTransportAid', v)} />
                                        </div>
                                        <Tooltip content="Subsidio obligatorio para quienes ganan hasta 2 SMMLV ($162.000 aprox)." />
                                    </div>
                                </div>
                            </Section>

                            {/* PARÁMETROS BASE DE CÁLCULO */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-semibold text-emerald-800">Parámetros Base de Cálculo</h3>
                                    <Tooltip content="Para liquidaciones de empleados que iniciaron en años anteriores, seleccione el año base correspondiente. Los valores de SMMLV y Auxilio se ajustarán automáticamente." />
                                </div>
                                <p className="text-xs text-emerald-600 mb-3">
                                    Útil para liquidar empleados con la base salarial de años anteriores (regla de los últimos 6 meses).
                                </p>

                                <div className="grid grid-cols-3 gap-4">
                                    {/* Selector de Año */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Año Base</label>
                                        <select
                                            className="w-full bg-white border border-emerald-200 rounded-lg py-2 px-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={anoBase}
                                            onChange={(e) => {
                                                const year = Number(e.target.value) as AnoBase;
                                                setAnoBase(year);
                                                const params = PARAMETROS_NOMINA[year];
                                                setSmmlvOverride(params.smmlv);
                                                setAuxOverride(params.auxTransporte);
                                            }}
                                        >
                                            <option value={2024}>2024</option>
                                            <option value={2025}>2025</option>
                                            <option value={2026}>2026 (Actual)</option>
                                        </select>
                                    </div>

                                    {/* SMMLV Editable */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">SMMLV</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">$</span>
                                            <input
                                                type="text"
                                                value={smmlvOverride.toLocaleString('es-CO')}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/\D/g, '');
                                                    setSmmlvOverride(Number(v) || 0);
                                                }}
                                                className="w-full bg-white border border-emerald-200 rounded-lg py-2 pl-6 pr-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Auxilio Transporte Editable */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Aux. Transporte</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">$</span>
                                            <input
                                                type="text"
                                                value={auxOverride.toLocaleString('es-CO')}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/\D/g, '');
                                                    setAuxOverride(Number(v) || 0);
                                                }}
                                                className="w-full bg-white border border-emerald-200 rounded-lg py-2 pl-6 pr-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Indicador visual del año seleccionado */}
                                {anoBase !== 2026 && (
                                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs text-amber-700">
                                            Usando valores del año <strong>{anoBase}</strong>. Los cálculos de nómina y liquidación usarán estos parámetros.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* II. SEGURIDAD SOCIAL */}
                            <Section title="II. Seguridad Social y Configuración" icon={<UserCog className="w-4 h-4" />} isOpen={openSections.has('section2')} onToggle={() => toggleSection('section2')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Riesgo ARL</label>
                                        <select
                                            className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
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
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 max-w-[220px]">
                                                <Toggle label="Exento Parafiscales (Ley 1607)" checked={activeEmployee.isExempt} onChange={v => handleInputChange('isExempt', v)} />
                                            </div>
                                            <Tooltip content="Exonera de aportes a Salud (8.5%) y Parafiscales (SENA/ICBF) si el empleado gana menos de 10 SMMLV." />
                                        </div>
                                    </div>
                                </div>
                            </Section>

                            {/* III. HORAS EXTRAS */}
                            <Section title="III. Horas Extras y Variables" icon={<DollarSign className="w-4 h-4" />} isOpen={openSections.has('section3')} onToggle={() => toggleSection('section3')}>
                                <div className="grid grid-cols-3 gap-3">
                                    <Input label="H.E. Diurna (1.25)" type="number" value={activeEmployee.hedHours} onChange={v => handleInputChange('hedHours', v)} />
                                    <Input label="H.E. Nocturna (1.75)" type="number" value={activeEmployee.henHours} onChange={v => handleInputChange('henHours', v)} />
                                    <Input label="Recargo Noct. (0.35)" type="number" value={activeEmployee.rnHours} onChange={v => handleInputChange('rnHours', v)} />
                                    <Input label="H.E.D Festiva (2.00)" type="number" value={activeEmployee.heddfHours} onChange={v => handleInputChange('heddfHours', v)} />
                                    <Input label="H.E.N Festiva (2.50)" type="number" value={activeEmployee.hendfHours} onChange={v => handleInputChange('hendfHours', v)} />
                                    <div className="col-span-3 h-px bg-zinc-100 my-2"></div>
                                    <Input label="Comisiones" type="money" value={activeEmployee.commissions} onChange={v => handleInputChange('commissions', v)} />
                                    <Input label="Bonif. Salariales" type="money" value={activeEmployee.salaryBonuses} onChange={v => handleInputChange('salaryBonuses', v)} />
                                </div>
                            </Section>

                            {/* IV. NO SALARIAL */}
                            <Section title="IV. Pagos No Salariales" icon={<Briefcase className="w-4 h-4" />} isOpen={openSections.has('section4')} onToggle={() => toggleSection('section4')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Bonos No Salariales" type="money" value={activeEmployee.nonSalaryBonuses} onChange={v => handleInputChange('nonSalaryBonuses', v)} />
                                </div>
                            </Section>

                            {/* V. DEDUCCIONES */}
                            <Section title="V. Deducciones y Retenciones" icon={<TrendingDown className="w-4 h-4" />} isOpen={openSections.has('section5')} onToggle={() => toggleSection('section5')}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Préstamos Empresa" type="money" value={activeEmployee.loans} onChange={v => handleInputChange('loans', v)} />
                                        <Input label="Otras Deducciones" type="money" value={activeEmployee.otherDeductions} onChange={v => handleInputChange('otherDeductions', v)} />
                                    </div>

                                    {/* Toggle Deducciones Retefuente */}
                                    <div className="border-t border-zinc-100 pt-4">
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <div className="flex items-center gap-2">
                                                <BadgePercent className="w-4 h-4 text-emerald-600" />
                                                <span className="text-sm font-medium text-emerald-800">¿Activar deducciones Retefuente?</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${!activeEmployee.enableDeductions ? 'text-emerald-700' : 'text-zinc-400'}`}>NO</span>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={activeEmployee.enableDeductions}
                                                        onChange={e => handleInputChange('enableDeductions', e.target.checked)}
                                                    />
                                                    <div
                                                        onClick={() => handleInputChange('enableDeductions', !activeEmployee.enableDeductions)}
                                                        className={`w-10 h-5 rounded-full shadow-inner transition-colors cursor-pointer ${activeEmployee.enableDeductions ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform ${activeEmployee.enableDeductions ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-bold ${activeEmployee.enableDeductions ? 'text-emerald-700' : 'text-zinc-400'}`}>SI</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Campos Condicionales de Retefuente */}
                                    {activeEmployee.enableDeductions && (
                                        <div className="bg-zinc-50 rounded-xl p-4 space-y-4 border border-zinc-200 animate-in slide-in-from-top-2">
                                            <p className="text-xs text-zinc-500 font-medium">Configure los beneficios tributarios para reducir la base de retención en la fuente (Art. 383 E.T.)</p>

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

                            {/* VI. ANTICIPOS DE PRESTACIONES */}
                            <Section
                                title="VI. Anticipos de Prestaciones"
                                icon={<MinusCircle className="w-4 h-4" />}
                                isOpen={openSections.has('section6')}
                                onToggle={() => toggleSection('section6')}
                            >
                                    <div className="space-y-5">
                                        {/* Header con descripción y badge total */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-zinc-500">Montos ya pagados que se descontarán de la liquidación</p>
                                            {(anticipos.prima.montoPagado > 0 || anticipos.vacacionesPagadas > 0 ||
                                              anticipos.cesantiasParciales > 0 || anticipos.interesesCesantiasPagados > 0) && (
                                                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
                                                    Total: {formatCurrency(
                                                        anticipos.prima.montoPagado + anticipos.vacacionesPagadas +
                                                        anticipos.cesantiasParciales + anticipos.interesesCesantiasPagados
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Prima de Servicios */}
                                        <div className="bg-gradient-to-r from-pink-50 to-amber-50 rounded-xl p-4 border border-pink-200/60">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
                                                    <Gift className="w-4 h-4 text-pink-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-semibold text-zinc-700">Prima de Servicios</label>
                                                    <p className="text-xs text-zinc-400">Pagada por semestre o monto directo</p>
                                                </div>
                                                <select
                                                    value={anticipos.prima.tipo}
                                                    onChange={(e) => updatePrima('tipo', e.target.value as TipoPrimaAnticipada)}
                                                    className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                >
                                                    <option value="MONTO">Monto directo</option>
                                                    <option value="SEMESTRE">Por semestre</option>
                                                </select>
                                            </div>

                                            {anticipos.prima.tipo === 'SEMESTRE' ? (
                                                <div className="flex gap-3 ml-12">
                                                    {/* Checkbox Junio */}
                                                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer border-2 transition-all ${
                                                        anticipos.prima.semestreJunioPagado
                                                            ? 'bg-pink-100 border-pink-400'
                                                            : 'bg-white border-zinc-200 hover:border-pink-300'
                                                    }`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={anticipos.prima.semestreJunioPagado}
                                                            onChange={(e) => updatePrima('semestreJunioPagado', e.target.checked)}
                                                            className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                                        />
                                                        <div>
                                                            <span className="text-sm font-medium text-zinc-700">Junio</span>
                                                            <p className="text-xs text-zinc-400">Ene-Jun</p>
                                                        </div>
                                                    </label>
                                                    {/* Checkbox Diciembre */}
                                                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer border-2 transition-all ${
                                                        anticipos.prima.semestreDiciembrePagado
                                                            ? 'bg-pink-100 border-pink-400'
                                                            : 'bg-white border-zinc-200 hover:border-pink-300'
                                                    }`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={anticipos.prima.semestreDiciembrePagado}
                                                            onChange={(e) => updatePrima('semestreDiciembrePagado', e.target.checked)}
                                                            className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                                        />
                                                        <div>
                                                            <span className="text-sm font-medium text-zinc-700">Diciembre</span>
                                                            <p className="text-xs text-zinc-400">Jul-Dic</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="ml-12">
                                                    <div className="relative w-48">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                                                        <input
                                                            type="text"
                                                            value={anticipos.prima.montoPagado ? anticipos.prima.montoPagado.toLocaleString('es-CO') : ''}
                                                            onChange={(e) => updatePrima('montoPagado', Number(e.target.value.replace(/\D/g, '')))}
                                                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Grid 3 columnas: Vacaciones, Cesantías, Int. Cesantías */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Vacaciones Card */}
                                            <div className="bg-white rounded-xl p-4 border border-zinc-200 hover:border-cyan-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                                                        <Palmtree className="w-4 h-4 text-cyan-600" />
                                                    </div>
                                                    <label className="text-sm font-semibold text-zinc-700">Vacaciones</label>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">$</span>
                                                    <input
                                                        type="text"
                                                        value={anticipos.vacacionesPagadas ? anticipos.vacacionesPagadas.toLocaleString('es-CO') : ''}
                                                        onChange={(e) => setAnticipos(prev => ({
                                                            ...prev,
                                                            vacacionesPagadas: Number(e.target.value.replace(/\D/g, ''))
                                                        }))}
                                                        className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-white transition-colors"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Cesantías Card */}
                                            <div className="bg-white rounded-xl p-4 border border-zinc-200 hover:border-emerald-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                        <PiggyBank className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <label className="text-sm font-semibold text-zinc-700">Cesantias</label>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">$</span>
                                                    <input
                                                        type="text"
                                                        value={anticipos.cesantiasParciales ? anticipos.cesantiasParciales.toLocaleString('es-CO') : ''}
                                                        onChange={(e) => setAnticipos(prev => ({
                                                            ...prev,
                                                            cesantiasParciales: Number(e.target.value.replace(/\D/g, ''))
                                                        }))}
                                                        className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Int. Cesantías Card */}
                                            <div className="bg-white rounded-xl p-4 border border-zinc-200 hover:border-violet-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                                        <Percent className="w-4 h-4 text-violet-600" />
                                                    </div>
                                                    <label className="text-sm font-semibold text-zinc-700">Int. Cesantias</label>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">$</span>
                                                    <input
                                                        type="text"
                                                        value={anticipos.interesesCesantiasPagados ? anticipos.interesesCesantiasPagados.toLocaleString('es-CO') : ''}
                                                        onChange={(e) => setAnticipos(prev => ({
                                                            ...prev,
                                                            interesesCesantiasPagados: Number(e.target.value.replace(/\D/g, ''))
                                                        }))}
                                                        className="w-full pl-7 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-colors"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            </Section>

                            {/* VII. OTRAS DEDUCCIONES */}
                            <Section
                                title="VII. Otras Deducciones"
                                icon={<ListMinus className="w-4 h-4" />}
                                isOpen={openSections.has('section7')}
                                onToggle={() => toggleSection('section7')}
                            >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-zinc-500">Embargos, prestamos adicionales, etc. (maximo 5)</p>
                                            <button
                                                onClick={addDeduccionPersonalizada}
                                                disabled={deduccionesPersonalizadas.length >= 5}
                                                className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Agregar
                                            </button>
                                        </div>

                                        {deduccionesPersonalizadas.length === 0 ? (
                                            <div className="text-center py-8 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200">
                                                <ListMinus className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                                                <p className="text-sm text-zinc-400">Sin deducciones adicionales</p>
                                                <p className="text-xs text-zinc-300 mt-1">Haz clic en &quot;Agregar&quot; para crear una deduccion</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {deduccionesPersonalizadas.map((d, index) => (
                                                    <div key={d.id} className="flex items-center gap-3 bg-zinc-50 hover:bg-zinc-100 p-3 rounded-xl transition-colors group">
                                                        <span className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600 flex-shrink-0">
                                                            {index + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="Concepto (ej: Embargo judicial)"
                                                            value={d.nombre}
                                                            onChange={(e) => updateDeduccion(d.id, 'nombre', e.target.value)}
                                                            className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none"
                                                        />
                                                        <div className="relative w-36 flex-shrink-0">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">$</span>
                                                            <input
                                                                type="number"
                                                                value={d.valor || ''}
                                                                onChange={(e) => updateDeduccion(d.id, 'valor', Number(e.target.value) || 0)}
                                                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeDeduccion(d.id)}
                                                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                            title="Eliminar deduccion"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Total de deducciones personalizadas */}
                                                <div className="flex justify-end pt-2 border-t border-zinc-200">
                                                    <div className="text-sm">
                                                        <span className="text-zinc-500 mr-2">Total deducciones:</span>
                                                        <span className="font-bold text-red-600">
                                                            {formatCurrency(deduccionesPersonalizadas.reduce((sum, d) => sum + (d.valor || 0), 0))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                            </Section>

                            {/* Save Actions */}
                            {selectedClientId && (
                                <div className="flex gap-3">
                                    <Tooltip content="Guarda la configuración del empleado: salario, deducciones, anticipos y parámetros base. Úsalo cuando modifiques datos del empleado." asWrapper>
                                        <button
                                            onClick={handleSaveToDb}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar Empleado
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT PANEL: RESULTS DASHBOARD (1/3) - Scroll independiente */}
                <div className="lg:col-span-1 lg:h-full lg:overflow-y-auto lg:pl-3 space-y-6 scrollbar-thin">

                    {/* PAYROLL CONTENT (TAB: NOMINA) */}
                    {activeTab === 'nomina' && result && (
                        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                            <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
                                <div className="bg-zinc-900 p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12">
                                        <DollarSign className="w-32 h-32" />
                                    </div>
                                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Neto a Pagar</p>
                                    <h2 className="text-4xl font-bold tracking-tight mb-4">
                                        <AnimatedCounter value={result.monthly.netPay} formatter={formatCurrency} />
                                    </h2>

                                    <div className="grid grid-cols-2 gap-4 border-t border-emerald-700/50 pt-4">
                                        <div>
                                            <p className="text-xs text-emerald-300">Total Devengado</p>
                                            <p className="font-semibold">
                                                <AnimatedCounter value={result.monthly.salaryData.totalAccrued} formatter={formatCurrency} />
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-300">Total Deducciones</p>
                                            <p className="font-semibold">
                                                <AnimatedCounter value={result.monthly.employeeDeductions.totalDeductions} formatter={formatCurrency} />
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* SS Detail */}
                                    <div>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Detalle Seguridad Social</h3>
                                        <div className="space-y-2 text-sm">
                                            <ResultRow label="Salud (Empleado)" value={result.monthly.employeeDeductions.health} />
                                            <ResultRow label="Pensión (Empleado)" value={result.monthly.employeeDeductions.pension} />
                                            <ResultRow label="Fondo Solidaridad" value={result.monthly.employeeDeductions.solidarityFund} isBold={result.monthly.employeeDeductions.solidarityFund > 0} />
                                        </div>
                                    </div>

                                    {/* Employer Costs */}
                                    <div>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Costo Empleador</h3>
                                        <div className="bg-zinc-50 rounded-xl p-4 space-y-2 text-sm border border-zinc-100">
                                            <ResultRow label="Salud (Patrono)" value={result.monthly.employerCosts.health} />
                                            <ResultRow label="Pensión (Patrono)" value={result.monthly.employerCosts.pension} />
                                            <ResultRow label="ARL" value={result.monthly.employerCosts.arl} />
                                            <ResultRow label="Parafiscales (CCF+ICBF+SENA)" value={result.monthly.employerCosts.compensationBox + result.monthly.employerCosts.sena + result.monthly.employerCosts.icbf} />
                                            <div className="border-t border-zinc-200 my-2 pt-2 font-bold text-zinc-900 flex justify-between">
                                                <span>Total Provisiones</span>
                                                <span>{formatCurrency(result.monthly.employerCosts.cesantias + result.monthly.employerCosts.interesesCesantias + result.monthly.employerCosts.prima + result.monthly.employerCosts.vacations)}</span>
                                            </div>
                                            <div className="pt-2 text-right">
                                                <span className="text-xs text-zinc-500 mr-2">Costo Total Nómina:</span>
                                                <span className="font-bold text-emerald-700">
                                                    <AnimatedCounter value={result.monthly.totals.grandTotalCost} formatter={formatCurrency} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-center gap-2 text-xs text-emerald-700">
                                        <Building2 className="w-4 h-4" />
                                        <span>IBC Calculado: <strong>{formatCurrency(result.monthly.salaryData.baseSalary)}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Nomina Actions */}
                            <div className="space-y-3">
                                <div className="bg-white rounded-xl p-4 border border-zinc-200 space-y-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Acciones de Nómina</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPreviewModal('nomina')}
                                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 text-zinc-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-zinc-100 transition-colors"
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
                                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                                        >
                                            <Download className="w-4 h-4" />
                                            Descargar PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Save to History */}
                                {selectedClientId && (
                                    <Tooltip content="Guarda un registro de esta nómina en el historial. Úsalo cada mes/quincena cuando proceses y pagues la nómina del período." asWrapper>
                                        <button
                                            onClick={handleSavePayroll}
                                            disabled={saving}
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-md"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar en Histórico
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LIQUIDATION CONTENT (TAB: LIQUIDACION) */}
                    {activeTab === 'liquidacion' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                            {liquidationResult && activeEmployee ? (
                                <>
                                    <div className="bg-white rounded-3xl shadow-xl border border-amber-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12">
                                                <Wallet className="w-32 h-32" />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-5 h-5 text-amber-200" />
                                                <p className="text-amber-100 text-xs font-bold uppercase tracking-widest">Liquidación Definitiva</p>
                                            </div>
                                            <p className="text-amber-200 text-xs mb-1">Prestaciones Acumuladas</p>
                                            <h2 className="text-4xl font-bold tracking-tight mb-2">{formatCurrency(liquidationResult.netToPay)}</h2>
                                            <p className="text-amber-200 text-xs">
                                                <User className="w-3 h-3 inline mr-1" />
                                                Total a Pagar al Empleado
                                            </p>
                                        </div>

                                        <div className="p-5 space-y-4">
                                            {/* Indicadores: Días Trabajados + Base Liquidación */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-medium uppercase">Días Trabajados</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-amber-800">{liquidationResult.daysWorked}</p>
                                                </div>
                                                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-medium uppercase">Base Liquidación</span>
                                                    </div>
                                                    <p className="text-base font-bold text-zinc-800">{formatCurrency(liquidationResult.baseLiquidation)}</p>
                                                </div>
                                            </div>

                                            {/* Detalle de Liquidación - Formato filas */}
                                            <div className="bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold px-4 py-2 bg-zinc-100 border-b border-zinc-200">
                                                    Detalle de Liquidación
                                                </p>
                                                <div className="divide-y divide-zinc-100">
                                                    {/* Cesantías */}
                                                    <div className="flex justify-between items-center px-4 py-3">
                                                        <span className="text-sm text-zinc-600">Cesantías</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-semibold text-zinc-800">{formatCurrency(liquidationResult.cesantiasNetas)}</span>
                                                            {liquidationResult.cesantiasAnticipadas > 0 && (
                                                                <p className="text-[10px] text-amber-600">Anticipo: -{formatCurrency(liquidationResult.cesantiasAnticipadas)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Intereses Cesantías */}
                                                    <div className="flex justify-between items-center px-4 py-3">
                                                        <span className="text-sm text-zinc-600">Int. Cesantías</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-semibold text-zinc-800">{formatCurrency(liquidationResult.interesesCesantiasNetos)}</span>
                                                            {liquidationResult.interesesCesantiasAnticipados > 0 && (
                                                                <p className="text-[10px] text-amber-600">Anticipo: -{formatCurrency(liquidationResult.interesesCesantiasAnticipados)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Prima Servicios */}
                                                    <div className="flex justify-between items-center px-4 py-3">
                                                        <span className="text-sm text-zinc-600">Prima Servicios</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-semibold text-zinc-800">{formatCurrency(liquidationResult.primaNeta)}</span>
                                                            {liquidationResult.primaAnticipada > 0 && (
                                                                <p className="text-[10px] text-amber-600">Anticipo: -{formatCurrency(liquidationResult.primaAnticipada)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Vacaciones */}
                                                    <div className="flex justify-between items-center px-4 py-3">
                                                        <span className="text-sm text-zinc-600">Vacaciones</span>
                                                        <div className="text-right">
                                                            <span className="text-sm font-semibold text-zinc-800">{formatCurrency(liquidationResult.vacacionesNetas)}</span>
                                                            {liquidationResult.vacacionesAnticipadas > 0 && (
                                                                <p className="text-[10px] text-amber-600">Anticipo: -{formatCurrency(liquidationResult.vacacionesAnticipadas)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Total */}
                                                    <div className="flex justify-between items-center px-4 py-3 bg-amber-50">
                                                        <span className="text-sm font-bold text-zinc-700">Total Neto</span>
                                                        <span className="text-sm font-bold text-amber-700">{formatCurrency(liquidationResult.totalPrestaciones)}</span>
                                                    </div>
                                                </div>
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
                                                        {/* Deducciones personalizadas */}
                                                        {liquidationResult.deductions.deduccionesPersonalizadas?.map(d => (
                                                            <div key={d.id} className="flex justify-between">
                                                                <span className="text-red-600">{d.nombre || 'Sin nombre'}</span>
                                                                <span className="font-medium text-red-700">-{formatCurrency(d.valor)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Período */}
                                            <p className="text-xs text-zinc-400 text-center pt-2 border-t border-zinc-100">
                                                Período: {activeEmployee.startDate} a {activeEmployee.endDate}
                                            </p>
                                        </div>
                                    </div>

                                    {/* SECCIÓN: Deducciones Aplicadas (Read-Only Display) */}
                                    {((anticipos.prima.montoPagado > 0 || anticipos.vacacionesPagadas > 0 ||
                                      anticipos.cesantiasParciales > 0 || anticipos.interesesCesantiasPagados > 0) ||
                                      deduccionesPersonalizadas.length > 0) && (
                                        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border border-red-200/60 p-5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                                    <MinusCircle className="w-5 h-5 text-red-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-zinc-800">Deducciones Aplicadas</h4>
                                                    <p className="text-xs text-zinc-500">Montos que se descontaran del total</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Anticipos de Prestaciones */}
                                                {anticipos.prima.montoPagado > 0 && (
                                                    <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                                                        <span className="text-sm text-zinc-600 flex items-center gap-2">
                                                            <Gift className="w-4 h-4 text-pink-500" />
                                                            Prima Anticipada
                                                        </span>
                                                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(anticipos.prima.montoPagado)}</span>
                                                    </div>
                                                )}
                                                {anticipos.vacacionesPagadas > 0 && (
                                                    <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                                                        <span className="text-sm text-zinc-600 flex items-center gap-2">
                                                            <Palmtree className="w-4 h-4 text-cyan-500" />
                                                            Vacaciones Pagadas
                                                        </span>
                                                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(anticipos.vacacionesPagadas)}</span>
                                                    </div>
                                                )}
                                                {anticipos.cesantiasParciales > 0 && (
                                                    <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                                                        <span className="text-sm text-zinc-600 flex items-center gap-2">
                                                            <PiggyBank className="w-4 h-4 text-emerald-500" />
                                                            Cesantias Parciales
                                                        </span>
                                                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(anticipos.cesantiasParciales)}</span>
                                                    </div>
                                                )}
                                                {anticipos.interesesCesantiasPagados > 0 && (
                                                    <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                                                        <span className="text-sm text-zinc-600 flex items-center gap-2">
                                                            <Percent className="w-4 h-4 text-violet-500" />
                                                            Int. Cesantias Pagados
                                                        </span>
                                                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(anticipos.interesesCesantiasPagados)}</span>
                                                    </div>
                                                )}

                                                {/* Deducciones Personalizadas */}
                                                {deduccionesPersonalizadas.map((d) => (
                                                    d.valor > 0 && (
                                                        <div key={d.id} className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                                                            <span className="text-sm text-zinc-600 flex items-center gap-2">
                                                                <ListMinus className="w-4 h-4 text-red-500" />
                                                                {d.nombre || 'Deduccion'}
                                                            </span>
                                                            <span className="text-sm font-semibold text-red-600">-{formatCurrency(d.valor)}</span>
                                                        </div>
                                                    )
                                                ))}

                                                {/* Total */}
                                                <div className="flex justify-between items-center py-3 px-3 bg-red-100 rounded-lg mt-2 border border-red-200">
                                                    <span className="text-sm font-bold text-red-700">Total Deducciones</span>
                                                    <span className="text-sm font-bold text-red-700">
                                                        -{formatCurrency(
                                                            anticipos.prima.montoPagado +
                                                            anticipos.vacacionesPagadas +
                                                            anticipos.cesantiasParciales +
                                                            anticipos.interesesCesantiasPagados +
                                                            deduccionesPersonalizadas.reduce((sum, d) => sum + (d.valor || 0), 0)
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Liquidación Actions */}
                                    <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-3 shadow-sm">
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Acciones de Liquidación</p>
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

                                        {/* Guardar liquidación en histórico */}
                                        {selectedClientId && (
                                            <button
                                                onClick={handleSaveLiquidation}
                                                disabled={saving}
                                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Guardar Liquidación
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center text-zinc-400">
                                    <div className="p-4 bg-zinc-50 rounded-full mb-4">
                                        <Calculator className="w-8 h-8 text-zinc-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-600">Calculando Prestaciones...</h3>
                                    <p className="text-sm max-w-xs mt-2">Complete los datos del empleado y el período para ver la proyección de liquidación definitiva.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Client Modal */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-zinc-900 mb-4">Crear Nuevo Cliente</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-1">Nombre del Cliente *</label>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Empresa S.A.S"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-1">NIT</label>
                                <input
                                    type="text"
                                    value={newClientNit}
                                    onChange={(e) => setNewClientNit(e.target.value)}
                                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="900123456-1"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowClientModal(false)}
                                    className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateClient}
                                    disabled={!newClientName.trim() || saving}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:brightness-110 disabled:opacity-50"
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
                        <div className={`p-4 flex items-center justify-between ${showPreviewModal === 'nomina' ? 'bg-zinc-900' : 'bg-amber-600'} text-white`}>
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
                        <div className="flex-1 overflow-y-auto p-6 bg-zinc-100">
                            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
                                {showPreviewModal === 'nomina' ? (
                                    <>
                                        {/* Nómina Preview */}
                                        <div className="text-center border-b-2 border-zinc-900 pb-4 mb-4">
                                            <h1 className="text-xl font-bold text-zinc-900">COMPROBANTE DE NÓMINA</h1>
                                            <p className="text-sm text-zinc-600">Período: {activeEmployee.startDate} - {activeEmployee.endDate}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                            <div className="bg-zinc-50 p-3 rounded">
                                                <p className="text-xs text-zinc-500 font-bold">EMPRESA</p>
                                                <p className="font-medium">{clients.find(c => c.id === selectedClientId)?.name || 'ContaBot S.A.S'}</p>
                                                <p className="text-zinc-600">NIT: {clients.find(c => c.id === selectedClientId)?.nit || '900.123.456-7'}</p>
                                            </div>
                                            <div className="bg-zinc-50 p-3 rounded">
                                                <p className="text-xs text-zinc-500 font-bold">EMPLEADO</p>
                                                <p className="font-medium">{activeEmployee.name}</p>
                                                <p className="text-zinc-600">CC: {activeEmployee.documentNumber || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm mb-4">
                                            <thead>
                                                <tr className="bg-emerald-600 text-white">
                                                    <th className="text-left p-2 rounded-tl">Concepto</th>
                                                    <th className="text-right p-2 rounded-tr">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b"><td className="p-2">Salario Base</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.baseSalary)}</td></tr>
                                                <tr className="border-b bg-zinc-50"><td className="p-2">Auxilio de Transporte</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.transportAid)}</td></tr>
                                                {(result.monthly.salaryData.overtime ?? 0) > 0 && <tr className="border-b"><td className="p-2">Horas Extra</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.overtime ?? 0)}</td></tr>}
                                                <tr className="bg-emerald-50 font-bold"><td className="p-2">TOTAL DEVENGADO</td><td className="text-right p-2">{formatCurrency(result.monthly.salaryData.totalAccrued)}</td></tr>
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
                                                <tr className="border-b bg-zinc-50"><td className="p-2">Pensión (4%)</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.pension)}</td></tr>
                                                {result.monthly.employeeDeductions.solidarityFund > 0 && <tr className="border-b"><td className="p-2">Fondo Solidaridad</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.solidarityFund)}</td></tr>}
                                                <tr className="bg-red-50 font-bold"><td className="p-2">TOTAL DEDUCCIONES</td><td className="text-right p-2">{formatCurrency(result.monthly.employeeDeductions.totalDeductions)}</td></tr>
                                            </tbody>
                                        </table>

                                        <div className="bg-emerald-600 text-white p-4 rounded-lg flex justify-between items-center">
                                            <span className="font-bold">NETO A PAGAR</span>
                                            <span className="text-2xl font-bold">{formatCurrency(result.monthly.netPay)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Liquidación Preview */}
                                        <div className="text-center border-b-2 border-amber-600 pb-4 mb-4">
                                            <h1 className="text-xl font-bold text-zinc-900">LIQUIDACIÓN DE PRESTACIONES SOCIALES</h1>
                                            <p className="text-sm text-zinc-500 italic">(Colombia – Código Sustantivo del Trabajo)</p>
                                        </div>

                                        <div className="bg-zinc-100 p-3 rounded mb-4 text-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <p><span className="text-zinc-500">Trabajador:</span> <strong>{activeEmployee.name}</strong></p>
                                                <p><span className="text-zinc-500">Documento:</span> {activeEmployee.documentNumber || 'N/A'}</p>
                                                <p><span className="text-zinc-500">Fecha ingreso:</span> {activeEmployee.startDate}</p>
                                                <p><span className="text-zinc-500">Fecha retiro:</span> {activeEmployee.endDate}</p>
                                                <p><span className="text-zinc-500">Días laborados:</span> <strong>{liquidationResult?.daysWorked}</strong></p>
                                                <p><span className="text-zinc-500">Salario base:</span> {formatCurrency(activeEmployee.baseSalary)}</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm mb-4">
                                            <thead>
                                                <tr className="bg-zinc-200">
                                                    <th className="text-left p-2">Concepto</th>
                                                    <th className="text-right p-2">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b"><td className="p-2">Cesantías</td><td className="text-right p-2">{formatCurrency(liquidationResult?.cesantias || 0)}</td></tr>
                                                <tr className="border-b bg-zinc-50"><td className="p-2">Intereses de Cesantías (12%)</td><td className="text-right p-2">{formatCurrency(liquidationResult?.interesesCesantias || 0)}</td></tr>
                                                <tr className="border-b"><td className="p-2">Prima de Servicios</td><td className="text-right p-2">{formatCurrency(liquidationResult?.prima || 0)}</td></tr>
                                                <tr className="border-b bg-zinc-50"><td className="p-2">Vacaciones</td><td className="text-right p-2">{formatCurrency(liquidationResult?.vacaciones || 0)}</td></tr>
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
                        <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowPreviewModal(null)}
                                className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded-lg font-medium transition-colors"
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
                                className={`px-6 py-2 text-white rounded-lg font-bold flex items-center gap-2 ${showPreviewModal === 'nomina' ? 'bg-zinc-900 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'}`}
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
                                <h2 className="text-xl font-bold text-zinc-900 mb-2">¡Gracias por tu feedback!</h2>
                                <p className="text-zinc-600">Tu opinión nos ayuda a mejorar ContaBot.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 rounded-xl">
                                            <MessageSquare className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900">Califica el módulo de Nómina</h2>
                                    </div>
                                    <button onClick={() => setShowFeedbackModal(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                                        <X className="w-5 h-5 text-zinc-400" />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    {/* Star Rating */}
                                    <div>
                                        <p className="text-sm text-zinc-600 mb-3">¿Qué tan útil te parece este módulo?</p>
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setFeedbackRating(star)}
                                                    className="p-1 transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        className={`w-10 h-10 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-300'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-center text-sm text-zinc-500 mt-2">
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
                                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                                            Comentarios (opcional)
                                        </label>
                                        <textarea
                                            value={feedbackComment}
                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                            placeholder="¿Qué podríamos mejorar? ¿Qué te gustaría ver?"
                                            className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={feedbackRating === 0 || submittingFeedback}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 z-40 flex items-center gap-2 group"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
                    Calificar módulo
                </span>
            </button>

            {/* Delete Employee Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, employeeId: '', employeeName: '' })}
                onConfirm={handleDeleteEmployee}
                title="Eliminar Empleado"
                description="¿Estás seguro de que deseas eliminar este empleado? Podrás restaurarlo desde la papelera durante los próximos 30 días."
                itemName={deleteModal.employeeName}
                isRecoverable={!!selectedClientId}
            />
        </div>
    );
}
