'use client';

import { useState } from 'react';
import {
    ScanLine,
    Upload,
    FileText,
    Table,
    Download,
    FolderOpen,
    CheckCircle2
} from 'lucide-react';

export default function GastosPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;

        setProcessing(true);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock results
        setResults([
            {
                fileName: files[0]?.name || 'documento.pdf',
                entity: 'TECNOLOGÍA S.A.S',
                date: '2025-01-15',
                total: 5370000,
                items: [
                    { description: 'Portátil MacBook Air M2', qty: 1, total: 5200000, category: 'Equipos' },
                    { description: 'Adaptador USB-C', qty: 2, total: 170000, category: 'Accesorios' },
                ],
                confidence: 0.95
            }
        ]);

        setProcessing(false);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#002D44] mb-2">Digitador OCR</h1>
                <p className="text-gray-500">Digitaliza facturas y documentos con inteligencia artificial</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-6">
                    {/* Drop Zone */}
                    <div
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-[#1AB1B1] hover:bg-teal-50/30 transition-all cursor-pointer"
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-bold text-[#002D44] mb-2">Arrastra archivos aquí</p>
                        <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-400">PDF, imágenes, Excel, CSV • Máximo 10 archivos</p>
                        <input
                            id="file-input"
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
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
                                        Procesando con IA...
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
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span className="text-green-600 font-bold">{Math.round(result.confidence * 100)}% confianza</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-400">Fecha</p>
                                                <p className="font-bold text-[#002D44]">{result.date}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Total</p>
                                                <p className="font-bold text-[#1AB1B1] text-lg">
                                                    ${result.total.toLocaleString('es-CO')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
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
                                                {result.items.map((item: any, j: number) => (
                                                    <tr key={j} className="border-t border-gray-100">
                                                        <td className="py-2">
                                                            <p className="font-medium">{item.description}</p>
                                                            <span className="text-xs text-gray-400">{item.category}</span>
                                                        </td>
                                                        <td className="py-2 text-right">{item.qty}</td>
                                                        <td className="py-2 text-right font-bold">${item.total.toLocaleString('es-CO')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button className="flex items-center gap-2 bg-[#002D44] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors">
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
