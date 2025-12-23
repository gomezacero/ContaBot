
import React from 'react';
import { PayrollResult, PayrollInput } from '../types';
import { formatCurrency, calculatePayroll, getSolidarityRate } from '../utils/calculations';
import { Download, FileText, Building2, User, AlertCircle, PiggyBank, CalendarClock, Wallet, Bell, ShieldAlert } from 'lucide-react';
import { generatePayrollPDF } from '../utils/pdfGenerator';
import { SMMLV_2025 } from '../constants';
import ModuleFeedback from './ModuleFeedback';

interface Props {
  result: PayrollResult; // Global aggregate (optional use)
  employees: PayrollInput[];
  activeEmployeeId?: string; // New prop to identify selected tab
  onActionTrigger?: () => void;
  isUserLoggedIn?: boolean;
}

const ResultsView: React.FC<Props> = ({ result, employees, activeEmployeeId, onActionTrigger, isUserLoggedIn = false }) => {
  // 1. Identify the active employee
  const activeEmp = employees.find(e => e.id === activeEmployeeId) || employees[0];
  
  // 2. Calculate Payroll ONLY for this employee (Independent Calculation)
  const activeResult = calculatePayroll(activeEmp);
  
  // Data for Monthly View
  const data = activeResult.monthly;
  
  // Data for Liquidation View (Calculated on actual days)
  const liquidationData = activeResult.annual;

  const handleDownloadPDF = () => {
    // We pass the single result and array of 1 employee to generate the specific PDF
    const singleResult = { monthly: data, annual: liquidationData, employeeCount: 1 };
    generatePayrollPDF(singleResult, [activeEmp]);
    if (onActionTrigger) {
        onActionTrigger();
    }
  };

  // --- NEW: Calculate "Neto de Ley" for Summary Section 1 ---
  // Only Law requirements (Health, Pension, FSP) and Transport Aid (already in totalAccrued)
  const netoMensualLey = data.salaryData.totalAccrued - 
                         data.employeeDeductions.health - 
                         data.employeeDeductions.pension - 
                         data.employeeDeductions.solidarityFund;

  // --- Calculations for Liquidation Logic (FROM LIQUIDATION DATA) ---
  const valCesantias = liquidationData.employerCosts.cesantias;
  const valIntereses = liquidationData.employerCosts.interesesCesantias;
  const valPrima = liquidationData.employerCosts.prima;
  const valVacaciones = liquidationData.employerCosts.vacations;
  const totalLiquidacion = valCesantias + valIntereses + valPrima + valVacaciones;

  // --- Logic for Solidarity Fund Display ---
  const fspValue = data.employeeDeductions.solidarityFund;
  const showFsp = fspValue > 0;

  // --- Logic for Extra Deductions (Retefuente & Voluntary) for LIQUIDATION SECTION ---
  const retefuente = data.employeeDeductions.retencionFuente;
  const dedParams = activeEmp.deductionsParameters || { voluntaryPension: 0, voluntaryPensionExempt: 0, afc: 0 };
  
  // Deductions from payment (Money leaving the pocket)
  const volPension = dedParams.voluntaryPension + dedParams.voluntaryPensionExempt;
  const afc = dedParams.afc;
  const loans = activeEmp.loans || 0;
  const otherDeds = activeEmp.otherDeductions || 0;
  
  const totalDeduccionesExtra = retefuente + volPension + afc + loans + otherDeds;
  const netoLiquidacion = totalLiquidacion - totalDeduccionesExtra;

  const hasOvertime = (data.salaryData.overtime || 0) > 0;
  const hasVariables = (data.salaryData.variables || 0) > 0;
  const hasNonSalary = (data.salaryData.nonSalary || 0) > 0;
  const hasTransportAid = (data.salaryData.transportAid || 0) > 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      
      {/* REGISTER REQUIRED BANNER */}
      {!isUserLoggedIn && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                      <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
                  </div>
                  <div>
                      <h4 className="text-lg font-bold text-indigo-900 leading-tight">Guarda tus empleados permanentemente</h4>
                      <p className="text-sm text-indigo-700/80">Regístrate para mantener un historial de tus nóminas, exportar reportes personalizados y sincronizar tus datos en la nube.</p>
                  </div>
              </div>
              <div className="flex gap-3 shrink-0">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
              </div>
          </div>
      )}

      {/* SECCIÓN 1: IMPACTO MENSUAL (CASH FLOW) */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            1. Impacto Mensual de Nómina
        </h3>
        <p className="text-sm text-gray-500 mb-4 -mt-2">
            Resumen de flujo de caja para un mes estándar de 30 días.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* IZQUIERDA: LADO DEL EMPLEADO (NETO DE LEY) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                <div className="bg-emerald-50/50 p-5 border-b border-emerald-100/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">El Empleado Recibe</h3>
                            <p className="text-xs text-gray-500">Salario de Ley (Sin deducciones extra)</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-gray-500">Pago Neto Mensual (Ley)</span>
                            <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(netoMensualLey)}</span>
                        </div>
                        
                        {/* Breakdown: ONLY LAW ACCORDING TO REQUEST */}
                        <div className="space-y-2 text-sm mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between">
                                <span className="text-gray-600 font-medium">Total Devengado</span>
                                <span className="font-bold text-gray-800">{formatCurrency(data.salaryData.totalAccrued)}</span>
                            </div>
                            
                            {/* Breakdown of Income */}
                            {(hasOvertime || hasVariables || hasNonSalary || hasTransportAid) && (
                                <div className="pl-2 text-xs text-gray-500 space-y-1 mb-2 border-l-2 border-gray-200">
                                    <div className="flex justify-between"><span>Básico:</span> <span>{formatCurrency(data.salaryData.baseSalary)}</span></div>
                                    {hasOvertime && <div className="flex justify-between"><span>Extras/Recargos:</span> <span>{formatCurrency(data.salaryData.overtime || 0)}</span></div>}
                                    {hasVariables && <div className="flex justify-between"><span>Comisiones/Bonos Sal:</span> <span>{formatCurrency(data.salaryData.variables || 0)}</span></div>}
                                    {hasNonSalary && <div className="flex justify-between"><span>No Salarial:</span> <span>{formatCurrency(data.salaryData.nonSalary || 0)}</span></div>}
                                    {hasTransportAid && <div className="flex justify-between"><span>Aux. Transporte:</span> <span>{formatCurrency(data.salaryData.transportAid)}</span></div>}
                                </div>
                            )}

                            <div className="h-px bg-gray-200 my-2"></div>
                            
                            {/* Law Deductions Only */}
                            <div className="flex justify-between text-red-600/80">
                                <span>(-) Salud (4%)</span>
                                <span>{formatCurrency(data.employeeDeductions.health)}</span>
                            </div>
                            <div className="flex justify-between text-red-600/80">
                                <span>(-) Pensión (4%)</span>
                                <span>{formatCurrency(data.employeeDeductions.pension)}</span>
                            </div>
                            
                            {showFsp && (
                                <div className="flex justify-between items-center text-red-700">
                                    <span>(-) Fondo Solidaridad</span>
                                    <span>{formatCurrency(fspValue)}</span>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-400 italic mt-3 pt-2 border-t border-gray-100">
                                * Préstamos, Retenciones y Aportes Voluntarios no se incluyen en este resumen de ley.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* DERECHA: LADO DEL EMPLEADOR (COSTO TOTAL) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                <div className="bg-blue-50/50 p-5 border-b border-blue-100/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Costo Empresa</h3>
                            <p className="text-xs text-gray-500">Salario + Prestaciones + SS</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-gray-500">Gasto Total Mensual</span>
                            <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(data.totals.grandTotalCost)}</span>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2 text-sm mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Devengado (Inc. Aux.)</span>
                                <span className="font-bold text-gray-800">{formatCurrency(data.salaryData.totalAccrued)}</span>
                            </div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            
                            <div className="flex justify-between text-gray-600">
                                <span>Seguridad Social (8.5% + 12% + ARL)</span>
                                <span className="font-medium">{formatCurrency(data.employerCosts.health + data.employerCosts.pension + data.employerCosts.arl)}</span>
                            </div>
                            
                            <div className="flex justify-between text-gray-600">
                                <span>Parafiscales (Caja/ICBF/SENA)</span>
                                <span className="font-medium">{formatCurrency(data.employerCosts.compensationBox + data.employerCosts.icbf + data.employerCosts.sena)}</span>
                            </div>

                            <div className="flex justify-between text-blue-700 font-bold bg-blue-50/50 -mx-2 px-2 py-1 rounded mt-2">
                                <div className="flex items-center gap-1.5">
                                    <span>Provisiones Mensuales</span>
                                    <div className="group relative">
                                        <PiggyBank className="w-3.5 h-3.5 cursor-help opacity-70"/>
                                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white shadow-xl border border-gray-100 text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-left">
                                            <p className="font-bold mb-1 border-b pb-1 text-gray-700">Ahorro mensual obligatorio:</p>
                                            <div className="flex justify-between py-0.5"><span>Cesantías:</span> <span>{formatCurrency(data.employerCosts.cesantias)}</span></div>
                                            <div className="flex justify-between py-0.5"><span>Primas:</span> <span>{formatCurrency(data.employerCosts.prima)}</span></div>
                                            <div className="flex justify-between py-0.5"><span>Vacaciones:</span> <span>{formatCurrency(data.employerCosts.vacations)}</span></div>
                                        </div>
                                    </div>
                                </div>
                                <span>{formatCurrency(data.employerCosts.cesantias + data.employerCosts.interesesCesantias + data.employerCosts.prima + data.employerCosts.vacations)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* SECCIÓN 2: LIQUIDACIÓN ACUMULADA */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            2. Liquidación a la Fecha (Prestaciones Acumuladas)
        </h3>
        <p className="text-sm text-gray-500 mb-4 -mt-2">
            Calculado sobre <strong>{liquidationData.salaryData.daysWorked} días laborados</strong> (Desde {activeEmp.startDate || 'Inicio'} hasta {activeEmp.endDate || 'Corte'}).
        </p>

        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full opacity-10 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                
                {/* Grand Total */}
                <div className="text-center md:text-left">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total a Pagar al Empleado</p>
                    <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        {formatCurrency(netoLiquidacion)}
                    </p>
                    <p className="text-sm text-emerald-400 mt-2 font-medium">
                        Total Prestaciones menos Deducciones del Periodo.
                    </p>
                </div>

                {/* Breakdown Grid */}
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto min-w-[320px]">
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                        <p className="text-[10px] text-gray-300 uppercase font-bold">Cesantías + Int.</p>
                        <p className="text-base font-bold">{formatCurrency(valCesantias + valIntereses)}</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                        <p className="text-[10px] text-gray-300 uppercase font-bold">Prima Servicios</p>
                        <p className="text-base font-bold">{formatCurrency(valPrima)}</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10 col-span-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Vacaciones</p>
                                <p className="text-base font-bold">{formatCurrency(valVacaciones)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal Prestaciones</p>
                                <p className="text-sm font-medium text-emerald-300">{formatCurrency(totalLiquidacion)}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Deductions Box */}
                    {totalDeduccionesExtra > 0 && (
                        <div className="bg-red-500/10 p-3 rounded-xl backdrop-blur-sm border border-red-500/20 col-span-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-red-200 uppercase font-bold">(-) Total Deducciones</p>
                                    <p className="text-base font-bold text-white">{formatCurrency(totalDeduccionesExtra)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-red-300/70 uppercase font-bold">Aplicadas al pago</p>
                                </div>
                            </div>
                            <div className="text-[10px] text-red-300/60 mt-1 flex flex-wrap gap-2">
                                {loans > 0 && <span className="bg-red-500/20 px-1.5 rounded">Préstamos</span>}
                                {retefuente > 0 && <span className="bg-red-500/20 px-1.5 rounded">Retefuente</span>}
                                {(volPension > 0 || afc > 0) && <span className="bg-red-500/20 px-1.5 rounded">Aportes Vol.</span>}
                                {otherDeds > 0 && <span className="bg-red-500/20 px-1.5 rounded">Otros</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER */}
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 text-gray-800 font-sans max-w-4xl mx-auto mt-8">
        
        {/* Actions Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100 print:hidden">
             <div>
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-3">
                    <FileText className="w-8 h-8 text-gray-700" />
                    Vista Previa: Documento de Liquidación
                </h1>
                <p className="text-sm text-gray-500 italic mt-1 ml-11">Formato legal sugerido para terminación de contrato.</p>
             </div>
             <button 
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95"
            >
                <Download className="w-4 h-4" />
                <span className="font-semibold text-sm">Descargar PDF</span>
            </button>
        </div>

        {/* 1. DATOS GENERALES */}
        <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                1. DATOS GENERALES
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Tipo de Empleador</div>
                    <div className="p-2 font-bold">{activeEmp.employerType === 'NATURAL' ? 'Persona Natural' : 'Persona Jurídica / Empresa'}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Empresa / Razón Social</div>
                    <div className="p-2">{activeEmp.companyName || 'No registrado'}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">NIT / Identificación</div>
                    <div className="p-2">{activeEmp.companyNit || 'No registrado'}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Nombre del trabajador</div>
                    <div className="p-2">{activeEmp.name}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Documento de identidad</div>
                    <div className="p-2">{activeEmp.documentNumber || 'No registrado'}</div>
                </div>
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Cargo</div>
                    <div className="p-2">{activeEmp.jobTitle || 'No registrado'}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Tipo de contrato</div>
                    <div className="p-2 flex gap-2">
                        <span>{activeEmp.contractType === 'FIJO' ? '☒' : '☐'} Término fijo</span>
                        <span>{activeEmp.contractType === 'INDEFINIDO' ? '☒' : '☐'} Indefinido</span>
                        <span>{activeEmp.contractType === 'OBRA_LABOR' ? '☒' : '☐'} Obra o labor</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Fecha de ingreso</div>
                    <div className="p-2">{activeEmp.startDate || '2025-01-01'}</div>
                </div>
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Fecha de retiro / corte</div>
                    <div className="p-2">{activeEmp.endDate || '2025-01-30'}</div>
                </div>
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Días laborados en el período</div>
                    <div className="p-2">{liquidationData.salaryData.daysWorked}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Salario mensual base</div>
                    <div className="p-2">{formatCurrency(data.salaryData.baseSalary)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Salario variable (promedio)</div>
                    <div className="p-2">
                         {hasVariables || hasOvertime ? formatCurrency((data.salaryData.variables || 0) + (data.salaryData.overtime || 0)) : 'N/A'}
                    </div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-medium">Auxilio de transporte</div>
                    <div className="p-2 flex gap-2">
                         <span>{activeEmp.includeTransportAid ? '☒' : '☐'} Sí</span>
                         <span>{!activeEmp.includeTransportAid ? '☒' : '☐'} No</span>
                    </div>
                </div>
                <div className="grid grid-cols-2">
                    <div className="p-2 border-r border-gray-100 bg-gray-50 font-bold">Total salario base de liquidación</div>
                    <div className="p-2 font-bold">{formatCurrency(data.salaryData.totalAccrued)}</div>
                </div>
            </div>
        </div>

        {/* 2. BASE LIQUIDACIÓN */}
        <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                2. BASE DE LIQUIDACIÓN
            </h2>
             <p className="text-xs text-gray-500 mb-2 italic">
                *Base salarial = Salario + factores salariales habituales (No incluye: horas extras ocasionales, auxilios no salariales, viáticos accidentales)
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-2 border-b border-gray-100">
                     <div className="p-2 border-r border-gray-100 bg-gray-50">Salario mensual</div>
                     <div className="p-2 text-right">{formatCurrency(data.salaryData.baseSalary)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                     <div className="p-2 border-r border-gray-100 bg-gray-50">Recargos y Variables</div>
                     <div className="p-2 text-right">{formatCurrency((data.salaryData.overtime || 0) + (data.salaryData.variables || 0))}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                     <div className="p-2 border-r border-gray-100 bg-gray-50">Auxilio de transporte (si aplica)</div>
                     <div className="p-2 text-right">{formatCurrency(data.salaryData.transportAid)}</div>
                </div>
                <div className="grid grid-cols-2 bg-gray-100 font-bold">
                     <div className="p-2 border-r border-gray-200">Base para prestaciones</div>
                     <div className="p-2 text-right">{formatCurrency(data.salaryData.totalAccrued - (data.salaryData.nonSalary || 0))}</div>
                </div>
            </div>
        </div>

        {/* 3. LIQUIDACIÓN */}
        <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                3. LIQUIDACIÓN DE PRESTACIONES SOCIALES
            </h2>

            <div className="space-y-6">
                {/* CESANTIAS */}
                <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        🟢 A. CESANTÍAS <span className="text-xs font-normal text-gray-500 italic">(Art. 249 CST)</span>
                    </h3>
                    <div className="bg-gray-50 px-3 py-1 text-xs text-gray-600 mb-2 border-l-2 border-blue-500">
                         Fórmula: (Salario base × Días trabajados) ÷ 360
                    </div>
                    <div className="border border-gray-200 rounded text-sm">
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Salario base</div>
                            <div className="p-2 text-right">{formatCurrency(data.salaryData.totalAccrued - (data.salaryData.nonSalary || 0))}</div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Días trabajados</div>
                            <div className="p-2 text-right">{liquidationData.salaryData.daysWorked}</div>
                        </div>
                        <div className="grid grid-cols-2 font-bold bg-white">
                            <div className="p-2 border-r bg-gray-50">Cesantías causadas</div>
                            <div className="p-2 text-right">{formatCurrency(valCesantias)}</div>
                        </div>
                    </div>
                </div>

                {/* INTERESES */}
                <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        🟢 B. INTERESES A LAS CESANTÍAS <span className="text-xs font-normal text-gray-500 italic">(Ley 52 de 1975 – 12% anual)</span>
                    </h3>
                    <div className="bg-gray-50 px-3 py-1 text-xs text-gray-600 mb-2 border-l-2 border-blue-500">
                         Fórmula: (Cesantías × Días trabajados × 12%) ÷ 360
                    </div>
                     <div className="border border-gray-200 rounded text-sm">
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Valor cesantías</div>
                            <div className="p-2 text-right">{formatCurrency(valCesantias)}</div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Días causados</div>
                            <div className="p-2 text-right">{liquidationData.salaryData.daysWorked}</div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Tasa</div>
                            <div className="p-2 text-right">12%</div>
                        </div>
                        <div className="grid grid-cols-2 font-bold bg-white">
                            <div className="p-2 border-r bg-gray-50">Intereses de cesantías</div>
                            <div className="p-2 text-right">{formatCurrency(valIntereses)}</div>
                        </div>
                    </div>
                </div>

                {/* PRIMA */}
                <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        🟢 C. PRIMA DE SERVICIOS <span className="text-xs font-normal text-gray-500 italic">(Art. 306 CST)</span>
                    </h3>
                    <div className="bg-gray-50 px-3 py-1 text-xs text-gray-600 mb-2 border-l-2 border-blue-500">
                         Fórmula: (Salario base × Días trabajados) ÷ 360
                    </div>
                     <div className="border border-gray-200 rounded text-sm">
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Salario base</div>
                            <div className="p-2 text-right">{formatCurrency(data.salaryData.totalAccrued - (data.salaryData.nonSalary || 0))}</div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Días trabajados</div>
                            <div className="p-2 text-right">{liquidationData.salaryData.daysWorked}</div>
                        </div>
                        <div className="grid grid-cols-2 font-bold bg-white">
                            <div className="p-2 border-r bg-gray-50">Prima causada</div>
                            <div className="p-2 text-right">{formatCurrency(valPrima)}</div>
                        </div>
                    </div>
                </div>

                {/* VACACIONES */}
                <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        🟢 D. VACACIONES <span className="text-xs font-normal text-gray-500 italic">(Art. 186 CST)</span>
                    </h3>
                    <div className="bg-gray-50 px-3 py-1 text-xs text-gray-600 mb-2 border-l-2 border-blue-500">
                         Fórmula: (Salario base × Días trabajados) ÷ 720 (No incluye auxilio de transporte)
                    </div>
                     <div className="border border-gray-200 rounded text-sm">
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Salario base</div>
                            <div className="p-2 text-right">{formatCurrency(data.salaryData.baseSalary)}</div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <div className="p-2 border-r bg-gray-50">Días trabajados</div>
                            <div className="p-2 text-right">{liquidationData.salaryData.daysWorked}</div>
                        </div>
                        <div className="grid grid-cols-2 font-bold bg-white">
                            <div className="p-2 border-r bg-gray-50">Vacaciones causadas</div>
                            <div className="p-2 text-right">{formatCurrency(valVacaciones)}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* 4. RESUMEN GENERAL */}
        <div className="mb-8">
             <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                4. RESUMEN GENERAL DE LA LIQUIDACIÓN
            </h2>
            <div className="border border-gray-200 rounded text-sm">
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Cesantías</div>
                    <div className="p-2 text-right">{formatCurrency(valCesantias)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Intereses de cesantías</div>
                    <div className="p-2 text-right">{formatCurrency(valIntereses)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Prima de servicios</div>
                    <div className="p-2 text-right">{formatCurrency(valPrima)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Vacaciones</div>
                    <div className="p-2 text-right">{formatCurrency(valVacaciones)}</div>
                </div>
                <div className="grid grid-cols-2 bg-gray-100 font-bold">
                    <div className="p-2 border-r border-gray-200">TOTAL PRESTACIONES SOCIALES</div>
                    <div className="p-2 text-right">{formatCurrency(totalLiquidacion)}</div>
                </div>
            </div>
        </div>

        {/* 5. DESCUENTOS */}
        <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                5. DESCUENTOS DE NÓMINA Y RETENCIONES DEL PERIODO FINAL
            </h2>
             <div className="border border-gray-200 rounded text-sm">
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Préstamos y Libranzas</div>
                    <div className="p-2 text-right text-gray-700">{formatCurrency(loans)}</div>
                </div>
                {otherDeds > 0 && (
                     <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-2 border-r bg-gray-50">Otras Deducciones</div>
                        <div className="p-2 text-right text-gray-700">{formatCurrency(otherDeds)}</div>
                    </div>
                )}
                {/* DYNAMIC ROWS FOR RETEFUENTE AND VOLUNTARY */}
                {retefuente > 0 && (
                     <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-2 border-r bg-gray-50 text-red-700 font-medium">Retención en la Fuente (Calculada)</div>
                        <div className="p-2 text-right text-red-700">{formatCurrency(retefuente)}</div>
                    </div>
                )}
                {volPension > 0 && (
                     <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-2 border-r bg-gray-50 text-red-700 font-medium">Aportes Voluntarios Pensión Obligatoria</div>
                        <div className="p-2 text-right text-red-700">{formatCurrency(volPension)}</div>
                    </div>
                )}
                {afc > 0 && (
                     <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-2 border-r bg-gray-50 text-red-700 font-medium">Aportes AFC</div>
                        <div className="p-2 text-right text-red-700">{formatCurrency(afc)}</div>
                    </div>
                )}

                <div className="grid grid-cols-2 font-bold text-red-600 bg-red-50">
                    <div className="p-2 border-r border-red-100">Total descuentos del periodo</div>
                    <div className="p-2 text-right">{formatCurrency(totalDeduccionesExtra)}</div>
                </div>
             </div>
        </div>

        {/* 6. NETO A PAGAR */}
        <div className="mb-12">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b-2 border-gray-100 pb-2 mb-4">
                6. NETO A PAGAR
            </h2>
            <div className="border border-gray-200 rounded text-sm">
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">Total prestaciones acumuladas</div>
                    <div className="p-2 text-right font-medium">{formatCurrency(totalLiquidacion)}</div>
                </div>
                 <div className="grid grid-cols-2 border-b border-gray-100">
                    <div className="p-2 border-r bg-gray-50">(-) Descuentos periodo final</div>
                    <div className="p-2 text-right text-red-500 font-medium">{formatCurrency(totalDeduccionesExtra)}</div>
                </div>
                <div className="grid grid-cols-2 bg-green-50 text-green-800 font-bold text-lg">
                    <div className="p-4 border-r border-green-100">NETO A PAGAR AL TRABAJADOR</div>
                    <div className="p-4 text-right">{formatCurrency(netoLiquidacion)}</div>
                </div>
            </div>
        </div>
        
        {/* Module Feedback Component */}
        <ModuleFeedback moduleName="Nómina" />

      </div>
    </div>
  );
};

export default ResultsView;
