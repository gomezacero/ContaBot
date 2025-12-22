'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ScanLine,
    Upload,
    FileText,
    Table,
    Download,
    FolderOpen,
    CheckCircle2,
    AlertCircle,
    X,
    Plus,
    Type,
    Loader2,
    AlertTriangle,
    Trash2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OCRResult, OCRItem } from '@/types/ocr';

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
}

type InputMode = 'FILE' | 'TEXT';

export default function GastosPage() {
    const supabase = createClient();

    // Client state
    const [clients, setClients] = useState<DBClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);

    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('FILE');
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');

    // Processing state
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<OCRResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load clients
    const loadClients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, nit')
                .order('name');
            if (error) throw error;
            setClients(data || []);
            // Auto-select first client or create "General"
            if (data && data.length > 0 && !selectedClientId) {
                setSelectedClientId(data[0].id);
            }
        } catch {
            console.error('Error loading clients');
        } finally {
            setLoadingClients(false);
        }
    }, [supabase, selectedClientId]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    // Create new folder/client
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('clients')
                .insert({ user_id: user.id, name: newFolderName })
                .select()
                .single();

            if (error) throw error;
            setClients([...clients, data]);
            setSelectedClientId(data.id);
            setNewFolderName('');
            setShowNewFolder(false);
        } catch {
            setError('Error creando carpeta');
        }
    };

    // File handlers
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
            setError(null);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    // Process documents
    const handleProcess = async () => {
        if (inputMode === 'FILE' && files.length === 0) return;
        if (inputMode === 'TEXT' && !textInput.trim()) return;

        setProcessing(true);
        setError(null);

        try {
            let response;

            if (inputMode === 'TEXT') {
                response = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: textInput,
                        clientId: selectedClientId
                    }),
                });
            } else {
                const formData = new FormData();
                files.forEach(file => formData.append('files', file));
                if (selectedClientId) formData.append('clientId', selectedClientId);

                response = await fetch('/api/ocr', {
                    method: 'POST',
                    body: formData,
                });
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error procesando documentos');
            }

            setResults(prev => [...prev, ...data.results]);
            // Clear inputs after successful processing
            if (inputMode === 'FILE') setFiles([]);
            if (inputMode === 'TEXT') setTextInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error procesando');
        } finally {
            setProcessing(false);
        }
    };

    // Clear all results
    const clearResults = () => {
        setResults([]);
    };

    // Export to Excel/CSV
    const exportToExcel = () => {
        if (results.length === 0) return;

        // Create accounting format
        const headers = ['Cuenta PUC', 'Descripción', 'NIT Tercero', 'Nombre Tercero', 'Documento', 'Fecha', 'Débito', 'Crédito', 'Confianza', 'Archivo'];
        const rows: string[][] = [];

        results.forEach(result => {
            result.items.forEach(item => {
                // Extract PUC code from category
                const pucMatch = item.category?.match(/\((\d+)\)/);
                const pucCode = pucMatch ? pucMatch[1] : '529595';

                // Debit entry (expense)
                rows.push([
                    pucCode,
                    item.description,
                    result.nit,
                    result.entity,
                    result.invoiceNumber,
                    result.date,
                    item.total.toString(),
                    '0',
                    `${Math.round((item.confidence || 0.8) * 100)}%`,
                    result.fileName,
                ]);
            });

            // Credit entry (accounts payable) - consolidated per document
            if (result.items.length > 0) {
                rows.push([
                    '220505', // Cuentas por pagar proveedores
                    `Factura ${result.invoiceNumber || 'S/N'} - ${result.entity}`,
                    result.nit,
                    result.entity,
                    result.invoiceNumber,
                    result.date,
                    '0',
                    result.total.toString(),
                    `${Math.round(result.confidence * 100)}%`,
                    result.fileName,
                ]);
            }
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const clientName = clients.find(c => c.id === selectedClientId)?.name || 'General';
        link.download = `asiento_${clientName}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'text-green-600 bg-green-50';
        if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const totalAmount = results.reduce((sum, r) => sum + r.total, 0);
    const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-[#002D44] mb-1 flex items-center gap-3">
                        <ScanLine className="w-8 h-8" />
                        Digitador Inteligente
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Carpeta actual:</span>
                        <span className="bg-[#002D44] text-white text-xs px-3 py-1 rounded-full font-bold">
                            📁 {selectedClient?.name || 'General'}
                        </span>
                    </div>
                </div>
                <span className="text-xs font-bold text-[#1AB1B1] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    MULTI-DOC ENABLED V2.5
                </span>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-500" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel - Folders */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                Carpetas de Cliente
                            </h3>
                            <button
                                onClick={() => setShowNewFolder(true)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <Plus className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {loadingClients ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {clients.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${selectedClientId === client.id
                                                ? 'bg-[#002D44] text-white'
                                                : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <span className={selectedClientId === client.id ? 'text-white' : 'text-gray-400'}>📁</span>
                                        <span className="truncate">{client.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* New folder input */}
                        {showNewFolder && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="Nombre cliente"
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                    autoFocus
                                />
                                <button onClick={handleCreateFolder} className="px-3 py-2 bg-[#1AB1B1] text-white rounded-lg text-sm">
                                    OK
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Input Mode Tabs */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setInputMode('FILE')}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'FILE'
                                        ? 'bg-[#002D44] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Upload className="w-4 h-4" />
                                ARCHIVO
                            </button>
                            <button
                                onClick={() => setInputMode('TEXT')}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'TEXT'
                                        ? 'bg-[#002D44] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <Type className="w-4 h-4" />
                                TEXTO
                            </button>
                        </div>

                        {inputMode === 'FILE' ? (
                            <>
                                {/* Drop Zone */}
                                <div
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#1AB1B1] hover:bg-teal-50/30 transition-all cursor-pointer"
                                    onClick={() => document.getElementById('file-input')?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-600">Cargar Soportes</p>
                                    <p className="text-xs text-gray-400">ARRASTRA MÚLTIPLES ARCHIVOS AQUÍ</p>
                                    <div className="flex justify-center gap-2 mt-2 text-gray-300">
                                        <FileText className="w-4 h-4" />
                                        <FileText className="w-4 h-4" />
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="file-input"
                                        type="file"
                                        multiple
                                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* File list */}
                                {files.length > 0 && (
                                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                                        {files.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded">
                                                <FileText className="w-3 h-3 text-gray-400" />
                                                <span className="truncate flex-1">{file.name}</span>
                                                <button onClick={() => removeFile(i)}>
                                                    <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <textarea
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                                placeholder="Pega aquí el texto con los datos de gastos, facturas o recibos..."
                                className="w-full h-40 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#1AB1B1]"
                            />
                        )}

                        <button
                            onClick={handleProcess}
                            disabled={processing || (inputMode === 'FILE' ? files.length === 0 : !textInput.trim())}
                            className="w-full mt-4 bg-[#1AB1B1] text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="w-5 h-5" />
                                    Analizar {inputMode === 'FILE' ? `(${files.length})` : 'Texto'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="lg:col-span-9">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Results Header */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-[#002D44] flex items-center gap-2">
                                    <Table className="w-5 h-5" />
                                    CONSOLIDACIÓN {results.length > 0 ? 'LISTA' : ''}
                                </h3>
                                {results.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {results.length} documentos • {totalItems} items • Total: {formatCurrency(totalAmount)}
                                    </p>
                                )}
                            </div>
                            {results.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={clearResults}
                                        className="flex items-center gap-1 text-gray-500 hover:text-red-500 text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Limpiar
                                    </button>
                                    <button
                                        onClick={exportToExcel}
                                        className="flex items-center gap-2 bg-[#002D44] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black"
                                    >
                                        <Download className="w-4 h-4" />
                                        Exportar Lote a Excel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Results Content */}
                        {results.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-lg font-bold text-gray-400 mb-1">CONSOLIDACIÓN LISTA</p>
                                <p className="text-sm text-gray-400">
                                    Carga varios archivos para que ContaBot cree un único<br />
                                    archivo de exportación estructurado para tu contabilidad.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3">Archivo</th>
                                            <th className="px-4 py-3">Proveedor</th>
                                            <th className="px-4 py-3">Descripción</th>
                                            <th className="px-4 py-3">Categoría PUC</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                            <th className="px-4 py-3 text-center">Confianza</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.flatMap((result, rIdx) =>
                                            result.items.map((item, iIdx) => (
                                                <tr key={`${rIdx}-${iIdx}`} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-gray-400" />
                                                            <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                                                {result.fileName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-[#002D44]">{result.entity}</p>
                                                        <p className="text-xs text-gray-400">{result.nit}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className={item.description?.includes('[?]') ? 'text-orange-600' : ''}>
                                                            {item.description}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold">
                                                        {formatCurrency(item.total)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${getConfidenceColor(item.confidence || 0.8)}`}>
                                                            {Math.round((item.confidence || 0.8) * 100)}%
                                                        </span>
                                                        {(item.confidence || 0.8) < 0.7 && (
                                                            <AlertTriangle className="w-3 h-3 text-orange-500 inline ml-1" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right">TOTAL LOTE:</td>
                                            <td className="px-4 py-3 text-right text-[#1AB1B1] text-lg">
                                                {formatCurrency(totalAmount)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Low confidence warning */}
                    {results.some(r => r.items.some(i => (i.confidence || 0.8) < 0.7)) && (
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                            <div>
                                <p className="font-bold text-orange-700">Revisión requerida</p>
                                <p className="text-sm text-orange-600">
                                    Algunos items tienen baja confianza (marcados con ⚠️).
                                    Revisa estos datos antes de exportar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
