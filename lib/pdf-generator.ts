import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollInput, PayrollResult } from '@/types/payroll';
import { formatCurrency } from './calculations';

interface PayrollPDFData {
    employee: PayrollInput;
    result: PayrollResult;
    companyName?: string;
    companyNit?: string;
    periodDescription?: string;
}

export function generatePayrollPDF(data: PayrollPDFData): void {
    const { employee, result, companyName, companyNit, periodDescription } = data;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Colors
    const primaryColor: [number, number, number] = [0, 45, 68]; // #002D44
    const accentColor: [number, number, number] = [26, 177, 177]; // #1AB1B1

    // ===== HEADER =====
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE NÓMINA', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(periodDescription || `Período: ${employee.startDate} - ${employee.endDate}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, 35, { align: 'center' });

    yPos = 50;

    // ===== COMPANY & EMPLOYEE INFO =====
    doc.setTextColor(0, 0, 0);

    // Company box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPos, (pageWidth - margin * 2) / 2 - 5, 35, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('EMPRESA', margin + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(companyName || employee.companyName || 'ContaBot S.A.S', margin + 5, yPos + 18);
    doc.setFontSize(9);
    doc.text(`NIT: ${companyNit || employee.companyNit || '900.123.456-7'}`, margin + 5, yPos + 26);

    // Employee box
    const empBoxX = pageWidth / 2 + 5;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(empBoxX, yPos, (pageWidth - margin * 2) / 2 - 5, 35, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('EMPLEADO', empBoxX + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(employee.name, empBoxX + 5, yPos + 18);
    doc.setFontSize(9);
    doc.text(`CC: ${employee.documentNumber || 'N/A'}`, empBoxX + 5, yPos + 26);

    yPos += 45;

    // ===== DEVENGADO TABLE =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text('DEVENGADO', margin, yPos);
    yPos += 5;

    const devengadoBody: [string, string][] = [
        ['Salario Base', formatCurrency(result.monthly.salaryData.baseSalary)],
        ['Auxilio de Transporte', formatCurrency(result.monthly.salaryData.transportAid)],
    ];

    if (result.monthly.salaryData.overtime && result.monthly.salaryData.overtime > 0) {
        devengadoBody.push(['Horas Extra', formatCurrency(result.monthly.salaryData.overtime)]);
    }
    if (result.monthly.salaryData.variables && result.monthly.salaryData.variables > 0) {
        devengadoBody.push(['Variables (Comisiones, Bonos)', formatCurrency(result.monthly.salaryData.variables)]);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: devengadoBody,
        foot: [['TOTAL DEVENGADO', formatCurrency(result.monthly.salaryData.totalAccrued)]],
        theme: 'striped',
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 255, 255], textColor: primaryColor, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // ===== DEDUCCIONES TABLE =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 53, 69); // Red
    doc.text('DEDUCCIONES', margin, yPos);
    yPos += 5;

    const deductionsBody: [string, string][] = [
        ['Salud (4%)', formatCurrency(result.monthly.employeeDeductions.health)],
        ['Pensión (4%)', formatCurrency(result.monthly.employeeDeductions.pension)],
    ];

    if (result.monthly.employeeDeductions.solidarityFund > 0) {
        deductionsBody.push(['Fondo de Solidaridad', formatCurrency(result.monthly.employeeDeductions.solidarityFund)]);
    }
    if (result.monthly.employeeDeductions.retencionFuente > 0) {
        deductionsBody.push(['Retención en la Fuente', formatCurrency(result.monthly.employeeDeductions.retencionFuente)]);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: deductionsBody,
        foot: [['TOTAL DEDUCCIONES', formatCurrency(result.monthly.employeeDeductions.totalDeductions)]],
        theme: 'striped',
        headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [255, 235, 235], textColor: [150, 30, 30], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // ===== NET PAY BOX =====
    doc.setFillColor(...accentColor);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NETO A PAGAR', margin + 10, yPos + 10);

    doc.setFontSize(18);
    doc.text(formatCurrency(result.monthly.netPay), pageWidth - margin - 10, yPos + 16, { align: 'right' });

    yPos += 35;

    // ===== EMPLOYER COSTS (smaller) =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('COSTOS DEL EMPLEADOR (Información para la empresa)', margin, yPos);
    yPos += 5;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor', 'Concepto', 'Valor']],
        body: [
            ['Salud (8.5%)', formatCurrency(result.monthly.employerCosts.health), 'Cesantías', formatCurrency(result.monthly.employerCosts.cesantias)],
            ['Pensión (12%)', formatCurrency(result.monthly.employerCosts.pension), 'Int. Cesantías', formatCurrency(result.monthly.employerCosts.interesesCesantias)],
            ['ARL', formatCurrency(result.monthly.employerCosts.arl), 'Prima', formatCurrency(result.monthly.employerCosts.prima)],
            ['Caja Compensación', formatCurrency(result.monthly.employerCosts.compensationBox), 'Vacaciones', formatCurrency(result.monthly.employerCosts.vacations)],
        ],
        foot: [['', '', 'COSTO TOTAL EMPLEADOR', formatCurrency(result.monthly.employerCosts.totalEmployerCost)]],
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [240, 240, 240], textColor: primaryColor, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // ===== SIGNATURES =====
    const signWidth = (pageWidth - margin * 2 - 20) / 2;

    doc.setDrawColor(150, 150, 150);
    doc.line(margin, yPos + 15, margin + signWidth, yPos + 15);
    doc.line(pageWidth - margin - signWidth, yPos + 15, pageWidth - margin, yPos + 15);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Firma Empleador', margin + signWidth / 2, yPos + 22, { align: 'center' });
    doc.text('Firma Empleado', pageWidth - margin - signWidth / 2, yPos + 22, { align: 'center' });

    // ===== FOOTER =====
    doc.setFillColor(245, 245, 245);
    doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F');

    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Generado con ContaBot - www.contabot.co', pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });

    // Save the PDF
    const fileName = `nomina_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}

// Generate PDF for liquidation
export function generateLiquidationPDF(data: PayrollPDFData): void {
    const { employee, result } = data;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    const primaryColor: [number, number, number] = [0, 45, 68];
    const accentColor: [number, number, number] = [26, 177, 177];

    // Calculate liquidation values based on monthly provisions
    const daysWorked = result.monthly.salaryData.daysWorked || 30;
    const cesantiasAmount = result.monthly.employerCosts.cesantias;
    const interesesCesantias = result.monthly.employerCosts.interesesCesantias;
    const primaAmount = result.monthly.employerCosts.prima;
    const vacationsAmount = result.monthly.employerCosts.vacations;
    const totalLiquidation = cesantiasAmount + interesesCesantias + primaAmount + vacationsAmount;

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE CONTRATO', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Período trabajado: ${employee.startDate} - ${employee.endDate}`, pageWidth / 2, 28, { align: 'center' });

    yPos = 45;

    // Employee info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Empleado: ${employee.name}`, margin, yPos);
    doc.text(`Documento: ${employee.documentNumber || 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 15;

    // Liquidation table
    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Base', 'Días', 'Valor']],
        body: [
            ['Cesantías', formatCurrency(result.monthly.salaryData.totalAccrued), String(daysWorked), formatCurrency(cesantiasAmount)],
            ['Intereses Cesantías', '-', '-', formatCurrency(interesesCesantias)],
            ['Prima de Servicios', formatCurrency(result.monthly.salaryData.totalAccrued), String(daysWorked), formatCurrency(primaAmount)],
            ['Vacaciones', formatCurrency(result.monthly.salaryData.baseSalary), String(daysWorked), formatCurrency(vacationsAmount)],
        ],
        foot: [['', '', 'TOTAL LIQUIDACIÓN', formatCurrency(totalLiquidation)]],
        theme: 'striped',
        headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [230, 255, 255], textColor: primaryColor, fontStyle: 'bold', fontSize: 11 },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;

    // Signatures
    const signWidth = (pageWidth - margin * 2 - 20) / 2;
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, yPos, margin + signWidth, yPos);
    doc.line(pageWidth - margin - signWidth, yPos, pageWidth - margin, yPos);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Firma Empleador', margin + signWidth / 2, yPos + 7, { align: 'center' });
    doc.text('Firma Empleado', pageWidth - margin - signWidth / 2, yPos + 7, { align: 'center' });

    // Footer
    doc.setFillColor(245, 245, 245);
    doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageWidth, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Generado con ContaBot - www.contabot.co', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });

    const fileName = `liquidacion_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
