import React from 'react';
import { PayrollResult } from '@/types/payroll';
import { formatCurrency } from '@/lib/calculations';
import { TrendingUp, UserCheck, Briefcase, FileText } from 'lucide-react';

interface PayrollSummaryProps {
    result: PayrollResult | null;
}

const SummaryCard = ({
    title,
    value,
    subtitle,
    colorClass,
    icon: Icon,
    children
}: {
    title: string;
    value: string;
    subtitle?: string;
    colorClass: string;
    icon: any;
    children?: React.ReactNode
}) => (
    <div className={`rounded-xl border shadow-sm p-5 ${colorClass} transition-all hover:shadow-md`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">{title}</p>
                <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-2 rounded-lg bg-white/20`}>
                <Icon size={20} />
            </div>
        </div>
        {children && <div className="border-t border-black/5 mt-4 pt-4 space-y-2 text-sm">{children}</div>}
    </div>
);

const Row = ({ label, value, isBold = false }: { label: string; value: number; isBold?: boolean }) => (
    <div className={`flex justify-between items-center ${isBold ? 'font-semibold' : 'text-sm opacity-90'}`}>
        <span>{label}</span>
        <span>{formatCurrency(value)}</span>
    </div>
);

export const PayrollSummary: React.FC<PayrollSummaryProps> = ({ result }) => {
    if (!result) return <div className="text-center p-10 text-gray-400">Calculando...</div>;

    const { monthly, annual } = result;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-600" />
                Impacto Financiero
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. EMPLOYEE IMPACT (Recibido Neto) */}
                <SummaryCard
                    title="Neto a Pagar (Empleado)"
                    value={formatCurrency(monthly.netPay)}
                    subtitle="Disponible en Banco"
                    colorClass="bg-emerald-600 text-white border-emerald-700"
                    icon={UserCheck}
                >
                    <Row label="Total Devengado" value={monthly.salaryData.totalAccrued} />
                    <div className="my-1 border-t border-white/20"></div>
                    <Row label="Salud (-4%)" value={monthly.employeeDeductions.health} />
                    <Row label="Pensión (-4%)" value={monthly.employeeDeductions.pension} />
                    {monthly.employeeDeductions.solidarityFund > 0 && (
                        <Row label="Fondo Solidaridad" value={monthly.employeeDeductions.solidarityFund} />
                    )}
                    {monthly.employeeDeductions.retencionFuente > 0 && (
                        <Row label="Retención Fuente" value={monthly.employeeDeductions.retencionFuente} />
                    )}
                    {(monthly.employeeDeductions.totalDeductions - monthly.employeeDeductions.health - monthly.employeeDeductions.pension - monthly.employeeDeductions.solidarityFund - monthly.employeeDeductions.retencionFuente) > 0 && (
                        <Row label="Otras Deducciones" value={monthly.employeeDeductions.totalDeductions - monthly.employeeDeductions.health - monthly.employeeDeductions.pension - monthly.employeeDeductions.solidarityFund - monthly.employeeDeductions.retencionFuente} />
                    )}
                </SummaryCard>

                {/* 2. EMPLOYER IMPACT (Costo Total) */}
                <SummaryCard
                    title="Costo Total Empresa"
                    value={formatCurrency(monthly.totals.grandTotalCost)}
                    subtitle={`Factor Prestacional: ${((monthly.totals.grandTotalCost / monthly.salaryData.baseSalary - 1) * 100).toFixed(1)}%`}
                    colorClass="bg-blue-600 text-white border-blue-700"
                    icon={Briefcase}
                >
                    <Row label="Total Devengado" value={monthly.salaryData.totalAccrued} />
                    <div className="my-1 border-t border-white/20"></div>
                    <Row label="Seguridad Social (Salud/Pens/ARL)" value={monthly.employerCosts.health + monthly.employerCosts.pension + monthly.employerCosts.arl} />
                    <Row label="Parafiscales (Caja/ICBF/SENA)" value={monthly.employerCosts.compensationBox + monthly.employerCosts.icbf + monthly.employerCosts.sena} />
                    <Row label="Provisiones (Prestaciones)" value={monthly.employerCosts.cesantias + monthly.employerCosts.interesesCesantias + monthly.employerCosts.prima + monthly.employerCosts.vacations} isBold />
                </SummaryCard>
            </div>

            {/* 3. LIQUIDATION PREVIEW */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-700 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-amber-500">Valor Liquidación a la Fecha</h3>
                            <p className="text-xs text-slate-400">Provisión acumulada si el contrato terminara hoy</p>
                        </div>
                    </div>
                    <div className="text-3xl font-mono font-bold text-white">
                        {formatCurrency(
                            annual.employerCosts.cesantias +
                            annual.employerCosts.interesesCesantias +
                            annual.employerCosts.prima +
                            annual.employerCosts.vacations
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700 text-sm">
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-400 mb-1">Cesantías</p>
                        <p className="font-semibold">{formatCurrency(annual.employerCosts.cesantias)}</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-400 mb-1">Int. Cesantías</p>
                        <p className="font-semibold">{formatCurrency(annual.employerCosts.interesesCesantias)}</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-400 mb-1">Prima Servicios</p>
                        <p className="font-semibold">{formatCurrency(annual.employerCosts.prima)}</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-lg text-center">
                        <p className="text-xs text-slate-400 mb-1">Vacaciones</p>
                        <p className="font-semibold">{formatCurrency(annual.employerCosts.vacations)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
