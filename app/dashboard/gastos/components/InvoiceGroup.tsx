import { useState } from 'react';
import { ChevronDown, FileText, ShoppingBag, Hash, Trash2, DollarSign } from 'lucide-react';
import { OCRItem, ValidationResult } from '../types';
import { ValidationBadge } from './ValidationBadge';
import { ValidationDetails } from './ValidationDetails';

interface GroupedInvoiceData {
    nit: string;
    entity: string;
    total: number;
    // Aggregated tax data for the group
    subtotal: number;
    iva: number;
    tax_inc: number;
    tip: number;
    // AIU (Colombian construction/service invoicing)
    aiu?: {
        administracion: number;
        imprevistos: number;
        utilidad: number;
        base_gravable: number;
    };
    retentions: {
        reteFuente: number;
        reteIca: number;
        reteIva: number;
    };
    currency: string;
    items: (OCRItem & { fileName: string; hasValidationError?: boolean })[];
    invoiceCount: number;
    // Validation result for the first/primary invoice
    validation?: ValidationResult;
}

interface InvoiceGroupProps {
    group: GroupedInvoiceData;
    formatCurrency: (amount: number) => string;
    onDelete?: (entity: string) => void;
}

export function InvoiceGroup({ group, formatCurrency, onDelete }: InvoiceGroupProps) {
    const [expanded, setExpanded] = useState(false);

    // Calculate aggregated confidence (mock logic or real if available)
    const avgConfidence = group.items.reduce((acc, item) => acc + (item.confidence || 0), 0) / group.items.length || 0;
    const isLowConfidence = avgConfidence < 0.7;

    // Check if any items have discounts (to conditionally show discount column)
    const hasDiscounts = group.items.some(item => (item.discount && item.discount > 0) || (item.discountPercentage && item.discountPercentage > 0));

    // Check if any items have non-default unit of measure
    const hasNonUnitItems = group.items.some(item => item.unitOfMeasure && item.unitOfMeasure !== 'Und');

    return (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Header / Summary Card */}
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
                                {group.invoiceCount} Facturas
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
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Grupo ({group.currency || 'COP'})</p>
                        <p className="font-black text-zinc-900 text-xl text-right">
                            {formatCurrency(group.total)}
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
                                title="Eliminar grupo"
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

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-zinc-100 animate-slide-down">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-900/5 text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-8 py-4 sticky left-0 z-10 bg-zinc-50 md:bg-transparent">Item / Concepto</th>
                                    <th className="px-4 py-4 text-center">{hasNonUnitItems ? 'Cant. / Unid.' : 'Cant.'}</th>
                                    <th className="px-6 py-4 text-right">Unitario</th>
                                    {hasDiscounts && <th className="px-4 py-4 text-right text-red-500">Descuento</th>}
                                    <th className="px-8 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Archivo Origen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-sm">
                                {group.items.map((item, idx) => {
                                    // Calculate display discount
                                    const discountValue = item.discount || 0;
                                    const hasItemDiscount = discountValue > 0 || (item.discountPercentage && item.discountPercentage > 0);

                                    return (
                                        <tr key={idx} className="hover:bg-emerald-50/20 transition-colors group">
                                            <td className="px-8 py-4 text-zinc-700 font-bold">
                                                <div className="flex flex-col">
                                                    <span>{item.description}</span>
                                                    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">{item.category || 'General'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-mono text-zinc-500">
                                                <span>{item.quantity}</span>
                                                {item.unitOfMeasure && item.unitOfMeasure !== 'Und' && (
                                                    <span className="ml-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">
                                                        {item.unitOfMeasure}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-zinc-500">{formatCurrency(item.unitPrice)}</td>
                                            {hasDiscounts && (
                                                <td className="px-4 py-4 text-right font-mono">
                                                    {hasItemDiscount ? (
                                                        <span className="text-red-500">
                                                            -{formatCurrency(discountValue)}
                                                            {item.discountPercentage && item.discountPercentage > 0 && (
                                                                <span className="text-[10px] ml-1">({Math.round(item.discountPercentage * 100)}%)</span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-300">-</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-8 py-4 text-right font-black text-zinc-900">{formatCurrency(item.total)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-50 rounded-lg border border-zinc-100 shrink-0">
                                                    <FileText className="w-3 h-3 text-zinc-400 group-hover:text-emerald-600" />
                                                    <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[100px]">{item.fileName}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Tax Summary Footer */}
                            <tfoot className="bg-zinc-50/80 border-t border-zinc-200">
                                <tr>
                                    <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Subtotal</td>
                                    <td className="px-8 py-3 text-right font-mono text-sm text-zinc-600">{formatCurrency(group.subtotal)}</td>
                                    <td></td>
                                </tr>
                                {/* AIU Section - Colombian construction/service invoicing */}
                                {group.aiu && (group.aiu.administracion > 0 || group.aiu.imprevistos > 0 || group.aiu.utilidad > 0) && (
                                    <>
                                        {group.aiu.administracion > 0 && (
                                            <tr>
                                                <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-blue-600 uppercase tracking-wider">+ Administración</td>
                                                <td className="px-8 py-1 text-right font-mono text-sm text-blue-600">{formatCurrency(group.aiu.administracion)}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        {group.aiu.imprevistos > 0 && (
                                            <tr>
                                                <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-blue-600 uppercase tracking-wider">+ Imprevistos</td>
                                                <td className="px-8 py-1 text-right font-mono text-sm text-blue-600">{formatCurrency(group.aiu.imprevistos)}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        {group.aiu.utilidad > 0 && (
                                            <tr>
                                                <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-blue-600 uppercase tracking-wider">+ Utilidad</td>
                                                <td className="px-8 py-1 text-right font-mono text-sm text-blue-600">{formatCurrency(group.aiu.utilidad)}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        <tr className="border-t border-blue-200">
                                            <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-2 text-right text-xs font-black text-blue-800 uppercase tracking-wider">Base Gravable (AIU)</td>
                                            <td className="px-8 py-2 text-right font-mono text-sm font-bold text-blue-800">{formatCurrency(group.aiu.base_gravable)}</td>
                                            <td></td>
                                        </tr>
                                    </>
                                )}
                                {group.iva > 0 && (
                                    <tr>
                                        <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">IVA (19%)</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-zinc-600">{formatCurrency(group.iva)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {group.tax_inc > 0 && (
                                    <tr>
                                        <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Impoconsumo</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-zinc-600">{formatCurrency(group.tax_inc)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {group.tip > 0 && (
                                    <tr>
                                        <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-emerald-600 uppercase tracking-wider">Propina / Servicio</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-emerald-600">{formatCurrency(group.tip)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {(group.retentions.reteFuente > 0 || group.retentions.reteIca > 0 || group.retentions.reteIva > 0) && (
                                    <tr>
                                        <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-1 text-right text-xs font-bold text-red-400 uppercase tracking-wider">Menos Retenciones</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-red-500">
                                            - {formatCurrency(group.retentions.reteFuente + group.retentions.reteIca + group.retentions.reteIva)}
                                        </td>
                                        <td></td>
                                    </tr>
                                )}
                                <tr className="border-t border-zinc-200">
                                    <td colSpan={hasDiscounts ? 4 : 3} className="px-8 py-4 text-right text-sm font-black text-zinc-900 uppercase tracking-wider">Total a Pagar</td>
                                    <td className="px-8 py-4 text-right font-black text-lg text-zinc-900">{formatCurrency(group.total)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {/* Validation Details Panel */}
                    {group.validation && (
                        <div className="px-8 py-2">
                            <ValidationDetails validation={group.validation} />
                        </div>
                    )}

                    {/* Optional Footer for the group */}
                    <div className="bg-zinc-50 px-8 py-3 border-t border-zinc-100 flex justify-between items-center">
                        <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-2">
                            {group.validation && (
                                <span className="text-zinc-500">
                                    Confianza: {Math.round((group.validation.overallConfidence || 0) * 100)}%
                                </span>
                            )}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-2">
                            {isLowConfidence && <span className="text-orange-500 flex items-center gap-1">⚠️ Revisar Confianza</span>}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
