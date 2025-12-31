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
import { validateOCRResult } from '@/lib/services/ocr-validation-service';

// Configuración para permitir archivos más grandes
export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `Actua como un experto contable y auditor de facturacion. Tu mision es extraer informacion con precision MILIMETRICA de este documento (factura POS, electronica o recibo).

REGLA DE ORO: Si la imagen es borrosa o dificil de leer, usa tu razonamiento logico para deducir numeros basados en sumas y contextos (ej: Precio x Cantidad = Total).

EXTRAE EXACTAMENTE ESTOS DATOS:
1.  **PROVEEDOR**: Nombre legal completo (Busca "S.A.S", "Limitada", etc).
2.  **IDENTIFICACION**: NIT o RUT (Ej: 900.432.416-9).
3.  **FACTURA**: Numero de consecutivo/factura.
4.  **FECHA**: Fecha de emision.
5.  **MONEDA**: Detecta si es COP, USD, etc.
6.  **DESGLOSE TRIBUTARIO (CRITICO)**:
    -   Busca secciones de "INFORMACION TRIBUTARIA", "DESGLOSE" o porcentajes al final.
    -   **IMPOCONSUMO (INC)**: Busca explicitamente "IPO", "IMPOCONSUMO", "INC", "CONSUMO". **IMPORTANTE: Si dice IMPOCONSUMO, el valor va en 'tax_inc', NO en 'iva'.**
    -   **IVA**: Impuesto al valor agregado. Solo asigna aqui si dice explicitamente "IVA".
    -   **PROPINA**: Busca "Servicio Voluntario", "Tip", "Propina".
    -   **TASAS/PORCENTAJES**: Extrae el porcentaje de cada impuesto cuando este visible (ej: "IVA 19%", "Inc 8%", "ReteFte 2.5%")
7.  **ITEMS** (EXTRACCION CRITICA para facturas con tablas):
    - Si la tabla esta desorganizada, usa RAZONAMIENTO LOGICO:
      * 3 numeros por linea = (Cantidad, Precio, Total)
      * 4 numeros por linea = (Cantidad, Precio, Descuento, Total)
      * Sin cantidad explicita = asumir cantidad = 1
    - **UNIDADES**: Detecta "Und", "Kg", "Lt", "Gln", "Hrs", "Svc", "Caja", "Paq", "Mt", "M2", "M3"
    - **DESCUENTOS**: Busca "Desc", "Dscto", "Rebaja", "-" cerca del precio o total
    - VERIFICA: total = (quantity * unitPrice) - discount
8.  **AIU** (FACTURAS DE CONSTRUCCION/SERVICIOS PROFESIONALES):
    - Busca "Administración", "Admin", "A.I.U", "AIU"
    - Busca "Imprevistos", "Contingencia"
    - Busca "Utilidad", "Profit", "Margen"
    - CRITICO: Si detectas AIU, el IVA se calcula sobre (Subtotal + A + I + U), NO solo sobre el subtotal
    - Extrae los valores y porcentajes de cada componente
    - base_gravable = subtotal + administracion + imprevistos + utilidad
9.  **ESTACIONES DE SERVICIO / GASOLINERAS (EDS)**:
    - CRITICO: Busca "ESTACION DE SERVICIO", "EDS", "GASOLINERA", "SERVICENTRO" en el encabezado
    - El PROVEEDOR/EMISOR es la estacion de servicio, NO el cliente
    - Si ves "CLIENTE:", "NIT CLIENTE:", "NIT / CC:" despues de un nombre, esos datos son del COMPRADOR, no del vendedor
    - El NIT del EMISOR esta arriba, cerca del nombre de la estacion
    - Productos tipicos: "CORRIENTE", "EXTRA", "DIESEL", "ACPM", "GAS"
    - Precios combustible Colombia 2025: $14,000-$18,000 COP/Galon (NUNCA $14 COP)
    - Unidad de medida: "Gln" (galones)
    - IVA combustible: generalmente 0% o exento (tarifa I = 0%)
10. **FORMATO MONEDA COLOMBIANA (COP) - MUY IMPORTANTE**:
    - Los pesos colombianos NO usan decimales para centavos
    - "70.285" o "70,285" = SETENTA MIL DOSCIENTOS OCHENTA Y CINCO pesos ($70,285)
    - "14.057" = CATORCE MIL CINCUENTA Y SIETE pesos ($14,057)
    - Los puntos y comas son separadores de MILES, no decimales
    - Si el total parece muy bajo (< $1,000 COP para una compra normal), es error de interpretacion
    - REGLA COMBUSTIBLE: precio/galon debe ser $10,000-$20,000 COP, total compra $30,000-$500,000 COP
    - VALIDACION: subtotal + impuestos - retenciones debe aproximarse al total
11. **IVA INCLUIDO (RECIBOS RETAIL - SUPERMERCADOS, DROGUERIAS)**:
    - CRITICO: Si SUBTOTAL = VALOR TOTAL (o muy cercanos, diferencia < 1%), el IVA YA ESTA INCLUIDO en el precio
    - Supermercados colombianos (Exito, Alkosto, Carulla, D1, Ara, Olimpica, Jumbo) muestran precios con IVA incluido
    - La seccion "DISCRIMINACION TARIFAS IMPUESTOS" es INFORMATIVA, muestra cuanto del precio ya pagado es IVA
    - En este caso:
      * subtotal = valor total pagado (precio con IVA incluido)
      * iva = 0 (ya esta incluido en el precio, NO sumar de nuevo)
      * iva_rate = 0.19 (solo para referencia)
    - DETECCION: Si ves "IVA INCLUIDO", "IVA INC", o si SUBTOTAL ≈ TOTAL, NO sumes el IVA
    - EJEMPLO: Recibo Exito con SUBTOTAL=20,380 y TOTAL=20,380 y desglose IVA=3,254 → iva debe ser 0, NO 3,254
12. **CAFETERIAS, RESTAURANTES Y BARES (IMPOCONSUMO 8%)**:
    - Negocios como SOMOS MASA, Juan Valdez, OMA, Crepes & Waffles, Starbucks, etc.
    - Tienen IMPOCONSUMO del 8% sobre productos preparados
    - ESTRUCTURA TIPICA DEL RECIBO:
      * "Total Productos" o "Subtotal Items" = suma de precios de items (puede incluir impoconsumo)
      * "Subtotal" o "Base" = valor ANTES de impoconsumo (BASE GRAVABLE)
      * "Impoconsumo" o "INC 8%" = impuesto calculado sobre la base
      * "Propina" o "Servicio Voluntario" = propina (usualmente 10%)
      * "TOTAL" = subtotal + impoconsumo + propina
    - CRITICO: Usa el valor marcado como "Subtotal" o "Base" para el campo subtotal
    - tax_inc = valor del impoconsumo mostrado
    - tax_inc_rate = 0.08 (8%)
    - tip = valor de propina/servicio voluntario
    - VALIDACION: subtotal + tax_inc + tip = TOTAL (aproximadamente)
    - EJEMPLO: SOMOS MASA con Subtotal=$148,056, Impoconsumo=$11,844, Propina=$14,806, TOTAL=$174,706
      → subtotal=148056, tax_inc=11844, tip=14806, total=174706
13. **DEDUPLICACION - UNA SOLA FACTURA POR DOCUMENTO**:
    - IMPORTANTE: Cada documento/imagen es UNA SOLA factura, NO multiples
    - Si ves informacion repetida o similar, es la MISMA factura, NO duplicarla
    - Devuelve UN SOLO objeto JSON por documento, NO un array con duplicados
    - Si el recibo tiene multiples paginas/secciones, consolidar en UNA sola factura
    - NUNCA dupliques items, totales o facturas completas

IMPORTANTE: Responde UNICAMENTE con un objeto JSON valido.

Estructura JSON requerida:
{
  "entity": "Razon Social Emisor",
  "nit": "NIT Emisor",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "Prefijo + Numero",
  "currency": "COP",
  "subtotal": 0,
  "iva": 0,
  "iva_rate": 0.19,
  "tax_inc": 0,
  "tax_inc_rate": 0.08,
  "tip": 0,
  "aiu": {
      "administracion": 0,
      "administracion_rate": 0,
      "imprevistos": 0,
      "imprevistos_rate": 0,
      "utilidad": 0,
      "utilidad_rate": 0,
      "base_gravable": 0
  },
  "retentions": {
      "reteFuente": 0,
      "reteFuente_rate": 0,
      "reteIca": 0,
      "reteIca_rate": 0,
      "reteIva": 0
  },
  "total": 0,
  "items": [
    {
      "description": "Nombre producto/servicio",
      "quantity": 1,
      "unitOfMeasure": "Und",
      "unitPrice": 0,
      "discount": 0,
      "discountPercentage": 0,
      "total": 0,
      "category": "Categoria + Codigo PUC",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95
}

NOTAS:
- iva_rate, tax_inc_rate, reteFuente_rate, reteIca_rate: son las tasas como decimal (0.19 = 19%, 0.08 = 8%)
- Si no puedes determinar la tasa, usa 0
- unitOfMeasure: Unidad de medida detectada (default "Und" si no es explicito)
- discount: Descuento absoluto en COP (ej: 5000 = $5,000 de descuento)
- discountPercentage: Descuento como decimal (0.10 = 10%). Si hay %, calcula discount = unitPrice * quantity * discountPercentage
- AIU: Solo incluir si detectas estructura AIU (construccion/servicios). Omitir si no hay AIU.
- AIU.base_gravable = subtotal + administracion + imprevistos + utilidad
- Si hay AIU, el IVA debe calcularse sobre base_gravable, no sobre subtotal
- Verifica internamente: total_item = (quantity * unitPrice) - discount
- Verifica internamente que la suma de items = subtotal antes de responder
- Si detectas inconsistencias matematicas, ajusta confidence a < 0.7
`;

const TEXT_EXTRACTION_PROMPT = `Analiza el texto y extrae facturas/gastos en JSON.

OBJETIVO: Agrupar por proveedor, extraer NITs, DETALLES TRIBUTARIOS, PROPINAS, TASAS de impuestos y AIU.

TEXTO A ANALIZAR:
{TEXT_CONTENT}

EXTRACCION DE ITEMS:
- Sin cantidad explicita = asumir cantidad = 1
- Detecta UNIDADES: "Und", "Kg", "Lt", "Gln", "Hrs", "Svc", "Caja", "Paq"
- Detecta DESCUENTOS: "Desc", "Dscto", "-XX%"
- VERIFICA: total = (quantity * unitPrice) - discount

AIU (FACTURAS CONSTRUCCION/SERVICIOS):
- Busca "Administración", "Imprevistos", "Utilidad", "A.I.U"
- Si hay AIU: base_gravable = subtotal + A + I + U

ESTACIONES DE SERVICIO (EDS/GASOLINERAS):
- CRITICO: "ESTACION DE SERVICIO", "EDS", "GASOLINERA" = nombre del PROVEEDOR
- "CLIENTE:", "NIT CLIENTE:" = datos del COMPRADOR (NO del vendedor)
- Productos: "CORRIENTE", "EXTRA", "DIESEL", "ACPM"
- Precios combustible: $14,000-$18,000 COP/Galon (nunca $14 COP)
- Unidad: "Gln", IVA: generalmente 0%

FORMATO MONEDA COP (IMPORTANTE):
- Pesos colombianos NO tienen decimales
- "70.285" = $70,285 COP (setenta mil)
- "14.057" = $14,057 COP (catorce mil)
- Puntos/comas son separadores de MILES
- Si total < $1,000 para compra normal, es error de interpretacion

IVA INCLUIDO (SUPERMERCADOS, RETAIL):
- CRITICO: Si SUBTOTAL = TOTAL (diferencia < 1%), el IVA ya esta incluido en el precio
- Supermercados (Exito, Alkosto, Carulla, D1, Ara, Olimpica) = precios con IVA incluido
- "DISCRIMINACION TARIFAS" es informativa, NO sumar ese IVA al total
- Si SUBTOTAL ≈ TOTAL: iva = 0 (ya incluido)

CAFETERIAS, RESTAURANTES Y BARES (IMPOCONSUMO 8%):
- SOMOS MASA, Juan Valdez, OMA, Crepes & Waffles, Starbucks = Impoconsumo 8%
- ESTRUCTURA: "Subtotal/Base" + "Impoconsumo" + "Propina" = "TOTAL"
- subtotal = valor de "Subtotal" o "Base" (ANTES de impoconsumo)
- tax_inc = valor del impoconsumo
- tip = propina/servicio voluntario
- VALIDACION: subtotal + tax_inc + tip ≈ TOTAL
- EJEMPLO: Subtotal=$148,056 + Impoconsumo=$11,844 + Propina=$14,806 = TOTAL=$174,706

DEDUPLICACION:
- Cada documento es UNA SOLA factura
- NO dupliques facturas, items ni totales
- Devuelve UN objeto por documento, NO arrays con duplicados

Responde UNICAMENTE con un ARRAY JSON. Estructura por factura:
{
  "entity": "Nombre Empresa",
  "nit": "NIT",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "N Factura",
  "currency": "COP",
  "subtotal": 0,
  "iva": 0,
  "iva_rate": 0.19,
  "tax_inc": 0,
  "tax_inc_rate": 0.08,
  "tip": 0,
  "aiu": {
    "administracion": 0,
    "administracion_rate": 0,
    "imprevistos": 0,
    "imprevistos_rate": 0,
    "utilidad": 0,
    "utilidad_rate": 0,
    "base_gravable": 0
  },
  "retentions": {
    "reteFuente": 0,
    "reteFuente_rate": 0,
    "reteIca": 0,
    "reteIca_rate": 0,
    "reteIva": 0
  },
  "total": 0,
  "items": [
    {
      "description": "Nombre producto/servicio",
      "quantity": 1,
      "unitOfMeasure": "Und",
      "unitPrice": 0,
      "discount": 0,
      "discountPercentage": 0,
      "total": 0,
      "category": "Categoria",
      "confidence": 0.9
    }
  ],
  "confidence": 0.9
}

NOTAS:
- Las tasas (iva_rate, tax_inc_rate, etc.) son decimales: 0.19 = 19%
- unitOfMeasure: "Und" por defecto si no se detecta otra unidad
- discount: Descuento absoluto en COP. Si hay %, calcula: unitPrice * quantity * discountPercentage
- AIU: Solo incluir si detectas estructura AIU. Omitir si no hay.
- Verifica que (quantity x unitPrice) - discount = total por item
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
                    // Build the OCR result
                    const ocrResult: OCRResult = {
                        fileName: `Texto pegado (${idx + 1})`,
                        entity: item.entity || 'Desconocido',
                        nit: item.nit || '',
                        date: item.date || new Date().toISOString().split('T')[0],
                        invoiceNumber: item.invoiceNumber || '',
                        currency: item.currency || 'COP',
                        subtotal: item.subtotal || 0,
                        iva: item.iva || 0,
                        iva_rate: item.iva_rate,
                        tax_inc: item.tax_inc || 0,
                        tax_inc_rate: item.tax_inc_rate,
                        tip: item.tip || 0,
                        // AIU (only include if present with non-zero values)
                        aiu: item.aiu && (item.aiu.administracion > 0 || item.aiu.imprevistos > 0 || item.aiu.utilidad > 0) ? {
                            administracion: item.aiu.administracion || 0,
                            administracion_rate: item.aiu.administracion_rate,
                            imprevistos: item.aiu.imprevistos || 0,
                            imprevistos_rate: item.aiu.imprevistos_rate,
                            utilidad: item.aiu.utilidad || 0,
                            utilidad_rate: item.aiu.utilidad_rate,
                            base_gravable: item.aiu.base_gravable || ((item.subtotal || 0) + (item.aiu.administracion || 0) + (item.aiu.imprevistos || 0) + (item.aiu.utilidad || 0)),
                        } : undefined,
                        retentions: {
                            reteFuente: item.retentions?.reteFuente || 0,
                            reteFuente_rate: item.retentions?.reteFuente_rate,
                            reteIca: item.retentions?.reteIca || 0,
                            reteIca_rate: item.retentions?.reteIca_rate,
                            reteIva: item.retentions?.reteIva || 0,
                        },
                        total: item.total || 0,
                        items: (item.items || []).map((i: OCRItem) => ({
                            description: i.description || '',
                            quantity: i.quantity || 1,
                            unitOfMeasure: i.unitOfMeasure || 'Und',
                            unitPrice: i.unitPrice || 0,
                            discount: i.discount || 0,
                            discountPercentage: i.discountPercentage || 0,
                            total: i.total || 0,
                            category: i.category || '',
                            confidence: i.confidence || 0.8
                        })),
                        confidence: item.confidence || 0.7,
                        tokens_input: idx === 0 ? tokensInput : 0,
                        tokens_output: idx === 0 ? tokensOutput : 0,
                        cost_estimated: idx === 0 ? costEstimated : 0
                    };

                    // Run calculation validation
                    ocrResult.validation = validateOCRResult(ocrResult);

                    results.push(ocrResult);
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

                // Build the OCR result
                const ocrResult: OCRResult = {
                    fileName: file.name,
                    entity: parsed.entity || 'Desconocido',
                    nit: parsed.nit || '',
                    date: parsed.date || new Date().toISOString().split('T')[0],
                    invoiceNumber: parsed.invoiceNumber || '',
                    currency: parsed.currency || 'COP',
                    subtotal: parsed.subtotal || 0,
                    iva: parsed.iva || 0,
                    iva_rate: parsed.iva_rate,
                    tax_inc: parsed.tax_inc || 0,
                    tax_inc_rate: parsed.tax_inc_rate,
                    tip: parsed.tip || 0,
                    // AIU (only include if present with non-zero values)
                    aiu: parsed.aiu && (parsed.aiu.administracion > 0 || parsed.aiu.imprevistos > 0 || parsed.aiu.utilidad > 0) ? {
                        administracion: parsed.aiu.administracion || 0,
                        administracion_rate: parsed.aiu.administracion_rate,
                        imprevistos: parsed.aiu.imprevistos || 0,
                        imprevistos_rate: parsed.aiu.imprevistos_rate,
                        utilidad: parsed.aiu.utilidad || 0,
                        utilidad_rate: parsed.aiu.utilidad_rate,
                        base_gravable: parsed.aiu.base_gravable || ((parsed.subtotal || 0) + (parsed.aiu.administracion || 0) + (parsed.aiu.imprevistos || 0) + (parsed.aiu.utilidad || 0)),
                    } : undefined,
                    retentions: {
                        reteFuente: parsed.retentions?.reteFuente || 0,
                        reteFuente_rate: parsed.retentions?.reteFuente_rate,
                        reteIca: parsed.retentions?.reteIca || 0,
                        reteIca_rate: parsed.retentions?.reteIca_rate,
                        reteIva: parsed.retentions?.reteIva || 0,
                    },
                    total: parsed.total || 0,
                    items: (parsed.items || []).map((i: OCRItem) => ({
                        description: i.description || '',
                        quantity: i.quantity || 1,
                        unitOfMeasure: i.unitOfMeasure || 'Und',
                        unitPrice: i.unitPrice || 0,
                        discount: i.discount || 0,
                        discountPercentage: i.discountPercentage || 0,
                        total: i.total || 0,
                        category: i.category || '',
                        confidence: i.confidence || 0.8
                    })),
                    confidence: parsed.confidence || 0.5,
                    tokens_input: tokensInput,
                    tokens_output: tokensOutput,
                    cost_estimated: costEstimated
                };

                // Run calculation validation
                ocrResult.validation = validateOCRResult(ocrResult);

                results.push(ocrResult);
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
