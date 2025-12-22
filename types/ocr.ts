// OCR Types for document processing with Gemini

export interface OCRItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category: string;
    confidence?: number;
}

export interface OCRResult {
    fileName: string;
    entity: string;
    nit: string;
    date: string;
    invoiceNumber: string;
    subtotal: number;
    iva: number;
    total: number;
    items: OCRItem[];
    confidence: number;
    rawText?: string;
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
