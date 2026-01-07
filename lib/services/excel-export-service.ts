/**
 * Excel Export Service for Accounting Entries
 * Generates professional .xlsx files with Colombian PUC format
 * With proper debit/credit balancing and colored formatting
 *
 * Using ExcelJS for secure XLSX generation (no prototype pollution vulnerabilities)
 */

import ExcelJS from 'exceljs';
import type { OCRResult } from '@/app/dashboard/gastos/types';

interface ExcelExportOptions {
    clientName: string;
    results: OCRResult[];
    includeItems?: boolean;
    includeTaxSummary?: boolean;
}

// Colombian PUC Account Codes
const PUC_ACCOUNTS = {
    PROVEEDORES: '220505',
    RETEFUENTE: '236515',
    RETEICA: '236540',
    RETEIVA: '236705',
    IVA_DESCONTABLE: '240810',
    GASTOS_DIVERSOS: '529595',
    IMPOCONSUMO: '511570',
    PROPINAS: '519595',
};

// Account descriptions
const ACCOUNT_NAMES: Record<string, string> = {
    '220505': 'Proveedores Nacionales',
    '236515': 'Retención en la Fuente por Pagar',
    '236540': 'Retención ICA por Pagar',
    '236705': 'Retención de IVA por Pagar',
    '240810': 'IVA Descontable',
    '529595': 'Gastos Diversos',
    '519530': 'Útiles, Papelería y Fotocopias',
    '513505': 'Servicios Públicos',
    '512010': 'Arrendamientos',
    '511025': 'Honorarios',
    '516515': 'Software',
    '152405': 'Equipo de Oficina',
    '511570': 'Impoconsumo',
    '519595': 'Propinas y Servicios',
};

// Color definitions (ARGB format for ExcelJS)
const COLORS = {
    HEADER_BG: '002D44',      // Dark blue header
    HEADER_TEXT: 'FFFFFF',    // White text
    DEBIT_BG: 'E8F5E9',       // Light green for debits
    CREDIT_BG: 'FFEBEE',      // Light red for credits
    TOTAL_BG: 'FFF3E0',       // Light orange for totals
    ALERT_BG: 'FFCDD2',       // Red for alerts/warnings
    TEAL_HEADER: '1AB1B1',    // Teal for items sheet
};

/**
 * Generates a professional Excel workbook with accounting entries
 */
export async function generateAccountingExcel(options: ExcelExportOptions): Promise<Blob> {
    const { results, includeItems = true, includeTaxSummary = true } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Contabio';
    workbook.created = new Date();

    // Sheet 1: Asiento Contable (Accounting Entries)
    createAccountingSheet(workbook, results);

    // Sheet 2: Detalle Items (Item Details)
    if (includeItems) {
        createItemsSheet(workbook, results);
    }

    // Sheet 3: Resumen Impuestos (Tax Summary)
    if (includeTaxSummary) {
        createTaxSummarySheet(workbook, results);
    }

    // Convert to blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Creates the main accounting entries sheet with CORRECT debit/credit logic
 */
function createAccountingSheet(workbook: ExcelJS.Workbook, results: OCRResult[]): void {
    const worksheet = workbook.addWorksheet('Asiento Contable');

    const headers = [
        'Cuenta PUC',
        'Descripción',
        'NIT Tercero',
        'Nombre Tercero',
        'Documento',
        'Fecha',
        'Moneda',
        'Débito',
        'Crédito',
        'Base Gravable',
        'IVA',
        'Tasa IVA',
        'Impoconsumo',
        'ReteFuente',
        'ReteIVA',
        'ReteICA',
        'Neto a Pagar',
        'Archivo',
        'Confianza'
    ];

    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.HEADER_BG }
        };
        cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let totalDebito = 0;
    let totalCredito = 0;

    for (const result of results) {
        const nit = result.nit || 'S/N';
        const tercero = result.entity || 'Desconocido';
        const documento = result.invoiceNumber || 'S/N';
        const fecha = result.date || '';
        const moneda = result.currency || 'COP';
        const archivo = result.fileName || '';
        const confianza = result.confidence || 0;

        // Extract retention values
        const reteFuente = result.retentions?.reteFuente || 0;
        const reteIca = result.retentions?.reteIca || 0;
        const reteIva = result.retentions?.reteIva || 0;

        // Extract tax values
        const iva = result.iva || 0;
        const impoconsumo = result.tax_inc || 0;
        const propina = result.tip || 0;
        const tasaIva = result.iva_rate || (iva > 0 ? 0.19 : 0);

        // Calculate base gravable
        let baseGravable = result.subtotal || 0;
        if (result.aiu) {
            baseGravable = result.aiu.base_gravable ||
                (result.subtotal + (result.aiu.administracion || 0) + (result.aiu.imprevistos || 0) + (result.aiu.utilidad || 0));
        }

        const netoAPagar = result.total;

        // Helper function to add a row
        const addEntryRow = (cuenta: string, descripcion: string, debito: number, credito: number) => {
            const row = worksheet.addRow([
                cuenta,
                descripcion,
                nit,
                tercero,
                documento,
                fecha,
                moneda,
                debito || '',
                credito || '',
                baseGravable,
                iva,
                tasaIva,
                impoconsumo,
                reteFuente,
                reteIva,
                reteIca,
                netoAPagar,
                archivo,
                confianza
            ]);

            // Style debit cell
            if (debito > 0) {
                row.getCell(8).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.DEBIT_BG }
                };
                row.getCell(8).font = { bold: true };
                row.getCell(8).numFmt = '"$"#,##0';
            }

            // Style credit cell
            if (credito > 0) {
                row.getCell(9).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.CREDIT_BG }
                };
                row.getCell(9).font = { bold: true };
                row.getCell(9).numFmt = '"$"#,##0';
            }

            return row;
        };

        // === DEBIT ENTRIES ===

        // 1. Expense entries from items (group by category)
        const categoryTotals = new Map<string, number>();
        let itemsTotal = 0;

        for (const item of result.items) {
            const pucMatch = item.category?.match(/\((\d+)\)/);
            const pucCode = pucMatch ? pucMatch[1] : PUC_ACCOUNTS.GASTOS_DIVERSOS;
            const current = categoryTotals.get(pucCode) || 0;
            categoryTotals.set(pucCode, current + (item.total || 0));
            itemsTotal += item.total || 0;
        }

        // If no items or items don't sum to subtotal, use subtotal
        if (categoryTotals.size === 0 || Math.abs(itemsTotal - baseGravable) > 1) {
            categoryTotals.clear();
            categoryTotals.set(PUC_ACCOUNTS.GASTOS_DIVERSOS, baseGravable);
        }

        // Add expense entries (DEBIT)
        for (const [pucCode, amount] of categoryTotals) {
            if (amount > 0) {
                const descripcion = ACCOUNT_NAMES[pucCode] || 'Gastos';
                addEntryRow(pucCode, descripcion, amount, 0);
                totalDebito += amount;
            }
        }

        // 2. IVA Descontable (DEBIT)
        if (iva > 0) {
            addEntryRow(
                PUC_ACCOUNTS.IVA_DESCONTABLE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IVA_DESCONTABLE],
                iva,
                0
            );
            totalDebito += iva;
        }

        // 3. Impoconsumo (DEBIT)
        if (impoconsumo > 0) {
            addEntryRow(
                PUC_ACCOUNTS.IMPOCONSUMO,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IMPOCONSUMO],
                impoconsumo,
                0
            );
            totalDebito += impoconsumo;
        }

        // 4. Propina (DEBIT)
        if (propina > 0) {
            addEntryRow(
                PUC_ACCOUNTS.PROPINAS,
                ACCOUNT_NAMES[PUC_ACCOUNTS.PROPINAS],
                propina,
                0
            );
            totalDebito += propina;
        }

        // === CREDIT ENTRIES ===

        // 5. Proveedores (CREDIT)
        addEntryRow(
            PUC_ACCOUNTS.PROVEEDORES,
            ACCOUNT_NAMES[PUC_ACCOUNTS.PROVEEDORES],
            0,
            netoAPagar
        );
        totalCredito += netoAPagar;

        // 6. ReteFuente (CREDIT)
        if (reteFuente > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEFUENTE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEFUENTE],
                0,
                reteFuente
            );
            totalCredito += reteFuente;
        }

        // 7. ReteICA (CREDIT)
        if (reteIca > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEICA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEICA],
                0,
                reteIca
            );
            totalCredito += reteIca;
        }

        // 8. ReteIVA (CREDIT)
        if (reteIva > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEIVA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEIVA],
                0,
                reteIva
            );
            totalCredito += reteIva;
        }

        // Add empty row between invoices
        worksheet.addRow([]);
    }

    // Add totals row
    const totalsRow = worksheet.addRow([
        '',
        'TOTALES',
        '', '', '', '', '',
        totalDebito,
        totalCredito,
        '', '', '', '', '', '', '', '', '', ''
    ]);
    totalsRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TOTAL_BG }
        };
        cell.font = { bold: true, size: 12 };
    });
    totalsRow.getCell(8).numFmt = '"$"#,##0';
    totalsRow.getCell(9).numFmt = '"$"#,##0';

    // Verify balance
    const difference = Math.round(totalDebito - totalCredito);
    if (Math.abs(difference) > 1) {
        const alertRow = worksheet.addRow([
            '',
            `⚠️ DESCUADRE: $${difference.toLocaleString('es-CO')} - Verificar datos de factura`,
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        alertRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ALERT_BG }
            };
            cell.font = { bold: true, color: { argb: 'C62828' } };
        });
    } else {
        const balancedRow = worksheet.addRow([
            '',
            '✓ CUADRADO - Débitos = Créditos',
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        balancedRow.getCell(2).font = { bold: true, color: { argb: '2E7D32' } };
    }

    // Set column widths
    worksheet.columns = [
        { width: 12 },  // Cuenta PUC
        { width: 35 },  // Descripción
        { width: 15 },  // NIT
        { width: 30 },  // Nombre Tercero
        { width: 15 },  // Documento
        { width: 12 },  // Fecha
        { width: 8 },   // Moneda
        { width: 18 },  // Débito
        { width: 18 },  // Crédito
        { width: 15 },  // Base Gravable
        { width: 12 },  // IVA
        { width: 10 },  // Tasa IVA
        { width: 12 },  // Impoconsumo
        { width: 12 },  // ReteFuente
        { width: 12 },  // ReteIVA
        { width: 12 },  // ReteICA
        { width: 15 },  // Neto a Pagar
        { width: 25 },  // Archivo
        { width: 10 },  // Confianza
    ];
}

/**
 * Creates the detailed items sheet
 */
function createItemsSheet(workbook: ExcelJS.Workbook, results: OCRResult[]): void {
    const worksheet = workbook.addWorksheet('Detalle Items');

    const headers = [
        'Proveedor',
        'NIT',
        'Factura',
        'Fecha',
        'Descripción',
        'Cantidad',
        'Unidad',
        'Precio Unitario',
        'Descuento',
        'Total',
        'Categoría PUC',
        'Archivo'
    ];

    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TEAL_HEADER }
        };
        cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT } };
        cell.alignment = { horizontal: 'center' };
    });

    for (const result of results) {
        for (const item of result.items) {
            const row = worksheet.addRow([
                result.entity || 'Desconocido',
                result.nit || 'S/N',
                result.invoiceNumber || 'S/N',
                result.date || '',
                item.description || '',
                item.quantity || 1,
                item.unitOfMeasure || 'Und',
                item.unitPrice || 0,
                item.discount || 0,
                item.total || 0,
                item.category || '',
                result.fileName || ''
            ]);

            // Format currency columns
            row.getCell(8).numFmt = '"$"#,##0';
            row.getCell(9).numFmt = '"$"#,##0';
            row.getCell(10).numFmt = '"$"#,##0';
        }
    }

    // Add totals
    const totalItems = results.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.total || 0), 0), 0);
    const totalsRow = worksheet.addRow(['', '', '', '', 'TOTAL', '', '', '', '', totalItems, '', '']);
    totalsRow.font = { bold: true };
    totalsRow.getCell(10).numFmt = '"$"#,##0';

    // Set column widths
    worksheet.columns = [
        { width: 30 },  // Proveedor
        { width: 15 },  // NIT
        { width: 15 },  // Factura
        { width: 12 },  // Fecha
        { width: 40 },  // Descripción
        { width: 10 },  // Cantidad
        { width: 8 },   // Unidad
        { width: 18 },  // Precio Unitario
        { width: 12 },  // Descuento
        { width: 18 },  // Total
        { width: 25 },  // Categoría PUC
        { width: 25 },  // Archivo
    ];
}

/**
 * Creates the tax summary sheet
 */
function createTaxSummarySheet(workbook: ExcelJS.Workbook, results: OCRResult[]): void {
    const worksheet = workbook.addWorksheet('Resumen Impuestos');

    // Aggregate tax data
    let totalSubtotal = 0;
    let totalIva = 0;
    let totalImpoconsumo = 0;
    let totalReteFuente = 0;
    let totalReteIca = 0;
    let totalReteIva = 0;
    let totalTip = 0;
    let totalAiu = { administracion: 0, imprevistos: 0, utilidad: 0 };
    let totalGrandTotal = 0;

    for (const result of results) {
        totalSubtotal += result.subtotal || 0;
        totalIva += result.iva || 0;
        totalImpoconsumo += result.tax_inc || 0;
        totalReteFuente += result.retentions?.reteFuente || 0;
        totalReteIca += result.retentions?.reteIca || 0;
        totalReteIva += result.retentions?.reteIva || 0;
        totalTip += result.tip || 0;
        totalGrandTotal += result.total || 0;

        if (result.aiu) {
            totalAiu.administracion += result.aiu.administracion || 0;
            totalAiu.imprevistos += result.aiu.imprevistos || 0;
            totalAiu.utilidad += result.aiu.utilidad || 0;
        }
    }

    const totalRetenciones = totalReteFuente + totalReteIca + totalReteIva;

    // Title
    const titleRow = worksheet.addRow(['RESUMEN DE IMPUESTOS Y RETENCIONES', '', '']);
    titleRow.font = { bold: true, size: 14, color: { argb: '002D44' } };
    worksheet.mergeCells('A1:C1');

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['Concepto', 'Base / Tasa', 'Valor']);
    headerRow.font = { bold: true };

    worksheet.addRow([]);

    const subtotalRow = worksheet.addRow(['Subtotal (Base Gravable)', '', totalSubtotal]);
    subtotalRow.getCell(3).numFmt = '"$"#,##0';

    worksheet.addRow([]);

    // AIU if present
    if (totalAiu.administracion > 0 || totalAiu.imprevistos > 0 || totalAiu.utilidad > 0) {
        const aiuRows = [
            worksheet.addRow(['AIU - Administración', '', totalAiu.administracion]),
            worksheet.addRow(['AIU - Imprevistos', '', totalAiu.imprevistos]),
            worksheet.addRow(['AIU - Utilidad', '', totalAiu.utilidad])
        ];
        aiuRows.forEach(row => { row.getCell(3).numFmt = '"$"#,##0'; });
        worksheet.addRow([]);
    }

    // Taxes section
    const taxHeader = worksheet.addRow(['IMPUESTOS (DÉBITOS)', '', '']);
    taxHeader.font = { bold: true };
    taxHeader.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.DEBIT_BG }
    };

    const ivaRow = worksheet.addRow(['IVA Descontable', '19%', totalIva]);
    ivaRow.getCell(3).numFmt = '"$"#,##0';

    if (totalImpoconsumo > 0) {
        const impoRow = worksheet.addRow(['Impoconsumo', '8%', totalImpoconsumo]);
        impoRow.getCell(3).numFmt = '"$"#,##0';
    }

    if (totalTip > 0) {
        const tipRow = worksheet.addRow(['Propina / Servicio', '', totalTip]);
        tipRow.getCell(3).numFmt = '"$"#,##0';
    }

    worksheet.addRow([]);

    // Retentions section
    const retHeader = worksheet.addRow(['RETENCIONES (CRÉDITOS)', '', '']);
    retHeader.font = { bold: true };
    retHeader.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.CREDIT_BG }
    };

    const reteFuenteRow = worksheet.addRow(['Retención en la Fuente', '2.5%', totalReteFuente]);
    reteFuenteRow.getCell(3).numFmt = '"$"#,##0';

    const reteIcaRow = worksheet.addRow(['Retención de ICA', '0.4% - 1.4%', totalReteIca]);
    reteIcaRow.getCell(3).numFmt = '"$"#,##0';

    const reteIvaRow = worksheet.addRow(['Retención de IVA', '15% del IVA', totalReteIva]);
    reteIvaRow.getCell(3).numFmt = '"$"#,##0';

    const totalRetRow = worksheet.addRow(['Total Retenciones', '', totalRetenciones]);
    totalRetRow.font = { bold: true };
    totalRetRow.getCell(3).numFmt = '"$"#,##0';

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Grand total
    const grandTotalRow = worksheet.addRow(['TOTAL FACTURADO (Neto a Pagar)', '', totalGrandTotal]);
    grandTotalRow.font = { bold: true, size: 12 };
    grandTotalRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.TOTAL_BG }
    };
    grandTotalRow.getCell(3).numFmt = '"$"#,##0';

    worksheet.addRow([]);

    const countRow = worksheet.addRow(['Número de Facturas Procesadas', '', results.length]);
    countRow.font = { italic: true };

    // Set column widths
    worksheet.columns = [
        { width: 40 },  // Concepto
        { width: 15 },  // Base / Tasa
        { width: 20 },  // Valor
    ];
}

export default generateAccountingExcel;
