import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { OCRResult } from '@/types/ocr';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const EXTRACTION_PROMPT = `Analiza esta imagen de una factura o documento contable colombiano y extrae la información en formato JSON.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "entity": "Nombre de la empresa emisora",
  "nit": "NIT del emisor (solo números y guión)",
  "date": "Fecha en formato YYYY-MM-DD",
  "invoiceNumber": "Número de factura",
  "subtotal": 0,
  "iva": 0,
  "total": 0,
  "items": [
    {
      "description": "Descripción del producto/servicio",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0,
      "category": "Categoría contable sugerida"
    }
  ],
  "confidence": 0.95
}

Categorías válidas: Equipos de Cómputo, Suministros de Oficina, Servicios Públicos, Arrendamiento, Honorarios Profesionales, Publicidad y Marketing, Gastos de Viaje, Alimentación, Transporte, Mantenimiento, Software y Licencias, Telecomunicaciones, Seguros, Impuestos, Gastos Financieros, Otros Gastos.

Si no puedes extraer algún campo, usa valores vacíos o 0 según corresponda.
El campo "confidence" debe ser un número entre 0 y 1 indicando qué tan seguro estás de la extracción.`;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No files provided' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const results: OCRResult[] = [];

        for (const file of files) {
            try {
                // Convert file to base64
                const bytes = await file.arrayBuffer();
                const base64 = Buffer.from(bytes).toString('base64');

                // Determine MIME type
                let mimeType = file.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') mimeType = 'application/pdf';
                    else if (ext === 'png') mimeType = 'image/png';
                    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                    else mimeType = 'image/png'; // default
                }

                // Call Gemini Vision
                const result = await model.generateContent([
                    EXTRACTION_PROMPT,
                    {
                        inlineData: {
                            mimeType,
                            data: base64,
                        },
                    },
                ]);

                const response = await result.response;
                const text = response.text();

                // Parse JSON response
                let parsed;
                try {
                    // Clean response - remove markdown code blocks if present
                    let cleanText = text.trim();
                    if (cleanText.startsWith('```json')) {
                        cleanText = cleanText.slice(7);
                    }
                    if (cleanText.startsWith('```')) {
                        cleanText = cleanText.slice(3);
                    }
                    if (cleanText.endsWith('```')) {
                        cleanText = cleanText.slice(0, -3);
                    }
                    parsed = JSON.parse(cleanText.trim());
                } catch {
                    console.error('Failed to parse Gemini response:', text);
                    parsed = {
                        entity: 'No se pudo extraer',
                        nit: '',
                        date: new Date().toISOString().split('T')[0],
                        invoiceNumber: '',
                        subtotal: 0,
                        iva: 0,
                        total: 0,
                        items: [],
                        confidence: 0.3,
                    };
                }

                results.push({
                    fileName: file.name,
                    entity: parsed.entity || 'Desconocido',
                    nit: parsed.nit || '',
                    date: parsed.date || new Date().toISOString().split('T')[0],
                    invoiceNumber: parsed.invoiceNumber || '',
                    subtotal: parsed.subtotal || 0,
                    iva: parsed.iva || 0,
                    total: parsed.total || 0,
                    items: parsed.items || [],
                    confidence: parsed.confidence || 0.5,
                    rawText: text,
                });
            } catch (fileError) {
                console.error(`Error processing file ${file.name}:`, fileError);
                results.push({
                    fileName: file.name,
                    entity: 'Error al procesar',
                    nit: '',
                    date: new Date().toISOString().split('T')[0],
                    invoiceNumber: '',
                    subtotal: 0,
                    iva: 0,
                    total: 0,
                    items: [],
                    confidence: 0,
                });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('OCR API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error processing documents' },
            { status: 500 }
        );
    }
}
