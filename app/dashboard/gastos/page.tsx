'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ScanLine,
    Upload,
    FileText,
    Table2,
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
    Bell,
    Layers,
    ChevronRight,
    Bot,
    Files,
    FileCheck,
    FileSpreadsheet,
    Image as ImageIcon,
    DatabaseZap,
    History,
    Folder,
    ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OCRResult, OCRItem } from '@/types/ocr';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Client state
    const [clients, setClients] = useState<DBClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderNit, setNewFolderNit] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);

    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('FILE');
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');

    // Processing state
    const [processing, setProcessing] = useState(false);
    const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState<OCRResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [savedCount, setSavedCount] = useState(0);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearing, setClearing] = useState(false);

    // Load clients
    const loadClients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, nit')
                .order('name');
            if (error) throw error;
            setClients(data || []);
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
                .insert({ user_id: user.id, name: newFolderName, nit: newFolderNit || null })
                .select()
                .single();

            if (error) throw error;
            setClients([...clients, data]);
            setSelectedClientId(data.id);
            setNewFolderName('');
            setNewFolderNit('');
            setShowNewFolderModal(false);
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
        setProcessingCount({ current: 0, total: inputMode === 'FILE' ? files.length : 1 });

        try {
            let response;

            if (inputMode === 'TEXT') {
                setProcessingCount({ current: 1, total: 1 });
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
                setProcessingCount({ current: 1, total: files.length });

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
                                vendor: result.entity,
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

            if (inputMode === 'FILE') setFiles([]);
            if (inputMode === 'TEXT') setTextInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error procesando');
        } finally {
            setProcessing(false);
        }
    };

    const handleClearClick = () => {
        if (results.length === 0) return;
        setShowClearConfirm(true);
    };

    const confirmClear = async () => {
        if (!selectedClientId) return;

        setClearing(true);
        try {
            const { error } = await supabase
                .from('ocr_results')
                .delete()
                .eq('client_id', selectedClientId);

            if (error) {
                console.error('Error deleting OCR results:', error);
                setError('Error al limpiar los datos');
            } else {
                setResults([]);
                setSavedCount(0);
            }
        } catch (err) {
            console.error('Error clearing:', err);
            setError('Error al limpiar');
        } finally {
            setClearing(false);
            setShowClearConfirm(false);
        }
    };

    const exportToExcel = () => {
        if (results.length === 0) return;

        const headers = ['Cuenta PUC', 'Descripción', 'NIT Tercero', 'Nombre Tercero', 'Documento', 'Fecha', 'Débito', 'Crédito', 'Confianza', 'Archivo'];
        const rows: string[][] = [];

        results.forEach(result => {
            result.items.forEach(item => {
                const pucMatch = item.category?.match(/\((\d+)\)/);
                const pucCode = pucMatch ? pucMatch[1] : '529595';

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

            if (result.items.length > 0) {
                rows.push([
                    '220505',
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
    const avgConfidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1AB1B1]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">

            {/* GUEST BANNER */}
            {isGuest && (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-indigo-600 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-indigo-900 leading-tight">Organiza tus soportes por cliente</h4>
                            <p className="text-sm text-indigo-700/80">Regístrate para crear carpetas de clientes permanentes, guardar el historial de extracciones y exportar lotes de facturas directamente a tu software.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest self-center mr-2">Acceso Invitado</span>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-[#002D44] tracking-tight flex items-center gap-3">
                        <ScanLine className="w-8 h-8 text-[#1AB1B1]" />
                        Digitador Inteligente
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-500 font-medium">Carpeta actual:</span>
                        <span className="bg-[#002D44] text-white px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                            <Folder className="w-3 h-3 text-[#1AB1B1]" />
                            {selectedClient?.name || 'General'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-[0.2em] self-center bg-teal-50 px-4 py-1.5 rounded-full border border-teal-100 shadow-sm">Multi-Doc Enabled v2.5</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-500" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Folders & Upload */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Folder Manager */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-gray-50/80 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-[#002D44]" />
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carpetas de Cliente</span>
                            </div>
                            <button
                                onClick={() => setShowNewFolderModal(true)}
                                className="p-1.5 bg-white border border-gray-200 text-[#1AB1B1] rounded-lg hover:bg-teal-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 max-h-60 overflow-y-auto space-y-1">
                            {loadingClients ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                clients.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedClientId === client.id
                                            ? 'bg-[#002D44] text-white shadow-md'
                                            : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder className={`w-4 h-4 ${selectedClientId === client.id ? 'text-[#1AB1B1]' : 'text-gray-400'}`} />
                                            <span className="text-sm font-bold truncate max-w-[140px]">{client.name}</span>
                                        </div>
                                        <ChevronRight className={`w-3 h-3 opacity-40 ${selectedClientId === client.id ? 'block' : 'hidden'}`} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                        <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
                            <button
                                onClick={() => setInputMode('FILE')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${inputMode === 'FILE' ? 'bg-white text-[#1AB1B1] shadow-md' : 'text-gray-400'
                                    }`}
                            >
                                <Upload className="w-4 h-4" /> Archivo
                            </button>
                            <button
                                onClick={() => setInputMode('TEXT')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${inputMode === 'TEXT' ? 'bg-white text-[#1AB1B1] shadow-md' : 'text-gray-400'
                                    }`}
                            >
                                <Type className="w-4 h-4" /> Texto
                            </button>
                        </div>

                        <div
                            className={`rounded-[2.5rem] border-2 border-dashed transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center p-6 ${processing ? 'border-[#1AB1B1] bg-teal-50/10' : 'border-gray-200 hover:border-[#1AB1B1] hover:bg-gray-50/50'
                                }`}
                            style={{ minHeight: '320px' }}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                        >
                            {processing ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="relative w-16 h-16 mb-6">
                                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-[#1AB1B1] rounded-full border-t-transparent animate-spin"></div>
                                        <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[#1AB1B1] animate-pulse" />
                                    </div>
                                    <h3 className="text-sm font-black text-[#002D44] mb-1">Procesando lote...</h3>
                                    <div className="flex items-center gap-2 bg-[#002D44] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <span>{processingCount.current} de {processingCount.total}</span>
                                        <Files className="w-3 h-3 text-[#99D95E]" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-4 px-6 font-bold uppercase tracking-wider text-center">IA Analizando documentos para: {selectedClient?.name || 'General'}</p>
                                </div>
                            ) : (
                                <>
                                    {inputMode === 'FILE' ? (
                                        <div className="flex flex-col items-center text-center cursor-pointer group w-full" onClick={() => fileInputRef.current?.click()}>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png,.jpeg,.csv,.xlsx,.xls,.txt" multiple />
                                            <div className="w-16 h-16 bg-teal-50 text-[#1AB1B1] rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                                <Upload className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-black text-[#002D44] mb-1">Cargar Soportes</h3>
                                            <p className="text-[10px] text-gray-400 mb-6 font-bold uppercase tracking-wider">Arrastra múltiples archivos aquí</p>
                                            <div className="flex gap-2">
                                                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#1AB1B1] transition-colors"><FileText className="w-4 h-4" /></div>
                                                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#99D95E] transition-colors"><ImageIcon className="w-4 h-4" /></div>
                                                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#002D44] transition-colors"><FileSpreadsheet className="w-4 h-4" /></div>
                                            </div>

                                            {/* File list */}
                                            {files.length > 0 && (
                                                <div className="mt-4 w-full space-y-1 max-h-24 overflow-y-auto">
                                                    {files.map((file, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 rounded-xl">
                                                            <FileText className="w-3 h-3 text-gray-400" />
                                                            <span className="truncate flex-1 font-medium">{file.name}</span>
                                                            <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                                                                <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col">
                                            <textarea
                                                className="w-full flex-1 bg-gray-50 rounded-2xl p-4 text-sm font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-[#1AB1B1] resize-none border border-gray-100 transition-all mb-4"
                                                placeholder="Pega texto de múltiples facturas aquí..."
                                                value={textInput}
                                                onChange={(e) => setTextInput(e.target.value)}
                                                style={{ minHeight: '200px' }}
                                            ></textarea>
                                            <button
                                                onClick={handleProcess}
                                                disabled={!textInput.trim()}
                                                className="w-full bg-[#002D44] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black shadow-lg disabled:opacity-30 transition-all"
                                            >
                                                Procesar Texto <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Process Button for FILE mode */}
                        {inputMode === 'FILE' && !processing && files.length > 0 && (
                            <button
                                onClick={handleProcess}
                                className="w-full mt-4 bg-[#1AB1B1] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#169a9a] shadow-lg transition-all"
                            >
                                <ScanLine className="w-5 h-5" />
                                Analizar ({files.length} archivos)
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Results Table */}
                <div className="lg:col-span-8">
                    {results.length === 0 ? (
                        <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-200 p-20 text-center flex flex-col items-center justify-center opacity-60 min-h-[500px] shadow-sm">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-8">
                                <DatabaseZap className="w-10 h-10 text-gray-200" />
                            </div>
                            <h3 className="text-xl font-black text-[#002D44] mb-2 uppercase tracking-widest">Consolidación Lista</h3>
                            <p className="text-gray-400 max-w-sm font-bold text-sm leading-relaxed">Carga varios archivos para que ContaBot cree un único archivo de exportación estructurado para tu contabilidad.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">

                            {/* Header Info Block */}
                            <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#1AB1B1]">
                                        <Files className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lote Procesado:</p>
                                        <p className="font-black text-[#002D44] text-sm">{results.length} Documentos Cargados</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado:</span>
                                    <span className="font-black text-[#002D44] text-lg">{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>

                            {/* Table Container */}
                            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col" style={{ height: '700px' }}>
                                <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Table2 className="w-5 h-5 text-[#1AB1B1]" />
                                        <h3 className="font-black text-[#002D44] uppercase text-xs tracking-[0.2em]">Asiento Contable Unificado</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleClearClick}
                                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs font-bold transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Limpiar
                                        </button>
                                        <span className="text-[9px] font-black text-white bg-[#002D44] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                                            <FileCheck className="w-3 h-3 text-[#99D95E]" /> {totalItems} Líneas
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                                            <tr>
                                                <th className="px-10 py-6">Concepto Extraído</th>
                                                <th className="px-6 py-6 text-center">Cant.</th>
                                                <th className="px-8 py-6 text-right">Unitario</th>
                                                <th className="px-10 py-6 text-right">Total</th>
                                                <th className="px-8 py-6 text-center">Archivo Fuente</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {results.flatMap((result, rIdx) => {
                                                if (!result.items || result.items.length === 0) {
                                                    return [(
                                                        <tr key={`${rIdx}-total`} className="hover:bg-teal-50/10 transition-colors group">
                                                            <td className="px-10 py-7">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-black text-[#002D44] text-sm group-hover:text-[#1AB1B1] transition-colors">
                                                                        Factura #{result.invoiceNumber || 'N/A'} - {result.entity}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-wider">
                                                                        Cat: General
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-7 text-center font-mono text-xs font-bold text-gray-600">1</td>
                                                            <td className="px-8 py-7 text-right font-mono text-xs font-bold text-gray-600">-</td>
                                                            <td className="px-10 py-7 text-right font-black text-[#002D44] text-sm tabular-nums">
                                                                {formatCurrency(result.total)}
                                                            </td>
                                                            <td className="px-8 py-7 text-center">
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg border border-gray-100 group-hover:bg-teal-50 group-hover:text-[#1AB1B1] group-hover:border-teal-100 transition-colors">
                                                                    <FileText className="w-3 h-3" />
                                                                    <span className="text-[9px] font-bold truncate max-w-[80px]">{result.fileName || 'Manual'}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )];
                                                }

                                                return result.items.map((item, iIdx) => (
                                                    <tr key={`${rIdx}-${iIdx}`} className="hover:bg-teal-50/10 transition-colors group">
                                                        <td className="px-10 py-7">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-black text-[#002D44] text-sm group-hover:text-[#1AB1B1] transition-colors">{item.description}</span>
                                                                <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-wider">Cat: {item.category || 'General'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-7 text-center font-mono text-xs font-bold text-gray-600">{item.quantity || '-'}</td>
                                                        <td className="px-8 py-7 text-right font-mono text-xs font-bold text-gray-600">
                                                            {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                                                        </td>
                                                        <td className="px-10 py-7 text-right font-black text-[#002D44] text-sm tabular-nums">
                                                            {formatCurrency(item.total)}
                                                        </td>
                                                        <td className="px-8 py-7 text-center">
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg border border-gray-100 group-hover:bg-teal-50 group-hover:text-[#1AB1B1] group-hover:border-teal-100 transition-colors">
                                                                <FileText className="w-3 h-3" />
                                                                <span className="text-[9px] font-bold truncate max-w-[80px]">{result.fileName || 'Manual'}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ));
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer area with metrics and EXPORT BUTTON */}
                                <div className="bg-[#002D44] px-10 py-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#99D95E] animate-pulse"></span>
                                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Confianza Lote: {(avgConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-[0.2em]">{totalItems} Registros Consolidados</span>
                                    </div>

                                    <button
                                        onClick={exportToExcel}
                                        className="w-full md:w-auto bg-[#1AB1B1] hover:bg-[#169a9a] text-white px-10 py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-500/10 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                                    >
                                        <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Exportar Lote a Excel
                                    </button>
                                </div>
                            </div>

                            {/* Low confidence warning */}
                            {results.some(r => r.items.some(i => (i.confidence || 0.8) < 0.7)) && (
                                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-orange-700">Revisión requerida</p>
                                        <p className="text-sm text-orange-600">
                                            Algunos items tienen baja confianza. Revisa estos datos antes de exportar.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewFolderModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-gray-100 animate-fade-in">
                        <h3 className="text-2xl font-black text-[#002D44] mb-6 flex items-center gap-3">
                            <Folder className="w-7 h-7 text-[#1AB1B1]" /> Nueva Carpeta
                        </h3>
                        <div className="space-y-4 mb-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Nombre del Cliente / Proyecto</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                                    placeholder="Ej: Inversiones ABC"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">NIT / Cédula (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                                    placeholder="900.123.456"
                                    value={newFolderNit}
                                    onChange={e => setNewFolderNit(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowNewFolderModal(false)} className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={handleCreateFolder} className="flex-1 bg-[#1AB1B1] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-[#169a9a] transition-all">Crear Carpeta</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#002D44]">¿Limpiar Datos?</h3>
                                <p className="text-sm text-gray-500">{results.length} registros serán eliminados</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Esta acción eliminará <strong>permanentemente</strong> todos los registros OCR de la carpeta actual.
                            Esta acción no se puede deshacer.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Esto eliminará {formatCurrency(totalAmount)} en registros
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                disabled={clearing}
                                className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmClear}
                                disabled={clearing}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                            >
                                {clearing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-5 h-5" />
                                        Sí, Eliminar Todo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
