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

// Color palette for professional design (ARGB format for ExcelJS)
const COLORS = {
    // Header colors by category
    HEADER_MAIN: '1F4E79',        // Dark blue - main headers
    HEADER_TERCEROS: '2E7D32',    // Dark green - vendor info
    HEADER_DOCS: '6A1B9A',        // Purple - document info
    HEADER_FECHAS: 'E65100',      // Orange - dates
    HEADER_CALCULOS: '00695C',    // Teal - calculations
    HEADER_TEXT: 'FFFFFF',        // White text

    // Row colors
    DEBIT_BG: 'E8F5E9',           // Light green for debits
    CREDIT_BG: 'FFEBEE',          // Light red for credits
    ZEBRA_LIGHT: 'F5F5F5',        // Light gray for alternating rows
    ZEBRA_WHITE: 'FFFFFF',        // White

    // Status colors
    TOTAL_BG: '1565C0',           // Blue for totals
    TOTAL_TEXT: 'FFFFFF',         // White text
    SUCCESS_BG: 'C8E6C9',         // Light green for success
    SUCCESS_TEXT: '1B5E20',       // Dark green text
    ALERT_BG: 'FFCDD2',           // Light red for alerts
    ALERT_TEXT: 'B71C1C',         // Dark red text
    WARNING_BG: 'FFF3E0',         // Light orange for warnings
    WARNING_TEXT: 'E65100',       // Dark orange text

    // Currency distinction
    COP_TEXT: '1565C0',           // Blue for COP
    USD_TEXT: '2E7D32',           // Green for USD

    // Items sheet
    TEAL_HEADER: '00897B',        // Teal for items sheet
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
 *
 * ACCOUNTING LOGIC:
 * ================
 * For a purchase invoice, the accounting entry is:
 *
 * DEBITS (Assets increase, Expenses):
 * - Gastos/Compras (Subtotal - base gravable)
 * - IVA Descontable (IVA amount)
 * - Impoconsumo (if applicable)
 * - Propina (if applicable)
 *
 * CREDITS (Liabilities increase):
 * - Proveedores Nacionales (Net amount to pay = Total)
 * - Retención en la Fuente (if applicable)
 * - Retención ICA (if applicable)
 * - Retención IVA (if applicable)
 *
 * BALANCE CHECK:
 * Subtotal + IVA + Impoconsumo + Propina = Total + ReteFuente + ReteICA + ReteIVA
 */
function createAccountingSheet(workbook: ExcelJS.Workbook, results: OCRResult[]): void {
    const worksheet = workbook.addWorksheet('Asiento Contable');

    // Define header groups with their colors
    const headerGroups = [
        { cols: [1, 2], name: 'CUENTA', color: COLORS.HEADER_MAIN },
        { cols: [3, 4], name: 'TERCERO', color: COLORS.HEADER_TERCEROS },
        { cols: [5, 6, 7], name: 'DOCUMENTO', color: COLORS.HEADER_DOCS },
        { cols: [8, 9], name: 'MOVIMIENTO', color: COLORS.HEADER_CALCULOS },
        { cols: [10, 11, 12, 13], name: 'IMPUESTOS', color: COLORS.HEADER_FECHAS },
        { cols: [14, 15, 16], name: 'RETENCIONES', color: COLORS.HEADER_CALCULOS },
        { cols: [17, 18, 19], name: 'REFERENCIAS', color: COLORS.HEADER_MAIN },
    ];

    const headers = [
        'Cuenta PUC',      // 1
        'Descripción',     // 2
        'NIT Tercero',     // 3
        'Nombre Tercero',  // 4
        'Documento',       // 5
        'Fecha',           // 6
        'Moneda',          // 7
        'Débito',          // 8
        'Crédito',         // 9
        'Base Gravable',   // 10
        'IVA',             // 11
        'Tasa IVA',        // 12
        'Impoconsumo',     // 13
        'ReteFuente',      // 14
        'ReteIVA',         // 15
        'ReteICA',         // 16
        'Neto a Pagar',    // 17
        'Archivo',         // 18
        'Confianza'        // 19
    ];

    // Add header row with grouped colors
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;

    headers.forEach((_, idx) => {
        const colNum = idx + 1;
        const cell = headerRow.getCell(colNum);
        const group = headerGroups.find(g => g.cols.includes(colNum));
        const bgColor = group ? group.color : COLORS.HEADER_MAIN;

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
        };
    });

    let totalDebito = 0;
    let totalCredito = 0;
    let rowIndex = 1; // For zebra striping

    for (const result of results) {
        const nit = result.nit || 'S/N';
        const tercero = result.entity || 'Desconocido';
        const documento = result.invoiceNumber || 'S/N';
        const fecha = result.date || '';
        const moneda = result.currency || 'COP';
        const archivo = result.fileName || '';
        const confianza = result.confidence || 0;

        // Extract retention values (these are CREDITS - reduce amount to pay)
        const reteFuente = result.retentions?.reteFuente || 0;
        const reteIca = result.retentions?.reteIca || 0;
        const reteIva = result.retentions?.reteIva || 0;
        const totalRetenciones = reteFuente + reteIca + reteIva;

        // Extract tax values (these are part of DEBITS - increase cost)
        const iva = result.iva || 0;
        const impoconsumo = result.tax_inc || 0;
        const propina = result.tip || 0;
        const tasaIva = result.iva_rate || (iva > 0 ? 0.19 : 0);

        // Calculate subtotal (base gravable before taxes)
        let subtotal = result.subtotal || 0;

        // Handle AIU (Administración, Imprevistos, Utilidad) if present
        let aiuTotal = 0;
        if (result.aiu) {
            aiuTotal = (result.aiu.administracion || 0) +
                (result.aiu.imprevistos || 0) +
                (result.aiu.utilidad || 0);
            // For AIU contracts, base gravable includes AIU
            if (result.aiu.base_gravable) {
                subtotal = result.aiu.base_gravable;
            }
        }

        // Net amount to pay to vendor (already has retentions deducted)
        const netoAPagar = result.total;

        // VALIDATION: Check if the numbers add up
        // Expected: Subtotal + AIU + IVA + Impoconsumo + Propina - Retenciones = Total
        const expectedTotal = subtotal + aiuTotal + iva + impoconsumo + propina - totalRetenciones;
        const hasDiscrepancy = Math.abs(expectedTotal - netoAPagar) > 1;

        // Helper function to add a row with zebra striping and formatting
        const addEntryRow = (
            cuenta: string,
            descripcion: string,
            debito: number,
            credito: number,
            isFirstOfInvoice: boolean = false
        ) => {
            const zebraColor = rowIndex % 2 === 0 ? COLORS.ZEBRA_LIGHT : COLORS.ZEBRA_WHITE;
            rowIndex++;

            const row = worksheet.addRow([
                cuenta,
                descripcion,
                isFirstOfInvoice ? nit : '',
                isFirstOfInvoice ? tercero : '',
                isFirstOfInvoice ? documento : '',
                isFirstOfInvoice ? fecha : '',
                isFirstOfInvoice ? moneda : '',
                debito || '',
                credito || '',
                isFirstOfInvoice ? subtotal : '',
                isFirstOfInvoice ? iva : '',
                isFirstOfInvoice ? tasaIva : '',
                isFirstOfInvoice ? impoconsumo : '',
                isFirstOfInvoice ? reteFuente : '',
                isFirstOfInvoice ? reteIva : '',
                isFirstOfInvoice ? reteIca : '',
                isFirstOfInvoice ? netoAPagar : '',
                isFirstOfInvoice ? archivo : '',
                isFirstOfInvoice ? confianza : ''
            ]);

            // Apply zebra striping
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: zebraColor }
                };
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'CCCCCC' } }
                };
            });

            // Style debit cell (green background)
            if (debito > 0) {
                row.getCell(8).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.DEBIT_BG }
                };
                row.getCell(8).font = { bold: true, color: { argb: '1B5E20' } };
                row.getCell(8).numFmt = '"$"#,##0';
                row.getCell(8).alignment = { horizontal: 'right' };
            }

            // Style credit cell (red background)
            if (credito > 0) {
                row.getCell(9).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.CREDIT_BG }
                };
                row.getCell(9).font = { bold: true, color: { argb: 'B71C1C' } };
                row.getCell(9).numFmt = '"$"#,##0';
                row.getCell(9).alignment = { horizontal: 'right' };
            }

            // Format currency cells
            [10, 11, 13, 14, 15, 16, 17].forEach(col => {
                const cell = row.getCell(col);
                if (cell.value && typeof cell.value === 'number') {
                    cell.numFmt = '"$"#,##0';
                    cell.alignment = { horizontal: 'right' };
                }
            });

            // Format percentage
            if (row.getCell(12).value) {
                row.getCell(12).numFmt = '0%';
                row.getCell(12).alignment = { horizontal: 'center' };
            }

            // Format confidence as percentage
            if (row.getCell(19).value) {
                row.getCell(19).numFmt = '0%';
                row.getCell(19).alignment = { horizontal: 'center' };
            }

            // Color code currency (COP blue, USD green)
            if (isFirstOfInvoice) {
                const currencyColor = moneda === 'USD' ? COLORS.USD_TEXT : COLORS.COP_TEXT;
                row.getCell(7).font = { bold: true, color: { argb: currencyColor } };
            }

            return row;
        };

        let isFirst = true;

        // === DEBIT ENTRIES (Expenses/Assets that increase) ===

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

        // If no items or items don't sum correctly, use subtotal as single expense
        if (categoryTotals.size === 0 || Math.abs(itemsTotal - subtotal) > 1) {
            categoryTotals.clear();
            categoryTotals.set(PUC_ACCOUNTS.GASTOS_DIVERSOS, subtotal);
        }

        // Add expense entries (DEBIT)
        for (const [pucCode, amount] of categoryTotals) {
            if (amount > 0) {
                const descripcion = ACCOUNT_NAMES[pucCode] || 'Gastos Diversos';
                addEntryRow(pucCode, descripcion, amount, 0, isFirst);
                totalDebito += amount;
                isFirst = false;
            }
        }

        // 2. IVA Descontable (DEBIT - asset that increases)
        if (iva > 0) {
            addEntryRow(
                PUC_ACCOUNTS.IVA_DESCONTABLE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IVA_DESCONTABLE],
                iva,
                0,
                isFirst
            );
            totalDebito += iva;
            isFirst = false;
        }

        // 3. Impoconsumo (DEBIT - expense)
        if (impoconsumo > 0) {
            addEntryRow(
                PUC_ACCOUNTS.IMPOCONSUMO,
                ACCOUNT_NAMES[PUC_ACCOUNTS.IMPOCONSUMO],
                impoconsumo,
                0,
                isFirst
            );
            totalDebito += impoconsumo;
            isFirst = false;
        }

        // 4. Propina (DEBIT - expense)
        if (propina > 0) {
            addEntryRow(
                PUC_ACCOUNTS.PROPINAS,
                ACCOUNT_NAMES[PUC_ACCOUNTS.PROPINAS],
                propina,
                0,
                isFirst
            );
            totalDebito += propina;
            isFirst = false;
        }

        // === CREDIT ENTRIES (Liabilities that increase) ===

        // 5. Proveedores - Net amount to pay (CREDIT)
        addEntryRow(
            PUC_ACCOUNTS.PROVEEDORES,
            ACCOUNT_NAMES[PUC_ACCOUNTS.PROVEEDORES],
            0,
            netoAPagar,
            isFirst
        );
        totalCredito += netoAPagar;
        isFirst = false;

        // 6. ReteFuente (CREDIT - liability to pay to DIAN)
        if (reteFuente > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEFUENTE,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEFUENTE],
                0,
                reteFuente,
                isFirst
            );
            totalCredito += reteFuente;
            isFirst = false;
        }

        // 7. ReteICA (CREDIT - liability to pay to municipality)
        if (reteIca > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEICA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEICA],
                0,
                reteIca,
                isFirst
            );
            totalCredito += reteIca;
            isFirst = false;
        }

        // 8. ReteIVA (CREDIT - liability to pay to DIAN)
        if (reteIva > 0) {
            addEntryRow(
                PUC_ACCOUNTS.RETEIVA,
                ACCOUNT_NAMES[PUC_ACCOUNTS.RETEIVA],
                0,
                reteIva,
                isFirst
            );
            totalCredito += reteIva;
        }

        // Add warning row if there's a discrepancy for this invoice
        if (hasDiscrepancy) {
            const discrepancy = Math.round(expectedTotal - netoAPagar);
            const warningRow = worksheet.addRow([
                '⚠️',
                `Diferencia en factura ${documento}: $${Math.abs(discrepancy).toLocaleString('es-CO')}`,
                '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            warningRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.WARNING_BG }
                };
                cell.font = { italic: true, color: { argb: COLORS.WARNING_TEXT }, size: 9 };
            });
            rowIndex++;
        }
    }

    // Add separator before totals
    worksheet.addRow([]);

    // Add totals row with prominent styling
    const totalsRow = worksheet.addRow([
        '',
        'TOTALES',
        '', '', '', '', '',
        totalDebito,
        totalCredito,
        '', '', '', '', '', '', '', '', '', ''
    ]);

    totalsRow.height = 28;
    totalsRow.eachCell((cell, colNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TOTAL_BG }
        };
        cell.font = { bold: true, color: { argb: COLORS.TOTAL_TEXT }, size: 12 };
        cell.border = {
            top: { style: 'double', color: { argb: '000000' } },
            bottom: { style: 'double', color: { argb: '000000' } }
        };
        if (colNumber === 8 || colNumber === 9) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
    });
    totalsRow.getCell(8).numFmt = '"$"#,##0';
    totalsRow.getCell(9).numFmt = '"$"#,##0';

    // Verify balance and add status row
    const difference = Math.round(totalDebito - totalCredito);

    if (Math.abs(difference) > 1) {
        const alertRow = worksheet.addRow([
            '✗',
            `DESCUADRE: $${Math.abs(difference).toLocaleString('es-CO')} - Verificar datos de factura`,
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        alertRow.height = 24;
        alertRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ALERT_BG }
            };
            cell.font = { bold: true, color: { argb: COLORS.ALERT_TEXT }, size: 11 };
        });
        alertRow.getCell(1).font = { bold: true, color: { argb: COLORS.ALERT_TEXT }, size: 14 };
    } else {
        const balancedRow = worksheet.addRow([
            '✓',
            'CUADRADO - Débitos = Créditos',
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        balancedRow.height = 24;
        balancedRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.SUCCESS_BG }
            };
            cell.font = { bold: true, color: { argb: COLORS.SUCCESS_TEXT }, size: 11 };
        });
        balancedRow.getCell(1).font = { bold: true, color: { argb: COLORS.SUCCESS_TEXT }, size: 14 };
    }

    // Set column widths
    worksheet.columns = [
        { width: 12 },  // 1. Cuenta PUC
        { width: 32 },  // 2. Descripción
        { width: 14 },  // 3. NIT
        { width: 28 },  // 4. Nombre Tercero
        { width: 14 },  // 5. Documento
        { width: 11 },  // 6. Fecha
        { width: 8 },   // 7. Moneda
        { width: 16 },  // 8. Débito
        { width: 16 },  // 9. Crédito
        { width: 14 },  // 10. Base Gravable
        { width: 12 },  // 11. IVA
        { width: 9 },   // 12. Tasa IVA
        { width: 12 },  // 13. Impoconsumo
        { width: 12 },  // 14. ReteFuente
        { width: 10 },  // 15. ReteIVA
        { width: 10 },  // 16. ReteICA
        { width: 14 },  // 17. Neto a Pagar
        { width: 28 },  // 18. Archivo
        { width: 10 },  // 19. Confianza
    ];

    // Freeze first row (headers)
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Add auto-filter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'S1'
    };
}

/**
 * Creates the detailed items sheet with improved design
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
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TEAL_HEADER }
        };
        cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
        };
    });

    let rowIndex = 0;
    let grandTotal = 0;

    for (const result of results) {
        for (const item of result.items) {
            const zebraColor = rowIndex % 2 === 0 ? COLORS.ZEBRA_LIGHT : COLORS.ZEBRA_WHITE;
            rowIndex++;

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

            // Apply zebra striping
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: zebraColor }
                };
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'DDDDDD' } }
                };
            });

            // Format currency columns
            row.getCell(8).numFmt = '"$"#,##0';
            row.getCell(8).alignment = { horizontal: 'right' };
            row.getCell(9).numFmt = '"$"#,##0';
            row.getCell(9).alignment = { horizontal: 'right' };
            row.getCell(10).numFmt = '"$"#,##0';
            row.getCell(10).alignment = { horizontal: 'right' };
            row.getCell(10).font = { bold: true };

            // Center quantity and unit
            row.getCell(6).alignment = { horizontal: 'center' };
            row.getCell(7).alignment = { horizontal: 'center' };

            grandTotal += item.total || 0;
        }
    }

    // Add totals row
    worksheet.addRow([]);
    const totalsRow = worksheet.addRow(['', '', '', '', 'TOTAL', '', '', '', '', grandTotal, '', '']);
    totalsRow.height = 24;
    totalsRow.eachCell((cell, colNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TOTAL_BG }
        };
        cell.font = { bold: true, color: { argb: COLORS.TOTAL_TEXT }, size: 11 };
        if (colNumber === 10) {
            cell.numFmt = '"$"#,##0';
            cell.alignment = { horizontal: 'right' };
        }
    });

    // Set column widths
    worksheet.columns = [
        { width: 28 },  // Proveedor
        { width: 14 },  // NIT
        { width: 14 },  // Factura
        { width: 11 },  // Fecha
        { width: 40 },  // Descripción
        { width: 10 },  // Cantidad
        { width: 8 },   // Unidad
        { width: 16 },  // Precio Unitario
        { width: 12 },  // Descuento
        { width: 16 },  // Total
        { width: 24 },  // Categoría PUC
        { width: 26 },  // Archivo
    ];

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter
    worksheet.autoFilter = {
        from: 'A1',
        to: 'L1'
    };
}

/**
 * Creates the tax summary sheet with improved design
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
    const totalTaxes = totalIva + totalImpoconsumo + totalTip;

    // Title
    const titleRow = worksheet.addRow(['RESUMEN DE IMPUESTOS Y RETENCIONES']);
    titleRow.height = 30;
    titleRow.font = { bold: true, size: 16, color: { argb: COLORS.HEADER_MAIN } };
    worksheet.mergeCells('A1:C1');
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);

    // Summary statistics row
    const statsRow = worksheet.addRow([
        `Facturas Procesadas: ${results.length}`,
        '',
        `Fecha: ${new Date().toLocaleDateString('es-CO')}`
    ]);
    statsRow.font = { italic: true, size: 10, color: { argb: '666666' } };

    worksheet.addRow([]);

    // Add a styled section header
    const addSectionHeader = (text: string, bgColor: string) => {
        const row = worksheet.addRow([text, '', '']);
        row.height = 24;
        row.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_TEXT } };
        row.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        row.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        row.getCell(3).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
        };
        worksheet.mergeCells(row.number, 1, row.number, 3);
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    };

    // Add a data row with formatting
    const addDataRow = (label: string, rate: string, value: number, isTotal: boolean = false) => {
        const row = worksheet.addRow([label, rate, value]);
        row.getCell(3).numFmt = '"$"#,##0';
        row.getCell(3).alignment = { horizontal: 'right' };

        if (isTotal) {
            row.font = { bold: true, size: 11 };
            row.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ZEBRA_LIGHT }
            };
            row.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ZEBRA_LIGHT }
            };
            row.getCell(3).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ZEBRA_LIGHT }
            };
        }
        return row;
    };

    // Column headers
    const colHeaderRow = worksheet.addRow(['Concepto', 'Base / Tasa', 'Valor']);
    colHeaderRow.font = { bold: true };
    colHeaderRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.ZEBRA_LIGHT }
        };
        cell.border = {
            bottom: { style: 'thin', color: { argb: '000000' } }
        };
    });

    worksheet.addRow([]);

    // Base section
    addDataRow('Subtotal (Base Gravable)', '', totalSubtotal, true);

    worksheet.addRow([]);

    // AIU if present
    if (totalAiu.administracion > 0 || totalAiu.imprevistos > 0 || totalAiu.utilidad > 0) {
        addSectionHeader('AIU (Administración, Imprevistos, Utilidad)', '7B1FA2');
        addDataRow('Administración', '', totalAiu.administracion);
        addDataRow('Imprevistos', '', totalAiu.imprevistos);
        addDataRow('Utilidad', '', totalAiu.utilidad);
        worksheet.addRow([]);
    }

    // Taxes section (DEBITS)
    addSectionHeader('IMPUESTOS (DÉBITOS)', '2E7D32');
    addDataRow('IVA Descontable', '19%', totalIva);

    if (totalImpoconsumo > 0) {
        addDataRow('Impoconsumo', '8%', totalImpoconsumo);
    }

    if (totalTip > 0) {
        addDataRow('Propina / Servicio', '', totalTip);
    }

    addDataRow('Total Impuestos', '', totalTaxes, true);

    worksheet.addRow([]);

    // Retentions section (CREDITS)
    addSectionHeader('RETENCIONES (CRÉDITOS)', 'C62828');
    addDataRow('Retención en la Fuente', '2.5%', totalReteFuente);
    addDataRow('Retención de ICA', '0.4% - 1.4%', totalReteIca);
    addDataRow('Retención de IVA', '15% del IVA', totalReteIva);
    addDataRow('Total Retenciones', '', totalRetenciones, true);

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Grand total with prominent styling
    const grandTotalRow = worksheet.addRow(['TOTAL FACTURADO (Neto a Pagar)', '', totalGrandTotal]);
    grandTotalRow.height = 28;
    grandTotalRow.font = { bold: true, size: 13, color: { argb: COLORS.HEADER_TEXT } };
    grandTotalRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.TOTAL_BG }
        };
    });
    grandTotalRow.getCell(3).numFmt = '"$"#,##0';
    grandTotalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.mergeCells(grandTotalRow.number, 1, grandTotalRow.number, 2);

    worksheet.addRow([]);

    // Validation summary
    const expectedDebit = totalSubtotal + totalIva + totalImpoconsumo + totalTip +
        totalAiu.administracion + totalAiu.imprevistos + totalAiu.utilidad;
    const expectedCredit = totalGrandTotal + totalRetenciones;
    const diff = Math.round(expectedDebit - expectedCredit);

    if (Math.abs(diff) <= 1) {
        const validRow = worksheet.addRow(['✓ Asiento contable cuadrado', '', '']);
        validRow.font = { bold: true, color: { argb: COLORS.SUCCESS_TEXT } };
    } else {
        const invalidRow = worksheet.addRow([`⚠️ Diferencia detectada: $${Math.abs(diff).toLocaleString('es-CO')}`, '', '']);
        invalidRow.font = { bold: true, color: { argb: COLORS.ALERT_TEXT } };
    }

    // Set column widths
    worksheet.columns = [
        { width: 40 },  // Concepto
        { width: 15 },  // Base / Tasa
        { width: 20 },  // Valor
    ];
}

export default generateAccountingExcel;
