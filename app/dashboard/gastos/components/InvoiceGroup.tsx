import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, ShoppingBag, Calendar, Hash, Trash2 } from 'lucide-react';
import { OCRItem } from '../types';

interface GroupedInvoiceData {
    nit: string;
    entity: string;
    total: number;
    // Aggregated tax data for the group
    subtotal: number;
    iva: number;
    tax_inc: number;
    tip: number;
    retentions: {
        reteFuente: number;
        reteIca: number;
        reteIva: number;
    };
    currency: string;
    items: (OCRItem & { fileName: string })[];
    invoiceCount: number;
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

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Header / Summary Card */}
            <div
                onClick={() => setExpanded(!expanded)}
                className={`p-6 cursor-pointer flex flex-col md:flex-row justify-between items-center gap-4 transition-colors ${expanded ? 'bg-slate-50' : 'bg-white hover:bg-gray-50'}`}
            >
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${expanded ? 'bg-[#002D44] text-white' : 'bg-white border-2 border-[#1AB1B1] text-[#002D44]'}`}>
                        <ShoppingBag className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col">
                        <h4 className="font-black text-[#002D44] text-lg leading-tight">{group.entity}</h4>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Hash className="w-3 h-3" /> NIT: {group.nit}
                            </span>
                            <span className="text-[10px] font-bold text-[#1AB1B1] bg-teal-50 px-2 py-0.5 rounded-md">
                                {group.invoiceCount} Facturas
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Grupo ({group.currency || 'COP'})</p>
                        <p className="font-black text-[#002D44] text-xl text-right">
                            {formatCurrency(group.total)}
                            <span className="text-xs text-gray-400 ml-1">{group.currency || 'COP'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(group.entity);
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Eliminar grupo"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expanded ? 'bg-[#1AB1B1] text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-gray-100 animate-slide-down">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#002D44]/5 text-[10px] font-black text-[#002D44] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-8 py-4 sticky left-0 z-10 bg-slate-50 md:bg-transparent">Item / Concepto</th>
                                    <th className="px-4 py-4 text-center">Cant.</th>
                                    <th className="px-6 py-4 text-right">Unitario</th>
                                    <th className="px-8 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Archivo Origen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {group.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/20 transition-colors group">
                                        <td className="px-8 py-4 text-gray-700 font-bold">
                                            <div className="flex flex-col">
                                                <span>{item.description}</span>
                                                <span className="text-[9px] text-[#1AB1B1] font-black uppercase tracking-wider mt-0.5">{item.category || 'General'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-mono text-gray-500">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-8 py-4 text-right font-black text-[#002D44]">{formatCurrency(item.total)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                                                <FileText className="w-3 h-3 text-gray-400 group-hover:text-[#1AB1B1]" />
                                                <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]">{item.fileName}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Tax Summary Footer */}
                            <tfoot className="bg-gray-50/80 border-t border-gray-200">
                                <tr>
                                    <td colSpan={3} className="px-8 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Subtotal</td>
                                    <td className="px-8 py-3 text-right font-mono text-sm text-gray-600">{formatCurrency(group.subtotal)}</td>
                                    <td></td>
                                </tr>
                                {group.iva > 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-1 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">IVA (19%)</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-gray-600">{formatCurrency(group.iva)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {group.tax_inc > 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-1 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Impoconsumo</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-gray-600">{formatCurrency(group.tax_inc)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {group.tip > 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-1 text-right text-xs font-bold text-[#1AB1B1] uppercase tracking-wider">Propina / Servicio</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-[#1AB1B1]">{formatCurrency(group.tip)}</td>
                                        <td></td>
                                    </tr>
                                )}
                                {(group.retentions.reteFuente > 0 || group.retentions.reteIca > 0 || group.retentions.reteIva > 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-1 text-right text-xs font-bold text-red-400 uppercase tracking-wider">Menos Retenciones</td>
                                        <td className="px-8 py-1 text-right font-mono text-sm text-red-500">
                                            - {formatCurrency(group.retentions.reteFuente + group.retentions.reteIca + group.retentions.reteIva)}
                                        </td>
                                        <td></td>
                                    </tr>
                                )}
                                <tr className="border-t border-gray-200">
                                    <td colSpan={3} className="px-8 py-4 text-right text-sm font-black text-[#002D44] uppercase tracking-wider">Total a Pagar</td>
                                    <td className="px-8 py-4 text-right font-black text-lg text-[#002D44]">{formatCurrency(group.total)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {/* Optional Footer for the group */}
                    <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex justify-end">
                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                            {isLowConfidence && <span className="text-orange-500 flex items-center gap-1">⚠️ Revisar Confianza</span>}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
