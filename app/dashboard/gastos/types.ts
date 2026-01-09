// Re-export validation types and constants from main types file
export type {
    ValidationSeverity,
    ValidationError,
    ItemValidation,
    TaxValidation,
    SubtotalValidation,
    TotalValidation,
    ValidationResult,
    UnitOfMeasure,
    AIUData,
} from '@/types/ocr';

export { UNITS_OF_MEASURE } from '@/types/ocr';

export interface OCRItem {
    description: string;
    quantity: number;
    unitOfMeasure?: string;          // Unit: 'Und', 'Kg', 'Lt', 'Svc', 'Hrs', etc. Default: 'Und'
    unitPrice: number;
    discount?: number;               // Absolute discount in COP
    discountPercentage?: number;     // Discount as decimal (e.g., 0.10 = 10%)
    total: number;                   // Net total after discount
    category?: string;
    confidence?: number;
}

export interface OCRResult {
    id?: string; // Database ID (set when loaded from DB)
    entity: string;
    nit?: string;
    date: string;
    invoiceNumber: string;
    currency?: string; // e.g. 'COP', 'USD'
    subtotal: number;
    iva: number;
    iva_rate?: number; // Tax rate as decimal (e.g., 0.19 for 19%)
    tax_inc?: number; // Impoconsumo
    tax_inc_rate?: number; // Impoconsumo rate as decimal
    tip?: number; // Propina / Servicio Voluntario
    aiu?: import('@/types/ocr').AIUData; // Colombian AIU (Administración, Imprevistos, Utilidad)
    retentions?: {
        reteFuente?: number;
        reteFuente_rate?: number;
        reteIca?: number;
        reteIca_rate?: number;
        reteIva?: number;
    };
    total: number;
    items: OCRItem[];
    fileName: string;
    confidence?: number;
    tokens_input?: number;
    tokens_output?: number;
    cost_estimated?: number;
    validation?: import('@/types/ocr').ValidationResult; // Calculation validation results
}
