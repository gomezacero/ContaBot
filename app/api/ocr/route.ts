import { NextRequest, NextResponse } from 'next/server';
import { OCRResult, OCRItem } from '@/types/ocr';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `Analiza este documento contable (factura, recibo, comprobante) y extrae la información en formato JSON.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown.

El JSON debe tener esta estructura exacta:
{
  "entity": "Nombre de la empresa emisora",
  "nit": "NIT del emisor (solo números y guión)",
  "date": "Fecha en formato YYYY-MM-DD",
  "invoiceNumber": "Número de factura o documento",
  "subtotal": 0,
  "iva": 0,
  "total": 0,
  "items": [
    {
      "description": "Descripción del producto/servicio",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0,
      "category": "Categoría contable",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95
}

Categorías válidas:
- Equipos de Cómputo (código 152405)
- Suministros de Oficina (código 519530)
- Servicios Públicos (código 513505)
- Publicidad y Marketing (código 522010)
- Software y Licencias (código 516515)
- Telecomunicaciones (código 513530)
- Otros Gastos (código 529595)

Incluye el código PUC entre paréntesis en la categoría.
El campo "confidence" indica qué tan seguro estás de cada extracción (0 a 1).`;

const TEXT_EXTRACTION_PROMPT = `Analiza el siguiente texto que contiene información de gastos o facturas y extrae los datos en formato JSON.

TEXTO A ANALIZAR:
{TEXT_CONTENT}

IMPORTANTE: Responde ÚNICAMENTE con un array JSON de objetos, sin texto adicional.

Cada objeto debe tener esta estructura:
{
  "entity": "Nombre de la empresa/proveedor",
  "nit": "NIT si está disponible",
  "date": "Fecha en formato YYYY-MM-DD",
  "invoiceNumber": "Número de factura si está",
  "subtotal": 0,
  "iva": 0,
  "total": 0,
  "items": [
    {
      "description": "Descripción",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0,
      "category": "Categoría con código PUC",
      "confidence": 0.9
    }
  ],
  "confidence": 0.9
}

Extrae TODOS los gastos/facturas que puedas identificar en el texto.`;

// Direct REST API call to Gemini
async function callGeminiAPI(contents: object[], apiKey: string): Promise<string> {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: contents,
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', response.status, errorText);
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response structure from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        const results: OCRResult[] = [];

        // Handle text input
        if (contentType.includes('application/json')) {
            const body = await request.json();
            const { text, clientId } = body;

            if (!text) {
                return NextResponse.json(
                    { success: false, error: 'No text provided' },
                    { status: 400 }
                );
            }

            const prompt = TEXT_EXTRACTION_PROMPT.replace('{TEXT_CONTENT}', text);

            const contents = [{
                parts: [{ text: prompt }]
            }];

            const responseText = await callGeminiAPI(contents, apiKey);

            try {
                let cleanText = responseText.trim();
                if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
                if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
                if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

                const parsed = JSON.parse(cleanText.trim());
                const items = Array.isArray(parsed) ? parsed : [parsed];

                items.forEach((item: OCRResult, idx: number) => {
                    results.push({
                        fileName: `Texto pegado (${idx + 1})`,
                        entity: item.entity || 'Desconocido',
                        nit: item.nit || '',
                        date: item.date || new Date().toISOString().split('T')[0],
                        invoiceNumber: item.invoiceNumber || '',
                        subtotal: item.subtotal || 0,
                        iva: item.iva || 0,
                        total: item.total || 0,
                        items: (item.items || []).map((i: OCRItem) => ({
                            ...i,
                            confidence: i.confidence || 0.8
                        })),
                        confidence: item.confidence || 0.7,
                    });
                });
            } catch {
                return NextResponse.json(
                    { success: false, error: 'No se pudo extraer información del texto' },
                    { status: 400 }
                );
            }

            return NextResponse.json({ success: true, results, clientId });
        }

        // Handle file upload (FormData)
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const clientId = formData.get('clientId') as string;

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No files provided' },
                { status: 400 }
            );
        }

        for (const file of files) {
            try {
                const bytes = await file.arrayBuffer();
                const base64 = Buffer.from(bytes).toString('base64');

                let mimeType = file.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') mimeType = 'application/pdf';
                    else if (ext === 'png') mimeType = 'image/png';
                    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                    else mimeType = 'image/png';
                }

                console.log(`Processing: ${file.name}, MIME: ${mimeType}, Size: ${bytes.byteLength} bytes`);

                const contents = [{
                    parts: [
                        { text: EXTRACTION_PROMPT },
                        {
                            inlineData: {
                                mimeType,
                                data: base64
                            }
                        }
                    ]
                }];

                const responseText = await callGeminiAPI(contents, apiKey);

                let parsed;
                try {
                    let cleanText = responseText.trim();
                    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
                    if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
                    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
                    parsed = JSON.parse(cleanText.trim());
                } catch {
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
                    items: (parsed.items || []).map((i: OCRItem) => ({
                        ...i,
                        confidence: i.confidence || 0.8
                    })),
                    confidence: parsed.confidence || 0.5,
                });
            } catch (fileError) {
                const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
                console.error(`Error processing file ${file.name}:`, errorMessage);
                results.push({
                    fileName: file.name,
                    entity: `Error: ${errorMessage.slice(0, 80)}`,
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

        return NextResponse.json({ success: true, results, clientId });
    } catch (error) {
        console.error('OCR API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error processing documents';
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
