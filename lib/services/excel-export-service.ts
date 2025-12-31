/**
 * Excel Export Service for Accounting Entries
 * Generates professional .xlsx files with Colombian PUC format
 * With proper debit/credit balancing and colored formatting
 */

import * as XLSX from 'xlsx';
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

// Color definitions (ARGB format for xlsx)
const COLORS = {
    HEADER_BG: '002D44',      // Dark blue header
    HEADER_TEXT: 'FFFFFF',    // White text
    DEBIT_BG: 'E8F5E9',       // Light green for debits
    CREDIT_BG: 'FFEBEE',      // Light red for credits
    TOTAL_BG: 'FFF3E0',       // Light orange for totals
    ALERT_BG: 'FFCDD2',       // Red for alerts/warnings
};

/**
 * Apply cell styles to a worksheet
 */
function applyStyles(worksheet: XLSX.WorkSheet, rows: (string | number)[][], headerRowIndex: number = 0): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellRef];
            if (!cell) continue;

            // Initialize style object
            if (!cell.s) cell.s = {};

            // Header row styling
            if (R === headerRowIndex) {
                cell.s = {
                    fill: { fgColor: { rgb: COLORS.HEADER_BG } },
                    font: { bold: true, color: { rgb: COLORS.HEADER_TEXT } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }

            // Data rows - check for debit/credit columns (columns 7 and 8 are Débito and Crédito)
            if (R > headerRowIndex) {
                const rowData = rows[R];
                if (rowData) {
                    // Débito column (index 7)
                    if (C === 7 && typeof rowData[7] === 'number' && rowData[7] > 0) {
                        cell.s = {
                            fill: { fgColor: { rgb: COLORS.DEBIT_BG } },
                            font: { bold: true },
                            numFmt: '"$"#,##0'
                        };
                    }
                    // Crédito column (index 8)
                    if (C === 8 && typeof rowData[8] === 'number' && rowData[8] > 0) {
                        cell.s = {
                            fill: { fgColor: { rgb: COLORS.CREDIT_BG } },
                            font: { bold: true },
                            numFmt: '"$"#,##0'
                        };
                    }
                    // TOTALES row
                    if (rowData[1] === 'TOTALES') {
                        cell.s = {
                            fill: { fgColor: { rgb: COLORS.TOTAL_BG } },
                            font: { bold: true, sz: 12 }
                        };
                    }
                    // DESCUADRE row
                    if (typeof rowData[1] === 'string' && rowData[1].includes('DESCUADRE')) {
                        cell.s = {
                            fill: { fgColor: { rgb: COLORS.ALERT_BG } },
                            font: { bold: true, color: { rgb: 'C62828' } }
                        };
                    }
                }
            }

            // Number formatting for currency columns
            if (typeof cell.v === 'number' && C >= 7 && C <= 16) {
                cell.z = '"$"#,##0';
            }
            // Percentage formatting for Tasa IVA and Confianza
            if (typeof cell.v === 'number' && (C === 11 || C === 18)) {
                cell.z = '0.00%';
            }
        }
    }
}

/**
 * Generates a professional Excel workbook with accounting entries
 */
export function generateAccountingExcel(options: ExcelExportOptions): Blob {
    const { results, includeItems = true, includeTaxSummary = true } = options;

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Asiento Contable (Accounting Entries)
    const { sheet: accountingSheet, rows: accountingRows } = createAccountingSheet(results);
    XLSX.utils.book_append_sheet(workbook, accountingSheet, 'Asiento Contable');

    // Sheet 2: Detalle Items (Item Details)
    if (includeItems) {
        const { sheet: itemsSheet } = createItemsSheet(results);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Detalle Items');
    }

    // Sheet 3: Resumen Impuestos (Tax Summary)
    if (includeTaxSummary) {
        const { sheet: taxSheet } = createTaxSummarySheet(results);
        XLSX.utils.book_append_sheet(workbook, taxSheet, 'Resumen Impuestos');
    }

    // Convert to blob
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Creates the main accounting entries sheet with CORRECT debit/credit logic
 *
 * ACCOUNTING EQUATION:
 * DÉBITOS = Gastos + IVA Descontable + Impoconsumo + Propina
 * CRÉDITOS = Proveedores (neto a pagar) + Retenciones
 *
 * Where: Neto a Pagar = Total de factura (which already has retentions deducted)
 */
function createAccountingSheet(results: OCRResult[]): { sheet: XLSX.WorkSheet; rows: (string | number)[][] } {
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

    const rows: (string | number)[][] = [headers];
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
        const totalRetenciones = reteFuente + reteIca + reteIva;

        // Extract tax values
        const iva = result.iva || 0;
        const impoconsumo = result.tax_inc || 0;
        const propina = result.tip || 0;
        const tasaIva = result.iva_rate || (iva > 0 ? 0.19 : 0);

        // Calculate base gravable (considering AIU if present)
        let baseGravable = result.subtotal || 0;
        if (result.aiu) {
            baseGravable = result.aiu.base_gravable ||
                (result.subtotal + (result.aiu.administracion || 0) + (result.aiu.imprevistos || 0) + (result.aiu.utilidad || 0));
        }

        // IMPORTANT: result.total is already the NET amount payable (retentions already deducted)
        // Formula: Total = Subtotal + IVA + Impoconsumo + Propina - Retenciones
        const netoAPagar = result.total;

        // Helper function to create a row
        const createRow = (cuenta: string, descripcion: string, debito: number, credito: number) => [
            cuenta,
            descripcion,
            nit,
            tercero,
            documento,
            fecha,
            moneda,
            debito,
            credito,
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
        ];

        // === DEBIT ENTRIES (what we received/consumed) ===

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
                rows.push(createRow(pucCode, descripcion, amount, 0));
                totalDebito += amount;
            }
        }

        // 2. IVA Descontable (DEBIT) - tax credit
        if (iva > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.IVA_DESCONTABLE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IVA_DESCONTABLE],
                iva,
                0
            ));
            totalDebito += iva;
        }

        // 3. Impoconsumo (DEBIT) - it's a non-deductible expense
        if (impoconsumo > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.IMPOCONSUMO,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IMPOCONSUMO],
                impoconsumo,
                0
            ));
            totalDebito += impoconsumo;
        }

        // 4. Propina/Service (DEBIT) - it's an expense
        if (propina > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.PROPINAS,
                ACCOUNT_NAMES[PUC_ACCOUNTS.PROPINAS],
                propina,
                0
            ));
            totalDebito += propina;
        }

        // === CREDIT ENTRIES (our obligations) ===

        // 5. Proveedores (CREDIT) - what we owe to the vendor (net of retentions)
        rows.push(createRow(
            PUC_ACCOUNTS.PROVEEDORES,
            ACCOUNT_NAMES[PUC_ACCOUNTS.PROVEEDORES],
            0,
            netoAPagar
        ));
        totalCredito += netoAPagar;

        // 6. ReteFuente (CREDIT) - obligation to DIAN
        if (reteFuente > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.RETEFUENTE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEFUENTE],
                0,
                reteFuente
            ));
            totalCredito += reteFuente;
        }

        // 7. ReteICA (CREDIT) - obligation to municipality
        if (reteIca > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.RETEICA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEICA],
                0,
                reteIca
            ));
            totalCredito += reteIca;
        }

        // 8. ReteIVA (CREDIT)
        if (reteIva > 0) {
            rows.push(createRow(
                PUC_ACCOUNTS.RETEIVA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEIVA],
                0,
                reteIva
            ));
            totalCredito += reteIva;
        }

        // Add empty row between invoices for readability
        rows.push(Array(headers.length).fill(''));
    }

    // Add totals row
    rows.push([
        '',
        'TOTALES',
        '',
        '',
        '',
        '',
        '',
        totalDebito,
        totalCredito,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    ]);

    // Verify balance and add warning if unbalanced
    const difference = Math.round(totalDebito - totalCredito);
    if (Math.abs(difference) > 1) {
        rows.push([
            '',
            `⚠️ DESCUADRE: $${difference.toLocaleString('es-CO')} - Verificar datos de factura`,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
    } else {
        rows.push([
            '',
            '✓ CUADRADO - Débitos = Créditos',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 12 },  // Cuenta PUC
        { wch: 35 },  // Descripción
        { wch: 15 },  // NIT
        { wch: 30 },  // Nombre Tercero
        { wch: 15 },  // Documento
        { wch: 12 },  // Fecha
        { wch: 8 },   // Moneda
        { wch: 18 },  // Débito
        { wch: 18 },  // Crédito
        { wch: 15 },  // Base Gravable
        { wch: 12 },  // IVA
        { wch: 10 },  // Tasa IVA
        { wch: 12 },  // Impoconsumo
        { wch: 12 },  // ReteFuente
        { wch: 12 },  // ReteIVA
        { wch: 12 },  // ReteICA
        { wch: 15 },  // Neto a Pagar
        { wch: 25 },  // Archivo
        { wch: 10 },  // Confianza
    ];

    // Apply styles
    applyStyles(worksheet, rows, 0);

    return { sheet: worksheet, rows };
}

/**
 * Creates the detailed items sheet with colors
 */
function createItemsSheet(results: OCRResult[]): { sheet: XLSX.WorkSheet; rows: (string | number)[][] } {
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

    const rows: (string | number)[][] = [headers];

    for (const result of results) {
        for (const item of result.items) {
            rows.push([
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
        }
    }

    // Add totals
    const totalItems = results.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.total || 0), 0), 0);
    rows.push(['', '', '', '', 'TOTAL', '', '', '', '', totalItems, '', '']);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = [
        { wch: 30 },  // Proveedor
        { wch: 15 },  // NIT
        { wch: 15 },  // Factura
        { wch: 12 },  // Fecha
        { wch: 40 },  // Descripción
        { wch: 10 },  // Cantidad
        { wch: 8 },   // Unidad
        { wch: 18 },  // Precio Unitario
        { wch: 12 },  // Descuento
        { wch: 18 },  // Total
        { wch: 25 },  // Categoría PUC
        { wch: 25 },  // Archivo
    ];

    // Apply header styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
        const cell = worksheet[cellRef];
        if (cell) {
            cell.s = {
                fill: { fgColor: { rgb: '1AB1B1' } }, // Teal header
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                alignment: { horizontal: 'center' }
            };
        }
    }

    return { sheet: worksheet, rows };
}

/**
 * Creates the tax summary sheet with colors
 */
function createTaxSummarySheet(results: OCRResult[]): { sheet: XLSX.WorkSheet; rows: (string | number)[][] } {
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

    const rows: (string | number)[][] = [
        ['RESUMEN DE IMPUESTOS Y RETENCIONES', '', ''],
        ['', '', ''],
        ['Concepto', 'Base / Tasa', 'Valor'],
        ['', '', ''],
        ['Subtotal (Base Gravable)', '', totalSubtotal],
        ['', '', ''],
    ];

    // AIU if present
    if (totalAiu.administracion > 0 || totalAiu.imprevistos > 0 || totalAiu.utilidad > 0) {
        rows.push(['AIU - Administración', '', totalAiu.administracion]);
        rows.push(['AIU - Imprevistos', '', totalAiu.imprevistos]);
        rows.push(['AIU - Utilidad', '', totalAiu.utilidad]);
        rows.push(['', '', '']);
    }

    // Taxes (green section)
    rows.push(['IMPUESTOS (DÉBITOS)', '', '']);
    rows.push(['IVA Descontable', '19%', totalIva]);
    if (totalImpoconsumo > 0) {
        rows.push(['Impoconsumo', '8%', totalImpoconsumo]);
    }
    if (totalTip > 0) {
        rows.push(['Propina / Servicio', '', totalTip]);
    }
    rows.push(['', '', '']);

    // Retentions (red section)
    rows.push(['RETENCIONES (CRÉDITOS)', '', '']);
    rows.push(['Retención en la Fuente', '2.5%', totalReteFuente]);
    rows.push(['Retención de ICA', '0.4% - 1.4%', totalReteIca]);
    rows.push(['Retención de IVA', '15% del IVA', totalReteIva]);
    rows.push(['Total Retenciones', '', totalRetenciones]);
    rows.push(['', '', '']);

    // Totals
    rows.push(['', '', '']);
    rows.push(['TOTAL FACTURADO (Neto a Pagar)', '', totalGrandTotal]);
    rows.push(['', '', '']);
    rows.push(['Número de Facturas Procesadas', '', results.length]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet['!cols'] = [
        { wch: 40 },  // Concepto
        { wch: 15 },  // Base / Tasa
        { wch: 20 },  // Valor
    ];

    // Apply styles to header
    const headerCell = worksheet['A1'];
    if (headerCell) {
        headerCell.s = {
            font: { bold: true, sz: 14, color: { rgb: '002D44' } }
        };
    }

    return { sheet: worksheet, rows };
}

export default generateAccountingExcel;
