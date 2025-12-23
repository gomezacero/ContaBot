
import React, { useEffect, useState } from 'react';
import { PayrollInput, RiskLevel } from '../types';
import { RISK_LEVEL_LABELS, SMMLV_2025, AUX_TRANSPORTE_2025 } from '../constants';
import { User, Briefcase, Info, CalendarRange, ArrowRight, FileBadge, FileText, BadgePercent, ChevronDown, ChevronUp, Clock, Wallet, Calendar, Building2, UserCircle2 } from 'lucide-react';

interface InputFormProps {
  values: PayrollInput;
  onChange: (newValues: PayrollInput) => void;
  title?: string;
}

const InputForm: React.FC<InputFormProps> = ({ values, onChange, title }) => {
  const [formattedSalary, setFormattedSalary] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'novedades': false,
      'deducciones': false
  });
  
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (values.deductionsParameters) {
        const newToggles: Record<string, boolean> = {};
        const params = values.deductionsParameters;
        if (params.housingInterest > 0) newToggles['housingInterest'] = true;
        if (params.prepaidMedicine > 0) newToggles['prepaidMedicine'] = true;
        if (params.voluntaryPension > 0) newToggles['voluntaryPension'] = true;
        if (params.voluntaryPensionExempt > 0) newToggles['voluntaryPensionExempt'] = true;
        if (params.afc > 0) newToggles['afc'] = true;
        setActiveToggles(prev => ({ ...prev, ...newToggles }));
    }
  }, [values.id]);

  useEffect(() => {
    if (values.baseSalary) {
        setFormattedSalary(values.baseSalary.toLocaleString('es-CO'));
    } else {
        setFormattedSalary('');
    }
  }, [values.baseSalary]);

  const handleChange = (field: keyof PayrollInput, value: any) => {
    const newValues = { ...values, [field]: value };
    if (field === 'baseSalary') {
      const salary = Number(value);
      newValues.includeTransportAid = salary <= (SMMLV_2025 * 2);
    }
    onChange(newValues);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numberValue = Number(rawValue);
    setFormattedSalary(numberValue === 0 ? '' : numberValue.toLocaleString('es-CO'));
    handleChange('baseSalary', numberValue);
  };

  const handleDeductionChange = (key: string, value: any) => {
      const updatedDeductions = { ...values.deductionsParameters, [key]: value };
      handleChange('deductionsParameters', updatedDeductions);
  };

  const toggleDeduction = (key: string, isActive: boolean) => {
      setActiveToggles(prev => ({ ...prev, [key]: isActive }));
      if (!isActive) {
          handleDeductionChange(key, 0);
      }
  };

  const toggleSection = (key: string) => {
      setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-100">
      
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">{title || 'Configuración'}</h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
            Editar
        </span>
      </div>

      <div className="space-y-6">
        
        {/* EMPLOYER TYPE SELECTOR */}
        <div className="space-y-2">
            <Label>Tipo de Empleador</Label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                    onClick={() => handleChange('employerType', 'NATURAL')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        values.employerType === 'NATURAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                    }`}
                >
                    <UserCircle2 className="w-4 h-4" /> Persona Natural
                </button>
                <button 
                    onClick={() => handleChange('employerType', 'JURIDICA')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        values.employerType === 'JURIDICA' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                    }`}
                >
                    <Building2 className="w-4 h-4" /> Empresa / Jurídica
                </button>
            </div>
        </div>

        {/* COMPANY & NIT */}
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
                <Label>{values.employerType === 'NATURAL' ? 'Nombre Completo / Comerciante' : 'Razón Social / Empresa'}</Label>
                <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Building2 className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input type="text" value={values.companyName || ''} onChange={(e) => handleChange('companyName', e.target.value)} className="block w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" placeholder={values.employerType === 'NATURAL' ? "Nombre del contratante" : "Nombre de la empresa"} />
                </div>
            </div>
             <div className="space-y-2">
                <Label>{values.employerType === 'NATURAL' ? 'Cédula / NIT' : 'NIT Empresa'}</Label>
                <input type="text" value={values.companyNit || ''} onChange={(e) => handleChange('companyNit', e.target.value)} className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" placeholder="900.123.456" />
            </div>
        </div>

        {/* Core Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2 space-y-2">
                <Label>Nombre del Trabajador</Label>
                <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input type="text" value={values.name} onChange={(e) => handleChange('name', e.target.value)} className="block w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium" placeholder="Ej: Juan Pérez" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Documento (C.C.)</Label>
                <input type="text" value={values.documentNumber || ''} onChange={(e) => handleChange('documentNumber', e.target.value)} className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" placeholder="123456789" />
            </div>
            
            <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <div className="relative">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                     </div>
                     <select
                        value={values.contractType || 'INDEFINIDO'}
                        onChange={(e) => handleChange('contractType', e.target.value)}
                        className="block w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-8 py-3 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm appearance-none font-medium cursor-pointer"
                     >
                        <option value="INDEFINIDO">Término Indefinido</option>
                        <option value="FIJO">Término Fijo</option>
                        <option value="OBRA_LABOR">Obra o Labor</option>
                        <option value="APRENDIZAJE">Aprendizaje</option>
                     </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                     </div>
                </div>
            </div>

             <div className="md:col-span-2 space-y-2">
                <Label>Cargo</Label>
                <input type="text" value={values.jobTitle || ''} onChange={(e) => handleChange('jobTitle', e.target.value)} className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm" placeholder="Auxiliar Contable, Gerente, etc." />
            </div>
        </div>

        {/* Date Inputs for Liquidation */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-2">
                <Label>Fecha Ingreso</Label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="date" value={values.startDate || ''} onChange={(e) => handleChange('startDate', e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Fecha Corte / Salida</Label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="date" value={values.endDate || ''} onChange={(e) => handleChange('endDate', e.target.value)} className="block w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm font-medium" />
                </div>
            </div>
        </div>

        {/* Salary Input */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Label>Salario Base (COP)</Label>
          <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-gray-400 font-semibold group-focus-within:text-blue-500 transition-colors">$</span>
                </div>
                <input type="text" inputMode="numeric" value={formattedSalary} onChange={handleSalaryChange} className="block w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-lg font-bold text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200" placeholder="0" />
            </div>
        </div>

        {/* --- SECTION: NOVEDADES Y RECARGOS --- */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
             <button onClick={() => toggleSection('novedades')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                 <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                     <Clock className="w-4 h-4 text-blue-500"/> Novedades y Recargos
                 </div>
                 {openSections['novedades'] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
             </button>
             {openSections['novedades'] && (
                 <div className="p-4 bg-white border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                     <div className="grid grid-cols-3 gap-3">
                        <SmallInput label="H.E. Diurna (1.25)" value={values.hedHours} onChange={v => handleChange('hedHours', v)} />
                        <SmallInput label="H.E. Nocturna (1.75)" value={values.henHours} onChange={v => handleChange('henHours', v)} />
                        <SmallInput label="Recargo Noct. (0.35)" value={values.rnHours} onChange={v => handleChange('rnHours', v)} />
                        <SmallInput label="Dom/Fest Ord. (1.80)" value={values.domFestHours} onChange={v => handleChange('domFestHours', v)} />
                        <SmallInput label="HED Festiva (2.00)" value={values.heddfHours} onChange={v => handleChange('heddfHours', v)} />
                        <SmallInput label="HEN Festiva (2.50)" value={values.hendfHours} onChange={v => handleChange('hendfHours', v)} />
                     </div>
                     <div className="space-y-3 pt-2 border-t border-gray-100">
                        <MoneyInput label="Comisiones" value={values.commissions} onChange={v => handleChange('commissions', v)} />
                        <MoneyInput label="Bonos Salariales" value={values.salaryBonuses} onChange={v => handleChange('salaryBonuses', v)} />
                        <MoneyInput label="Bonos No Salariales" value={values.nonSalaryBonuses} onChange={v => handleChange('nonSalaryBonuses', v)} />
                     </div>
                 </div>
             )}
        </div>

        {/* --- SECTION: DEDUCCIONES ADICIONALES --- */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
             <button onClick={() => toggleSection('deducciones')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                 <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                     <Wallet className="w-4 h-4 text-red-500"/> Préstamos y Otras Deducciones
                 </div>
                 {openSections['deducciones'] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
             </button>
             {openSections['deducciones'] && (
                 <div className="p-4 bg-white border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                     <MoneyInput label="Préstamos / Libranzas" value={values.loans} onChange={v => handleChange('loans', v)} />
                     <MoneyInput label="Otras Deducciones" value={values.otherDeductions} onChange={v => handleChange('otherDeductions', v)} />
                 </div>
             )}
        </div>

        {/* --- RETENCIÓN EN LA FUENTE SECTION --- */}
        <div className="space-y-4 pt-4 border-t border-gray-100 mt-6">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <BadgePercent className="w-4 h-4 text-orange-500"/>
                    ¿Activar deducciones Retefuente?
                </label>
                <div className="flex gap-2 text-sm font-medium">
                    <button onClick={() => handleChange('enableDeductions', true)} className={`px-4 py-1.5 rounded-full border transition-all ${values.enableDeductions ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}>SI</button>
                    <button onClick={() => handleChange('enableDeductions', false)} className={`px-4 py-1.5 rounded-full border transition-all ${!values.enableDeductions ? 'bg-gray-600 text-white border-gray-600 shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}>NO</button>
                </div>
            </div>

            {values.enableDeductions && (
                <div className="space-y-1 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2">
                    {[
                        { key: 'housingInterest', label: 'Deducción de vivienda' },
                        { key: 'prepaidMedicine', label: 'Deducción medicina prepagada' },
                        { key: 'voluntaryPension', label: 'Aportes vol. pensión obligatoria' },
                        { key: 'voluntaryPensionExempt', label: 'Aportes vol. - Renta exenta' },
                        { key: 'afc', label: 'Aporte voluntario AFC' },
                    ].map((item) => {
                        const isActive = activeToggles[item.key] || false;
                        const currentVal = values.deductionsParameters?.[item.key as keyof typeof values.deductionsParameters] as number || 0;
                        return (
                            <div key={item.key} className="flex flex-col py-3 border-b border-gray-100 last:border-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => toggleDeduction(item.key, e.target.checked)}/>
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                                {isActive && (
                                    <div className="mt-2 relative animate-in slide-in-from-top-1 fade-in duration-200">
                                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>
                                        <input type="text" inputMode="numeric" value={currentVal === 0 ? '' : currentVal.toLocaleString('es-CO')} onChange={(e) => { const val = Number(e.target.value.replace(/\D/g, '')); handleDeductionChange(item.key, val); }} className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-6 pr-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm placeholder-gray-400" placeholder="0" autoFocus />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                     <div className="flex flex-col py-3">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Aplica deducción para dependientes</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={values.deductionsParameters?.hasDependents || false} onChange={(e) => handleDeductionChange('hasDependents', e.target.checked)} />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* General Toggles */}
        <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/80 border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group">
                <div className="flex-1">
                    <span className="block text-sm font-semibold text-gray-900">Auxilio de Transporte</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">${AUX_TRANSPORTE_2025.toLocaleString('es-CO')}</span>
                </div>
                <div className="relative">
                    <input type="checkbox" checked={values.includeTransportAid} onChange={(e) => handleChange('includeTransportAid', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </div>
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 cursor-pointer hover:bg-blue-50/80 transition-colors">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-1.5"><span className="block text-sm font-semibold text-blue-900">Ley 1607 (Exonerado)</span></div>
                    <span className="text-xs text-blue-800/70 mt-0.5 block">Exime Salud, ICBF y SENA patronal.</span>
                </div>
                <div className="relative">
                    <input type="checkbox" checked={values.isExempt} onChange={(e) => handleChange('isExempt', e.target.checked)} className="sr-only peer" />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
            </label>
        </div>
      </div>
    </div>
  );
};

const Label: React.FC<{children: React.ReactNode}> = ({children}) => (<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">{children}</label>);

const SmallInput: React.FC<any> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</label>
        <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 placeholder-gray-400" placeholder="0" />
    </div>
);

const MoneyInput: React.FC<any> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</label>
        <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input type="text" value={Number(value || 0).toLocaleString('es-CO')} onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')))} className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 font-medium placeholder-gray-400" placeholder="0" />
        </div>
    </div>
);

export default InputForm;
