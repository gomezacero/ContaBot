
import React, { useState, useRef, useEffect } from 'react';
import { processSmartDocument, processSmartText } from '../utils/modulesLogic';
import { SmartExpenseResult, ExpenseHistoryItem, ClientFolder } from '../types';
import { 
  ScanLine, 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Copy, 
  Table2, 
  Code2,
  Download,
  Type,
  ArrowRight,
  History,
  Folder,
  Plus,
  ChevronRight,
  Building2,
  BrainCircuit,
  FileSearch,
  DatabaseZap,
  Bot,
  Search,
  MoreVertical,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  DownloadCloud,
  Files,
  FileCheck,
  Bell,
  ShieldAlert
} from 'lucide-react';
import ModuleFeedback from './ModuleFeedback';

interface Props {
    onActionTrigger?: () => void;
    history?: ExpenseHistoryItem[];
    onAddToHistory?: (item: ExpenseHistoryItem) => void;
    isUserLoggedIn?: boolean;
}

// Extendemos el tipo de item para incluir la fuente del archivo en la tabla consolidada
interface ExtractedItemWithSource {
    description: string;
    qty?: number;
    unitPrice?: number;
    total: number;
    category?: string;
    sourceFile?: string;
}

const SmartExpenseView: React.FC<Props> = ({ onActionTrigger, history = [], onAddToHistory, isUserLoggedIn = false }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<any | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [textInput, setTextInput] = useState('');
  
  // Organization State
  const [clients, setClients] = useState<ClientFolder[]>(() => {
      const saved = localStorage.getItem('contabot_digitador_folders');
      return saved ? JSON.parse(saved) : [
          { id: '1', name: 'General', nit: 'N/A', color: '#002D44' }
      ];
  });
  const [selectedClientId, setSelectedClientId] = useState<string>('1');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNit, setNewFolderNit] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      localStorage.setItem('contabot_digitador_folders', JSON.stringify(clients));
  }, [clients]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      await analyzeFiles(files);
    }
  };

  const processResult = (data: any) => {
      setResult(data);
      setIsAnalyzing(false);
      
      if (onAddToHistory) {
          const historyItem: ExpenseHistoryItem = {
              id: crypto.randomUUID(),
              clientId: selectedClientId,
              date: new Date().toISOString(),
              fileName: data.fileName || 'Procesamiento Masivo',
              totalAmount: data.summary.totalAmount,
              entity: data.summary.entity,
              itemCount: data.extractedItems.length
          };
          onAddToHistory(historyItem);
      }

      if (onActionTrigger) {
          onActionTrigger();
      }
  };

  const analyzeFiles = async (files: File[]) => {
    setIsAnalyzing(true);
    setResult(null);
    setProcessingCount({ current: 0, total: files.length });

    try {
        const allResults: SmartExpenseResult[] = [];
        
        for (let i = 0; i < files.length; i++) {
            setProcessingCount(prev => ({ ...prev, current: i + 1 }));
            const res = await processSmartDocument(files[i]);
            allResults.push(res);
        }

        const consolidatedItems: ExtractedItemWithSource[] = allResults.flatMap(r => 
            r.extractedItems.map(item => ({ ...item, sourceFile: r.fileName }))
        );

        const totalAmount = allResults.reduce((acc, r) => acc + r.summary.totalAmount, 0);
        const avgConfidence = allResults.reduce((acc, r) => acc + r.summary.confidenceScore, 0) / allResults.length;
        
        const consolidatedData = {
            type: files.length > 1 ? 'BATCH' : allResults[0].type,
            fileName: files.length > 1 ? `${files.length} Documentos Cargados` : allResults[0].fileName,
            summary: {
                entity: files.length > 1 ? "Consolidado Masivo" : allResults[0].summary.entity,
                date: new Date().toISOString().split('T')[0],
                totalAmount: totalAmount,
                confidenceScore: avgConfidence
            },
            extractedItems: consolidatedItems,
            rawTextOutput: allResults.map(r => `--- ARCHIVO: ${r.fileName} ---\n${r.rawTextOutput}`).join('\n\n')
        };

        processResult(consolidatedData);
    } catch (error) {
        console.error("Error procesando lote:", error);
        setIsAnalyzing(false);
    }
  };

  const handleTextAnalysis = async () => {
    if (!textInput.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    const data = await processSmartText(textInput);
    processResult(data);
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    const headers = ["Descripción", "Cantidad", "Unitario", "Total", "Categoría", "Archivo Origen"];
    const rows = result.extractedItems.map((item: any) => 
      `"${item.description}",${item.qty || 0},${item.unitPrice || 0},${item.total},"${item.category || ''}","${item.sourceFile || 'N/A'}"`
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asiento_consolidado_${activeClient.name}_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleCreateFolder = () => {
      if (!newFolderName) return;
      const newFolder: ClientFolder = {
          id: crypto.randomUUID(),
          name: newFolderName,
          nit: newFolderNit || 'N/A',
          color: ['#002D44', '#1AB1B1', '#99D95E'][Math.floor(Math.random() * 3)]
      };
      setClients([...clients, newFolder]);
      setSelectedClientId(newFolder.id);
      setNewFolderName('');
      setNewFolderNit('');
      setShowNewFolderModal(false);
  };

  const activeClient = clients.find(c => c.id === selectedClientId) || clients[0];
  const filteredHistory = history.filter(h => h.clientId === selectedClientId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* REGISTER REQUIRED BANNER */}
      {!isUserLoggedIn && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 mb-4 shadow-sm">
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
                      {activeClient.name}
                  </span>
              </div>
          </div>
          <div className="flex gap-2">
               <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-[0.2em] self-center bg-teal-50 px-4 py-1.5 rounded-full border border-teal-100 shadow-sm">Multi-Doc Enabled v2.5</span>
          </div>
      </div>

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
                <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {clients.map(client => (
                        <button 
                            key={client.id}
                            onClick={() => setSelectedClientId(client.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                selectedClientId === client.id 
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
                    ))}
                </div>
            </div>

            {/* Upload Area */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
                    <button 
                        onClick={() => setInputMode('file')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                            inputMode === 'file' ? 'bg-white text-[#1AB1B1] shadow-md' : 'text-gray-400'
                        }`}
                    >
                        <UploadCloud className="w-4 h-4" /> Archivo
                    </button>
                    <button 
                        onClick={() => setInputMode('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                            inputMode === 'text' ? 'bg-white text-[#1AB1B1] shadow-md' : 'text-gray-400'
                        }`}
                    >
                        <Type className="w-4 h-4" /> Texto
                    </button>
                </div>

                <div 
                    className={`rounded-[2.5rem] border-2 border-dashed transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center p-6 ${
                        isAnalyzing ? 'border-[#1AB1B1] bg-teal-50/10' : 'border-gray-200 hover:border-[#1AB1B1] hover:bg-gray-50/50'
                    }`}
                    style={{ minHeight: '320px' }}
                >
                    {isAnalyzing ? (
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
                            <p className="text-[10px] text-gray-400 mt-4 px-6 font-bold uppercase tracking-wider text-center">IA Analizando documentos para: {activeClient.name}</p>
                        </div>
                    ) : (
                        <>
                            {inputMode === 'file' ? (
                                <div className="flex flex-col items-center text-center cursor-pointer group w-full" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.png,.jpeg,.csv,.xlsx,.xls,.txt" multiple />
                                    <div className="w-16 h-16 bg-teal-50 text-[#1AB1B1] rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                        <UploadCloud className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-black text-[#002D44] mb-1">Cargar Soportes</h3>
                                    <p className="text-[10px] text-gray-400 mb-6 font-bold uppercase tracking-wider">Arrastra múltiples archivos aquí</p>
                                    <div className="flex gap-2">
                                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#1AB1B1] transition-colors"><FileText className="w-4 h-4"/></div>
                                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#99D95E] transition-colors"><ImageIcon className="w-4 h-4"/></div>
                                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 group-hover:text-[#002D44] transition-colors"><FileSpreadsheet className="w-4 h-4"/></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col">
                                    <textarea
                                        className="w-full flex-1 bg-gray-50 rounded-2xl p-4 text-sm font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-[#1AB1B1] resize-none border border-gray-100 transition-all mb-4"
                                        placeholder="Pega texto de múltiples facturas aquí..."
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                    ></textarea>
                                    <button
                                        onClick={handleTextAnalysis}
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
            </div>

            {/* Folder History */}
            {filteredHistory.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-100 flex items-center gap-3">
                        <History className="w-4 h-4 text-[#1AB1B1]" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cargas recientes</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto custom-scrollbar">
                        {filteredHistory.map((item) => (
                            <div key={item.id} className="px-8 py-4 hover:bg-teal-50/20 transition-colors flex justify-between items-center group cursor-pointer">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-[#002D44] truncate">{item.entity}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{new Date(item.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black text-[#1AB1B1]">${item.totalAmount.toLocaleString('es-CO')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Results Table */}
        <div className="lg:col-span-8">
            {!result ? (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-200 p-20 text-center flex flex-col items-center justify-center opacity-60 min-h-[500px] shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-8">
                        <DatabaseZap className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-black text-[#002D44] mb-2 uppercase tracking-widest">Consolidación Lista</h3>
                    <p className="text-gray-400 max-w-sm font-bold text-sm leading-relaxed">Carga varios archivos para que ContaBot cree un único archivo de exportación estructurado para tu contabilidad.</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    
                    {/* Header Info Block */}
                    <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#1AB1B1]">
                                <Files className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lote Procesado:</p>
                                <p className="font-black text-[#002D44] text-sm">{result.fileName}</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado:</span>
                             <span className="font-black text-[#002D44] text-lg">${result.summary.totalAmount.toLocaleString('es-CO')}</span>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col h-[700px]">
                        <div className="px-10 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Table2 className="w-5 h-5 text-[#1AB1B1]" />
                                <h3 className="font-black text-[#002D44] uppercase text-xs tracking-[0.2em]">Asiento Contable Unificado</h3>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-black text-white bg-[#002D44] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                                    <FileCheck className="w-3 h-3 text-[#99D95E]" /> {result.extractedItems.length} Líneas
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                                    {result.extractedItems.map((item: ExtractedItemWithSource, idx: number) => (
                                        <tr key={idx} className="hover:bg-teal-50/10 transition-colors group">
                                            <td className="px-10 py-7">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-[#002D44] text-sm group-hover:text-[#1AB1B1] transition-colors">{item.description}</span>
                                                    <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-wider">Cat: {item.category || 'General'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7 text-center font-mono text-xs font-bold text-gray-600">{item.qty || '-'}</td>
                                            <td className="px-8 py-7 text-right font-mono text-xs font-bold text-gray-600">
                                                {item.unitPrice ? `$${item.unitPrice.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-10 py-7 text-right font-black text-[#002D44] text-sm tabular-nums">
                                                ${item.total.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-7 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg border border-gray-100 group-hover:bg-teal-50 group-hover:text-[#1AB1B1] group-hover:border-teal-100 transition-colors">
                                                    <FileText className="w-3 h-3" />
                                                    <span className="text-[9px] font-bold truncate max-w-[80px]">{item.sourceFile || 'Manual'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer area with metrics and EXPORT BUTTON */}
                        <div className="bg-[#002D44] px-10 py-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#99D95E] animate-pulse"></span>
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Confianza Lote: {(result.summary.confidenceScore * 100).toFixed(0)}%</span>
                                </div>
                                <span className="text-[10px] font-black text-[#1AB1B1] uppercase tracking-[0.2em]">{result.extractedItems.length} Registros Consolidados</span>
                            </div>

                            <button 
                                onClick={handleDownloadCSV}
                                className="w-full md:w-auto bg-[#1AB1B1] hover:bg-[#169a9a] text-white px-10 py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-500/10 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                            >
                                <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Exportar Lote a Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Modals */}
      {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewFolderModal(false)}></div>
              <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
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

      <ModuleFeedback moduleName="Digitador Inteligente" />
      
    </div>
  );
};

export default SmartExpenseView;
