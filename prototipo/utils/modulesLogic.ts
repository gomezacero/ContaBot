import { UVT_2025 } from "../constants";
import { 
  SmartExpenseResult, 
  ExogenaAuditResult,
  ThirdPartyIssue,
  TaxCrossCheck,
  MinorAmountGroup
} from "../types";

// --- MODULE 1: SMART EXPENSE LOGIC ---
export const processSmartDocument = (file: File): Promise<SmartExpenseResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileName = file.name.toLowerCase();
      const isSpreadsheet = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (isSpreadsheet) {
        // Mock Response for Excel/CSV
        const items = [
            { description: "Licencias Software Adobe", qty: 5, unitPrice: 120000, total: 600000, category: "Software" },
            { description: "Mantenimiento AC - Sede Norte", qty: 1, unitPrice: 450000, total: 450000, category: "Mantenimiento" },
            { description: "Servicio de Vigilancia", qty: 1, unitPrice: 2100000, total: 2100000, category: "Servicios" },
            { description: "Papelería Trimestre 1", qty: 1, unitPrice: 300000, total: 300000, category: "Suministros" }
        ];
        const total = items.reduce((acc, curr) => acc + curr.total, 0);

        resolve({
            type: 'SPREADSHEET',
            fileName: file.name,
            summary: {
                entity: "Reporte_Gastos_Q1.xlsx",
                date: new Date().toISOString().split('T')[0],
                totalAmount: total,
                confidenceScore: 0.99
            },
            extractedItems: items,
            rawTextOutput: JSON.stringify(items, null, 2)
        });

      } else {
        // Mock Response for Invoice/Image
        const items = [
            { description: "Portátil MacBook Air M2", qty: 1, unitPrice: 5200000, total: 5200000, category: "Equipos" },
            { description: "Adaptador USB-C", qty: 2, unitPrice: 85000, total: 170000, category: "Accesorios" }
        ];
        const total = items.reduce((acc, curr) => acc + curr.total, 0);

        resolve({
            type: 'INVOICE',
            fileName: file.name,
            summary: {
                entity: "TECNOLOGÍA S.A.S",
                date: "2025-02-14",
                totalAmount: total,
                confidenceScore: 0.95
            },
            extractedItems: items,
            rawTextOutput: `
EMISOR: TECNOLOGÍA S.A.S
FECHA: 2025-02-14
TOTAL: $${total}

ITEMS:
1. Portátil MacBook Air M2 | $5.200.000 | Cat: Equipos
2. Adaptador USB-C (x2) | $170.000 | Cat: Accesorios
            `.trim()
        });
      }
    }, 2500); // Simulate processing time
  });
};

export const processSmartText = (text: string): Promise<SmartExpenseResult> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const isJson = text.trim().startsWith('[') || text.trim().startsWith('{');
            let items = [];
            let entity = "Texto Importado";

            if (isJson) {
                try {
                    const parsed = JSON.parse(text);
                    items = Array.isArray(parsed) ? parsed : [parsed];
                    items = items.map((i: any) => ({
                        description: i.description || i.name || "Item sin nombre",
                        qty: i.qty || i.quantity || 1,
                        unitPrice: i.unitPrice || i.price || 0,
                        total: (i.qty || 1) * (i.unitPrice || 0),
                        category: i.category || "General"
                    }));
                    entity = "JSON Importado";
                } catch (e) {
                    items = [{ description: "Error parseando JSON", qty: 0, unitPrice: 0, total: 0, category: "Error" }];
                }
            } else {
                items = [
                    { description: "Servicios Profesionales (Extraído)", qty: 1, unitPrice: 1500000, total: 1500000, category: "Honorarios" },
                    { description: "Gastos de Viaje Detectados", qty: 1, unitPrice: 450000, total: 450000, category: "Viáticos" }
                ];
                entity = "Texto Plano Procesado";
            }
            const total = items.reduce((acc: number, curr: any) => acc + curr.total, 0);
            resolve({
                type: 'SPREADSHEET',
                fileName: 'clipboard_content.txt',
                summary: { entity, date: new Date().toISOString().split('T')[0], totalAmount: total, confidenceScore: 0.88 },
                extractedItems: items,
                rawTextOutput: text
            });
        }, 2000);
    });
};

// --- MODULE 3: EXOGENA LOGIC (ADVANCED) ---

// Helper: Modulo 11 for Colombian DV Check
const calculateDV = (nit: string): number => {
    const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
    const cleanNit = nit.replace(/\D/g, ''); // Remove non-digits
    
    if (cleanNit.length > 15) return -1;
    
    let sum = 0;
    // Iterate backwards
    for (let i = 0; i < cleanNit.length; i++) {
        const digit = parseInt(cleanNit.substring(cleanNit.length - 1 - i, cleanNit.length - i));
        sum += digit * weights[weights.length - 1 - i];
    }
    
    const remainder = sum % 11;
    if (remainder === 0) return 0;
    if (remainder === 1) return 1;
    return 11 - remainder;
};

export const runExogenaAudit = (files: File[]): Promise<ExogenaAuditResult> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // 1. DATA MAESTRA ISSUES SIMULATION
            const masterDataIssues: ThirdPartyIssue[] = [
                {
                    nit: '900123456',
                    name: 'SOLUCIONES TECH SAS',
                    issueType: 'DV_ERROR',
                    description: 'El dígito de verificación registrado es 5, pero el cálculo Módulo 11 indica que debería ser 1.',
                    suggestedFix: 'Corregir DV a 1 en el ERP.'
                },
                {
                    nit: '860000123',
                    name: 'DISTRIBUIDORA DEL SUR',
                    issueType: 'DANE_INVALID',
                    description: 'Código DANE Municipio "000" no existe en la tabla oficial.',
                    suggestedFix: 'Asignar código real (ej. 11001 Bogotá).'
                },
                {
                    nit: '1010202303',
                    name: '',
                    issueType: 'TYPE_MISMATCH',
                    description: 'Tipo de documento 13 (Cédula) sin Nombres y Apellidos diligenciados, solo Razón Social.',
                    suggestedFix: 'Mover "INVERSIONES X" a campos de Nombre y Apellido o cambiar tipo a NIT.'
                }
            ];

            // 2. CROSS CHECKS SIMULATION
            const crossChecks: TaxCrossCheck[] = [
                {
                    concept: 'Ingresos Brutos',
                    sourceExogena: 'Fto 1007 (Ingresos)',
                    valueExogena: 1540000000,
                    sourceTaxReturn: 'Fto 110 (Renta) - Renglón Ingresos',
                    valueTaxReturn: 1540000000,
                    difference: 0,
                    status: 'OK'
                },
                {
                    concept: 'IVA Generado',
                    sourceExogena: 'Fto 1006 (IVA Gen)',
                    valueExogena: 285000000,
                    sourceTaxReturn: 'Fto 300 (IVA Anual)',
                    valueTaxReturn: 292600000,
                    difference: -7600000,
                    status: 'RISK' // Critical diff
                },
                {
                    concept: 'Retención en la Fuente',
                    sourceExogena: 'Fto 1001 (Col. Retención)',
                    valueExogena: 45000000,
                    sourceTaxReturn: 'Fto 350 (Retenciones Anuales)',
                    valueTaxReturn: 45000000,
                    difference: 0,
                    status: 'OK'
                },
                {
                    concept: 'Costos y Deducciones',
                    sourceExogena: 'Fto 1001 (Total)',
                    valueExogena: 890000000,
                    sourceTaxReturn: 'Fto 110 (Costos + Gastos)',
                    valueTaxReturn: 910000000,
                    difference: -20000000,
                    status: 'CRITICAL' // Missing costs in exogena
                }
            ];

            // 3. MINOR AMOUNTS SIMULATION (Cuantías Menores)
            const minorAmounts: MinorAmountGroup[] = [
                { originalNit: '901000111', totalAmount: 45000, concept: '5002 - Honorarios', action: 'GROUP_222222222' },
                { originalNit: '52000123', totalAmount: 89000, concept: '5004 - Servicios', action: 'GROUP_222222222' },
                { originalNit: '79000111', totalAmount: 550000, concept: '5004 - Servicios', action: 'REPORT_INDIVIDUAL' }, // Over 100k
            ];

            // Slightly adjust stats based on file count to simulate responsiveness
            const fileBonus = files.length * 10;

            resolve({
                stats: {
                    totalThirdParties: 1450 + fileBonus,
                    processedRecords: 5200 + (fileBonus * 5),
                    riskScore: 78 // Medium-High risk
                },
                masterDataIssues,
                crossChecks,
                minorAmounts,
                sanctionPrediction: {
                    estimatedFineCOP: 12500000, // Roughly 12.5M
                    article: "Art. 651 E.T.",
                    details: "Sanción del 3% sobre información con errores (IVA e inconsistencias de terceros)."
                }
            });

        }, 3000);
    });
};