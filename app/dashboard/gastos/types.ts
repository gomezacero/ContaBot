export interface OCRItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: string;
    confidence?: number;
}

export interface OCRResult {
    entity: string;
    nit?: string;
    date: string;
    invoiceNumber: string;
    currency?: string; // e.g. 'COP', 'USD'
    subtotal: number;
    iva: number;
    tax_inc?: number; // Impoconsumo
    tip?: number; // Propina / Servicio Voluntario
    retentions?: {
        reteFuente?: number;
        reteIca?: number;
        reteIva?: number;
    };
    total: number;
    items: OCRItem[];
    fileName: string;
    confidence?: number;
    tokens_input?: number;
    tokens_output?: number;
    cost_estimated?: number;
}
