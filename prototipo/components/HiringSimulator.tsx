
import React, { useState, useMemo } from 'react';
import { SMMLV_2025, AUX_TRANSPORTE_2025, RISK_LEVEL_RATES, RISK_LEVEL_LABELS } from '../constants';
import { formatCurrency } from '../utils/calculations';
import { 
    Calculator, 
    TrendingUp, 
    ShieldCheck, 
    PiggyBank, 
    ArrowRight, 
    Info, 
    HelpCircle,
    User,
    Building2,
    CheckCircle2,
    DollarSign,
    Briefcase,
    Bell,
    ShieldAlert
} from 'lucide-react';
import ModuleFeedback from './ModuleFeedback';

interface Props {
    isUserLoggedIn?: boolean;
}

const HiringSimulator: React.FC<Props> = ({ isUserLoggedIn = false }) => {
    const [salary, setSalary] = useState<number>(SMMLV_2025);
    const [riskLevel, setRiskLevel] = useState<keyof typeof RISK_LEVEL_RATES>('I');
    const [isExempt, setIsExempt] = useState<boolean>(true);
    const [includeTransport, setIncludeTransport] = useState<boolean>(true);

    const calculations = useMemo(() => {
        const base = salary;
        const auxTrans = includeTransport ? AUX_TRANSPORTE_2025 : 0;
        
        const healthEmp = base * 0.04;
        const pensionEmp = base * 0.04;
        const netPay = base + auxTrans - (healthEmp + pensionEmp);

        const isExemptNow = isExempt && (base < SMMLV_2025 * 10);
        
        const healthPat = isExemptNow ? 0 : base * 0.085;
        const pensionPat = base * 0.12;
        const arl = base * RISK_LEVEL_RATES[riskLevel];
        
        const sena = isExemptNow ? 0 : base * 0.02;
        const icbf = isExemptNow ? 0 : base * 0.03;
        const ccf = base * 0.04;

        const basePrestaciones = base + auxTrans;
        const prima = basePrestaciones * 0.0833;
        const cesantias = basePrestaciones * 0.0833;
        const intCesantias = cesantias * 0.12;
        const vacaciones = base * 0.0417;

        const totalSocialSecurity = healthPat + pensionPat + arl;
        const totalParafiscals = sena + icbf + ccf;
        const totalProvisions = prima + cesantias + intCesantias + vacaciones;
        
        const totalMonthlyCost = base + auxTrans + totalSocialSecurity + totalParafiscals + totalProvisions;

        return {
            netPay,
            healthEmp,
            pensionEmp,
            healthPat,
            pensionPat,
            arl,
            sena,
            icbf,
            ccf,
            prima,
            cesantias,
            intCesantias,
            vacaciones,
            totalSocialSecurity,
            totalParafiscals,
            totalProvisions,
            totalMonthlyCost,
            isExemptActual: isExemptNow
        };
    }, [salary, riskLevel, isExempt, includeTransport]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* REGISTER REQUIRED BANNER */}
            {!isUserLoggedIn && (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 mb-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-indigo-900 leading-tight">Guarda tus proyecciones de costos</h4>
                            <p className="text-sm text-indigo-700/80">Regístrate para guardar diferentes escenarios de contratación y exportar cuadros comparativos de costos para tus propuestas comerciales.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Simulador de Contratación 2025</h2>
                        <p className="text-sm text-gray-500">Proyección exacta de costos patronales y salario neto.</p>
                    </div>
                </div>
                <div className="bg-emerald-100/50 px-4 py-2 rounded-full border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Valores Vigentes 2025</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-100 space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Salario Mensual Base</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 font-bold">$</div>
                                <input 
                                    type="text" 
                                    value={salary.toLocaleString('es-CO')}
                                    onChange={(e) => setSalary(Number(e.target.value.replace(/\D/g, '')))}
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xl font-black text-gray-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>
                            <input type="range" min={SMMLV_2025} max={SMMLV_2025 * 10} step={50000} value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Ley 1607 (Exoneración)</span><span className="text-[10px] text-gray-400">Exime Salud, SENA e ICBF</span></div>
                                <Toggle checked={isExempt} onChange={setIsExempt} />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Auxilio Transporte</span><span className="text-[10px] text-gray-400">${AUX_TRANSPORTE_2025.toLocaleString()} mensual</span></div>
                                <Toggle checked={includeTransport} onChange={setIncludeTransport} />
                            </label>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Nivel de Riesgo (ARL)</label>
                            <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all">
                                {Object.keys(RISK_LEVEL_LABELS).map(key => (
                                    <option key={key} value={key}>{RISK_LEVEL_LABELS[key as keyof typeof RISK_LEVEL_RATES]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 className="w-24 h-24" /></div>
                            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">Costo Total Mensual (Empresa)</p>
                            <h3 className="text-4xl font-black tracking-tight mb-2">{formatCurrency(calculations.totalMonthlyCost)}</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><User className="w-24 h-24 text-gray-900" /></div>
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Salario Neto Mensual (Empleado)</p>
                            <h3 className="text-4xl font-black tracking-tight text-gray-900 mb-2">{formatCurrency(calculations.netPay)}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Desglose de Gastos Patronales</h4>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600 mb-4"><ShieldCheck className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wide">Seguridad Social</span></div>
                                <ResultRow label="Salud (Patrono)" value={calculations.healthPat} sublabel={calculations.isExemptActual ? "Exento (Ley 1607)" : "8.5%"} />
                                <ResultRow label="Pensión (Patrono)" value={calculations.pensionPat} sublabel="12%" />
                                <ResultRow label="ARL" value={calculations.arl} sublabel={`Riesgo ${riskLevel}`} />
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between font-black text-gray-900"><span>Total Seg. Social</span><span>{formatCurrency(calculations.totalSocialSecurity)}</span></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-amber-600 mb-4"><Briefcase className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wide">Parafiscales</span></div>
                                <ResultRow label="SENA" value={calculations.sena} sublabel={calculations.isExemptActual ? "Exento" : "2%"} />
                                <ResultRow label="ICBF" value={calculations.icbf} sublabel={calculations.isExemptActual ? "Exento" : "3%"} />
                                <ResultRow label="Caja Compensación" value={calculations.ccf} sublabel="4%" />
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between font-black text-gray-900"><span>Total Parafiscales</span><span>{formatCurrency(calculations.totalParafiscals)}</span></div>
                            </div>
                            <div className="space-y-4 md:col-span-2 mt-4 pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-pink-600 mb-6"><PiggyBank className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wide">Provisiones de Prestaciones (Ahorro Obligatorio)</span></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                    <ResultRow label="Prima de Servicios" value={calculations.prima} sublabel="8.33% de base + aux" />
                                    <ResultRow label="Cesantías" value={calculations.cesantias} sublabel="8.33% de base + aux" />
                                    <ResultRow label="Intereses Cesantías" value={calculations.intCesantias} sublabel="12% anual de cesantías" />
                                    <ResultRow label="Vacaciones" value={calculations.vacaciones} sublabel="4.17% del básico" />
                                </div>
                                <div className="mt-6 p-4 bg-pink-50 rounded-2xl border border-pink-100 flex justify-between font-black text-pink-900"><span>Total Provisiones Mensuales</span><span>{formatCurrency(calculations.totalProvisions)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ModuleFeedback moduleName="Simulador de Contratación" />
        </div>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <div onClick={() => onChange(!checked)} className={`w-12 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${checked ? 'bg-emerald-600' : 'bg-gray-300'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${checked ? 'left-7' : 'left-1 shadow-sm'}`}></div>
    </div>
);

const ResultRow: React.FC<{ label: string; value: number; sublabel?: string }> = ({ label, value, sublabel }) => (
    <div className="flex justify-between items-center text-sm">
        <div className="flex flex-col">
            <span className="text-gray-700 font-medium">{label}</span>
            {sublabel && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{sublabel}</span>}
        </div>
        <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(value)}</span>
    </div>
);

export default HiringSimulator;
