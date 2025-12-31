/**
 * OCR Validation Service
 * Validates mathematical consistency of extracted invoice data
 * without additional API costs (client-side validation)
 */

import type {
    OCRResult,
    OCRItem,
    ValidationResult,
    ValidationError,
    ItemValidation,
    TaxValidation,
    SubtotalValidation,
    TotalValidation,
    ValidationSeverity,
} from '@/types/ocr';

// ============================================
// Colombian Tax Rate Constants
// ============================================

export const COLOMBIAN_TAX_RATES = {
    // IVA (Impuesto al Valor Agregado)
    IVA_STANDARD: 0.19,      // 19% standard rate
    IVA_REDUCED: 0.05,       // 5% reduced rate
    IVA_EXEMPT: 0,           // 0% exempt

    // Impoconsumo rates
    IMPOCONSUMO_4: 0.04,     // 4% (telephony, data)
    IMPOCONSUMO_8: 0.08,     // 8% (restaurants, bars)
    IMPOCONSUMO_16: 0.16,    // 16% (vehicles)

    // ReteFuente (Withholding tax) common rates
    RETE_FUENTE_RATES: [
        0.005,  // 0.5%
        0.01,   // 1%
        0.015,  // 1.5%
        0.02,   // 2%
        0.025,  // 2.5%
        0.03,   // 3%
        0.035,  // 3.5%
        0.04,   // 4%
        0.06,   // 6%
        0.07,   // 7%
        0.10,   // 10%
        0.11,   // 11%
    ],

    // ReteIVA (IVA withholding)
    RETE_IVA_STANDARD: 0.15, // 15% of IVA

    // ReteICA range (varies by municipality)
    RETE_ICA_MIN: 0.002,     // 0.2%
    RETE_ICA_MAX: 0.014,     // 1.4%
};

// ============================================
// Validation Tolerances
// ============================================

const TOLERANCE = {
    // Absolute tolerance for rounding differences (in COP)
    ABSOLUTE: 1,
    // Percentage tolerance for OCR misreads
    PERCENTAGE: 0.02,        // 2%
    // Higher tolerance for tax calculations
    TAX_PERCENTAGE: 0.05,    // 5%
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format currency for display in error messages
 */
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
}

/**
 * Check if two values are equal within tolerance
 */
function isWithinTolerance(
    calculated: number,
    declared: number,
    absoluteTolerance: number = TOLERANCE.ABSOLUTE,
    percentageTolerance: number = TOLERANCE.PERCENTAGE
): boolean {
    const absDiff = Math.abs(calculated - declared);
    const percentDiff = declared !== 0 ? absDiff / Math.abs(declared) : (calculated !== 0 ? 1 : 0);

    return absDiff <= absoluteTolerance || percentDiff <= percentageTolerance;
}

/**
 * Determine severity based on percentage difference
 */
function getSeverity(percentageDiff: number): ValidationSeverity {
    if (percentageDiff > 0.1) return 'error';      // > 10% difference
    if (percentageDiff > 0.02) return 'warning';   // > 2% difference
    return 'info';
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate line item calculations: (quantity × unitPrice) - discount = total
 *
 * Supports:
 * - Absolute discount (discount field in COP)
 * - Percentage discount (discountPercentage as decimal, e.g., 0.10 = 10%)
 * - Unit of measure (for display purposes)
 */
function validateLineItems(items: OCRItem[]): ItemValidation[] {
    return items.map((item, index) => {
        const errors: ValidationError[] = [];

        // Calculate gross total before discount
        const grossTotal = item.quantity * item.unitPrice;

        // Calculate discount amount
        // If discountPercentage is provided, calculate: grossTotal * discountPercentage
        // Otherwise use the absolute discount value
        let discountAmount = item.discount || 0;
        if (item.discountPercentage && item.discountPercentage > 0) {
            discountAmount = grossTotal * item.discountPercentage;
        }

        // Calculate net total: gross - discount
        const calculatedTotal = grossTotal - discountAmount;
        const difference = Math.abs(calculatedTotal - item.total);
        const percentageDiff = item.total !== 0 ? difference / item.total : (calculatedTotal !== 0 ? 1 : 0);

        if (!isWithinTolerance(calculatedTotal, item.total)) {
            // Build descriptive message based on presence of discount
            let message = `"${item.description}": ${item.quantity}`;

            // Add unit of measure if not default
            if (item.unitOfMeasure && item.unitOfMeasure !== 'Und') {
                message += ` ${item.unitOfMeasure}`;
            }

            message += ` x ${formatCurrency(item.unitPrice)}`;

            // Add discount info if present
            if (discountAmount > 0) {
                if (item.discountPercentage && item.discountPercentage > 0) {
                    message += ` - ${(item.discountPercentage * 100).toFixed(0)}% (${formatCurrency(discountAmount)})`;
                } else {
                    message += ` - ${formatCurrency(discountAmount)}`;
                }
            }

            message += ` = ${formatCurrency(calculatedTotal)}, declarado: ${formatCurrency(item.total)}`;

            errors.push({
                field: `items[${index}].total`,
                message,
                severity: getSeverity(percentageDiff),
                expected: calculatedTotal,
                found: item.total,
                difference,
                percentageDiff,
            });
        }

        return {
            index,
            description: item.description,
            isValid: errors.length === 0,
            calculatedTotal,
            errors,
        };
    });
}

/**
 * Validate subtotal: sum of items = declared subtotal
 */
function validateSubtotal(
    result: OCRResult,
    itemValidations: ItemValidation[]
): SubtotalValidation {
    const errors: ValidationError[] = [];

    // Calculate subtotal from items (use calculated totals to catch cascading errors)
    const calculatedSubtotal = itemValidations.reduce(
        (sum, iv) => sum + iv.calculatedTotal,
        0
    );
    const declaredSubtotal = result.subtotal || 0;
    const difference = Math.abs(calculatedSubtotal - declaredSubtotal);
    const percentageDiff = declaredSubtotal !== 0 ? difference / declaredSubtotal : 0;

    // Only validate if there are items to sum
    if (result.items.length > 0 && !isWithinTolerance(calculatedSubtotal, declaredSubtotal)) {
        errors.push({
            field: 'subtotal',
            message: `Suma de items: ${formatCurrency(calculatedSubtotal)}, subtotal declarado: ${formatCurrency(declaredSubtotal)}`,
            severity: getSeverity(percentageDiff),
            expected: calculatedSubtotal,
            found: declaredSubtotal,
            difference,
            percentageDiff,
        });
    }

    return {
        isValid: errors.length === 0,
        calculatedSubtotal,
        declaredSubtotal,
        errors,
    };
}

/**
 * Validate tax calculations against Colombian rates
 * Note: When AIU is present, IVA is calculated on base_gravable (subtotal + A + I + U)
 */
function validateTaxes(result: OCRResult): TaxValidation[] {
    const validations: TaxValidation[] = [];
    const subtotal = result.subtotal || 0;

    // Calculate the taxable base for IVA
    // If AIU is present, IVA is calculated on (subtotal + A + I + U), not just subtotal
    const aiuTotal = result.aiu
        ? (result.aiu.administracion || 0) + (result.aiu.imprevistos || 0) + (result.aiu.utilidad || 0)
        : 0;
    const baseGravable = result.aiu?.base_gravable || (subtotal + aiuTotal);

    // IVA Validation
    if (result.iva && result.iva > 0 && baseGravable > 0) {
        const errors: ValidationError[] = [];
        // For AIU invoices, calculate rate against base_gravable, not subtotal
        const calculatedRate = result.iva / baseGravable;
        const declaredRate = result.iva_rate;

        // Check if rate matches known Colombian IVA rates
        const isStandardRate = Math.abs(calculatedRate - COLOMBIAN_TAX_RATES.IVA_STANDARD) < 0.02;
        const isReducedRate = Math.abs(calculatedRate - COLOMBIAN_TAX_RATES.IVA_REDUCED) < 0.01;
        const matchesDeclared = declaredRate !== undefined &&
            Math.abs(calculatedRate - declaredRate) < 0.01;

        if (!isStandardRate && !isReducedRate && !matchesDeclared && calculatedRate > 0.01) {
            const baseLabel = result.aiu ? 'base gravable (AIU)' : 'subtotal';
            errors.push({
                field: 'iva',
                message: `Tasa IVA calculada: ${formatPercentage(calculatedRate)} sobre ${baseLabel} (esperado: 19% o 5%)`,
                severity: 'warning',
                expected: baseGravable * COLOMBIAN_TAX_RATES.IVA_STANDARD,
                found: result.iva,
                percentageDiff: calculatedRate,
            });
        }

        validations.push({
            taxType: 'iva',
            isValid: errors.length === 0,
            declaredRate,
            calculatedRate,
            expectedValue: baseGravable * COLOMBIAN_TAX_RATES.IVA_STANDARD,
            errors,
        });
    }

    // Impoconsumo Validation
    if (result.tax_inc && result.tax_inc > 0 && subtotal > 0) {
        const errors: ValidationError[] = [];
        const calculatedRate = result.tax_inc / subtotal;
        const declaredRate = result.tax_inc_rate;

        const validRates = [
            COLOMBIAN_TAX_RATES.IMPOCONSUMO_4,
            COLOMBIAN_TAX_RATES.IMPOCONSUMO_8,
            COLOMBIAN_TAX_RATES.IMPOCONSUMO_16,
        ];
        const isValidRate = validRates.some(r => Math.abs(calculatedRate - r) < 0.01);
        const matchesDeclared = declaredRate !== undefined &&
            Math.abs(calculatedRate - declaredRate) < 0.01;

        if (!isValidRate && !matchesDeclared) {
            errors.push({
                field: 'tax_inc',
                message: `Tasa Impoconsumo calculada: ${formatPercentage(calculatedRate)} (esperado: 4%, 8% o 16%)`,
                severity: 'warning',
                found: result.tax_inc,
                percentageDiff: calculatedRate,
            });
        }

        validations.push({
            taxType: 'tax_inc',
            isValid: errors.length === 0,
            declaredRate,
            calculatedRate,
            errors,
        });
    }

    // ReteFuente Validation
    if (result.retentions?.reteFuente && result.retentions.reteFuente > 0 && subtotal > 0) {
        const errors: ValidationError[] = [];
        const calculatedRate = result.retentions.reteFuente / subtotal;
        const declaredRate = result.retentions.reteFuente_rate;

        const isValidRate = COLOMBIAN_TAX_RATES.RETE_FUENTE_RATES.some(
            r => Math.abs(calculatedRate - r) < 0.005
        );
        const matchesDeclared = declaredRate !== undefined &&
            Math.abs(calculatedRate - declaredRate) < 0.005;

        if (!isValidRate && !matchesDeclared && calculatedRate > 0.005) {
            errors.push({
                field: 'retentions.reteFuente',
                message: `Tasa ReteFuente: ${formatPercentage(calculatedRate)}`,
                severity: 'info', // Info level since rates vary widely
                found: result.retentions.reteFuente,
                percentageDiff: calculatedRate,
            });
        }

        validations.push({
            taxType: 'reteFuente',
            isValid: errors.length === 0,
            declaredRate,
            calculatedRate,
            errors,
        });
    }

    // ReteICA Validation
    if (result.retentions?.reteIca && result.retentions.reteIca > 0 && subtotal > 0) {
        const errors: ValidationError[] = [];
        const calculatedRate = result.retentions.reteIca / subtotal;
        const declaredRate = result.retentions.reteIca_rate;

        const isInRange = calculatedRate >= COLOMBIAN_TAX_RATES.RETE_ICA_MIN - 0.001 &&
            calculatedRate <= COLOMBIAN_TAX_RATES.RETE_ICA_MAX + 0.001;
        const matchesDeclared = declaredRate !== undefined &&
            Math.abs(calculatedRate - declaredRate) < 0.002;

        if (!isInRange && !matchesDeclared) {
            errors.push({
                field: 'retentions.reteIca',
                message: `Tasa ReteICA: ${formatPercentage(calculatedRate)} (rango esperado: 0.2% - 1.4%)`,
                severity: 'warning',
                found: result.retentions.reteIca,
                percentageDiff: calculatedRate,
            });
        }

        validations.push({
            taxType: 'reteIca',
            isValid: errors.length === 0,
            declaredRate,
            calculatedRate,
            errors,
        });
    }

    // ReteIVA Validation (should be 15% of IVA)
    if (result.retentions?.reteIva && result.retentions.reteIva > 0 && result.iva > 0) {
        const errors: ValidationError[] = [];
        const expectedReteIva = result.iva * COLOMBIAN_TAX_RATES.RETE_IVA_STANDARD;
        const difference = Math.abs(result.retentions.reteIva - expectedReteIva);
        const percentageDiff = expectedReteIva !== 0 ? difference / expectedReteIva : 0;

        if (!isWithinTolerance(result.retentions.reteIva, expectedReteIva, TOLERANCE.ABSOLUTE * 10, TOLERANCE.TAX_PERCENTAGE)) {
            errors.push({
                field: 'retentions.reteIva',
                message: `ReteIVA esperado (15% del IVA): ${formatCurrency(expectedReteIva)}, declarado: ${formatCurrency(result.retentions.reteIva)}`,
                severity: getSeverity(percentageDiff),
                expected: expectedReteIva,
                found: result.retentions.reteIva,
                difference,
                percentageDiff,
            });
        }

        validations.push({
            taxType: 'reteIva',
            isValid: errors.length === 0,
            calculatedRate: COLOMBIAN_TAX_RATES.RETE_IVA_STANDARD,
            expectedValue: expectedReteIva,
            errors,
        });
    }

    return validations;
}

/**
 * Validate total calculation:
 * WITH AIU: Total = Subtotal + AIU (A+I+U) + IVA + Impoconsumo + Propina - Retenciones
 * WITHOUT AIU: Total = Subtotal + IVA + Impoconsumo + Propina - Retenciones
 */
function validateTotal(result: OCRResult): TotalValidation {
    const errors: ValidationError[] = [];

    // Extract all components
    const subtotal = result.subtotal || 0;
    const iva = result.iva || 0;
    const taxInc = result.tax_inc || 0;
    const tip = result.tip || 0;
    const reteFuente = result.retentions?.reteFuente || 0;
    const reteIca = result.retentions?.reteIca || 0;
    const reteIva = result.retentions?.reteIva || 0;

    // AIU components (if present)
    const aiuTotal = result.aiu
        ? (result.aiu.administracion || 0) + (result.aiu.imprevistos || 0) + (result.aiu.utilidad || 0)
        : 0;

    // Calculate expected total (including AIU if present)
    const calculatedTotal = subtotal + aiuTotal + iva + taxInc + tip - reteFuente - reteIca - reteIva;
    const declaredTotal = result.total || 0;
    const difference = Math.abs(calculatedTotal - declaredTotal);
    const percentageDiff = declaredTotal !== 0 ? difference / declaredTotal : 0;

    // Use higher tolerance for total (errors can compound)
    if (!isWithinTolerance(calculatedTotal, declaredTotal, TOLERANCE.ABSOLUTE * 10, TOLERANCE.TAX_PERCENTAGE)) {
        const aiuNote = result.aiu ? ` (incluye AIU: ${formatCurrency(aiuTotal)})` : '';
        errors.push({
            field: 'total',
            message: `Total calculado: ${formatCurrency(calculatedTotal)}${aiuNote}, declarado: ${formatCurrency(declaredTotal)}`,
            severity: getSeverity(percentageDiff),
            expected: calculatedTotal,
            found: declaredTotal,
            difference,
            percentageDiff,
        });
    }

    return {
        isValid: errors.length === 0,
        calculatedTotal,
        declaredTotal,
        errors,
    };
}

/**
 * Calculate adjusted confidence based on validation results
 */
function calculateAdjustedConfidence(
    baseConfidence: number,
    errors: ValidationError[],
    warnings: ValidationError[]
): number {
    let penalty = 0;

    // Penalize for errors
    errors.forEach(e => {
        switch (e.severity) {
            case 'error':
                penalty += 0.15;
                break;
            case 'warning':
                penalty += 0.05;
                break;
            case 'info':
                penalty += 0.01;
                break;
        }
    });

    // Lighter penalty for warnings
    warnings.forEach(() => {
        penalty += 0.02;
    });

    // Clamp confidence between 0.1 and 1.0
    return Math.max(0.1, Math.min(1, baseConfidence - penalty));
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Validate an OCR extraction result for mathematical consistency
 *
 * @param result - The OCR extraction result to validate
 * @returns ValidationResult with detailed validation status and errors
 */
export function validateOCRResult(result: OCRResult): ValidationResult {
    // 1. Validate line items
    const itemValidations = validateLineItems(result.items || []);

    // 2. Validate subtotal
    const subtotalValidation = validateSubtotal(result, itemValidations);

    // 3. Validate taxes
    const taxValidations = validateTaxes(result);

    // 4. Validate total
    const totalValidation = validateTotal(result);

    // 5. Aggregate all errors and warnings
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Collect from item validations
    itemValidations.forEach(iv => {
        iv.errors.forEach(e => {
            if (e.severity === 'error') allErrors.push(e);
            else if (e.severity === 'warning') allWarnings.push(e);
        });
    });

    // Collect from subtotal validation
    subtotalValidation.errors.forEach(e => {
        if (e.severity === 'error') allErrors.push(e);
        else if (e.severity === 'warning') allWarnings.push(e);
    });

    // Collect from tax validations
    taxValidations.forEach(tv => {
        tv.errors.forEach(e => {
            if (e.severity === 'error') allErrors.push(e);
            else if (e.severity === 'warning') allWarnings.push(e);
        });
    });

    // Collect from total validation
    totalValidation.errors.forEach(e => {
        if (e.severity === 'error') allErrors.push(e);
        else if (e.severity === 'warning') allWarnings.push(e);
    });

    // 6. Calculate adjusted confidence
    const overallConfidence = calculateAdjustedConfidence(
        result.confidence || 0.5,
        allErrors,
        allWarnings
    );

    return {
        isValid: allErrors.length === 0,
        overallConfidence,
        itemValidations,
        subtotalValidation,
        taxValidations,
        totalValidation,
        errors: allErrors,
        warnings: allWarnings,
    };
}

/**
 * Quick validation check - returns true if the result passes basic validation
 */
export function isValidOCRResult(result: OCRResult): boolean {
    const validation = validateOCRResult(result);
    return validation.isValid;
}

/**
 * Get a summary string of validation errors for logging
 */
export function getValidationSummary(validation: ValidationResult): string {
    if (validation.isValid && validation.warnings.length === 0) {
        return 'Validacion exitosa';
    }

    const parts: string[] = [];

    if (validation.errors.length > 0) {
        parts.push(`${validation.errors.length} errores`);
    }

    if (validation.warnings.length > 0) {
        parts.push(`${validation.warnings.length} alertas`);
    }

    return parts.join(', ');
}
