'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ScanLine,
    Upload,
    FileText,
    AlertCircle,
    X,
    Plus,
    Loader2,
    AlertTriangle,
    Trash2,
    Bell,
    Layers,
    ChevronRight,
    Bot,
    Files,
    FileSpreadsheet,
    Image as ImageIcon,
    DatabaseZap,
    Folder,
    DollarSign,
    RefreshCw,
    Zap,
    HardDrive,
    Building2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OCRItem, OCRResult, ValidationResult } from './types';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import { useUsageStats } from '@/components/usage/UsageIndicator';
import { FILE_LIMITS, formatBytes } from '@/lib/usage-limits';
import { InvoiceGroup, GroupedInvoiceData } from './components/InvoiceGroup';
import type { InvoiceData } from './components/InvoiceCard';
import { useToast } from '@/components/ui/Toast';
import { useFeedback } from '@/components/feedback';
import { useClient } from '@/lib/context/ClientContext';
import { addLocalClient, getLocalClients } from '@/lib/local-storage';
import Link from 'next/link';

// Interfaces removed as they are now imported from ./types

// Guest user limits
const GUEST_LIMITS = {
    MAX_CLIENTS: 1,
    MAX_INVOICES: 3,
};

// TRM (Tasa Representativa del Mercado) for USD to COP conversion
interface TRMData {
    rate: number;
    date: string;
    source: 'api' | 'cache' | 'fallback';
}

export default function GastosPage() {
    const supabase = createClient();
    const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
    const isGuest = !isAuthenticated;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { stats: usageStats, refresh: refreshUsage } = useUsageStats();

    // Client state from global context
    const { clients, selectedClientId, setSelectedClientId, refreshClients, isLoading: loadingClients } = useClient();
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderNit, setNewFolderNit] = useState('');

    // Input state
    const [files, setFiles] = useState<File[]>([]);

    // Processing state
    const [processing, setProcessing] = useState(false);
    const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState<OCRResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [savedCount, setSavedCount] = useState(0);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [clearConfirmText, setClearConfirmText] = useState('');

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; entity: string; count: number; totalAmount: number }>({
        isOpen: false,
        entity: '',
        count: 0,
        totalAmount: 0
    });
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingGroup, setDeletingGroup] = useState(false);
    const { addToast } = useToast();
    const { trackAction } = useFeedback();

    // TRM state for USD to COP conversion
    const [trm, setTrm] = useState<TRMData | null>(null);
    const [loadingTrm, setLoadingTrm] = useState(false);

    // Fetch TRM on mount (for USD to COP conversion)
    const fetchTRM = useCallback(async () => {
        setLoadingTrm(true);
        try {
            const response = await fetch('/api/trm');
            const data = await response.json();
            if (data.rate) {
                setTrm({
                    rate: data.rate,
                    date: data.date,
                    source: data.source
                });
            }
        } catch (error) {
            console.error('Error fetching TRM:', error);
            // Use fallback rate
            setTrm({ rate: 4350, date: new Date().toISOString().split('T')[0], source: 'fallback' });
        } finally {
            setLoadingTrm(false);
        }
    }, []);

    useEffect(() => {
        fetchTRM();
    }, [fetchTRM]);

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
                .is('deleted_at', null)  // Filter out soft-deleted records
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading saved results:', error);
                return;
            }

            if (data && data.length > 0) {
                const loadedResults: OCRResult[] = data.map(record => ({
                    id: record.id, // Database record ID - required for deletion
                    fileName: record.filename || 'Documento',
                    entity: record.vendor || 'Desconocido',
                    nit: record.nit || '',
                    date: record.invoice_date || '',
                    invoiceNumber: record.invoice_number || '',
                    subtotal: record.subtotal || 0,
                    iva: record.iva || 0,
                    tax_inc: record.tax_inc || 0,
                    tip: record.tip || 0,
                    retentions: record.retentions || { reteFuente: 0, reteIca: 0, reteIva: 0 },
                    total: record.total || 0,
                    items: record.items || [],
                    confidence: record.confidence || 0.5,
                    // New OCR feature fields
                    currency: record.currency || 'COP',
                    aiu: record.aiu || undefined,
                    iva_rate: record.iva_rate || undefined,
                    tax_inc_rate: record.tax_inc_rate || undefined,
                    // Validation persistence
                    validation: record.validation_result || undefined,
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
            if (isAuthenticated) {
                // Authenticated user: save to Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('clients')
                    .insert({ user_id: user.id, name: newFolderName, nit: newFolderNit || null })
                    .select()
                    .single();

                if (error) throw error;

                // Refresh clients from context and select the new one
                await refreshClients();
                setSelectedClientId(data.id);
            } else {
                // Guest user: check limits first
                if (clients.length >= GUEST_LIMITS.MAX_CLIENTS) {
                    addToast({
                        type: 'warning',
                        title: 'Límite de invitado',
                        description: 'Solo puedes crear 1 carpeta. Regístrate para más.'
                    });
                    setShowNewFolderModal(false);
                    return;
                }

                // Guest user: save to localStorage
                const newClient = addLocalClient({
                    name: newFolderName,
                    nit: newFolderNit || '',
                    classification: 'JURIDICA',
                    tax_regime: 'ORDINARIO',
                    iva_periodicity: 'BIMESTRAL',
                    is_retention_agent: false,
                    has_gmf: false,
                    requires_exogena: false,
                    has_patrimony_tax: false,
                    alert_days: [7, 3, 1],
                    email_alert: false,
                    whatsapp_alert: false,
                });

                // Refresh clients from context and select the new one
                await refreshClients();
                setSelectedClientId(newClient.id);

                addToast({
                    type: 'success',
                    title: 'Carpeta creada',
                    description: 'Datos guardados localmente. Regístrate para sincronizar.'
                });
            }

            setNewFolderName('');
            setNewFolderNit('');
            setShowNewFolderModal(false);
        } catch {
            setError('Error creando carpeta');
        }
    };

    // Validar archivos antes de añadir
    const validateFiles = (newFiles: File[]): { valid: File[]; errors: string[] } => {
        const valid: File[] = [];
        const errors: string[] = [];
        const maxSize = FILE_LIMITS.MAX_FILE_SIZE_BYTES; // 10MB

        for (const file of newFiles) {
            // Validar tamaño
            if (file.size > maxSize) {
                errors.push(`"${file.name}" excede el límite de 10MB (${formatBytes(file.size)})`);
                continue;
            }

            // Validar tipo
            const allowedTypes = FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[];
            if (!allowedTypes.includes(file.type) && file.type !== '') {
                // También verificar por extensión
                const ext = file.name.split('.').pop()?.toLowerCase();
                const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
                if (!ext || !allowedExts.includes(ext)) {
                    errors.push(`"${file.name}" no es un tipo de archivo soportado. Usa JPG, PNG o PDF`);
                    continue;
                }
            }

            valid.push(file);
        }

        return { valid, errors };
    };

    // File handlers
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const { valid, errors } = validateFiles(Array.from(e.target.files));

            if (errors.length > 0) {
                setError(errors.join('. '));
            } else {
                setError(null);
            }

            if (valid.length > 0) {
                setFiles(prev => [...prev, ...valid]);
            }

            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const { valid, errors } = validateFiles(Array.from(e.dataTransfer.files));

            if (errors.length > 0) {
                setError(errors.join('. '));
            } else {
                setError(null);
            }

            if (valid.length > 0) {
                setFiles(prev => [...prev, ...valid]);
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    // Process documents
    const handleProcess = async () => {
        if (files.length === 0) return;

        // Check guest invoice limit
        if (isGuest) {
            const totalAfterProcess = results.length + files.length;
            if (results.length >= GUEST_LIMITS.MAX_INVOICES) {
                setError('Has alcanzado el límite de 3 facturas en modo invitado. Regístrate para continuar.');
                return;
            }
            if (totalAfterProcess > GUEST_LIMITS.MAX_INVOICES) {
                const canProcess = GUEST_LIMITS.MAX_INVOICES - results.length;
                setError(`Solo puedes procesar ${canProcess} factura(s) más. Regístrate para procesar sin límites.`);
                return;
            }
        }

        setProcessing(true);
        setError(null);
        setProcessingCount({ current: 0, total: files.length });

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            if (selectedClientId) formData.append('clientId', selectedClientId);
            setProcessingCount({ current: 1, total: files.length });

            const response = await fetch('/api/ocr', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            // Manejar errores de límite de uso
            if (response.status === 429) {
                setError(data.error || 'Has alcanzado el límite de solicitudes. Vuelve mañana o actualiza tu plan.');
                await refreshUsage();
                return;
            }

            // Manejar error de autenticación
            if (response.status === 401) {
                setError('Debes iniciar sesión para usar esta función');
                return;
            }

            if (!data.success) {
                throw new Error(data.error || 'Error procesando documentos');
            }

            // Refrescar estadísticas de uso
            await refreshUsage();

            // Auto-save to Supabase for authenticated users and get IDs
            const resultsWithIds: OCRResult[] = [];
            if (isAuthenticated && data.results.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    let savedThisSession = 0;
                    for (const result of data.results) {
                        try {
                            // Check for existing invoice to prevent duplicates
                            // Uses multi-criteria matching for robustness
                            let existing = null;

                            if (result.invoiceNumber) {
                                // Primary: Match by invoice_number + nit (allows same invoice# from different vendors)
                                const { data: existingData } = await supabase
                                    .from('ocr_results')
                                    .select('id')
                                    .eq('client_id', selectedClientId)
                                    .eq('invoice_number', result.invoiceNumber)
                                    .eq('nit', result.nit || '')
                                    .is('deleted_at', null)
                                    .maybeSingle();
                                existing = existingData;
                            } else {
                                // Fallback: Match by filename + vendor + date (for receipts without invoice numbers)
                                const { data: existingData } = await supabase
                                    .from('ocr_results')
                                    .select('id')
                                    .eq('client_id', selectedClientId)
                                    .eq('filename', result.fileName)
                                    .eq('vendor', result.entity || '')
                                    .eq('invoice_date', result.date || '')
                                    .is('deleted_at', null)
                                    .maybeSingle();
                                existing = existingData;
                            }

                            if (existing) {
                                console.log(`Skipping duplicate: ${result.invoiceNumber || result.fileName} from ${result.entity}`);
                                // Still add to results with existing ID
                                resultsWithIds.push({ ...result, id: existing.id });
                                continue;
                            }

                            // Insert and get the generated ID
                            const { data: insertedData, error: insertError } = await supabase
                                .from('ocr_results')
                                .insert({
                                    user_id: user.id,
                                    client_id: selectedClientId,
                                    filename: result.fileName || 'text_input',
                                    file_type: 'image',
                                    vendor: result.entity,
                                    nit: result.nit || null,
                                    invoice_number: result.invoiceNumber,
                                    invoice_date: result.date,
                                    subtotal: result.subtotal || 0,
                                    iva: result.iva || 0,
                                    tax_inc: result.tax_inc || 0,
                                    tip: result.tip || 0,
                                    retentions: result.retentions || { reteFuente: 0, reteIca: 0, reteIva: 0 },
                                    total: result.total || 0,
                                    items: result.items || [],
                                    confidence: result.confidence || 0,
                                    tokens_input: result.tokens_input || 0,
                                    tokens_output: result.tokens_output || 0,
                                    cost_estimated: result.cost_estimated || 0,
                                    // New OCR feature fields
                                    currency: result.currency || 'COP',
                                    aiu: result.aiu || null,
                                    iva_rate: result.iva_rate || null,
                                    tax_inc_rate: result.tax_inc_rate || null,
                                    // Validation persistence
                                    validation_result: result.validation || null,
                                    validation_passed: result.validation?.isValid ?? null
                                })
                                .select('id')
                                .single();

                            if (insertError) {
                                console.error('Error inserting OCR result:', insertError);
                                resultsWithIds.push(result); // Add without ID as fallback
                            } else {
                                // Add result with the database-generated ID
                                resultsWithIds.push({ ...result, id: insertedData.id });
                                savedThisSession++;
                            }
                        } catch (saveErr) {
                            console.error('Error saving OCR result:', saveErr);
                            resultsWithIds.push(result); // Add without ID as fallback
                        }
                    }
                    setSavedCount(prev => prev + savedThisSession);
                }
            } else {
                // For guest users, add results without IDs
                resultsWithIds.push(...data.results);
            }

            // Update state with results that include database IDs
            setResults(prev => [...prev, ...resultsWithIds]);

            // Track para feedback después de procesamiento OCR exitoso
            if (resultsWithIds.length > 0) {
                trackAction('gastos', 'ocr_process');
            }

            setFiles([]);
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
            // Use soft delete bulk via RPC for safe deletion with audit trail
            const { error } = await supabase.rpc('soft_delete_bulk', {
                p_table_name: 'ocr_results',
                p_filter_column: 'client_id',
                p_filter_value: selectedClientId,
                p_reason: 'Limpieza masiva desde modulo gastos'
            });

            if (error) {
                console.error('Error soft deleting OCR results:', error);
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

    // Open delete modal for a group
    const openDeleteGroupModal = (entity: string) => {
        if (!selectedClientId) return;
        const groupResults = results.filter(r => r.entity === entity);
        const totalAmount = groupResults.reduce((sum, r) => sum + r.total, 0);
        setDeleteModal({ isOpen: true, entity, count: groupResults.length, totalAmount });
        setDeleteConfirmText('');
    };

    const handleDeleteGroup = async () => {
        if (!selectedClientId) return;
        const { entity } = deleteModal;

        try {
            // First get all record IDs for this vendor
            const { data: records, error: fetchError } = await supabase
                .from('ocr_results')
                .select('id')
                .eq('client_id', selectedClientId)
                .eq('vendor', entity)
                .is('deleted_at', null);

            if (fetchError) {
                console.error('Error fetching group records:', fetchError);
                setError('Error al obtener registros del grupo');
                return;
            }

            // Soft delete each record
            if (records && records.length > 0) {
                for (const record of records) {
                    await supabase.rpc('soft_delete_record', {
                        p_table_name: 'ocr_results',
                        p_record_id: record.id,
                        p_reason: `Eliminacion de grupo: ${entity}`
                    });
                }
            }

            setResults(prev => prev.filter(r => r.entity !== entity));

            addToast({
                type: 'success',
                title: 'Registros eliminados',
                description: `${records?.length || 0} documentos de "${entity}" movidos a la papelera`,
                action: {
                    label: 'Ver papelera',
                    onClick: () => window.location.href = '/dashboard/papelera'
                }
            });
        } catch (err) {
            console.error('Error in handleDeleteGroup:', err);
            setError('Error al eliminar');
            addToast({
                type: 'error',
                title: 'Error',
                description: 'No se pudieron eliminar los registros'
            });
        }
    };

    // Handle individual item deletion within a group
    const handleDeleteItem = async (invoiceId: string, fileName: string, itemIndex: number) => {
        if (!selectedClientId) return;

        try {
            // Find the OCR result by ID (or fileName as fallback)
            const resultToUpdate = results.find(r => r.id === invoiceId || r.fileName === fileName);
            if (!resultToUpdate || !resultToUpdate.id) {
                console.error('Result not found for invoiceId:', invoiceId);
                return;
            }

            // If the document has only one item, delete the entire document
            if (resultToUpdate.items.length <= 1) {
                await supabase.rpc('soft_delete_record', {
                    p_table_name: 'ocr_results',
                    p_record_id: resultToUpdate.id,
                    p_reason: `Eliminación de único item de ${resultToUpdate.entity}`
                });
                setResults(prev => prev.filter(r => r.id !== resultToUpdate.id));

                addToast({
                    type: 'success',
                    title: 'Documento eliminado',
                    description: `Documento de "${resultToUpdate.entity}" movido a la papelera`,
                    action: {
                        label: 'Ver papelera',
                        onClick: () => window.location.href = '/dashboard/papelera'
                    }
                });
            } else {
                // Remove only the specific item from the items array
                // We need to find the correct item index within this specific document
                const itemsInThisDoc = resultToUpdate.items;
                const updatedItems = itemsInThisDoc.filter((_, idx) => idx !== itemIndex);

                // Update in database
                const { error: updateError } = await supabase
                    .from('ocr_results')
                    .update({
                        items: updatedItems,
                        // Recalculate totals
                        total: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0),
                        subtotal: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
                    })
                    .eq('id', resultToUpdate.id);

                if (updateError) {
                    console.error('Error updating items:', updateError);
                    addToast({
                        type: 'error',
                        title: 'Error',
                        description: 'No se pudo eliminar el item'
                    });
                    return;
                }

                // Update local state
                setResults(prev => prev.map(r =>
                    r.id === resultToUpdate.id
                        ? {
                            ...r,
                            items: updatedItems,
                            total: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0),
                            subtotal: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
                        }
                        : r
                ));

                addToast({
                    type: 'success',
                    title: 'Item eliminado',
                    description: `Item de "${resultToUpdate.entity}" eliminado correctamente`
                });
            }
        } catch (err) {
            console.error('Error in handleDeleteItem:', err);
            addToast({
                type: 'error',
                title: 'Error',
                description: 'No se pudo eliminar el item'
            });
        }
    };

    // Handle deleting an entire invoice (single document)
    const handleDeleteInvoice = async (invoiceId: string, fileName: string) => {
        if (!selectedClientId || !invoiceId) return;

        try {
            const resultToDelete = results.find(r => r.id === invoiceId);
            if (!resultToDelete) {
                console.error('Invoice not found:', invoiceId);
                return;
            }

            await supabase.rpc('soft_delete_record', {
                p_table_name: 'ocr_results',
                p_record_id: invoiceId,
                p_reason: `Eliminación de factura: ${fileName}`
            });

            setResults(prev => prev.filter(r => r.id !== invoiceId));

            addToast({
                type: 'success',
                title: 'Factura eliminada',
                description: `"${fileName}" movido a la papelera`,
                action: {
                    label: 'Ver papelera',
                    onClick: () => window.location.href = '/dashboard/papelera'
                }
            });
        } catch (err) {
            console.error('Error in handleDeleteInvoice:', err);
            addToast({
                type: 'error',
                title: 'Error',
                description: 'No se pudo eliminar la factura'
            });
        }
    };

    const exportToExcel = async () => {
        if (results.length === 0) return;

        try {
            // Import the Excel export service dynamically to avoid SSR issues
            const { generateAccountingExcel } = await import('@/lib/services/excel-export-service');
            const clientName = clients.find(c => c.id === selectedClientId)?.name || 'General';

            const blob = await generateAccountingExcel({
                clientName,
                results,
                includeItems: true,
                includeTaxSummary: true
            });

            // Download the file
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `asiento_contable_${clientName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);

            // Track para feedback después de exportar Excel
            trackAction('gastos', 'excel_export');
        } catch (err) {
            console.error('Error generating Excel:', err);
            addToast({
                type: 'error',
                title: 'Error',
                description: 'No se pudo generar el archivo Excel'
            });
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };

    const formatUSD = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
    };

    // Convert amount to COP based on currency
    const convertToCOP = (amount: number, currency?: string): number => {
        if (!currency || currency === 'COP') return amount;
        if (currency === 'USD' && trm) {
            return Math.round(amount * trm.rate);
        }
        return amount; // Unknown currency, return as-is
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'text-green-600 bg-green-50';
        if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const selectedClient = clients.find(c => c.id === selectedClientId);

    // Calculate totals with currency conversion
    const { totalAmountCOP, totalUSD, hasUSDInvoices } = results.reduce(
        (acc, r) => {
            if (r.currency === 'USD') {
                acc.totalUSD += r.total;
                acc.totalAmountCOP += convertToCOP(r.total, 'USD');
                acc.hasUSDInvoices = true;
            } else {
                acc.totalAmountCOP += r.total;
            }
            return acc;
        },
        { totalAmountCOP: 0, totalUSD: 0, hasUSDInvoices: false }
    );

    const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
    const avgConfidence = results.length > 0
        ? results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
        : 0;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">

            {/* GUEST BANNER */}
            {isGuest && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 sm:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-base sm:text-lg font-bold text-emerald-900 leading-tight">Organiza tus soportes por cliente</h4>
                            <p className="text-xs sm:text-sm text-emerald-700/80">Regístrate para crear carpetas permanentes y guardar el historial de extracciones.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest self-center">Acceso Invitado</span>
                    </div>
                </div>
            )}

            {/* GUEST LIMITS BANNER */}
            {isGuest && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-amber-800">
                                {results.length}/{GUEST_LIMITS.MAX_INVOICES} facturas procesadas
                                {clients.length > 0 && ` · ${clients.length}/${GUEST_LIMITS.MAX_CLIENTS} carpeta`}
                            </p>
                            <p className="text-xs text-amber-600">
                                {results.length >= GUEST_LIMITS.MAX_INVOICES
                                    ? 'Límite alcanzado. Regístrate para continuar.'
                                    : `Te quedan ${GUEST_LIMITS.MAX_INVOICES - results.length} facturas en modo invitado.`
                                }
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/register"
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shrink-0"
                    >
                        Crear Cuenta Gratis
                    </Link>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-4 sm:pb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2 sm:gap-3">
                        <ScanLine className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 shrink-0" />
                        Digitador Inteligente
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs sm:text-sm text-zinc-500 font-medium">Carpeta:</span>
                        <span className="bg-zinc-900 text-white px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-2 shadow-sm">
                            <Folder className="w-3 h-3 text-emerald-600" />
                            <span className="max-w-[120px] sm:max-w-none truncate">{selectedClient?.name || 'General'}</span>
                        </span>
                    </div>
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

            {/* Header de Empresa Destacado */}
            {selectedClientId && selectedClient && (
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
                            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-white truncate">
                                {selectedClient.name}
                            </h3>
                            <p className="text-zinc-400 text-xs sm:text-sm">
                                NIT: {selectedClient.nit || 'No registrado'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 w-full sm:w-auto justify-end">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">{results.length} docs</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">

                {/* LEFT COLUMN: Folders & Upload */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-6">

                    {/* Folder Manager */}
                    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                        <div className="bg-zinc-50/80 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-zinc-900" />
                                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Carpetas de Cliente</span>
                            </div>
                            <button
                                onClick={() => setShowNewFolderModal(true)}
                                className="p-1.5 bg-white border border-zinc-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 max-h-60 overflow-y-auto space-y-1">
                            {loadingClients ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                </div>
                            ) : (
                                clients.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedClientId === client.id
                                            ? 'bg-zinc-900 text-white shadow-md'
                                            : 'hover:bg-zinc-50 text-zinc-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder className={`w-4 h-4 ${selectedClientId === client.id ? 'text-emerald-600' : 'text-zinc-400'}`} />
                                            <span className="text-sm font-bold truncate max-w-[140px]">{client.name}</span>
                                        </div>
                                        <ChevronRight className={`w-3 h-3 opacity-40 ${selectedClientId === client.id ? 'block' : 'hidden'}`} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-zinc-100 shadow-xl relative overflow-hidden">
                        <div
                            className={`rounded-2xl border-2 border-dashed transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center p-6 ${processing ? 'border-emerald-600 bg-emerald-50/10' : 'border-zinc-200 hover:border-emerald-600 hover:bg-zinc-50/50'
                                }`}
                            style={{ minHeight: '280px' }}
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                        >
                            {processing ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="relative w-16 h-16 mb-6">
                                        <div className="absolute inset-0 border-4 border-zinc-100 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
                                        <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600 animate-pulse" />
                                    </div>
                                    <h3 className="text-sm font-black text-zinc-900 mb-1">Procesando lote...</h3>
                                    <div className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <span>{processingCount.current} de {processingCount.total}</span>
                                        <Files className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-4 px-6 font-bold uppercase tracking-wider text-center">IA Analizando documentos para: {selectedClient?.name || 'General'}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center cursor-pointer group w-full" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png,.jpeg" multiple />
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-black text-zinc-900 mb-1">Cargar Archivos</h3>
                                    <p className="text-[10px] text-zinc-400 mb-2 font-bold uppercase tracking-wider">Arrastra múltiples archivos aquí</p>
                                    <p className="text-[9px] text-zinc-300 mb-4 font-medium">Facturas, Extractos, Tirillas POS • JPG, PNG, PDF • Máx. 10MB</p>
                                    <div className="flex gap-2">
                                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-400 group-hover:text-emerald-600 transition-colors"><FileText className="w-4 h-4" /></div>
                                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-400 group-hover:text-emerald-400 transition-colors"><ImageIcon className="w-4 h-4" /></div>
                                    </div>

                                    {/* File list */}
                                    {files.length > 0 && (
                                        <div className="mt-4 w-full space-y-1 max-h-24 overflow-y-auto">
                                            {files.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs bg-zinc-50 px-3 py-2 rounded-xl">
                                                    <FileText className="w-3 h-3 text-zinc-400" />
                                                    <span className="truncate flex-1 font-medium">{file.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                                                        <X className="w-3 h-3 text-zinc-400 hover:text-red-500" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Process Button */}
                        {!processing && files.length > 0 && (
                            <button
                                onClick={handleProcess}
                                className="w-full mt-4 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-lg transition-all"
                            >
                                <ScanLine className="w-5 h-5" />
                                Analizar ({files.length} archivos)
                            </button>
                        )}
                    </div>

                    {/* USAGE INDICATOR - Compacto debajo del upload */}
                    {isAuthenticated && (
                        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <Zap className="w-4 h-4 text-emerald-600" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium text-zinc-600">Archivos hoy</span>
                                            <span className="font-bold text-emerald-600">{usageStats?.remaining?.daily_files ?? 10}/{usageStats?.limits?.daily_files ?? 10}</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${usageStats?.percentage?.files ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-200" />
                                <div className="flex items-center gap-3 flex-1">
                                    <HardDrive className="w-4 h-4 text-zinc-400" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium text-zinc-600">Datos</span>
                                            <span className="font-bold text-zinc-500">{formatBytes(usageStats?.daily?.bytes_processed ?? 0)}/{usageStats?.limits?.daily_bytes_mb ?? 50}MB</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-zinc-400 transition-all duration-500"
                                                style={{ width: `${usageStats?.percentage?.bytes ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Results Table */}
                <div className="lg:col-span-8">
                    {results.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-zinc-200 p-8 sm:p-12 lg:p-20 text-center flex flex-col items-center justify-center opacity-60 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] shadow-sm">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 lg:mb-8">
                                <DatabaseZap className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-zinc-200" />
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-black text-zinc-900 mb-2 uppercase tracking-wider sm:tracking-widest">Consolidación Lista</h3>
                            <p className="text-zinc-400 max-w-sm font-bold text-xs sm:text-sm leading-relaxed px-4">Carga varios archivos para que Contabio cree un único archivo de exportación estructurado.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">

                            {/* Header Info Block */}
                            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                        <Files className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lote Procesado:</p>
                                        <p className="font-black text-zinc-900 text-sm">{results.length} Facturas</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                    <button
                                        onClick={handleClearClick}
                                        className="flex items-center justify-center gap-1 text-zinc-400 hover:text-red-500 text-xs font-bold transition-colors px-3 py-2 border border-zinc-200 rounded-xl sm:border-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="sm:hidden">Limpiar</span>
                                        <span className="hidden sm:inline">Limpiar Todo</span>
                                    </button>
                                    <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 bg-zinc-50 px-3 sm:px-6 py-2 rounded-xl sm:rounded-2xl border border-zinc-100">
                                        <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total:</span>
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-zinc-900 text-sm sm:text-lg">{formatCurrency(totalAmountCOP)}</span>
                                            {hasUSDInvoices && trm && (
                                                <span className="text-[9px] sm:text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    {formatUSD(totalUSD)} × TRM {trm.rate.toLocaleString('es-CO')}
                                                </span>
                                            )}
                                        </div>
                                        {loadingTrm && (
                                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* GROUPED INVOICE LIST */}
                            <div className="space-y-4 pb-20">
                                {Array.from(
                                    results.reduce((map, result) => {
                                        // Key for grouping: Use NIT if available, otherwise fallback to Entity Name
                                        const key = result.nit && result.nit.length > 5 ? result.nit : result.entity;
                                        if (!map.has(key)) {
                                            map.set(key, {
                                                nit: result.nit || 'S/N',
                                                entity: result.entity,
                                                currency: result.currency || 'COP',
                                                invoiceCount: 0,
                                                invoices: [] as InvoiceData[],
                                                totals: {
                                                    subtotal: 0,
                                                    iva: 0,
                                                    tax_inc: 0,
                                                    tip: 0,
                                                    aiu: undefined as { administracion: number; imprevistos: number; utilidad: number; base_gravable: number } | undefined,
                                                    retentions: {
                                                        reteFuente: 0,
                                                        reteIca: 0,
                                                        reteIva: 0
                                                    },
                                                    total: 0
                                                },
                                                validation: result.validation // Store first invoice's validation
                                            });
                                        }
                                        const entry = map.get(key)!;

                                        // Add individual invoice to the array
                                        entry.invoices.push({
                                            id: result.id,
                                            invoiceNumber: result.invoiceNumber,
                                            date: result.date,
                                            fileName: result.fileName,
                                            items: result.items,
                                            subtotal: result.subtotal || 0,
                                            iva: result.iva || 0,
                                            iva_rate: result.iva_rate,
                                            tax_inc: result.tax_inc || 0,
                                            tax_inc_rate: result.tax_inc_rate,
                                            tip: result.tip || 0,
                                            aiu: result.aiu,
                                            retentions: {
                                                reteFuente: result.retentions?.reteFuente || 0,
                                                reteIca: result.retentions?.reteIca || 0,
                                                reteIva: result.retentions?.reteIva || 0
                                            },
                                            total: result.total,
                                            validation: result.validation
                                        });

                                        // Update consolidated totals
                                        entry.invoiceCount += 1;
                                        entry.totals.total += result.total;
                                        entry.totals.subtotal += result.subtotal || 0;
                                        entry.totals.iva += result.iva || 0;
                                        entry.totals.tax_inc += result.tax_inc || 0;
                                        entry.totals.tip += result.tip || 0;

                                        if (result.retentions) {
                                            entry.totals.retentions.reteFuente += result.retentions.reteFuente || 0;
                                            entry.totals.retentions.reteIca += result.retentions.reteIca || 0;
                                            entry.totals.retentions.reteIva += result.retentions.reteIva || 0;
                                        }

                                        // Aggregate AIU (Colombian construction/service invoicing)
                                        if (result.aiu && (result.aiu.administracion > 0 || result.aiu.imprevistos > 0 || result.aiu.utilidad > 0)) {
                                            if (!entry.totals.aiu) {
                                                entry.totals.aiu = { administracion: 0, imprevistos: 0, utilidad: 0, base_gravable: 0 };
                                            }
                                            entry.totals.aiu.administracion += result.aiu.administracion || 0;
                                            entry.totals.aiu.imprevistos += result.aiu.imprevistos || 0;
                                            entry.totals.aiu.utilidad += result.aiu.utilidad || 0;
                                            entry.totals.aiu.base_gravable = (entry.totals.aiu.base_gravable || 0) + (result.aiu.base_gravable || 0);
                                        }

                                        return map;
                                    }, new Map<string, GroupedInvoiceData>())
                                ).map(([key, group], idx) => (
                                    <InvoiceGroup
                                        key={idx}
                                        group={group}
                                        formatCurrency={formatCurrency}
                                        onDelete={openDeleteGroupModal}
                                        onDeleteInvoice={handleDeleteInvoice}
                                        onDeleteItem={handleDeleteItem}
                                    />
                                ))}
                            </div>

                            {/* Footer Floating Action Button for Export */}
                            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-40">
                                <button
                                    onClick={exportToExcel}
                                    className="bg-zinc-900 hover:bg-zinc-950 text-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-[0.2em] shadow-2xl flex items-center gap-2 sm:gap-3 transition-all hover:scale-105"
                                >
                                    <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                                    <span className="hidden sm:inline">Exportar Asiento ({totalItems} Líneas)</span>
                                    <span className="inline sm:hidden">Excel ({totalItems})</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewFolderModal(false)}></div>
                    <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md relative z-10 shadow-2xl border border-zinc-100 animate-fade-in mx-4">
                        <h3 className="text-xl sm:text-2xl font-black text-zinc-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                            <Folder className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" /> Nueva Carpeta
                        </h3>
                        <div className="space-y-4 mb-6 sm:mb-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nombre del Cliente / Proyecto</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                    placeholder="Ej: Inversiones ABC"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">NIT / Cédula (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                    placeholder="900.123.456"
                                    value={newFolderNit}
                                    onChange={e => setNewFolderNit(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowNewFolderModal(false)} className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button onClick={handleCreateFolder} className="flex-1 bg-emerald-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Confirmation Modal - Enhanced Security */}
            {showClearConfirm && (() => {
                // Calculate unique vendors/providers
                const uniqueVendors = new Set(results.map(r => r.entity)).size;
                const confirmPhrase = 'BORRAR TODO';
                const isConfirmValid = clearConfirmText.toUpperCase() === confirmPhrase;

                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-zinc-900">Eliminar Todos los Datos</h3>
                                    <p className="text-sm text-zinc-500">Acción irreversible</p>
                                </div>
                            </div>

                            <p className="text-zinc-600 mb-4">
                                Esta acción eliminará <strong className="text-red-600">permanentemente</strong> todos los registros OCR de la carpeta actual, incluyendo:
                            </p>

                            {/* Summary of what will be deleted */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-600">Proveedores:</span>
                                    <span className="font-bold text-zinc-900">{uniqueVendors}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-600">Facturas/Documentos:</span>
                                    <span className="font-bold text-zinc-900">{results.length}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-zinc-200 pt-2 mt-2">
                                    <span className="text-zinc-600">Monto total:</span>
                                    <span className="font-black text-red-600">{formatCurrency(totalAmountCOP)}</span>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                                <p className="text-sm text-red-700 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Esta acción <strong>NO se puede deshacer</strong>. Los datos se eliminarán permanentemente.</span>
                                </p>
                            </div>

                            {/* Confirmation input */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    Para confirmar, escribe <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{confirmPhrase}</span>
                                </label>
                                <input
                                    type="text"
                                    value={clearConfirmText}
                                    onChange={(e) => setClearConfirmText(e.target.value)}
                                    placeholder="Escribe aquí para confirmar..."
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all text-center font-bold uppercase tracking-wider"
                                    disabled={clearing}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowClearConfirm(false);
                                        setClearConfirmText('');
                                    }}
                                    disabled={clearing}
                                    className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (isConfirmValid) {
                                            confirmClear();
                                            setClearConfirmText('');
                                        }
                                    }}
                                    disabled={clearing || !isConfirmValid}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                        isConfirmValid
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                    }`}
                                >
                                    {clearing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-5 h-5" />
                                            Eliminar Todo
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Delete Group Confirmation Modal - Enhanced */}
            {deleteModal.isOpen && (() => {
                const confirmPhrase = 'ELIMINAR';
                const isConfirmValid = deleteConfirmText.toUpperCase() === confirmPhrase;
                // Get individual invoices for this vendor
                const vendorInvoices = results.filter(r => r.entity === deleteModal.entity);

                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-zinc-900">Eliminar Proveedor</h3>
                                    <p className="text-sm text-zinc-500">{deleteModal.entity}</p>
                                </div>
                            </div>

                            <p className="text-zinc-600 mb-4">
                                Se eliminarán <strong className="text-red-600">todas las facturas</strong> de este proveedor:
                            </p>

                            {/* Summary of invoices to delete */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                                <div className="space-y-2">
                                    {vendorInvoices.map((invoice, idx) => (
                                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-zinc-100 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-700 font-medium truncate max-w-[180px]">
                                                    {invoice.invoiceNumber || invoice.fileName}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">{invoice.date}</span>
                                            </div>
                                            <span className="font-bold text-zinc-900">{formatCurrency(invoice.total)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-sm border-t-2 border-zinc-300 pt-3 mt-3">
                                    <span className="font-bold text-zinc-700">Total ({deleteModal.count} facturas)</span>
                                    <span className="font-black text-red-600">{formatCurrency(deleteModal.totalAmount)}</span>
                                </div>
                            </div>

                            {/* Recoverable notice */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5">
                                <p className="text-sm text-emerald-700 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 shrink-0" />
                                    <span>Podrás restaurar desde la <strong>papelera</strong> en los próximos 30 días</span>
                                </p>
                            </div>

                            {/* Confirmation input */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-zinc-700 mb-2">
                                    Para confirmar, escribe <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{confirmPhrase}</span>
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="Escribe aquí para confirmar..."
                                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all text-center font-bold uppercase tracking-wider"
                                    disabled={deletingGroup}
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setDeleteModal({ isOpen: false, entity: '', count: 0, totalAmount: 0 });
                                        setDeleteConfirmText('');
                                    }}
                                    disabled={deletingGroup}
                                    className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (isConfirmValid) {
                                            setDeletingGroup(true);
                                            await handleDeleteGroup();
                                            setDeletingGroup(false);
                                            setDeleteModal({ isOpen: false, entity: '', count: 0, totalAmount: 0 });
                                            setDeleteConfirmText('');
                                        }
                                    }}
                                    disabled={deletingGroup || !isConfirmValid}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                        isConfirmValid
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                    }`}
                                >
                                    {deletingGroup ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-5 h-5" />
                                            Eliminar Facturas
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
