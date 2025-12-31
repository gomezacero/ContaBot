'use client';

import { useState } from 'react';
import { ChevronDown, AlertCircle, AlertTriangle, Info, Calculator, CheckCircle } from 'lucide-react';
import type { ValidationResult, ValidationError } from '@/types/ocr';

interface ValidationDetailsProps {
    validation: ValidationResult;
}

/**
 * Format currency in Colombian Pesos
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
 * Get icon for validation severity
 */
function SeverityIcon({ severity }: { severity: ValidationError['severity'] }) {
    switch (severity) {
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
        case 'warning':
            return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
        case 'info':
            return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
}

/**
 * Get background color class for severity
 */
function getSeverityBgClass(severity: ValidationError['severity']): string {
    switch (severity) {
        case 'error':
            return 'bg-red-50 border-red-200';
        case 'warning':
            return 'bg-amber-50 border-amber-200';
        case 'info':
            return 'bg-blue-50 border-blue-200';
    }
}

/**
 * Get text color class for severity
 */
function getSeverityTextClass(severity: ValidationError['severity']): string {
    switch (severity) {
        case 'error':
            return 'text-red-800';
        case 'warning':
            return 'text-amber-800';
        case 'info':
            return 'text-blue-800';
    }
}

/**
 * Expandable panel showing detailed validation results
 */
export function ValidationDetails({ validation }: ValidationDetailsProps) {
    const [expanded, setExpanded] = useState(false);

    // Don't render if everything is valid
    if (validation.isValid && validation.warnings.length === 0) {
        return null;
    }

    const allIssues = [...validation.errors, ...validation.warnings];

    return (
        <div className="mt-3 border border-amber-200 rounded-xl overflow-hidden bg-amber-50/50">
            {/* Header - clickable to expand/collapse */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-amber-800 hover:bg-amber-100/50 transition-colors"
            >
                <span className="flex items-center gap-2 text-xs font-bold">
                    <Calculator className="w-4 h-4" />
                    Validacion de Calculos
                    {validation.errors.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">
                            {validation.errors.length} {validation.errors.length === 1 ? 'error' : 'errores'}
                        </span>
                    )}
                    {validation.warnings.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                            {validation.warnings.length} {validation.warnings.length === 1 ? 'alerta' : 'alertas'}
                        </span>
                    )}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Expandable content */}
            {expanded && (
                <div className="px-4 py-3 border-t border-amber-200 space-y-3 text-xs">
                    {/* Validation issues */}
                    {allIssues.map((issue, idx) => (
                        <div
                            key={`issue-${idx}`}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border ${getSeverityBgClass(issue.severity)}`}
                        >
                            <SeverityIcon severity={issue.severity} />
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold ${getSeverityTextClass(issue.severity)}`}>
                                    {issue.field}
                                </p>
                                <p className={`mt-0.5 ${getSeverityTextClass(issue.severity)} opacity-90`}>
                                    {issue.message}
                                </p>
                                {issue.expected !== undefined && issue.found !== undefined && (
                                    <div className="mt-1.5 pt-1.5 border-t border-current/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
                                        <span>Esperado: <strong>{formatCurrency(issue.expected)}</strong></span>
                                        <span>Encontrado: <strong>{formatCurrency(issue.found)}</strong></span>
                                        {issue.difference !== undefined && (
                                            <span>Diferencia: <strong>{formatCurrency(issue.difference)}</strong></span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Calculation Summary */}
                    <div className="mt-4 pt-3 border-t border-amber-300/50">
                        <p className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5" />
                            Resumen de Validacion
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-amber-800 bg-amber-100/50 rounded-lg p-3">
                            <span className="text-amber-700">Subtotal Calculado:</span>
                            <span className="text-right font-mono font-medium">
                                {formatCurrency(validation.subtotalValidation.calculatedSubtotal)}
                            </span>

                            <span className="text-amber-700">Subtotal Declarado:</span>
                            <span className="text-right font-mono font-medium">
                                {formatCurrency(validation.subtotalValidation.declaredSubtotal)}
                            </span>

                            <span className="text-amber-700">Total Calculado:</span>
                            <span className="text-right font-mono font-medium">
                                {formatCurrency(validation.totalValidation.calculatedTotal)}
                            </span>

                            <span className="text-amber-700">Total Declarado:</span>
                            <span className="text-right font-mono font-medium">
                                {formatCurrency(validation.totalValidation.declaredTotal)}
                            </span>

                            <span className="text-amber-700 pt-2 border-t border-amber-200">Confianza Ajustada:</span>
                            <span className="text-right font-mono font-bold pt-2 border-t border-amber-200">
                                {Math.round(validation.overallConfidence * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Compact inline validation summary
 */
export function ValidationSummary({ validation }: { validation?: ValidationResult }) {
    if (!validation) return null;

    if (validation.isValid && validation.warnings.length === 0) {
        return (
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Calculos verificados</span>
            </div>
        );
    }

    const issues = validation.errors.length + validation.warnings.length;
    return (
        <div className="flex items-center gap-1.5 text-amber-600 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{issues} {issues === 1 ? 'discrepancia' : 'discrepancias'} detectadas</span>
        </div>
    );
}
