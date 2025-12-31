'use client';

import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ValidationResult } from '@/types/ocr';

interface ValidationBadgeProps {
    validation?: ValidationResult;
    compact?: boolean;
}

/**
 * Badge component showing validation status
 * - Green checkmark for valid invoices
 * - Red badge with error count for errors
 * - Amber badge with warning count for warnings
 */
export function ValidationBadge({ validation, compact = false }: ValidationBadgeProps) {
    if (!validation) return null;

    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;

    // Valid with no warnings
    if (validation.isValid && warningCount === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                <CheckCircle className="w-3 h-3" />
                {!compact && <span>Validado</span>}
            </span>
        );
    }

    // Has errors
    if (errorCount > 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200">
                <AlertCircle className="w-3 h-3" />
                <span>{compact ? errorCount : `${errorCount} ${errorCount === 1 ? 'error' : 'errores'}`}</span>
            </span>
        );
    }

    // Has warnings only
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            <span>{compact ? warningCount : `${warningCount} ${warningCount === 1 ? 'alerta' : 'alertas'}`}</span>
        </span>
    );
}

/**
 * Compact validation indicator showing just an icon with tooltip
 */
export function ValidationIndicator({ validation }: { validation?: ValidationResult }) {
    if (!validation) return null;

    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;

    if (validation.isValid && warningCount === 0) {
        return (
            <span title="Calculos validados correctamente" className="text-green-600">
                <CheckCircle className="w-4 h-4" />
            </span>
        );
    }

    if (errorCount > 0) {
        return (
            <span title={`${errorCount} errores de calculo detectados`} className="text-red-600">
                <AlertCircle className="w-4 h-4" />
            </span>
        );
    }

    return (
        <span title={`${warningCount} alertas de calculo`} className="text-amber-600">
            <AlertTriangle className="w-4 h-4" />
        </span>
    );
}
