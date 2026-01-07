import React, { useState } from 'react';
import { PayrollInput, RiskLevel, ContractType } from '@/types/payroll';
import { RISK_LEVEL_LABELS } from '@/lib/constants';
import {
    ChevronDown,
    ChevronRight,
    Briefcase,
    Clock,
    DollarSign,
    Settings,
    Calendar,
    User,
    Building,
    FileText,
    Calculator
} from 'lucide-react';

interface PayrollInputFormProps {
    input: PayrollInput;
    onChange: (updated: PayrollInput) => void;
}

const SectionHeader = ({
    title,
    icon: Icon,
    isOpen,
    toggle
}: {
    title: string;
    icon: any;
    isOpen: boolean;
    toggle: () => void
}) => (
    <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 border-b border-zinc-200 transition-colors bg-white"
    >
        <div className="flex items-center gap-2 text-zinc-700 font-medium">
            <Icon size={18} className="text-emerald-600" />
            {title}
        </div>
        {isOpen ? <ChevronDown size={18} className="text-zinc-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
    </button>
);

export const PayrollInputForm: React.FC<PayrollInputFormProps> = ({ input, onChange }) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        contract: true,
        novedades: false,
        variables: false,
        deductions: false,
        config: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleChange = (field: keyof PayrollInput, value: any) => {
        onChange({ ...input, [field]: value });
    };

    const handleDeductionParamChange = (field: keyof typeof input.deductionsParameters, value: any) => {
        onChange({
            ...input,
            deductionsParameters: {
                ...input.deductionsParameters,
                [field]: value
            }
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-zinc-900 text-white flex items-center gap-2">
                <Calculator size={20} className="text-emerald-400" />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Parámetros de Nómina</h2>
            </div>

            {/* 1. Datos Contractuales */}
            <SectionHeader
                title="Datos Contractuales BASE"
                icon={User}
                isOpen={openSections.contract}
                toggle={() => toggleSection('contract')}
            />
            {openSections.contract && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Salario Base</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-400">$</span>
                            <input
                                type="number"
                                value={input.baseSalary}
                                onChange={(e) => handleChange('baseSalary', Number(e.target.value))}
                                className="w-full pl-7 pr-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-zinc-800 font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Tipo de Contrato</label>
                        <select
                            value={input.contractType || 'INDEFINIDO'}
                            onChange={(e) => handleChange('contractType', e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-zinc-700 sm:text-sm"
                        >
                            <option value="INDEFINIDO">Indefinido</option>
                            <option value="FIJO">Término Fijo</option>
                            <option value="OBRA_LABOR">Obra o Labor</option>
                            <option value="APRENDIZAJE">Aprendizaje</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 md:col-span-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <input
                            type="checkbox"
                            checked={input.includeTransportAid}
                            onChange={(e) => handleChange('includeTransportAid', e.target.checked)}
                            id="transportAid"
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-zinc-300"
                        />
                        <label htmlFor="transportAid" className="text-sm text-zinc-700">
                            Incluir Auxilio de Transporte (Si aplica por ley)
                        </label>
                    </div>
                </div>
            )}

            {/* 2. Novedades (Tiempo Suplementario) */}
            <SectionHeader
                title="Novedades y Horas Extras"
                icon={Clock}
                isOpen={openSections.novedades}
                toggle={() => toggleSection('novedades')}
            />
            {openSections.novedades && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 bg-zinc-50/50">
                    {[
                        { label: 'H.E. Diurna (25%)', key: 'hedHours' },
                        { label: 'H.E. Nocturna (75%)', key: 'henHours' },
                        { label: 'Recargo Nocturno (35%)', key: 'rnHours' },
                        { label: 'Dom/Fest (75%)', key: 'domFestHours' },
                        { label: 'H.E. Dom/Fest D (100%)', key: 'heddfHours' },
                        { label: 'H.E. Dom/Fest N (150%)', key: 'hendfHours' },
                    ].map((item) => (
                        <div key={item.key} className="space-y-1">
                            <label className="text-xs text-zinc-500">{item.label}</label>
                            <input
                                type="number"
                                min="0"
                                value={input[item.key as keyof PayrollInput] as number || 0}
                                onChange={(e) => handleChange(item.key as keyof PayrollInput, Number(e.target.value))}
                                className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm focus:border-emerald-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 3. Variables y Bonificaciones */}
            <SectionHeader
                title="Otros Devengos (Ingresos)"
                icon={DollarSign}
                isOpen={openSections.variables}
                toggle={() => toggleSection('variables')}
            />
            {openSections.variables && (
                <div className="p-4 grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Comisiones (Salarial)</label>
                            <input
                                type="number"
                                value={input.commissions || 0}
                                onChange={(e) => handleChange('commissions', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Bonos Salariales</label>
                            <input
                                type="number"
                                value={input.salaryBonuses || 0}
                                onChange={(e) => handleChange('salaryBonuses', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Auxilios No Salariales</label>
                        <input
                            type="number"
                            value={input.nonSalaryBonuses || 0}
                            onChange={(e) => handleChange('nonSalaryBonuses', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                        <p className="text-[10px] text-orange-500 mt-1">* Sujeto a la regla del 40% (Art. 30 L.1393/2010)</p>
                    </div>
                </div>
            )}

            {/* 4. Deducciones y Prestamos */}
            <SectionHeader
                title="Deducciones (Empleado)"
                icon={FileText}
                isOpen={openSections.deductions}
                toggle={() => toggleSection('deductions')}
            />
            {openSections.deductions && (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Préstamos / Libranzas</label>
                            <input
                                type="number"
                                value={input.loans || 0}
                                onChange={(e) => handleChange('loans', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 uppercase">Otras Deducciones</label>
                            <input
                                type="number"
                                value={input.otherDeductions || 0}
                                onChange={(e) => handleChange('otherDeductions', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                checked={input.enableDeductions}
                                onChange={(e) => handleChange('enableDeductions', e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className="text-sm font-medium text-zinc-800">Depuración Retención en la Fuente (Opcional)</span>
                        </div>

                        {input.enableDeductions && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg text-sm">
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500">Intereses Vivienda</label>
                                    <input
                                        type="number"
                                        value={input.deductionsParameters.housingInterest}
                                        onChange={(e) => handleDeductionParamChange('housingInterest', Number(e.target.value))}
                                        className="w-full px-2 py-1 border rounded"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500">Salud Prepagada</label>
                                    <input
                                        type="number"
                                        value={input.deductionsParameters.prepaidMedicine}
                                        onChange={(e) => handleDeductionParamChange('prepaidMedicine', Number(e.target.value))}
                                        className="w-full px-2 py-1 border rounded"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500">Aporte Voluntario Pensión</label>
                                    <input
                                        type="number"
                                        value={input.deductionsParameters.voluntaryPension}
                                        onChange={(e) => handleDeductionParamChange('voluntaryPension', Number(e.target.value))}
                                        className="w-full px-2 py-1 border rounded"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <input
                                        type="checkbox"
                                        checked={input.deductionsParameters.hasDependents}
                                        onChange={(e) => handleDeductionParamChange('hasDependents', e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                    />
                                    <label className="text-xs text-zinc-700">Tiene Dependientes (10%)</label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Configuración Empleador */}
            <SectionHeader
                title="Configuración Empleador"
                icon={Building}
                isOpen={openSections.config}
                toggle={() => toggleSection('config')}
            />
            {openSections.config && (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase">Clase de Riesgo ARL</label>
                        <select
                            value={input.riskLevel}
                            onChange={(e) => handleChange('riskLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-zinc-700"
                        >
                            {(Object.keys(RISK_LEVEL_LABELS) as RiskLevel[]).map((level) => (
                                <option key={level} value={level}>
                                    {RISK_LEVEL_LABELS[level]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <input
                            type="checkbox"
                            checked={input.isExempt}
                            onChange={(e) => handleChange('isExempt', e.target.checked)}
                            id="exonerated"
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-zinc-300"
                        />
                        <div className="flex flex-col">
                            <label htmlFor="exonerated" className="text-sm font-medium text-zinc-800">
                                Exonerado de Parafiscales (Art. 114-1 E.T.)
                            </label>
                            <span className="text-xs text-zinc-500">Aplica para Salud, SENA e ICBF si salario &lt; 10 SMMLV.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
