import React, { useState, useEffect } from 'react';
import { AdvancedPayrollInput, RiskLevel } from '../types';
import { SMMLV_2025, AUX_TRANSPORTE_2025, UVT_2025, RISK_LEVEL_RATES } from '../constants';
import { Calculator, Calendar, DollarSign, UserCog, Briefcase, HeartPulse, Building2, TrendingDown, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

const EmpleadosProView: React.FC = () => {
    // Initial State with 2025 Defaults
    const [data, setData] = useState<AdvancedPayrollInput>({
        // I. General
        startDate: '2025-01-01',
        endDate: '2025-01-30',
        daysWorked: 30,
        baseSalary: SMMLV_2025,
        contractType: 'INDEFINIDO',
        applyTransportAid: true,
        
        // II. Empleado & SS
        employeeHealthRate: 4,
        employeePensionRate: 4,
        isParafiscalExempt: true,
        pensionFund: 'Porvenir',
        severanceFund: 'Porvenir',
        riskLevel: RiskLevel.I,
        applyRetefuente: true,

        // III. Variables
        hedHours: 0,
        henHours: 0,
        rnHours: 0,
        heddfHours: 0,
        hendfHours: 0,
        commissions: 0,
        salaryBonuses: 0,
        otherSalaryEarnings: 0,

        // IV. No Constitutivos
        nonSalaryBonuses: 0,
        nonSalaryViaticos: 0,
        nonSalaryAuxiliaries: 0,

        // V. Incapacidades
        generalSickDays: 0,
        generalSickValueEmployer: 0,
        maternityLeaveDays: 0,
        unpaidLeaveDays: 0,
        arlSickDays: 0,

        // VI. Deducciones
        voluntaryPension: 0,
        afc: 0,
        hasDependents: false,
        housingInterests: 0,
        prepaidMedicine: 0,
        liens: 0,
        companyLoans: 0,
        otherDeductions: 0,

        // VII. Bases Provisión
        daysPrima: 30,
        daysCesantias: 30,
        daysVacations: 30,
        baseVacations: SMMLV_2025,
        basePrimaCesantias: SMMLV_2025 + AUX_TRANSPORTE_2025,

        // VIII. Parámetros
        smmlv: SMMLV_2025,
        auxTransport: AUX_TRANSPORTE_2025
    });

    const [results, setResults] = useState<any>(null);
    const [activeSection, setActiveSection] = useState<string | null>('section1');

    // Toggle Section Helper
    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    // Generic Input Handler
    const handleInput = (field: keyof AdvancedPayrollInput, value: any) => {
        setData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Auto-logic: Transport Aid Rule (2 SMMLV)
            if (field === 'baseSalary') {
                const sal = Number(value);
                updated.applyTransportAid = sal <= (updated.smmlv * 2);
                updated.baseVacations = sal; // Default suggestion
                updated.basePrimaCesantias = sal + (updated.applyTransportAid ? updated.auxTransport : 0);
            }

            return updated;
        });
    };

    // --- MAIN CALCULATION ENGINE ---
    useEffect(() => {
        calculateResults();
    }, [data]);

    const calculateResults = () => {
        // 1. Overtime Calculation
        const hourlyRate = data.baseSalary / 240;
        const valHED = hourlyRate * 1.25 * data.hedHours;
        const valHEN = hourlyRate * 1.75 * data.henHours;
        const valRN = hourlyRate * 0.35 * data.rnHours;
        const valHEDDF = hourlyRate * 2.00 * data.heddfHours;
        const valHENDF = hourlyRate * 2.50 * data.hendfHours;
        const totalOvertime = valHED + valHEN + valRN + valHEDDF + valHENDF;

        // 2. Devengados
        const totalSalaryVariables = totalOvertime + data.commissions + data.salaryBonuses + data.otherSalaryEarnings;
        const auxTransportVal = data.applyTransportAid ? (data.auxTransport / 30) * data.daysWorked : 0;
        
        // Total Salarial (Base IBC)
        let totalSalarial = ((data.baseSalary / 30) * (data.daysWorked - data.unpaidLeaveDays)) + totalSalaryVariables;
        
        // IBC Calculation (Cap at 25 SMMLV)
        let ibc = totalSalarial;
        // Ajuste por incapacidades (Simplificado: 66.67% o 100% según norma, aquí asumimos base completa para cotización o ajustado por días)
        // Para herramienta PRO, asumimos que el usuario ajusta días.
        const ibcMax = data.smmlv * 25;
        if (ibc > ibcMax) ibc = ibcMax;
        if (ibc < data.smmlv && data.daysWorked === 30) ibc = data.smmlv; // Floor at SMMLV for full month

        // 3. Social Security Employee
        const healthEmp = ibc * (data.employeeHealthRate / 100);
        const pensionEmp = ibc * (data.employeePensionRate / 100);
        
        // FSP Logic
        let fspRate = 0;
        if (ibc >= (4 * data.smmlv)) {
            if (ibc < 16 * data.smmlv) fspRate = 0.01;
            else if (ibc < 17 * data.smmlv) fspRate = 0.012;
            else if (ibc < 18 * data.smmlv) fspRate = 0.014;
            else if (ibc < 19 * data.smmlv) fspRate = 0.016;
            else if (ibc < 20 * data.smmlv) fspRate = 0.018;
            else fspRate = 0.02;
        }
        const fspVal = ibc * fspRate;

        // 4. Retención en la Fuente (Procedimiento 1)
        let retencion = 0;
        if (data.applyRetefuente) {
            const income = totalSalarial; // Base
            const incr = healthEmp + pensionEmp + fspVal + data.voluntaryPension; // INCR
            const netIncome = income - incr;

            // Deductions
            const dedDependents = data.hasDependents ? Math.min(income * 0.1, 32 * UVT_2025) : 0;
            const dedHousing = Math.min(data.housingInterests, 100 * UVT_2025);
            const dedHealth = Math.min(data.prepaidMedicine, 16 * UVT_2025);
            const totalDeds = dedDependents + dedHousing + dedHealth;

            // Exempt
            const exemptVoluntary = data.afc; // Assuming already capped by user or simplified
            const base25 = Math.max(0, netIncome - totalDeds - exemptVoluntary);
            const exempt25 = Math.min(base25 * 0.25, (790 * UVT_2025) / 12);

            // 40% Limit
            const totalClaimed = totalDeds + exemptVoluntary + exempt25;
            const maxGlobal = netIncome * 0.40;
            const finalExempt = Math.min(totalClaimed, maxGlobal);

            const taxableBase = Math.max(0, netIncome - finalExempt);
            const baseUVT = taxableBase / UVT_2025;

            // Table 2025
            if (baseUVT > 95) {
                if (baseUVT <= 150) retencion = (baseUVT - 95) * 0.19;
                else if (baseUVT <= 360) retencion = (baseUVT - 150) * 0.28 + 10;
                else if (baseUVT <= 640) retencion = (baseUVT - 360) * 0.33 + 69;
                else if (baseUVT <= 945) retencion = (baseUVT - 640) * 0.35 + 162;
                else if (baseUVT <= 2300) retencion = (baseUVT - 945) * 0.37 + 268;
                else retencion = (baseUVT - 2300) * 0.39 + 770;
            }
            retencion = Math.round(retencion * UVT_2025);
        }

        // 5. Total Devengado & Deducciones
        const totalNoSalarial = data.nonSalaryBonuses + data.nonSalaryViaticos + data.nonSalaryAuxiliaries + data.generalSickValueEmployer;
        const granTotalDevengado = totalSalarial + auxTransportVal + totalNoSalarial;
        
        const totalDeducciones = healthEmp + pensionEmp + fspVal + retencion + data.liens + data.companyLoans + data.otherDeductions + data.afc + data.voluntaryPension;
        
        const netoPagar = granTotalDevengado - totalDeducciones;

        // 6. Employer Costs
        const isExempt = data.isParafiscalExempt && (data.baseSalary < 10 * data.smmlv);
        
        const empHealth = isExempt ? 0 : ibc * 0.085;
        const empPension = ibc * 0.12;
        const empArl = ibc * RISK_LEVEL_RATES[data.riskLevel];
        const empSena = isExempt ? 0 : ibc * 0.02;
        const empIcbf = isExempt ? 0 : ibc * 0.03;
        const empCaja = ibc * 0.04;

        // Provisions
        const provCesantias = data.basePrimaCesantias * 0.0833;
        const provIntCesantias = provCesantias * 0.12;
        const provPrima = data.basePrimaCesantias * 0.0833;
        const provVacaciones = data.baseVacations * 0.0417;

        setResults({
            ibc,
            totalSalarial,
            granTotalDevengado,
            auxTransportVal,
            totalOvertime,
            healthEmp,
            pensionEmp,
            fspVal,
            retencion,
            totalDeducciones,
            netoPagar,
            empHealth,
            empPension,
            empArl,
            empSena,
            empIcbf,
            empCaja,
            provCesantias,
            provIntCesantias,
            provPrima,
            provVacaciones,
            totalCostoEmpresa: granTotalDevengado + empHealth + empPension + empArl + empSena + empIcbf + empCaja + provCesantias + provIntCesantias + provPrima + provVacaciones
        });
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* LEFT COLUMN: FORM INPUTS */}
            <div className="xl:col-span-7 space-y-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Calculadora Pro 2025</h2>
                        <p className="text-sm text-gray-500">Control total de variables para liquidaciones complejas.</p>
                    </div>
                </div>

                {/* I. DATOS GENERALES */}
                <Section title="I. Datos Generales y Periodo" icon={<Calendar className="w-4 h-4"/>} isOpen={activeSection === 'section1'} onToggle={() => toggleSection('section1')}>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="Inicio Periodo" type="date" value={data.startDate} onChange={v => handleInput('startDate', v)} />
                        <Input label="Fin Periodo" type="date" value={data.endDate} onChange={v => handleInput('endDate', v)} />
                        <Input label="Días Trabajados" type="number" value={data.daysWorked} onChange={v => handleInput('daysWorked', Number(v))} />
                        <Input label="Salario Básico" type="money" value={data.baseSalary} onChange={v => handleInput('baseSalary', Number(v))} />
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo Contrato</label>
                            <select 
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                value={data.contractType}
                                onChange={e => handleInput('contractType', e.target.value)}
                            >
                                <option value="INDEFINIDO">Indefinido</option>
                                <option value="FIJO">Término Fijo</option>
                                <option value="OBRA_LABOR">Obra o Labor</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <Toggle label="Aplica Aux. Transporte" checked={data.applyTransportAid} onChange={v => handleInput('applyTransportAid', v)} />
                        </div>
                     </div>
                </Section>

                {/* II. DATOS EMPLEADO */}
                <Section title="II. Seguridad Social y Configuración" icon={<UserCog className="w-4 h-4"/>} isOpen={activeSection === 'section2'} onToggle={() => toggleSection('section2')}>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="% Salud Empleado" type="number" value={data.employeeHealthRate} onChange={v => handleInput('employeeHealthRate', Number(v))} />
                        <Input label="% Pensión Empleado" type="number" value={data.employeePensionRate} onChange={v => handleInput('employeePensionRate', Number(v))} />
                        <div className="col-span-1">
                             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Riesgo ARL</label>
                             <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={data.riskLevel} onChange={e => handleInput('riskLevel', e.target.value as any)}>
                                {Object.keys(RISK_LEVEL_RATES).map(r => <option key={r} value={r}>{r}</option>)}
                             </select>
                        </div>
                        <div className="flex flex-col justify-center gap-2 pt-4">
                            <Toggle label="Exento Parafiscales (Ley 1607)" checked={data.isParafiscalExempt} onChange={v => handleInput('isParafiscalExempt', v)} />
                            <Toggle label="Calcula Retefuente" checked={data.applyRetefuente} onChange={v => handleInput('applyRetefuente', v)} />
                        </div>
                     </div>
                </Section>

                {/* III. DEVENGADOS VARIABLES */}
                <Section title="III. Horas Extras y Variables" icon={<DollarSign className="w-4 h-4"/>} isOpen={activeSection === 'section3'} onToggle={() => toggleSection('section3')}>
                     <div className="grid grid-cols-3 gap-3">
                        <Input label="H.E. Diurna (1.25)" type="number" value={data.hedHours} onChange={v => handleInput('hedHours', Number(v))} />
                        <Input label="H.E. Nocturna (1.75)" type="number" value={data.henHours} onChange={v => handleInput('henHours', Number(v))} />
                        <Input label="Recargo Noct. (0.35)" type="number" value={data.rnHours} onChange={v => handleInput('rnHours', Number(v))} />
                        <Input label="H.E.D Festiva (2.00)" type="number" value={data.heddfHours} onChange={v => handleInput('heddfHours', Number(v))} />
                        <Input label="H.E.N Festiva (2.50)" type="number" value={data.hendfHours} onChange={v => handleInput('hendfHours', Number(v))} />
                        <div className="col-span-3 h-px bg-gray-100 my-2"></div>
                        <Input label="Comisiones" type="money" value={data.commissions} onChange={v => handleInput('commissions', Number(v))} />
                        <Input label="Bonif. Salariales" type="money" value={data.salaryBonuses} onChange={v => handleInput('salaryBonuses', Number(v))} />
                     </div>
                </Section>

                {/* IV. NO SALARIAL */}
                <Section title="IV. Pagos No Salariales" icon={<Briefcase className="w-4 h-4"/>} isOpen={activeSection === 'section4'} onToggle={() => toggleSection('section4')}>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="Bonos No Salariales" type="money" value={data.nonSalaryBonuses} onChange={v => handleInput('nonSalaryBonuses', Number(v))} />
                        <Input label="Viáticos No Salariales" type="money" value={data.nonSalaryViaticos} onChange={v => handleInput('nonSalaryViaticos', Number(v))} />
                        <Input label="Auxilios No Salariales" type="money" value={data.nonSalaryAuxiliaries} onChange={v => handleInput('nonSalaryAuxiliaries', Number(v))} />
                     </div>
                </Section>
                
                 {/* VI. DEDUCCIONES */}
                 <Section title="VI. Deducciones y Retenciones" icon={<TrendingDown className="w-4 h-4"/>} isOpen={activeSection === 'section6'} onToggle={() => toggleSection('section6')}>
                     <div className="grid grid-cols-2 gap-4">
                        <Input label="Pensión Voluntaria" type="money" value={data.voluntaryPension} onChange={v => handleInput('voluntaryPension', Number(v))} />
                        <Input label="Cuenta AFC" type="money" value={data.afc} onChange={v => handleInput('afc', Number(v))} />
                        <Input label="Int. Vivienda (Ded. RF)" type="money" value={data.housingInterests} onChange={v => handleInput('housingInterests', Number(v))} />
                        <Input label="Med. Prepagada (Ded. RF)" type="money" value={data.prepaidMedicine} onChange={v => handleInput('prepaidMedicine', Number(v))} />
                        <Input label="Libranzas / Embargos" type="money" value={data.liens} onChange={v => handleInput('liens', Number(v))} />
                        <Input label="Préstamos Empresa" type="money" value={data.companyLoans} onChange={v => handleInput('companyLoans', Number(v))} />
                        <div className="pt-6">
                             <Toggle label="Tiene Dependientes (Ded. RF)" checked={data.hasDependents} onChange={v => handleInput('hasDependents', v)} />
                        </div>
                     </div>
                </Section>

            </div>

            {/* RIGHT COLUMN: RESULTS DASHBOARD */}
            <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-28">
                {results && (
                    <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
                        <div className="bg-purple-900 p-6 text-white relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12">
                                <DollarSign className="w-32 h-32" />
                            </div>
                            <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Neto a Pagar</p>
                            <h2 className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(results.netoPagar)}</h2>
                            
                            <div className="grid grid-cols-2 gap-4 border-t border-purple-700/50 pt-4">
                                <div>
                                    <p className="text-xs text-purple-300">Total Devengado</p>
                                    <p className="font-semibold">{formatCurrency(results.granTotalDevengado)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-purple-300">Total Deducciones</p>
                                    <p className="font-semibold">{formatCurrency(results.totalDeducciones)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            
                            {/* Breakdown Block */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Detalle Seguridad Social</h3>
                                <div className="space-y-2 text-sm">
                                    <ResultRow label="Salud (Empleado)" value={results.healthEmp} />
                                    <ResultRow label="Pensión (Empleado)" value={results.pensionEmp} />
                                    <ResultRow label="Fondo Solidaridad" value={results.fspVal} isBold={results.fspVal > 0} />
                                    <ResultRow label="Retención en la Fuente" value={results.retencion} isBold={results.retencion > 0} color="text-red-600" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Costo Empleador</h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                                    <ResultRow label="Salud (Patrono)" value={results.empHealth} />
                                    <ResultRow label="Pensión (Patrono)" value={results.empPension} />
                                    <ResultRow label="ARL" value={results.empArl} />
                                    <ResultRow label="Parafiscales (CCF+ICBF+SENA)" value={results.empCaja + results.empIcbf + results.empSena} />
                                    <div className="border-t border-gray-200 my-2 pt-2 font-bold text-gray-900 flex justify-between">
                                        <span>Total Provisiones</span>
                                        <span>{formatCurrency(results.provCesantias + results.provIntCesantias + results.provPrima + results.provVacaciones)}</span>
                                    </div>
                                    <div className="pt-2 text-right">
                                        <span className="text-xs text-gray-500 mr-2">Costo Total Nómina:</span>
                                        <span className="font-bold text-purple-700">{formatCurrency(results.totalCostoEmpresa)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2 text-xs text-blue-700">
                                <Building2 className="w-4 h-4" />
                                <span>IBC Calculado: <strong>{formatCurrency(results.ibc)}</strong></span>
                            </div>

                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

// UI Helpers
const Section: React.FC<{ title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, icon, isOpen, onToggle, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                    {icon}
                </div>
                <span className="font-semibold text-gray-800 text-sm">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
        </button>
        {isOpen && <div className="p-5 border-t border-gray-100 animate-in slide-in-from-top-1">{children}</div>}
    </div>
);

const Input: React.FC<{ label: string; type: 'text'|'number'|'money'|'date'; value: any; onChange: (val: any) => void }> = ({ label, type, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</label>
        <div className="relative">
            {type === 'money' && <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>}
            <input 
                type={type === 'money' ? 'text' : type}
                value={type === 'money' ? Number(value).toLocaleString('es-CO') : value}
                onChange={e => {
                    const v = type === 'money' ? e.target.value.replace(/\D/g, '') : e.target.value;
                    onChange(v);
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

export default EmpleadosProView;
