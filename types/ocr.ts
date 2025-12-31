// OCR Types for document processing with Gemini

// ============================================
// Validation Types
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
    field: string;           // e.g., 'items[0].total', 'subtotal', 'iva'
    message: string;         // Human-readable message in Spanish
    severity: ValidationSeverity;
    expected?: number;       // Calculated value
    found?: number;          // Extracted value
    difference?: number;     // Absolute difference
    percentageDiff?: number; // Percentage difference
}

export interface ItemValidation {
    index: number;
    description: string;
    isValid: boolean;
    calculatedTotal: number;
    errors: ValidationError[];
}

export interface TaxValidation {
    taxType: 'iva' | 'tax_inc' | 'reteFuente' | 'reteIca' | 'reteIva';
    isValid: boolean;
    declaredRate?: number;   // Rate from OCR extraction
    calculatedRate?: number; // Reverse-calculated rate from value/base
    expectedValue?: number;
    errors: ValidationError[];
}

export interface SubtotalValidation {
    isValid: boolean;
    calculatedSubtotal: number;
    declaredSubtotal: number;
    errors: ValidationError[];
}

export interface TotalValidation {
    isValid: boolean;
    calculatedTotal: number;
    declaredTotal: number;
    errors: ValidationError[];
}

export interface ValidationResult {
    isValid: boolean;
    overallConfidence: number;  // 0-1, adjusted based on validation
    itemValidations: ItemValidation[];
    subtotalValidation: SubtotalValidation;
    taxValidations: TaxValidation[];
    totalValidation: TotalValidation;
    errors: ValidationError[];   // All errors aggregated
    warnings: ValidationError[]; // All warnings aggregated
}

// ============================================
// OCR Item and Result Types
// ============================================

// Supported units of measure for items
export const UNITS_OF_MEASURE = [
    'Und',  // Unidad (default)
    'Kg',   // Kilogramos
    'Lt',   // Litros
    'Gln',  // Galones
    'Hrs',  // Horas
    'Svc',  // Servicios
    'Caja', // Caja
    'Paq',  // Paquete
    'Mt',   // Metros
    'M2',   // Metros cuadrados
    'M3',   // Metros cúbicos
] as const;

export type UnitOfMeasure = typeof UNITS_OF_MEASURE[number] | string;

export interface OCRItem {
    description: string;
    quantity: number;
    unitOfMeasure?: UnitOfMeasure;   // Unit: 'Und', 'Kg', 'Lt', 'Svc', 'Hrs', etc. Default: 'Und'
    unitPrice: number;
    discount?: number;               // Absolute discount in COP (e.g., 5000 = $5,000 off)
    discountPercentage?: number;     // Discount as decimal (e.g., 0.10 = 10%)
    total: number;                   // Net total after discount: (qty × price) - discount
    category: string;
    confidence?: number;
}

// AIU (Colombian construction/service invoicing structure)
export interface AIUData {
    administracion: number;        // Administrative fee in COP
    administracion_rate?: number;  // Rate as decimal (0.05 = 5%)
    imprevistos: number;           // Contingency/unforeseen costs in COP
    imprevistos_rate?: number;     // Rate as decimal
    utilidad: number;              // Profit margin in COP
    utilidad_rate?: number;        // Rate as decimal
    base_gravable?: number;        // Calculated: subtotal + A + I + U (taxable base for IVA)
}

export interface OCRResult {
    fileName: string;
    entity: string;
    nit: string;
    date: string;
    invoiceNumber: string;
    currency?: string; // e.g. 'COP', 'USD'
    subtotal: number;
    iva: number;
    iva_rate?: number; // Tax rate as decimal (e.g., 0.19 for 19%)
    tax_inc?: number; // Impoconsumo
    tax_inc_rate?: number; // Impoconsumo rate as decimal
    tip?: number; // Propina / Servicio Voluntario
    aiu?: AIUData; // Colombian AIU (Administración, Imprevistos, Utilidad) - common in construction
    retentions?: {
        reteFuente?: number;
        reteFuente_rate?: number;
        reteIca?: number;
        reteIca_rate?: number;
        reteIva?: number;
    };
    total: number;
    items: OCRItem[];
    confidence: number;
    rawText?: string;
    tokens_input?: number;
    tokens_output?: number;
    cost_estimated?: number;
    validation?: ValidationResult; // Calculation validation results
}

export interface OCRResponse {
    success: boolean;
    results: OCRResult[];
    error?: string;
}

// Category mappings for Colombian accounting
export const EXPENSE_CATEGORIES = [
    'Equipos de Cómputo',
    'Suministros de Oficina',
    'Servicios Públicos',
    'Arrendamiento',
    'Honorarios Profesionales',
    'Publicidad y Marketing',
    'Gastos de Viaje',
    'Alimentación',
    'Transporte',
    'Mantenimiento',
    'Software y Licencias',
    'Telecomunicaciones',
    'Seguros',
    'Impuestos',
    'Gastos Financieros',
    'Otros Gastos',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
