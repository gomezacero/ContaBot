
import React, { useState, useEffect } from 'react';
import { CalculadoraProInput, RiskLevel } from '../types';
import { SMMLV_2025, AUX_TRANSPORTE_2025, RISK_LEVEL_RATES } from '../constants';
import { calculateCalculadoraPro, formatCurrency } from '../utils/calculations';
import { 
    Calculator, Calendar, ChevronDown, ChevronUp, 
    Briefcase, Wallet, Building2, Receipt, CheckCircle2, AlertCircle 
} from 'lucide-react';

const CalculadoraProView: React.FC = () => {
    // INITIAL STATE (2025 Defaults)
    const [input, setInput] = useState<CalculadoraProInput>({
        // G. Datos Generales
        contractType: 'INDEFINIDO',
        baseSalary: SMMLV_2025,
        hasTransportAid: true,
        startDate: '2025-01-01',
        endDate: '2025-01-30',
        paymentPeriodicity: 'MENSUAL',
        riskLevel: RiskLevel.I,
        isParafiscalExempt: true,
        isIntegralSalary: false,

        // N. Novedades
        daysWorked: 30,
        hedHours: 0,
        henHours: 0,
        rnHours: 0,
        domFestHours: 0,
        heddfHours: 0,
        hendfHours: 0,
        incapacityGeneralDays: 0,
        incapacityARLDays: 0,
        incapacityMaternityDays: 0,
        commissions: 0,
        salaryBonuses: 0,
        nonSalaryBonuses: 0,

        // D. Deducciones
        loans: 0,
        volPensionObligatory: 0,
        volPensionVoluntary: 0,
        prepaidMedicine: 0,
        housingInterest: 0,
        hasDependents: false,
        otherDeductions: 0
    });

    const [result, setResult] = useState(calculateCalculadoraPro(input));
    const [activeSection, setActiveSection] = useState<string | null>('general');

    // HANDLERS
    const handleChange = (field: keyof CalculadoraProInput, value: any) => {
        setInput(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-logic: Transport Aid
            if (field === 'baseSalary') {
                const sal = Number(value);
                if (!updated.isIntegralSalary) {
                    updated.hasTransportAid = sal <= (SMMLV_2025 * 2);
                }
            }
            // Auto-logic: Integral Salary
            if (field === 'isIntegralSalary' && value === true) {
                updated.hasTransportAid = false;
            }
            return updated;
        });
    };

    useEffect(() => {
        setResult(calculateCalculadoraPro(input));
    }, [input]);

    const toggleSection = (id: string) => setActiveSection(activeSection === id ? null : id);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* --- LEFT: INPUTS (G, N, D) --- */}
            <div className="xl:col-span-7 space-y-5">
                
                {/* Header */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Calculadora Nómina Pro</h2>
                        <p className="text-sm text-gray-500">Normativa Colombia 2025 • Reforma Laboral</p>
                    </div>
                </div>

                {/* G. DATOS GENERALES */}
                <Accordion title="G. Datos Generales del Empleado" icon={<Briefcase/>} isOpen={activeSection === 'general'} onToggle={() => toggleSection('general')}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>Tipo de Contrato</Label>
                            <Select value={input.contractType} onChange={v => handleChange('contractType', v)}>
                                <option value="INDEFINIDO">Indefinido</option>
                                <option value="FIJO">Término Fijo</option>
                                <option value="OBRA_LABOR">Obra o Labor</option>
                            </Select>
                        </div>
                        <InputMoney label="Salario Base (G2)" value={input.baseSalary} onChange={v => handleChange('baseSalary', v)} />
                        
                        <div className="flex flex-col gap-1">
                            <Label>Riesgo ARL (G7)</Label>
                            <Select value={input.riskLevel} onChange={v => handleChange('riskLevel', v)}>
                                {Object.keys(RISK_LEVEL_RATES).map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                        </div>
                        <InputNumber label="Días Trabajados (N1)" value={input.daysWorked} onChange={v => handleChange('daysWorked', v)} />

                        <div className="col-span-2 flex flex-wrap gap-4 pt-4 bg-gray-50 p-4 rounded-xl">
                            <Toggle label="Auxilio Transporte (G3)" checked={input.hasTransportAid} onChange={v => handleChange('hasTransportAid', v)} />
                            <Toggle label="Exoneración Parafiscales (G8)" checked={input.isParafiscalExempt} onChange={v => handleChange('isParafiscalExempt', v)} />
                            <Toggle label="Salario Integral (G9)" checked={input.isIntegralSalary} onChange={v => handleChange('isIntegralSalary', v)} />
                        </div>
                    </div>
                </Accordion>

                {/* N. NOVEDADES */}
                <Accordion title="N. Novedades y Recargos (2025)" icon={<Calendar/>} isOpen={activeSection === 'news'} onToggle={() => toggleSection('news')}>
                    <div className="grid grid-cols-3 gap-3">
                        <InputNumber label="H.E. Diurna (1.25)" value={input.hedHours} onChange={v => handleChange('hedHours', v)} />
                        <InputNumber label="H.E. Nocturna (1.75)" value={input.henHours} onChange={v => handleChange('henHours', v)} />
                        <InputNumber label="Recargo Noct. (0.35)" value={input.rnHours} onChange={v => handleChange('rnHours', v)} />
                        
                        <InputNumber label="Dom/Fest Ord. (1.80)" value={input.domFestHours} onChange={v => handleChange('domFestHours', v)} />
                        <InputNumber label="H.E.D Festiva (2.00)" value={input.heddfHours} onChange={v => handleChange('heddfHours', v)} />
                        <InputNumber label="H.E.N Festiva (2.50)" value={input.hendfHours} onChange={v => handleChange('hendfHours', v)} />
                        
                        <div className="col-span-3 border-t border-gray-100 my-2"></div>
                        
                        <InputMoney label="Comisiones (N9)" value={input.commissions} onChange={v => handleChange('commissions', v)} />
                        <InputMoney label="Bonos Salariales" value={input.salaryBonuses} onChange={v => handleChange('salaryBonuses', v)} />
                        <InputMoney label="Bonos No Salariales" value={input.nonSalaryBonuses} onChange={v => handleChange('nonSalaryBonuses', v)} />
                    </div>
                </Accordion>

                {/* D. DEDUCCIONES */}
                <Accordion title="D. Deducciones y Retención" icon={<Wallet/>} isOpen={activeSection === 'deds'} onToggle={() => toggleSection('deds')}>
                    <div className="grid grid-cols-2 gap-4">
                        <InputMoney label="Préstamos / Libranzas (D1)" value={input.loans} onChange={v => handleChange('loans', v)} />
                        <InputMoney label="Otras Deducciones (D7)" value={input.otherDeductions} onChange={v => handleChange('otherDeductions', v)} />
                        
                        <div className="col-span-2 pt-2 pb-2 text-xs font-bold text-gray-400 uppercase">Base Retención en la Fuente</div>
                        
                        <InputMoney label="Aporte Vol. Obligatorio (RAIS)" value={input.volPensionObligatory} onChange={v => handleChange('volPensionObligatory', v)} />
                        <InputMoney label="Aporte Voluntario (AFC/FVP)" value={input.volPensionVoluntary} onChange={v => handleChange('volPensionVoluntary', v)} />
                        <InputMoney label="Interés Vivienda" value={input.housingInterest} onChange={v => handleChange('housingInterest', v)} />
                        <InputMoney label="Medicina Prepagada" value={input.prepaidMedicine} onChange={v => handleChange('prepaidMedicine', v)} />
                        
                        <div className="col-span-2 pt-2">
                            <Toggle label="Deducción por Dependientes (10%)" checked={input.hasDependents} onChange={v => handleChange('hasDependents', v)} />
                        </div>
                    </div>
                </Accordion>

            </div>

            {/* --- RIGHT: DASHBOARD --- */}
            <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24">
                
                {/* TOTAL EMPLEADOR CARD */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Costo Total Empleador</p>
                        <h2 className="text-4xl font-bold tracking-tight mb-6">{formatCurrency(result.totals.grandTotalEmployer)}</h2>
                        
                        <div className="space-y-2 text-sm border-t border-gray-700 pt-4">
                            <ResultRow label="Salario + Variables" val={result.devengado.subtotalSalary} dark />
                            <ResultRow label="Aux. Transporte" val={result.devengado.transportAid} dark />
                            <ResultRow label="Seguridad Social + Parafiscales" val={result.costsEmp.totalSocialCosts} dark />
                            <ResultRow label="Provisiones Prestaciones" val={result.provisions.totalProvisions} dark highlight />
                        </div>
                    </div>
                </div>

                {/* EMPLEADO NETO CARD */}
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">Neto a Pagar Empleado</p>
                            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(result.deductionsEmp.netPay)}</h2>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <Receipt className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                        <div className="flex justify-between font-semibold text-gray-900">
                            <span>Total Devengado</span>
                            <span>{formatCurrency(result.devengado.totalGross)}</span>
                        </div>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <ResultRow label="Salud (4%)" val={result.deductionsEmp.health} neg />
                        <ResultRow label="Pensión (4%)" val={result.deductionsEmp.pension} neg />
                        {result.deductionsEmp.fsp > 0 && <ResultRow label="Fondo Solidaridad" val={result.deductionsEmp.fsp} neg />}
                        {result.deductionsEmp.retefuente > 0 && <ResultRow label="Retención Fuente" val={result.deductionsEmp.retefuente} neg />}
                        <ResultRow label="Otras Deducciones" val={result.deductionsEmp.otherDeductions} neg />
                    </div>
                </div>

                {/* DETALLE RETEFUENTE (Mini) */}
                {result.deductionsEmp.retefuente > 0 && (
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                        <h4 className="text-orange-800 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3"/> Auditoría Retefuente
                        </h4>
                        <div className="space-y-1 text-xs text-orange-900/80">
                            <div className="flex justify-between"><span>Ingreso Bruto:</span> <span>{formatCurrency(result.taxBase.grossIncome)}</span></div>
                            <div className="flex justify-between"><span>Base Gravable UVT:</span> <span>{result.taxBase.taxableBaseUVT.toFixed(2)} UVT</span></div>
                            <div className="flex justify-between font-bold"><span>Valor a Retener:</span> <span>{formatCurrency(result.deductionsEmp.retefuente)}</span></div>
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
};

// UI Components
const Accordion: React.FC<any> = ({ title, icon, isOpen, onToggle, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100">
            <div className="flex items-center gap-3 font-semibold text-gray-700 text-sm">
                <div className="text-gray-400">{icon}</div> {title}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
        </button>
        {isOpen && <div className="p-5 border-t border-gray-100 animate-in slide-in-from-top-1">{children}</div>}
    </div>
);

const Label: React.FC<{children: React.ReactNode}> = ({children}) => (
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">{children}</label>
);

const InputNumber: React.FC<any> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <Label>{label}</Label>
        <input 
            type="number" 
            value={value} 
            onChange={e => onChange(Number(e.target.value))}
            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder-gray-400 text-gray-700"
            placeholder="0"
        />
    </div>
);

const InputMoney: React.FC<any> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <Label>{label}</Label>
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input 
                type="text" 
                value={Number(value).toLocaleString('es-CO')} 
                onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')))}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder-gray-400 text-gray-700 font-medium"
                placeholder="0"
            />
        </div>
    </div>
);

const Select: React.FC<any> = ({ value, onChange, children }) => (
    <select 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none text-gray-700"
    >
        {children}
    </select>
);

const Toggle: React.FC<any> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
             <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
             <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${checked ? 'left-[19px]' : 'left-[3px]'}`}></div>
        </div>
        <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">{label}</span>
    </label>
);

const ResultRow: React.FC<any> = ({ label, val, neg, dark, highlight }) => (
    <div className={`flex justify-between items-center ${highlight ? 'font-bold' : ''} ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        <span>{label}</span>
        <span className={neg ? 'text-red-500' : dark ? 'text-white' : 'text-gray-900'}>
            {neg ? '-' : ''}{formatCurrency(val)}
        </span>
    </div>
);

export default CalculadoraProView;
