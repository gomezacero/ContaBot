
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollInput, PayrollResult } from '../types';
import { calculatePayroll, formatCurrency } from './calculations';

export const generatePayrollPDF = (
    consolidatedResult: PayrollResult,
    employees: PayrollInput[]
) => {
    // Generate individual liquidation PDF for the first employee
    const emp = employees[0];
    
    // USE LIQUIDATION DATA (ANNUAL)
    const data = consolidatedResult.annual;
    // Salary data usually comes from monthly/base logic, but total accrued depends on view.
    // For liquidation base, we usually state the MONTHLY BASE.
    const monthlyData = consolidatedResult.monthly;
    
    const doc = new jsPDF();
    
    // Calculate values locally for consistency
    const valCesantias = data.employerCosts.cesantias;
    const valIntereses = data.employerCosts.interesesCesantias;
    const valPrima = data.employerCosts.prima;
    const valVacaciones = data.employerCosts.vacations;
    const totalLiquidacion = valCesantias + valIntereses + valPrima + valVacaciones;

    // Additional Deductions Logic
    const retefuente = data.employeeDeductions.retencionFuente;
    const dedParams = emp.deductionsParameters || { voluntaryPension: 0, voluntaryPensionExempt: 0, afc: 0 };
    const volPension = dedParams.voluntaryPension + dedParams.voluntaryPensionExempt;
    const afc = dedParams.afc;
    const loans = emp.loans || 0;
    const otherDeds = emp.otherDeductions || 0;
    const totalDeduccionesExtra = retefuente + volPension + afc + loans + otherDeds;
    const netoLiquidacion = totalLiquidacion - totalDeduccionesExtra;

    const getContractLabel = (type?: string) => {
        switch(type) {
            case 'INDEFINIDO': return 'Indefinido';
            case 'FIJO': return 'Término Fijo';
            case 'OBRA_LABOR': return 'Obra o Labor';
            case 'APRENDIZAJE': return 'Aprendizaje';
            default: return 'Indefinido';
        }
    };
    
    // --- Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN DE PRESTACIONES SOCIALES', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('(Colombia – Código Sustantivo del Trabajo)', 105, 26, { align: 'center' });

    let currentY = 40;

    // --- 1. DATOS GENERALES ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. DATOS GENERALES DEL TRABAJADOR', 16, currentY + 5.5);
    currentY += 10;

    // Checkbox helper
    const checked = '[ X ]';
    const unchecked = '[   ]';

    const contractTypeStr = `${emp.contractType === 'FIJO' ? checked : unchecked} Término fijo  ${emp.contractType === 'INDEFINIDO' ? checked : unchecked} Indefinido  ${emp.contractType === 'OBRA_LABOR' ? checked : unchecked} Obra o labor`;
    const transportStr = `${emp.includeTransportAid ? checked : unchecked} Sí  ${!emp.includeTransportAid ? checked : unchecked} No`;

    const generalData = [
        ['Nombre del trabajador', emp.name],
        ['Documento de identidad', emp.documentNumber || ''],
        ['Cargo', emp.jobTitle || ''],
        ['Tipo de contrato', contractTypeStr],
        ['Fecha de ingreso', emp.startDate || '2025-01-01'],
        ['Fecha de retiro / corte', emp.endDate || '2025-01-30'],
        ['Días laborados en el período', data.salaryData.daysWorked], // Use calculated days
        ['Salario mensual base', formatCurrency(monthlyData.salaryData.baseSalary)],
        ['Salario variable (promedio)', formatCurrency((monthlyData.salaryData.variables || 0) + (monthlyData.salaryData.overtime || 0))],
        ['Auxilio de transporte', transportStr],
        ['Total salario base de liquidación', formatCurrency(monthlyData.salaryData.totalAccrued)],
    ];

    autoTable(doc, {
        startY: currentY,
        body: generalData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80, fillColor: [255, 255, 255] },
            1: { cellWidth: 102 }
        },
        didParseCell: (data) => {
            if (data.row.index === 10) data.cell.styles.fontStyle = 'bold';
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 2. BASE DE LIQUIDACIÓN ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('2. BASE DE LIQUIDACIÓN', 16, currentY + 5.5);
    currentY += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('* Base salarial = Salario + factores salariales habituales', 14, currentY - 2);
    
    const baseData = [
        ['Salario mensual', formatCurrency(monthlyData.salaryData.baseSalary)],
        ['Recargos y Variables', formatCurrency((monthlyData.salaryData.variables || 0) + (monthlyData.salaryData.overtime || 0))],
        ['Auxilio de transporte (si aplica)', formatCurrency(monthlyData.salaryData.transportAid)],
        ['Base para prestaciones', formatCurrency(monthlyData.salaryData.totalAccrued - (monthlyData.salaryData.nonSalary || 0))]
    ];

    autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: baseData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data) => {
            if (data.row.index === 3) data.cell.styles.fontStyle = 'bold';
        }
    });
    
    doc.setDrawColor(0);
    doc.line(14, (doc as any).lastAutoTable.finalY, 196, (doc as any).lastAutoTable.finalY);
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 3. LIQUIDACIÓN ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. LIQUIDACIÓN DE PRESTACIONES SOCIALES', 16, currentY + 5.5);
    currentY += 12;

    // CESANTIAS
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('A. CESANTÍAS (Art. 249 CST)', 14, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Fórmula: (Salario base x Días trabajados) / 360', 14, currentY + 4);
    currentY += 6;
    
    autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(monthlyData.salaryData.totalAccrued - (monthlyData.salaryData.nonSalary || 0))],
            ['Días trabajados', data.salaryData.daysWorked],
            ['Cesantías causadas', formatCurrency(valCesantias)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9, lineColor: [200, 200, 200] },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    // INTERESES
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('B. INTERESES A LAS CESANTÍAS (Ley 52 de 1975)', 14, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Fórmula: (Cesantías x Días Trabajados x 12%) / 360', 14, currentY + 4);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
            ['Valor cesantías', formatCurrency(valCesantias)],
            ['Días causados', data.salaryData.daysWorked],
            ['Tasa', '12%'],
            ['Intereses de cesantías', formatCurrency(valIntereses)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9, lineColor: [200, 200, 200] },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Check page break
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    // PRIMA
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('C. PRIMA DE SERVICIOS (Art. 306 CST)', 14, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Fórmula: (Salario base x Días trabajados) / 360', 14, currentY + 4);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(monthlyData.salaryData.totalAccrued - (monthlyData.salaryData.nonSalary || 0))],
            ['Días trabajados', data.salaryData.daysWorked],
            ['Prima causada', formatCurrency(valPrima)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9, lineColor: [200, 200, 200] },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    // VACACIONES
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('D. VACACIONES (Art. 186 CST)', 14, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Fórmula: (Salario base x Días trabajados) / 720 - No incluye auxilio de transporte', 14, currentY + 4);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
            ['Salario base', formatCurrency(monthlyData.salaryData.baseSalary)],
            ['Días trabajados', data.salaryData.daysWorked],
            ['Vacaciones causadas', formatCurrency(valVacaciones)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9, lineColor: [200, 200, 200] },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Check page break
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    }

    // --- 4. RESUMEN GENERAL ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. RESUMEN GENERAL DE LA LIQUIDACIÓN', 16, currentY + 5.5);
    currentY += 10;

    const summaryData = [
        ['Cesantías', formatCurrency(valCesantias)],
        ['Intereses de cesantías', formatCurrency(valIntereses)],
        ['Prima de servicios', formatCurrency(valPrima)],
        ['Vacaciones', formatCurrency(valVacaciones)],
        ['TOTAL PRESTACIONES SOCIALES', formatCurrency(totalLiquidacion)]
    ];

    autoTable(doc, {
        startY: currentY,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200] },
        columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
        didParseCell: (data) => {
            if (data.row.index === 4) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 248, 255];
            }
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 5. DESCUENTOS ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.text('5. DESCUENTOS DE NÓMINA Y RETENCIONES DEL PERIODO FINAL', 16, currentY + 5.5);
    currentY += 10;

    // Build dynamic discounts array
    const discounts = [];
    if (loans > 0) discounts.push(['Préstamos y Libranzas', formatCurrency(loans)]);
    else discounts.push(['Préstamos y Libranzas', '0']);
    
    if (otherDeds > 0) discounts.push(['Otras Deducciones', formatCurrency(otherDeds)]);

    if (retefuente > 0) {
        discounts.push(['Retención en la Fuente', formatCurrency(retefuente)]);
    }
    if (volPension > 0) {
        discounts.push(['Aportes Voluntarios Pensión Obligatoria', formatCurrency(volPension)]);
    }
    if (afc > 0) {
        discounts.push(['Aportes AFC', formatCurrency(afc)]);
    }
    
    discounts.push(['Total descuentos del periodo', formatCurrency(totalDeduccionesExtra)]);

    autoTable(doc, {
        startY: currentY,
        body: discounts,
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
        didParseCell: (data) => {
            // Style the last row (Total)
            if (data.row.index === discounts.length - 1) {
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 6. NETO ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.text('6. NETO A PAGAR', 16, currentY + 5.5);
    currentY += 10;

    autoTable(doc, {
        startY: currentY,
        body: [
            ['Total prestaciones acumuladas', formatCurrency(totalLiquidacion)],
            ['(-) Descuentos periodo final', formatCurrency(totalDeduccionesExtra)],
            ['NETO A PAGAR AL TRABAJADOR', formatCurrency(netoLiquidacion)]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
        didParseCell: (data) => {
            if (data.row.index === 2) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [220, 255, 220];
            }
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;

    // --- 7. FIRMAS ---
    if (currentY > 250) {
        doc.addPage();
        currentY = 40;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.text('7. FIRMAS', 16, currentY + 5.5);
    currentY += 20;

    // Draw signature boxes
    doc.rect(20, currentY, 70, 30); // Employer Box
    doc.rect(120, currentY, 70, 30); // Worker Box

    doc.setFontSize(8);
    doc.text('EMPLEADOR', 22, currentY + 5);
    doc.text('TRABAJADOR', 122, currentY + 5);

    doc.text('Firma __________________________', 22, currentY + 25);
    doc.text('Firma __________________________', 122, currentY + 25);

    currentY += 40;

    // Legal Note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('La presente liquidación se realiza conforme al Código Sustantivo del Trabajo, y no constituye renuncia a derechos laborales irrenunciables.', 14, currentY, { maxWidth: 180 });

    doc.save('Liquidacion_Prestaciones.pdf');
};
