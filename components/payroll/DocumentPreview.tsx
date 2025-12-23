import React from 'react';
import { PayrollInput, PayrollResult } from '@/types/payroll';
import { formatCurrency } from '@/lib/calculations';

interface DocumentPreviewProps {
    input: PayrollInput;
    result: PayrollResult | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ input, result }) => {
    if (!result) return null;
    const { monthly } = result;

    // Calculate values
    const daysWorked = monthly.salaryData.daysWorked || 30;
    const baseSalary = input.baseSalary;
    const transportAid = monthly.salaryData.transportAid || 0;
    const variableSalary = (monthly.salaryData.overtime || 0) + (monthly.salaryData.variables || 0);
    const baseForBenefits = baseSalary + transportAid + variableSalary;

    // Colombian formulas
    const cesantias = (baseForBenefits * daysWorked) / 360;
    const interesesCesantias = (cesantias * daysWorked * 0.12) / 360;
    const prima = (baseForBenefits * daysWorked) / 360;
    const vacaciones = (baseSalary * daysWorked) / 720; // No transport aid for vacations

    const totalPrestaciones = cesantias + interesesCesantias + prima + vacaciones;
    const descuentos = input.loans || 0;
    const netoAPagar = totalPrestaciones - descuentos;

    const TableRow = ({ label, value, isTotal = false }: { label: string; value: string | number; isTotal?: boolean }) => (
        <tr className={isTotal ? 'font-bold bg-gray-50' : ''}>
            <td className="py-2 px-4 border-b border-gray-200">{label}</td>
            <td className="py-2 px-4 border-b border-gray-200 text-right">{typeof value === 'number' ? formatCurrency(value) : value}</td>
        </tr>
    );

    const SectionHeader = ({ number, title }: { number: string; title: string }) => (
        <div className="bg-gray-100 border border-gray-300 px-4 py-2 font-bold text-sm uppercase tracking-wide mt-6 mb-2">
            {number}. {title}
        </div>
    );

    const SubSection = ({ title, formula }: { title: string; formula?: string }) => (
        <div className="mb-2 mt-4">
            <p className="font-bold text-sm">{title}</p>
            {formula && <p className="text-xs text-gray-500 italic">{formula}</p>}
        </div>
    );

    return (
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-xs font-sans text-slate-800 leading-relaxed max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black uppercase mb-1">LIQUIDACIÓN DE PRESTACIONES SOCIALES</h1>
                <p className="text-gray-500 italic">(Colombia – Código Sustantivo del Trabajo)</p>
            </div>

            {/* 1. DATOS GENERALES DEL TRABAJADOR */}
            <SectionHeader number="1" title="DATOS GENERALES DEL TRABAJADOR" />
            <table className="w-full text-sm">
                <tbody>
                    <TableRow label="Nombre del trabajador" value={input.name} />
                    <TableRow label="Documento de identidad" value={input.documentNumber || ''} />
                    <TableRow label="Cargo" value={input.jobTitle || ''} />
                    <TableRow
                        label="Tipo de contrato"
                        value={`[ ${input.contractType === 'FIJO' ? 'X' : ' '} ] Término fijo  [ ${input.contractType === 'INDEFINIDO' ? 'X' : ' '} ] Indefinido  [ ${input.contractType === 'OBRA_LABOR' ? 'X' : ' '} ] Obra o labor`}
                    />
                    <TableRow label="Fecha de ingreso" value={input.startDate || ''} />
                    <TableRow label="Fecha de retiro / corte" value={input.endDate || ''} />
                    <TableRow label="Días laborados en el período" value={daysWorked} />
                    <TableRow label="Salario mensual base" value={baseSalary} />
                    <TableRow label="Salario variable (promedio)" value={variableSalary} />
                    <TableRow label="Auxilio de transporte" value={`[ ${input.includeTransportAid ? 'X' : ' '} ] Sí  [ ${!input.includeTransportAid ? 'X' : ' '} ] No`} />
                    <TableRow label="Total salario base de liquidación" value={baseForBenefits} isTotal />
                </tbody>
            </table>

            {/* 2. BASE DE LIQUIDACIÓN */}
            <SectionHeader number="2" title="BASE DE LIQUIDACIÓN" />
            <p className="text-xs text-gray-500 italic mb-2">* Base salarial = Salario + factores salariales habituales</p>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left font-bold">Concepto</th>
                        <th className="py-2 px-4 text-right font-bold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <TableRow label="Salario mensual" value={baseSalary} />
                    <TableRow label="Recargos y Variables" value={variableSalary} />
                    <TableRow label="Auxilio de transporte (si aplica)" value={transportAid} />
                    <TableRow label="Base para prestaciones" value={baseForBenefits} isTotal />
                </tbody>
            </table>

            {/* 3. LIQUIDACIÓN DE PRESTACIONES SOCIALES */}
            <SectionHeader number="3" title="LIQUIDACIÓN DE PRESTACIONES SOCIALES" />

            {/* A. Cesantías */}
            <SubSection title="A. CESANTÍAS (Art. 249 CST)" formula="Fórmula: (Salario base x Días trabajados) / 360" />
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left font-bold">Concepto</th>
                        <th className="py-2 px-4 text-right font-bold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <TableRow label="Salario base" value={baseForBenefits} />
                    <TableRow label="Días trabajados" value={daysWorked} />
                    <TableRow label="Cesantías causadas" value={cesantias} isTotal />
                </tbody>
            </table>

            {/* B. Intereses Cesantías */}
            <SubSection title="B. INTERESES A LAS CESANTÍAS (Ley 52 de 1975)" formula="Fórmula: (Cesantías x Días Trabajados x 12%) / 360" />
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left font-bold">Concepto</th>
                        <th className="py-2 px-4 text-right font-bold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <TableRow label="Valor cesantías" value={cesantias} />
                    <TableRow label="Días causados" value={daysWorked} />
                    <TableRow label="Tasa" value="12%" />
                    <TableRow label="Intereses de cesantías" value={interesesCesantias} isTotal />
                </tbody>
            </table>

            {/* C. Prima de Servicios */}
            <SubSection title="C. PRIMA DE SERVICIOS (Art. 306 CST)" formula="Fórmula: (Salario base x Días trabajados) / 360" />
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left font-bold">Concepto</th>
                        <th className="py-2 px-4 text-right font-bold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <TableRow label="Salario base" value={baseForBenefits} />
                    <TableRow label="Días trabajados" value={daysWorked} />
                    <TableRow label="Prima causada" value={prima} isTotal />
                </tbody>
            </table>

            {/* D. Vacaciones */}
            <SubSection title="D. VACACIONES (Art. 186 CST)" formula="Fórmula: (Salario base x Días trabajados) / 720 - No incluye auxilio de transporte" />
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="py-2 px-4 text-left font-bold">Concepto</th>
                        <th className="py-2 px-4 text-right font-bold">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <TableRow label="Salario base" value={baseSalary} />
                    <TableRow label="Días trabajados" value={daysWorked} />
                    <TableRow label="Vacaciones causadas" value={vacaciones} isTotal />
                </tbody>
            </table>

            {/* 4. RESUMEN GENERAL */}
            <SectionHeader number="4" title="RESUMEN GENERAL DE LA LIQUIDACION" />
            <table className="w-full text-sm">
                <tbody>
                    <TableRow label="Cesantías" value={cesantias} />
                    <TableRow label="Intereses de cesantías" value={interesesCesantias} />
                    <TableRow label="Prima de servicios" value={prima} />
                    <TableRow label="Vacaciones" value={vacaciones} />
                    <tr className="font-bold bg-gray-100">
                        <td className="py-2 px-4 border-b border-gray-300 text-red-700">TOTAL PRESTACIONES SOCIALES</td>
                        <td className="py-2 px-4 border-b border-gray-300 text-right text-red-700">{formatCurrency(totalPrestaciones)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 5. DESCUENTOS */}
            <SectionHeader number="5" title="DESCUENTOS DE NÓMINA Y RETENCIONES DEL PERIODO FINAL" />
            <table className="w-full text-sm">
                <tbody>
                    <TableRow label="Préstamos y Libranzas" value={descuentos} />
                    <tr className="font-bold">
                        <td className="py-2 px-4 border-b border-gray-200 text-red-600">Total descuentos del periodo</td>
                        <td className="py-2 px-4 border-b border-gray-200 text-right text-red-600">{formatCurrency(descuentos)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 6. NETO A PAGAR */}
            <SectionHeader number="6" title="NETO A PAGAR" />
            <table className="w-full text-sm">
                <tbody>
                    <TableRow label="Total prestaciones acumuladas" value={totalPrestaciones} />
                    <TableRow label="(-) Descuentos periodo final" value={descuentos} />
                    <tr className="font-bold bg-green-50">
                        <td className="py-3 px-4 border-2 border-green-200 text-green-800">NETO A PAGAR AL TRABAJADOR</td>
                        <td className="py-3 px-4 border-2 border-green-200 text-right text-green-800 text-lg">{formatCurrency(netoAPagar)}</td>
                    </tr>
                </tbody>
            </table>

            {/* 7. FIRMAS */}
            <SectionHeader number="7" title="FIRMAS" />
            <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="border border-gray-300 p-6 min-h-[100px]">
                    <p className="font-bold text-sm mb-12">EMPLEADOR</p>
                    <div className="border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-500">Firma</p>
                    </div>
                </div>
                <div className="border border-gray-300 p-6 min-h-[100px]">
                    <p className="font-bold text-sm mb-12">TRABAJADOR</p>
                    <div className="border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-500">Firma</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
