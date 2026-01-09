import { useState } from 'react';
import { ChevronDown, FileText, Trash2, Calendar, Hash, Package } from 'lucide-react';
import { OCRItem, ValidationResult } from '../types';
import { ValidationBadge } from './ValidationBadge';

// Invoice data structure for individual invoices within a vendor group
export interface InvoiceData {
    id?: string;
    invoiceNumber: string;
    date: string;
    fileName: string;
    items: OCRItem[];
    subtotal: number;
    iva: number;
    iva_rate?: number;
    tax_inc: number;
    tax_inc_rate?: number;
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
    validation?: ValidationResult;
}

interface InvoiceCardProps {
    invoice: InvoiceData;
    invoiceIndex: number;
    formatCurrency: (amount: number) => string;
    onDeleteItem?: (itemIndex: number) => void;
    onDeleteInvoice?: () => void;
}

export function InvoiceCard({
    invoice,
    invoiceIndex,
    formatCurrency,
    onDeleteItem,
    onDeleteInvoice
}: InvoiceCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Check if any items have discounts
    const hasDiscounts = invoice.items.some(
        item => (item.discount && item.discount > 0) || (item.discountPercentage && item.discountPercentage > 0)
    );

    // Check if any items have non-default unit of measure
    const hasNonUnitItems = invoice.items.some(item => item.unitOfMeasure && item.unitOfMeasure !== 'Und');

    return (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {/* Invoice Header - Clickable to expand */}
            <div
                onClick={() => setExpanded(!expanded)}
                className={`p-4 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${
                    expanded ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-zinc-50 hover:bg-zinc-100'
                }`}
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        expanded ? 'bg-emerald-600 text-white' : 'bg-white border border-zinc-200 text-zinc-500'
                    }`}>
                        <FileText className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-900">
                                {invoice.invoiceNumber ? `Factura #${invoice.invoiceNumber}` : `Documento ${invoiceIndex + 1}`}
                            </span>
                            {invoice.validation && <ValidationBadge validation={invoice.validation} />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {invoice.date}
                            </span>
                            <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {invoice.items.length} items
                            </span>
                            <span className="text-zinc-400 truncate max-w-[120px]" title={invoice.fileName}>
                                {invoice.fileName}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="font-black text-zinc-900">{formatCurrency(invoice.total)}</p>
                        <p className="text-[10px] text-zinc-400">Total factura</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onDeleteInvoice && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteInvoice();
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Eliminar factura"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${
                            expanded ? 'bg-emerald-600 text-white rotate-180' : 'bg-zinc-200 text-zinc-500'
                        }`}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="animate-slide-down">
                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-100/50 text-[10px] font-black text-zinc-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Item / Concepto</th>
                                    <th className="px-3 py-3 text-center">{hasNonUnitItems ? 'Cant. / Unid.' : 'Cant.'}</th>
                                    <th className="px-3 py-3 text-right">Unitario</th>
                                    {hasDiscounts && <th className="px-3 py-3 text-right text-red-500">Dcto.</th>}
                                    <th className="px-4 py-3 text-right">Total</th>
                                    {onDeleteItem && <th className="px-2 py-3 text-center w-10"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-sm">
                                {invoice.items.map((item, idx) => {
                                    const discountValue = item.discount || 0;
                                    const hasItemDiscount = discountValue > 0 || (item.discountPercentage && item.discountPercentage > 0);

                                    return (
                                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors group">
                                            <td className="px-4 py-3 text-zinc-700">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.description}</span>
                                                    {item.category && (
                                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
                                                            {item.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-mono text-zinc-500">
                                                <span>{item.quantity}</span>
                                                {item.unitOfMeasure && item.unitOfMeasure !== 'Und' && (
                                                    <span className="ml-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">
                                                        {item.unitOfMeasure}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-zinc-500">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            {hasDiscounts && (
                                                <td className="px-3 py-3 text-right font-mono">
                                                    {hasItemDiscount ? (
                                                        <span className="text-red-500 text-xs">
                                                            -{formatCurrency(discountValue)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-300">-</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right font-bold text-zinc-900">
                                                {formatCurrency(item.total)}
                                            </td>
                                            {onDeleteItem && (
                                                <td className="px-2 py-3 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteItem(idx);
                                                        }}
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto opacity-0 group-hover:opacity-100"
                                                        title="Eliminar item"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Tax Summary for THIS invoice */}
                    <div className="bg-zinc-50 border-t border-zinc-200 p-4">
                        <div className="max-w-xs ml-auto space-y-1 text-sm">
                            <div className="flex justify-between text-zinc-600">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                            </div>

                            {/* AIU (Colombian construction/service) */}
                            {invoice.aiu && (invoice.aiu.administracion > 0 || invoice.aiu.imprevistos > 0 || invoice.aiu.utilidad > 0) && (
                                <>
                                    {invoice.aiu.administracion > 0 && (
                                        <div className="flex justify-between text-blue-600 text-xs">
                                            <span>+ Administración</span>
                                            <span className="font-mono">{formatCurrency(invoice.aiu.administracion)}</span>
                                        </div>
                                    )}
                                    {invoice.aiu.imprevistos > 0 && (
                                        <div className="flex justify-between text-blue-600 text-xs">
                                            <span>+ Imprevistos</span>
                                            <span className="font-mono">{formatCurrency(invoice.aiu.imprevistos)}</span>
                                        </div>
                                    )}
                                    {invoice.aiu.utilidad > 0 && (
                                        <div className="flex justify-between text-blue-600 text-xs">
                                            <span>+ Utilidad</span>
                                            <span className="font-mono">{formatCurrency(invoice.aiu.utilidad)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-blue-800 font-medium text-xs border-t border-blue-200 pt-1">
                                        <span>Base Gravable (AIU)</span>
                                        <span className="font-mono">{formatCurrency(invoice.aiu.base_gravable || 0)}</span>
                                    </div>
                                </>
                            )}

                            {invoice.iva > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                    <span>IVA {invoice.iva_rate ? `(${Math.round(invoice.iva_rate * 100)}%)` : '(19%)'}</span>
                                    <span className="font-mono">{formatCurrency(invoice.iva)}</span>
                                </div>
                            )}

                            {invoice.tax_inc > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                    <span>Impoconsumo {invoice.tax_inc_rate ? `(${Math.round(invoice.tax_inc_rate * 100)}%)` : ''}</span>
                                    <span className="font-mono">{formatCurrency(invoice.tax_inc)}</span>
                                </div>
                            )}

                            {invoice.tip > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Propina / Servicio</span>
                                    <span className="font-mono">{formatCurrency(invoice.tip)}</span>
                                </div>
                            )}

                            {/* Retentions */}
                            {(invoice.retentions.reteFuente > 0 || invoice.retentions.reteIca > 0 || invoice.retentions.reteIva > 0) && (
                                <>
                                    {invoice.retentions.reteFuente > 0 && (
                                        <div className="flex justify-between text-red-500 text-xs">
                                            <span>- ReteFuente</span>
                                            <span className="font-mono">{formatCurrency(invoice.retentions.reteFuente)}</span>
                                        </div>
                                    )}
                                    {invoice.retentions.reteIca > 0 && (
                                        <div className="flex justify-between text-red-500 text-xs">
                                            <span>- ReteICA</span>
                                            <span className="font-mono">{formatCurrency(invoice.retentions.reteIca)}</span>
                                        </div>
                                    )}
                                    {invoice.retentions.reteIva > 0 && (
                                        <div className="flex justify-between text-red-500 text-xs">
                                            <span>- ReteIVA</span>
                                            <span className="font-mono">{formatCurrency(invoice.retentions.reteIva)}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-300 pt-2 mt-2">
                                <span>TOTAL FACTURA</span>
                                <span className="font-mono">{formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
