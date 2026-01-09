import { useState } from 'react';
import { ChevronDown, ShoppingBag, Hash, Trash2, DollarSign } from 'lucide-react';
import { OCRItem, ValidationResult } from '../types';
import { ValidationBadge } from './ValidationBadge';
import { InvoiceCard, InvoiceData } from './InvoiceCard';

// Re-export InvoiceData for use in page.tsx
export type { InvoiceData } from './InvoiceCard';

// New grouped structure with invoices array instead of flat items
export interface GroupedInvoiceData {
    nit: string;
    entity: string;
    currency: string;
    invoiceCount: number;
    // Array of individual invoices
    invoices: InvoiceData[];
    // Consolidated totals for the vendor
    totals: {
        subtotal: number;
        iva: number;
        tax_inc: number;
        tip: number;
        aiu?: {
            administracion: number;
            imprevistos: number;
            utilidad: number;
            base_gravable?: number;
        };
        retentions: {
            reteFuente: number;
            reteIca: number;
            reteIva: number;
        };
        total: number;
    };
    // First invoice's validation (for summary display)
    validation?: ValidationResult;
    // DEPRECATED: flat items array (kept for backward compatibility)
    items?: (OCRItem & { fileName: string; hasValidationError?: boolean })[];
}

interface InvoiceGroupProps {
    group: GroupedInvoiceData;
    formatCurrency: (amount: number) => string;
    onDelete?: (entity: string) => void;
    onDeleteInvoice?: (invoiceId: string, fileName: string) => void;
    onDeleteItem?: (invoiceId: string, fileName: string, itemIndex: number) => void;
}

export function InvoiceGroup({ group, formatCurrency, onDelete, onDeleteInvoice, onDeleteItem }: InvoiceGroupProps) {
    const [expanded, setExpanded] = useState(false);

    // Calculate total items across all invoices
    const totalItems = group.invoices.reduce((sum, inv) => sum + inv.items.length, 0);

    return (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Vendor Header / Summary Card */}
            <div
                onClick={() => setExpanded(!expanded)}
                className={`p-6 cursor-pointer flex flex-col md:flex-row justify-between items-center gap-4 transition-colors ${expanded ? 'bg-zinc-50' : 'bg-white hover:bg-zinc-50'}`}
            >
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${expanded ? 'bg-zinc-900 text-white' : 'bg-white border-2 border-emerald-600 text-zinc-900'}`}>
                        <ShoppingBag className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col">
                        <h4 className="font-black text-zinc-900 text-lg leading-tight">{group.entity}</h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Hash className="w-3 h-3" /> NIT: {group.nit}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {group.invoiceCount} {group.invoiceCount === 1 ? 'Factura' : 'Facturas'}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-md">
                                {totalItems} items
                            </span>
                            {group.currency === 'USD' && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> USD
                                </span>
                            )}
                            {group.validation && <ValidationBadge validation={group.validation} />}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Proveedor</p>
                        <p className="font-black text-zinc-900 text-xl text-right">
                            {formatCurrency(group.totals.total)}
                            <span className="text-xs text-zinc-400 ml-1">{group.currency || 'COP'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(group.entity);
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Eliminar todas las facturas de este proveedor"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expanded ? 'bg-emerald-600 text-white rotate-180' : 'bg-zinc-100 text-zinc-400'}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content - Nested Invoices */}
            {expanded && (
                <div className="border-t border-zinc-100 animate-slide-down">
                    {/* Invoice Cards */}
                    <div className="p-4 space-y-3">
                        {group.invoices.map((invoice, idx) => (
                            <InvoiceCard
                                key={invoice.id || `${invoice.fileName}-${idx}`}
                                invoice={invoice}
                                invoiceIndex={idx}
                                formatCurrency={formatCurrency}
                                onDeleteInvoice={onDeleteInvoice ? () => onDeleteInvoice(invoice.id || '', invoice.fileName) : undefined}
                                onDeleteItem={onDeleteItem ? (itemIdx) => onDeleteItem(invoice.id || '', invoice.fileName, itemIdx) : undefined}
                            />
                        ))}
                    </div>

                    {/* Consolidated Vendor Totals */}
                    <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-5 mx-4 mb-4 rounded-xl">
                        <h5 className="font-bold text-sm uppercase tracking-wider text-zinc-400 mb-3">
                            Totales del Proveedor ({group.invoiceCount} {group.invoiceCount === 1 ? 'factura' : 'facturas'})
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-zinc-400">Subtotal</span>
                            <span className="text-right font-mono">{formatCurrency(group.totals.subtotal)}</span>

                            {/* AIU Section */}
                            {group.totals.aiu && (group.totals.aiu.administracion > 0 || group.totals.aiu.imprevistos > 0 || group.totals.aiu.utilidad > 0) && (
                                <>
                                    {group.totals.aiu.administracion > 0 && (
                                        <>
                                            <span className="text-blue-400 text-xs">+ Administración</span>
                                            <span className="text-right font-mono text-blue-400 text-xs">{formatCurrency(group.totals.aiu.administracion)}</span>
                                        </>
                                    )}
                                    {group.totals.aiu.imprevistos > 0 && (
                                        <>
                                            <span className="text-blue-400 text-xs">+ Imprevistos</span>
                                            <span className="text-right font-mono text-blue-400 text-xs">{formatCurrency(group.totals.aiu.imprevistos)}</span>
                                        </>
                                    )}
                                    {group.totals.aiu.utilidad > 0 && (
                                        <>
                                            <span className="text-blue-400 text-xs">+ Utilidad</span>
                                            <span className="text-right font-mono text-blue-400 text-xs">{formatCurrency(group.totals.aiu.utilidad)}</span>
                                        </>
                                    )}
                                    <span className="text-blue-300 font-medium text-xs">Base Gravable (AIU)</span>
                                    <span className="text-right font-mono text-blue-300 text-xs">{formatCurrency(group.totals.aiu.base_gravable || 0)}</span>
                                </>
                            )}

                            {group.totals.iva > 0 && (
                                <>
                                    <span className="text-zinc-400">IVA Total</span>
                                    <span className="text-right font-mono">{formatCurrency(group.totals.iva)}</span>
                                </>
                            )}

                            {group.totals.tax_inc > 0 && (
                                <>
                                    <span className="text-zinc-400">Impoconsumo Total</span>
                                    <span className="text-right font-mono">{formatCurrency(group.totals.tax_inc)}</span>
                                </>
                            )}

                            {group.totals.tip > 0 && (
                                <>
                                    <span className="text-emerald-400">Propina / Servicio</span>
                                    <span className="text-right font-mono text-emerald-400">{formatCurrency(group.totals.tip)}</span>
                                </>
                            )}

                            {/* Retentions */}
                            {(group.totals.retentions.reteFuente > 0 || group.totals.retentions.reteIca > 0 || group.totals.retentions.reteIva > 0) && (
                                <>
                                    {group.totals.retentions.reteFuente > 0 && (
                                        <>
                                            <span className="text-red-400 text-xs">- ReteFuente</span>
                                            <span className="text-right font-mono text-red-400 text-xs">{formatCurrency(group.totals.retentions.reteFuente)}</span>
                                        </>
                                    )}
                                    {group.totals.retentions.reteIca > 0 && (
                                        <>
                                            <span className="text-red-400 text-xs">- ReteICA</span>
                                            <span className="text-right font-mono text-red-400 text-xs">{formatCurrency(group.totals.retentions.reteIca)}</span>
                                        </>
                                    )}
                                    {group.totals.retentions.reteIva > 0 && (
                                        <>
                                            <span className="text-red-400 text-xs">- ReteIVA</span>
                                            <span className="text-right font-mono text-red-400 text-xs">{formatCurrency(group.totals.retentions.reteIva)}</span>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Total */}
                            <span className="font-bold text-lg border-t border-zinc-700 pt-3 mt-2">TOTAL PROVEEDOR</span>
                            <span className="font-bold text-lg text-right font-mono border-t border-zinc-700 pt-3 mt-2 text-emerald-400">
                                {formatCurrency(group.totals.total)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
