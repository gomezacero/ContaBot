import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollInput, PayrollResult, LiquidationResult } from '@/types/payroll';
import { formatCurrency } from './calculations';

interface PayrollPDFData {
    employee: PayrollInput;
    result: PayrollResult;
    companyName?: string;
    companyNit?: string;
    periodDescription?: string;
    liquidationResult?: LiquidationResult;
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

// Generate PDF for liquidation (Colombian format)
export function generateLiquidationPDF(data: PayrollPDFData): void {
    const { employee, result, liquidationResult: liquidation } = data;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 15;

    // Colors
    const headerBg: [number, number, number] = [240, 240, 240];
    const primaryText: [number, number, number] = [0, 0, 0];
    const greenHighlight: [number, number, number] = [220, 252, 231];
    const redText: [number, number, number] = [185, 28, 28];

    // Use LiquidationResult if available, otherwise calculate
    const daysWorked = liquidation?.daysWorked || result.annual?.salaryData?.daysWorked || 30;
    const baseSalary = employee.baseSalary;
    const transportAid = result.monthly.salaryData.transportAid || 0;
    const variableSalary = (result.monthly.salaryData.overtime || 0) + (result.monthly.salaryData.variables || 0);
    const baseForBenefits = liquidation?.baseLiquidation || (baseSalary + transportAid + variableSalary);

    // Use liquidation values if available, otherwise calculate with Colombian formulas
    const cesantias = liquidation?.cesantias || (baseForBenefits * daysWorked) / 360;
    const interesesCesantias = liquidation?.interesesCesantias || (cesantias * daysWorked * 0.12) / 360;
    const prima = liquidation?.prima || (baseForBenefits * daysWorked) / 360;
    const vacaciones = liquidation?.vacaciones || (baseSalary * daysWorked) / 720;

    const totalPrestaciones = liquidation?.totalPrestaciones || (cesantias + interesesCesantias + prima + vacaciones);

    // Deductions - use detailed breakdown if available
    const loans = liquidation?.deductions?.loans || employee.loans || 0;
    const retefuente = liquidation?.deductions?.retefuente || result.monthly.employeeDeductions.retencionFuente || 0;
    const voluntaryContributions = liquidation?.deductions?.voluntaryContributions || 0;
    const otherDeductions = liquidation?.deductions?.other || employee.otherDeductions || 0;
    const totalDescuentos = liquidation?.deductions?.total || (loans + retefuente + voluntaryContributions + otherDeductions);
    const netoAPagar = liquidation?.netToPay || (totalPrestaciones - totalDescuentos);

    // ===== HEADER =====
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE PRESTACIONES SOCIALES', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('(Colombia – Código Sustantivo del Trabajo)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Helper: Section Header
    const sectionHeader = (num: string, title: string) => {
        doc.setFillColor(...headerBg);
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryText);
        doc.text(`${num}. ${title}`, margin + 2, yPos + 5);
        yPos += 10;
    };

    // ===== 1. DATOS GENERALES DEL TRABAJADOR =====
    sectionHeader('1', 'DATOS GENERALES DEL TRABAJADOR');

    autoTable(doc, {
        startY: yPos,
        body: [
            ['Nombre del trabajador', employee.name],
            ['Documento de identidad', employee.documentNumber || ''],
            ['Cargo', employee.jobTitle || ''],
            ['Tipo de contrato', employee.contractType === 'INDEFINIDO' ? '[ X ] Indefinido' : employee.contractType === 'FIJO' ? '[ X ] Término fijo' : '[ X ] Obra o labor'],
            ['Fecha de ingreso', employee.startDate || ''],
            ['Fecha de retiro / corte', employee.endDate || ''],
            ['Días laborados en el período', String(daysWorked)],
            ['Salario mensual base', formatCurrency(baseSalary)],
            ['Salario variable (promedio)', formatCurrency(variableSalary)],
            ['Auxilio de transporte', employee.includeTransportAid ? '[ X ] Sí' : '[ X ] No'],
            ['Total salario base de liquidación', formatCurrency(baseForBenefits)],
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'normal', cellWidth: 80 }, 1: { halign: 'left' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== 2. BASE DE LIQUIDACIÓN =====
    sectionHeader('2', 'BASE DE LIQUIDACIÓN');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('* Base salarial = Salario + factores salariales habituales', margin, yPos);
    yPos += 4;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario mensual', formatCurrency(baseSalary)],
            ['Recargos y Variables', formatCurrency(variableSalary)],
            ['Auxilio de transporte (si aplica)', formatCurrency(transportAid)],
        ],
        foot: [['Base para prestaciones', formatCurrency(baseForBenefits)]],
        theme: 'striped',
        headStyles: { fillColor: [230, 230, 230], textColor: primaryText, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 245, 245], textColor: primaryText, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== 3. LIQUIDACIÓN DE PRESTACIONES SOCIALES =====
    sectionHeader('3', 'LIQUIDACIÓN DE PRESTACIONES SOCIALES');

    // A. Cesantías
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('A. CESANTÍAS (Art. 249 CST)', margin, yPos);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Fórmula: (Salario base x Días trabajados) / 360', margin, yPos + 4);
    yPos += 7;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(baseForBenefits)],
            ['Días trabajados', String(daysWorked)],
        ],
        foot: [['Cesantías causadas', formatCurrency(cesantias)]],
        theme: 'striped',
        headStyles: { fillColor: [230, 230, 230], textColor: primaryText, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // B. Intereses Cesantías
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('B. INTERESES A LAS CESANTÍAS (Ley 52 de 1975)', margin, yPos);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Fórmula: (Cesantías x Días Trabajados x 12%) / 360', margin, yPos + 4);
    yPos += 7;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: [
            ['Valor cesantías', formatCurrency(cesantias)],
            ['Días causados', String(daysWorked)],
            ['Tasa', '12%'],
        ],
        foot: [['Intereses de cesantías', formatCurrency(interesesCesantias)]],
        theme: 'striped',
        headStyles: { fillColor: [230, 230, 230], textColor: primaryText, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // C. Prima de Servicios
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('C. PRIMA DE SERVICIOS (Art. 306 CST)', margin, yPos);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Fórmula: (Salario base x Días trabajados) / 360', margin, yPos + 4);
    yPos += 7;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(baseForBenefits)],
            ['Días trabajados', String(daysWorked)],
        ],
        foot: [['Prima causada', formatCurrency(prima)]],
        theme: 'striped',
        headStyles: { fillColor: [230, 230, 230], textColor: primaryText, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // D. Vacaciones
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('D. VACACIONES (Art. 186 CST)', margin, yPos);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('Fórmula: (Salario base x Días trabajados) / 720 - No incluye auxilio de transporte', margin, yPos + 4);
    yPos += 7;

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(baseSalary)],
            ['Días trabajados', String(daysWorked)],
        ],
        foot: [['Vacaciones causadas', formatCurrency(vacaciones)]],
        theme: 'striped',
        headStyles: { fillColor: [230, 230, 230], textColor: primaryText, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Check for page break
    if (yPos > 240) {
        doc.addPage();
        yPos = 15;
    }

    // ===== 4. RESUMEN GENERAL =====
    sectionHeader('4', 'RESUMEN GENERAL DE LA LIQUIDACION');

    autoTable(doc, {
        startY: yPos,
        body: [
            ['Cesantías', formatCurrency(cesantias)],
            ['Intereses de cesantías', formatCurrency(interesesCesantias)],
            ['Prima de servicios', formatCurrency(prima)],
            ['Vacaciones', formatCurrency(vacaciones)],
        ],
        foot: [['TOTAL PRESTACIONES SOCIALES', formatCurrency(totalPrestaciones)]],
        theme: 'plain',
        footStyles: { fillColor: [254, 242, 242], textColor: redText, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== 5. DESCUENTOS =====
    sectionHeader('5', 'DESCUENTOS DE NÓMINA Y RETENCIONES DEL PERIODO FINAL');

    // Build dynamic deductions body
    const deductionsBody: [string, string][] = [];
    if (loans > 0) {
        deductionsBody.push(['Préstamos y Libranzas', formatCurrency(loans)]);
    }
    if (retefuente > 0) {
        deductionsBody.push(['Retención en la Fuente (Art. 383 E.T.)', formatCurrency(retefuente)]);
    }
    if (voluntaryContributions > 0) {
        deductionsBody.push(['Aportes Voluntarios (Pensión/AFC)', formatCurrency(voluntaryContributions)]);
    }
    if (otherDeductions > 0) {
        deductionsBody.push(['Otras Deducciones', formatCurrency(otherDeductions)]);
    }
    // If no deductions, show zero row
    if (deductionsBody.length === 0) {
        deductionsBody.push(['Sin deducciones', formatCurrency(0)]);
    }

    autoTable(doc, {
        startY: yPos,
        body: deductionsBody,
        foot: [['Total descuentos del periodo', formatCurrency(totalDescuentos)]],
        theme: 'plain',
        footStyles: { textColor: redText, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== 6. NETO A PAGAR =====
    sectionHeader('6', 'NETO A PAGAR');

    autoTable(doc, {
        startY: yPos,
        body: [
            ['Total prestaciones acumuladas', formatCurrency(totalPrestaciones)],
            ['(-) Descuentos periodo final', formatCurrency(totalDescuentos)],
        ],
        foot: [['NETO A PAGAR AL TRABAJADOR', formatCurrency(netoAPagar)]],
        theme: 'plain',
        footStyles: { fillColor: greenHighlight, textColor: [22, 101, 52], fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ===== 7. FIRMAS =====
    sectionHeader('7', 'FIRMAS');
    yPos += 5;

    const signWidth = (pageWidth - margin * 2 - 20) / 2;

    // Employer box
    doc.setDrawColor(150, 150, 150);
    doc.rect(margin, yPos, signWidth, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLEADOR', margin + 5, yPos + 8);
    doc.line(margin + 5, yPos + 22, margin + signWidth - 5, yPos + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Firma', margin + 5, yPos + 27);

    // Employee box
    const empBoxX = pageWidth - margin - signWidth;
    doc.rect(empBoxX, yPos, signWidth, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TRABAJADOR', empBoxX + 5, yPos + 8);
    doc.line(empBoxX + 5, yPos + 22, empBoxX + signWidth - 5, yPos + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Firma', empBoxX + 5, yPos + 27);

    // ===== FOOTER =====
    doc.setFillColor(245, 245, 245);
    doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageWidth, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Generado con ContaBot - www.contabot.co', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });

    // Save the PDF
    const fileName = `liquidacion_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
