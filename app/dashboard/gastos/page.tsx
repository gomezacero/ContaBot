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
    Trash2,
    Lock,
    Sparkles,
    LogIn
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OCRResult, OCRItem } from '@/types/ocr';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import Link from 'next/link';

interface DBClient {
    id: string;
    name: string;
    nit: string | null;
}

type InputMode = 'FILE' | 'TEXT';

export default function GastosPage() {
    const supabase = createClient();
    const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
    const isGuest = !isAuthenticated;

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
    const [showHistory, setShowHistory] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

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

    // Load saved OCR results for the selected client
    const loadSavedResults = useCallback(async () => {
        if (!isAuthenticated || !selectedClientId) {
            setResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('ocr_results')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading saved results:', error);
                return;
            }

            if (data && data.length > 0) {
                // Transform DB records to OCRResult format
                const loadedResults: OCRResult[] = data.map(record => ({
                    fileName: record.filename || 'Documento',
                    entity: record.vendor || 'Desconocido',
                    nit: '',
                    date: record.invoice_date || '',
                    invoiceNumber: record.invoice_number || '',
                    subtotal: record.subtotal || 0,
                    iva: record.iva || 0,
                    total: record.total || 0,
                    items: record.items || [],
                    confidence: record.confidence || 0.5,
                }));
                setResults(loadedResults);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error('Error loading results:', err);
        }
    }, [supabase, isAuthenticated, selectedClientId]);

    // Load results when client changes
    useEffect(() => {
        loadSavedResults();
    }, [loadSavedResults]);

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
        console.log('🚀 handleProcess called', { inputMode, filesCount: files.length, textLength: textInput.length });

        if (inputMode === 'FILE' && files.length === 0) {
            console.log('❌ No files to process');
            return;
        }
        if (inputMode === 'TEXT' && !textInput.trim()) {
            console.log('❌ No text to process');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            let response;

            if (inputMode === 'TEXT') {
                console.log('📝 Sending text to OCR API...');
                response = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: textInput,
                        clientId: selectedClientId
                    }),
                });
            } else {
                console.log('📁 Sending files to OCR API...', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
                const formData = new FormData();
                files.forEach(file => formData.append('files', file));
                if (selectedClientId) formData.append('clientId', selectedClientId);

                response = await fetch('/api/ocr', {
                    method: 'POST',
                    body: formData,
                });
            }

            console.log('📥 API Response status:', response.status);
            const data = await response.json();
            console.log('📦 API Response data:', data);

            if (!data.success) {
                throw new Error(data.error || 'Error procesando documentos');
            }

            setResults(prev => [...prev, ...data.results]);
            console.log('✅ Results set:', data.results.length, 'items');

            // Auto-save to Supabase for authenticated users
            if (isAuthenticated && data.results.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    let savedThisSession = 0;
                    for (const result of data.results) {
                        try {
                            await supabase.from('ocr_results').insert({
                                user_id: user.id,
                                client_id: selectedClientId,
                                filename: result.fileName || 'text_input',
                                file_type: inputMode === 'FILE' ? 'image' : 'text',
                                vendor: result.entity, // API returns 'entity' as vendor name
                                invoice_number: result.invoiceNumber,
                                invoice_date: result.date,
                                subtotal: result.subtotal || 0,
                                iva: result.iva || 0,
                                total: result.total || 0,
                                items: result.items || [],
                                confidence: result.confidence || 0
                            });
                            savedThisSession++;
                        } catch (saveErr) {
                            console.error('Error saving OCR result:', saveErr);
                        }
                    }
                    setSavedCount(prev => prev + savedThisSession);
                }
            }

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

    // Premium gate for AI features
    if (isGuest && !authLoading) {
        return (
            <div className="animate-fade-in">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-[#002D44] mb-1 flex items-center gap-3">
                            <ScanLine className="w-8 h-8" />
                            Digitador Inteligente
                            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> PRO
                            </span>
                        </h1>
                        <p className="text-gray-500">Extracción automática con IA de facturas y soportes</p>
                    </div>
                </div>

                {/* Premium Gate Card */}
                <div className="bg-gradient-to-br from-[#002D44] to-[#004D6E] rounded-[2rem] p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-10 h-10 text-amber-400" />
                        </div>

                        <h2 className="text-4xl font-black mb-4">Función Premium</h2>
                        <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
                            El Digitador Inteligente usa IA avanzada para extraer automáticamente datos de facturas y soportes.
                            Inicia sesión para acceder a esta función.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/login"
                                className="bg-[#1AB1B1] text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                            >
                                <LogIn className="w-5 h-5" />
                                Iniciar Sesión
                            </Link>
                            <Link
                                href="/register"
                                className="bg-white/10 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-2"
                            >
                                Crear Cuenta Gratis
                            </Link>
                        </div>

                        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                OCR con IA Gemini
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                Extracción automática
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                Exportar a Excel
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                        {results.flatMap((result, rIdx) => {
                                            // If no items, show a fallback row with the document total
                                            if (!result.items || result.items.length === 0) {
                                                return [(
                                                    <tr key={`${rIdx}-total`} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-gray-400" />
                                                                <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                                                    {result.fileName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-[#002D44]">{result.entity || 'Sin proveedor'}</p>
                                                            <p className="text-xs text-gray-400">{result.nit || ''}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p>Factura #{result.invoiceNumber || 'N/A'}</p>
                                                            <p className="text-xs text-gray-400">{result.date}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                                Sin categorizar
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold">
                                                            {formatCurrency(result.total)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${getConfidenceColor(result.confidence || 0.5)}`}>
                                                                {Math.round((result.confidence || 0.5) * 100)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )];
                                            }

                                            // If items exist, render each item
                                            return result.items.map((item, iIdx) => (
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
                                            ));
                                        })}
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
