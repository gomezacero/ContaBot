# Informe de Costos: Modelos de IA para ContaBot OCR

**Fecha:** 29 de Diciembre, 2025
**Preparado para:** Evaluación del Modelo Financiero
**Módulo analizado:** OCR de Documentos Contables

---

## 1. Estado Actual de la Aplicación

| Configuración | Valor |
|---------------|-------|
| **Modelo Actual** | Google Gemini 2.0 Flash |
| **API Endpoint** | `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash` |
| **Archivo de configuración** | `/app/api/ocr/route.ts` |
| **Temperature** | 0.1 (determinístico para OCR) |
| **Max Output Tokens** | 8,192 |
| **Formatos soportados** | JPG, PNG, WebP, PDF |

---

## 2. Comparativa de Precios por Modelo

### Precios por 1 Millón de Tokens

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Contexto Máximo |
|--------|---------------------|----------------------|-----------------|
| **Gemini 2.0 Flash** ⭐ (actual) | **$0.10** | **$0.40** | 1M tokens |
| Gemini 2.0 Flash-Lite | $0.075 | $0.30 | 1M tokens |
| Gemini 1.5 Flash | $0.075 | $0.30 | 1M tokens |
| Gemini 1.5 Pro | $1.25 | $5.00 | 2M tokens |
| **Gemini 2.5 Pro** | $1.25 | $10.00 | 1M tokens |
| Claude Haiku 3.5 | $0.80 | $4.00 | 200K tokens |
| Claude Sonnet 4 | $3.00 | $15.00 | 1M tokens |
| Claude Opus 4.5 | $5.00 | $25.00 | 200K tokens |

> **Nota:** Los precios de Gemini son para prompts ≤200K tokens. Prompts mayores tienen tarifa 2x.

---

## 3. Tokenización de Imágenes y PDFs

### Reglas de Tokenización (Gemini)

Los tokens de imagen **NO se calculan por tamaño de archivo (MB)** sino por **dimensiones de píxeles**.

| Tipo de Contenido | Tokens Consumidos |
|-------------------|-------------------|
| Imagen ≤ 384x384 px | ~258 tokens |
| Imagen 768x768 px (1 tile) | ~258 tokens |
| Imagen 1024x1024 px | ~1,290 tokens |
| Imagen 2000x3000 px | ~2,580 tokens |
| **PDF por página** | ~258-560 tokens/página |

### Fórmula para Imágenes Grandes

Para imágenes mayores a 384px en ambas dimensiones:
1. Calcular unidad de recorte: `floor(min(ancho, alto) / 1.5)`
2. Dividir cada dimensión por la unidad de recorte
3. Multiplicar para obtener número de tiles
4. **Tokens = tiles × 258**

---

## 4. Escenario de Carga Pesada (Archivo 3-10 MB)

### Suposiciones del Escenario

| Parámetro | Valor |
|-----------|-------|
| Archivo | PDF de 10 páginas (~5,000 tokens input) |
| Prompt OCR | ~500 tokens input |
| Respuesta JSON | ~2,000 tokens output |
| **Total por request** | **~5,500 tokens input + ~2,000 tokens output** |

### Costo por Request Individual

| Modelo | Costo Input | Costo Output | **Total/Request** | vs. Actual |
|--------|-------------|--------------|-------------------|------------|
| **Gemini 2.0 Flash** ⭐ | $0.00055 | $0.0008 | **$0.00135** | Baseline |
| Gemini 2.0 Flash-Lite | $0.00041 | $0.0006 | **$0.00101** | -25% |
| Gemini 1.5 Pro | $0.00688 | $0.01 | **$0.01688** | +1,150% |
| **Gemini 2.5 Pro** | $0.00688 | $0.02 | **$0.02688** | +1,890% |
| Claude Haiku 3.5 | $0.0044 | $0.008 | **$0.0124** | +819% |
| Claude Sonnet 4 | $0.0165 | $0.03 | **$0.0465** | +3,344% |
| Claude Opus 4.5 | $0.0275 | $0.05 | **$0.0775** | +5,640% |

---

## 5. Proyección de Costos Mensuales

### Límites de Uso por Plan ContaBot

| Plan | Requests Diarios | Archivos/Mes | Max Archivo | Max Request Total |
|------|------------------|--------------|-------------|-------------------|
| **FREEMIUM** | 10 | 100 | 10 MB | 30 MB |
| **PRO** | 100 | 1,000 | 25 MB | 100 MB |
| **ENTERPRISE** | 1,000 | 10,000 | 50 MB | 500 MB |

### Costo API Mensual con Gemini 2.0 Flash (Actual)

| Plan | Archivos/Mes | Costo API/Mes |
|------|--------------|---------------|
| **FREEMIUM** | 100 | **~$0.14** |
| **PRO** | 1,000 | **~$1.35** |
| **ENTERPRISE** | 10,000 | **~$13.50** |

### Comparativa: Plan PRO (1,000 archivos/mes)

| Modelo | Costo Mensual | Diferencia vs. Actual |
|--------|---------------|----------------------|
| **Gemini 2.0 Flash** ⭐ | **$1.35** | Baseline |
| Gemini 2.0 Flash-Lite | $1.01 | -25% ($0.34 menos) |
| Gemini 1.5 Pro | $16.88 | +1,150% ($15.53 más) |
| **Gemini 2.5 Pro** | $26.88 | +1,890% ($25.53 más) |
| Claude Haiku 3.5 | $12.40 | +819% ($11.05 más) |
| Claude Sonnet 4 | $46.50 | +3,344% ($45.15 más) |
| Claude Opus 4.5 | $77.50 | +5,640% ($76.15 más) |

---

## 6. Análisis por Modelo

### Gemini 2.0 Flash (Actual) - ⭐ RECOMENDADO

**Ventajas:**
- ✅ Mejor relación costo/rendimiento para OCR
- ✅ Soporte nativo para imágenes y PDFs
- ✅ 1M token context window
- ✅ Costos prácticamente negligibles (~$0.001/documento)
- ✅ Respuestas rápidas (optimizado para velocidad)

**Desventajas:**
- ⚠️ Calidad puede ser inferior en documentos muy complejos
- ⚠️ Menor capacidad de razonamiento que modelos Pro

**Caso de uso ideal:** OCR de documentos estándar (facturas, recibos, comprobantes)

---

### Gemini 2.5 Pro - Alternativa Premium

**Ventajas:**
- ✅ Mejor razonamiento y precisión
- ✅ "Thinking" tokens incluidos sin costo extra
- ✅ Mejor manejo de documentos complejos

**Desventajas:**
- ⚠️ **20x más caro** que 2.0 Flash
- ⚠️ Mayor latencia

**Caso de uso ideal:** Documentos complejos que requieran análisis profundo o fallback para errores

---

### Claude (Haiku/Sonnet/Opus)

**Ventajas:**
- ✅ Excelente precisión de extracción
- ✅ Mejor seguimiento de instrucciones estructuradas
- ✅ Superior en tareas que requieren razonamiento

**Desventajas:**
- ⚠️ **9-57x más caro** que Gemini 2.0 Flash
- ⚠️ Límites de imágenes por request más restrictivos
- ⚠️ Contexto máximo menor (excepto Sonnet 4)

**Caso de uso ideal:** Aplicaciones donde la precisión es crítica y el costo no es factor limitante

---

## 7. Recomendaciones

### Recomendación Principal

**Mantener Gemini 2.0 Flash** como modelo principal. Los costos son mínimos:

| Métrica | Valor |
|---------|-------|
| Costo por documento | ~$0.001 |
| Costo mensual Plan PRO | ~$1.35 |
| Costo mensual Plan ENTERPRISE | ~$13.50 |

### Estrategia Híbrida (Opcional)

Si se requiere mayor precisión en casos específicos:

1. **Default:** Gemini 2.0 Flash (99% de requests)
2. **Fallback:** Gemini 2.5 Pro para:
   - Documentos que fallen en primera extracción
   - Confidence score < 0.7
   - Documentos marcados como "complejos"

**Costo estimado estrategia híbrida (Plan PRO):**
- 95% requests con 2.0 Flash: ~$1.28
- 5% fallback con 2.5 Pro: ~$1.34
- **Total: ~$2.62/mes** (vs $26.88 si todo fuera 2.5 Pro)

---

## 8. Resumen Ejecutivo

| Aspecto | Estado Actual | Recomendación |
|---------|---------------|---------------|
| **Modelo** | Gemini 2.0 Flash | ✅ Mantener |
| **Costo/documento** | ~$0.001 | Óptimo |
| **Escalabilidad** | Excelente | - |
| **Calidad OCR** | Buena | Suficiente para facturas |
| **Alternativa sugerida** | - | Gemini 2.5 Pro como fallback |

### Conclusión

El modelo actual (Gemini 2.0 Flash) es **óptimo** para las necesidades de ContaBot:

- **Costo mínimo:** ~$0.001 por documento procesado
- **Alta escalabilidad:** 10,000 documentos/mes por solo $13.50
- **Funcionalidad adecuada:** Cumple con extracción OCR estructurada

**No se recomienda cambiar de modelo** a menos que se identifiquen problemas de calidad específicos que justifiquen el incremento de costos.

---

## 9. Fuentes

- [Gemini Developer API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Claude Pricing Documentation](https://platform.claude.com/docs/en/about-claude/pricing)
- [Gemini Token Calculation](https://ai.google.dev/gemini-api/docs/tokens)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)

---

*Documento generado con ContaBot - www.contabot.co*
