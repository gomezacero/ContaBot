import { NextRequest, NextResponse } from 'next/server';
import { OCRResult, OCRItem } from '@/types/ocr';
import { createClient } from '@/lib/supabase/server';
import {
    FILE_LIMITS,
    ERROR_MESSAGES,
    validateMimeType,
    getLimitsForMembership,
} from '@/lib/usage-limits';
import {
    checkCanMakeRequest,
    incrementUsage,
    getUserMembershipType,
} from '@/lib/services/usage-service';

// Configuración para permitir archivos más grandes
export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `Actúa como un experto contable y auditor de facturación. Tu misión es extraer información con precisión MILIMÉTRICA de este documento (factura POS, electrónica o recibo).

REGLA DE ORO: Si la imagen es borrosa o difícil de leer, usa tu razonamiento lógico para deducir números basados en sumas y contextos (ej: Precio x Cantidad = Total).

EXTRAE EXACTAMENTE ESTOS DATOS:
1.  **PROVEEDOR**: Nombre legal completo (Busca "S.A.S", "Limitada", etc).
2.  **IDENTIFICACIÓN**: NIT o RUT (Ej: 900.432.416-9).
3.  **FACTURA**: Número de consecutivo/factura.
4.  **FECHA**: Fecha de emisión.
5.  **MONEDA**: Detecta si es COP, USD, etc.
6.  **DESGLOSE TRIBUTARIO (CRÍTICO)**:
    -   Busca secciones de "INFORMACION TRIBUTARIA", "DESGLOSE" o porcentajes al final.
    -   **IMPOCONSUMO (INC)**: Busca explícitamente "IPO", "IMPOCONSUMO", "INC", "CONSUMO". **IMPORTANTE: Si dice IMPOCONSUMO, el valor va en 'tax_inc', NO en 'iva'.**
    -   **IVA**: Impuesto al valor agregado. Solo asigna aquí si dice explícitamente "IVA".
    -   **PROPINA**: Busca "Servicio Voluntario", "Tip", "Propina".
7.  **ITEMS**: Extrae los items si es legible.

ESTRUCTURA DE RESPUESTA (JSON ÚNICAMENTE):
{
  "entity": "Nombre del Establecimiento",
  "nit": "NIT o Documento",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "Número detectado",
  "currency": "COP",
  "subtotal": 0 (Base antes de impuestos),
  "iva": 0 (Solo si es IVA),
  "tax_inc": 0 (Valor del Impoconsumo/INC),
  "tip": 0 (Propina),
  "total": 0 (Total a pagar),
  "retentions": {
      "reteFuente": 0,
      "reteIca": 0,

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido.

Estructura JSON requerida:
{
  "entity": "Razón Social Emisor",
  "nit": "NIT Emisor",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "Prefijo + Número",
  "currency": "COP" | "USD" | "EUR",
  "subtotal": 0,
  "iva": 0,
  "tax_inc": 0,
  "tip": 0,
  "retentions": {
      "reteFuente": 0,
      "reteIca": 0,
      "reteIva": 0
  },
  "total": 0,
  "items": [
    {
      "description": "Nombre producto/servicio",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0,
      "category": "Categoría + Código PUC",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95
}
`;

const TEXT_EXTRACTION_PROMPT = `Analiza el texto y extrae facturas/gastos en JSON.

OBJETIVO: Agrupar por proveedor, extraer NITs, DETALLES TRIBUTARIOS y PROPINAS.

TEXTO A ANALIZAR:
{TEXT_CONTENT}

Responde ÚNICAMENTE con un ARRAY JSON. Estructura por factura:
{
  "entity": "Nombre Empresa",
  "nit": "NIT",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "N° Factura",
  "currency": "COP",
  "subtotal": 0,
  "iva": 0,
  "tax_inc": 0,
  "tip": 0,
  "retentions": { "reteFuente": 0, "reteIca": 0, "reteIva": 0 },
  "total": 0,
  "items": [...],
  "confidence": 0.9
}
`;

// Direct REST API call to Gemini
async function callGeminiAPI(contents: object[], apiKey: string): Promise<{ text: string, usage?: { promptTokenCount: number, candidatesTokenCount: number, totalTokenCount: number } }> {
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

    return {
        text: data.candidates[0].content.parts[0].text,
        usage: data.usageMetadata
    };
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

        // ===== VERIFICACIÓN DE AUTENTICACIÓN =====
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: ERROR_MESSAGES.AUTH_REQUIRED,
                    code: 'AUTH_REQUIRED'
                },
                { status: 401 }
            );
        }

        // ===== OBTENER TIPO DE MEMBRESÍA =====
        const membershipType = await getUserMembershipType(user.id);

        const results: OCRResult[] = [];
        let totalBytesProcessed = 0;
        let filesProcessedCount = 0;

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

            // Verificar límites antes de procesar
            const textBytes = new TextEncoder().encode(text).length;
            const usageCheck = await checkCanMakeRequest(user.id, membershipType, 1, textBytes);
            if (!usageCheck.allowed) {
                return NextResponse.json(
                    {
                        success: false,
                        error: usageCheck.reason,
                        code: usageCheck.code,
                        remaining: 0
                    },
                    { status: 429 }
                );
            }

            const prompt = TEXT_EXTRACTION_PROMPT.replace('{TEXT_CONTENT}', text);

            const contents = [{
                parts: [{ text: prompt }]
            }];

            const responseData = await callGeminiAPI(contents, apiKey);
            const responseText = responseData.text;
            const usage = responseData.usage;

            try {
                let cleanText = responseText.trim();
                if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
                if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
                if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

                const parsed = JSON.parse(cleanText.trim());
                const items = Array.isArray(parsed) ? parsed : [parsed];

                // Calculate cost
                let costEstimated = 0;
                let tokensInput = 0;
                let tokensOutput = 0;

                if (usage) {
                    tokensInput = usage.promptTokenCount;
                    tokensOutput = usage.candidatesTokenCount;
                    // Gemini 2.0 Flash pricing: $0.10/1M input, $0.40/1M output
                    const costInput = (tokensInput / 1_000_000) * 0.10;
                    const costOutput = (tokensOutput / 1_000_000) * 0.40;
                    costEstimated = costInput + costOutput;
                }

                items.forEach((item: OCRResult, idx: number) => {
                    results.push({
                        fileName: `Texto pegado (${idx + 1})`,
                        entity: item.entity || 'Desconocido',
                        nit: item.nit || '',
                        date: item.date || new Date().toISOString().split('T')[0],
                        invoiceNumber: item.invoiceNumber || '',
                        subtotal: item.subtotal || 0,
                        iva: item.iva || 0,
                        tax_inc: item.tax_inc || 0,
                        tip: item.tip || 0,
                        retentions: item.retentions || { reteFuente: 0, reteIca: 0, reteIva: 0 },
                        total: item.total || 0,
                        items: (item.items || []).map((i: OCRItem) => ({
                            ...i,
                            confidence: i.confidence || 0.8
                        })),
                        confidence: item.confidence || 0.7,
                        tokens_input: idx === 0 ? tokensInput : 0, // Attribute cost to first item or split? Let's just put it on first
                        tokens_output: idx === 0 ? tokensOutput : 0,
                        cost_estimated: idx === 0 ? costEstimated : 0
                    });
                });
            } catch {
                return NextResponse.json(
                    { success: false, error: 'No se pudo extraer información del texto' },
                    { status: 400 }
                );
            }

            // Incrementar uso para entrada de texto
            await incrementUsage(user.id, results.length, textBytes);

            return NextResponse.json({
                success: true,
                results,
                clientId,
                usage: {
                    filesProcessed: results.length,
                    bytesProcessed: textBytes,
                    remaining: usageCheck.remaining - results.length,
                }
            });
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

        // ===== VALIDACIÓN DE TAMAÑO DE ARCHIVOS =====
        const limits = getLimitsForMembership(membershipType);
        const maxFileSize = limits.max_file_size_mb * 1024 * 1024;
        let totalRequestSize = 0;

        for (const file of files) {
            // Validar tamaño individual
            if (file.size > maxFileSize) {
                return NextResponse.json(
                    {
                        success: false,
                        error: ERROR_MESSAGES.FILE_TOO_LARGE(file.name, limits.max_file_size_mb),
                        code: 'FILE_TOO_LARGE'
                    },
                    { status: 400 }
                );
            }

            // Validar tipo de archivo
            const mimeValidation = validateMimeType(file.type);
            if (!mimeValidation.valid) {
                return NextResponse.json(
                    {
                        success: false,
                        error: ERROR_MESSAGES.INVALID_FILE_TYPE(file.name),
                        code: 'INVALID_FILE_TYPE'
                    },
                    { status: 400 }
                );
            }

            totalRequestSize += file.size;
        }

        // Validar tamaño total de la solicitud
        if (totalRequestSize > FILE_LIMITS.MAX_TOTAL_REQUEST_BYTES) {
            return NextResponse.json(
                {
                    success: false,
                    error: ERROR_MESSAGES.TOTAL_TOO_LARGE(50),
                    code: 'TOTAL_TOO_LARGE'
                },
                { status: 400 }
            );
        }

        // ===== VERIFICAR LÍMITES DE USO DIARIO =====
        const usageCheck = await checkCanMakeRequest(user.id, membershipType, files.length, totalRequestSize);
        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: usageCheck.reason,
                    code: usageCheck.code,
                    remaining: usageCheck.remaining
                },
                { status: 429 }
            );
        }

        for (const file of files) {
            try {
                const bytes = await file.arrayBuffer();
                const base64 = Buffer.from(bytes).toString('base64');
                totalBytesProcessed += bytes.byteLength;

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

                const responseData = await callGeminiAPI(contents, apiKey);
                const responseText = responseData.text;
                const usage = responseData.usage;

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

                // Calculate cost
                let costEstimated = 0;
                let tokensInput = 0;
                let tokensOutput = 0;

                if (usage) {
                    tokensInput = usage.promptTokenCount;
                    tokensOutput = usage.candidatesTokenCount;
                    // Gemini 2.0 Flash pricing: $0.10/1M input, $0.40/1M output
                    const costInput = (tokensInput / 1_000_000) * 0.10;
                    const costOutput = (tokensOutput / 1_000_000) * 0.40;
                    costEstimated = costInput + costOutput;
                }

                results.push({
                    fileName: file.name,
                    entity: parsed.entity || 'Desconocido',
                    nit: parsed.nit || '',
                    date: parsed.date || new Date().toISOString().split('T')[0],
                    invoiceNumber: parsed.invoiceNumber || '',
                    subtotal: parsed.subtotal || 0,
                    iva: parsed.iva || 0,
                    tax_inc: parsed.tax_inc || 0,
                    tip: parsed.tip || 0,
                    retentions: parsed.retentions || { reteFuente: 0, reteIca: 0, reteIva: 0 },
                    total: parsed.total || 0,
                    items: (parsed.items || []).map((i: OCRItem) => ({
                        ...i,
                        confidence: i.confidence || 0.8
                    })),
                    confidence: parsed.confidence || 0.5,
                    tokens_input: tokensInput,
                    tokens_output: tokensOutput,
                    cost_estimated: costEstimated
                });
                filesProcessedCount++;
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

        // ===== INCREMENTAR CONTADOR DE USO =====
        if (filesProcessedCount > 0) {
            await incrementUsage(user.id, filesProcessedCount, totalBytesProcessed);
        }

        return NextResponse.json({
            success: true,
            results,
            clientId,
            usage: {
                filesProcessed: filesProcessedCount,
                bytesProcessed: totalBytesProcessed,
                remaining: usageCheck.remaining - filesProcessedCount,
            }
        });
    } catch (error) {
        console.error('OCR API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error processing documents';

        // Mejor manejo de errores específicos
        if (errorMessage.includes('413') || errorMessage.includes('Content Too Large')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'El archivo es demasiado grande. El límite es 4.5MB para archivos individuales en esta plataforma. Intenta comprimir el archivo o dividirlo.',
                    code: 'PAYLOAD_TOO_LARGE'
                },
                { status: 413 }
            );
        }

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
