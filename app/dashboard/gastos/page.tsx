'use client';

import { useState } from 'react';
import {
    ScanLine,
    Upload,
    FileText,
    Table,
    Download,
    FolderOpen,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react';
import { OCRResult } from '@/types/ocr';

export default function GastosPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<OCRResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setFiles(Array.from(e.dataTransfer.files));
            setError(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleProcess = async () => {
        if (files.length === 0) return;

        setProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const response = await fetch('/api/ocr', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error procesando documentos');
            }

            setResults(data.results);
        } catch (err) {
            console.error('Error:', err);
            setError(err instanceof Error ? err.message : 'Error procesando documentos');
        } finally {
            setProcessing(false);
        }
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        const headers = ['Archivo', 'Entidad', 'NIT', 'Fecha', 'Factura', 'Descripción', 'Cantidad', 'Precio Unit.', 'Total Item', 'Categoría', 'Subtotal', 'IVA', 'Total'];
        const rows: string[][] = [];

        results.forEach(result => {
            if (result.items.length === 0) {
                rows.push([
                    result.fileName,
                    result.entity,
                    result.nit,
                    result.date,
                    result.invoiceNumber,
                    '',
                    '',
                    '',
                    '',
                    '',
                    result.subtotal.toString(),
                    result.iva.toString(),
                    result.total.toString(),
                ]);
            } else {
                result.items.forEach((item, idx) => {
                    rows.push([
                        idx === 0 ? result.fileName : '',
                        idx === 0 ? result.entity : '',
                        idx === 0 ? result.nit : '',
                        idx === 0 ? result.date : '',
                        idx === 0 ? result.invoiceNumber : '',
                        item.description,
                        item.quantity.toString(),
                        item.unitPrice.toString(),
                        item.total.toString(),
                        item.category,
                        idx === 0 ? result.subtotal.toString() : '',
                        idx === 0 ? result.iva.toString() : '',
                        idx === 0 ? result.total.toString() : '',
                    ]);
                });
            }
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#002D44] mb-2">Digitador OCR</h1>
                <p className="text-gray-500">Digitaliza facturas y documentos con inteligencia artificial</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-6">
                    {/* Drop Zone */}
                    <div
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-[#1AB1B1] hover:bg-teal-50/30 transition-all cursor-pointer"
                        onClick={() => document.getElementById('file-input')?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-bold text-[#002D44] mb-2">Arrastra archivos aquí</p>
                        <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-400">PDF, imágenes (PNG, JPG) • Máximo 10 archivos</p>
                        <input
                            id="file-input"
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Selected Files */}
                    {files.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h3 className="font-bold text-[#002D44] mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Archivos seleccionados ({files.length})
                            </h3>
                            <div className="space-y-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <FileText className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                                        <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleProcess}
                                disabled={processing}
                                className="w-full mt-4 bg-[#1AB1B1] text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Procesando con Gemini AI...
                                    </>
                                ) : (
                                    <>
                                        <ScanLine className="w-5 h-5" />
                                        Analizar Documentos
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                        <h3 className="font-bold text-purple-900 mb-2">🤖 Powered by Gemini AI</h3>
                        <p className="text-sm text-purple-700">
                            Nuestro motor de IA extrae automáticamente entidades, fechas, montos y categoriza los gastos de tus documentos.
                        </p>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    {results.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Table className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-bold text-gray-400 mb-2">Sin resultados aún</p>
                            <p className="text-sm text-gray-400">Sube documentos para ver los datos extraídos</p>
                        </div>
                    ) : (
                        <>
                            {results.map((result, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    {/* Header */}
                                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-[#002D44]">{result.entity}</p>
                                                <p className="text-sm text-gray-500">{result.fileName}</p>
                                                {result.nit && (
                                                    <p className="text-xs text-gray-400 mt-1">NIT: {result.nit}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className={`w-4 h-4 ${result.confidence >= 0.7 ? 'text-green-500' : 'text-yellow-500'}`} />
                                                <span className={`font-bold ${result.confidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {Math.round(result.confidence * 100)}% confianza
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-400">Fecha</p>
                                                <p className="font-bold text-[#002D44]">{result.date}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Factura</p>
                                                <p className="font-bold text-[#002D44]">{result.invoiceNumber || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Total</p>
                                                <p className="font-bold text-[#1AB1B1] text-lg">
                                                    {formatCurrency(result.total)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    {result.items.length > 0 && (
                                        <div className="p-6">
                                            <h4 className="font-bold text-sm text-gray-700 mb-3">Items Extraídos</h4>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-400 text-xs uppercase">
                                                        <th className="pb-2">Descripción</th>
                                                        <th className="pb-2 text-right">Cant.</th>
                                                        <th className="pb-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.items.map((item, j) => (
                                                        <tr key={j} className="border-t border-gray-100">
                                                            <td className="py-2">
                                                                <p className="font-medium">{item.description}</p>
                                                                <span className="text-xs text-gray-400">{item.category}</span>
                                                            </td>
                                                            <td className="py-2 text-right">{item.quantity}</td>
                                                            <td className="py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Totals */}
                                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Subtotal</span>
                                                    <span>{formatCurrency(result.subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">IVA</span>
                                                    <span>{formatCurrency(result.iva)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold">
                                                    <span>Total</span>
                                                    <span className="text-[#1AB1B1]">{formatCurrency(result.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={exportToCSV}
                                    className="flex items-center gap-2 bg-[#002D44] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                    Exportar CSV
                                </button>
                                <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                                    <FolderOpen className="w-5 h-5" />
                                    Guardar en Carpeta
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
