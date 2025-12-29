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
    subtotal: number;
    iva: number;
    total: number;
    items: OCRItem[];
    fileName: string; // Added to track source
    confidence?: number;
}
