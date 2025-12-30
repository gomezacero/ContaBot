'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, RotateCcw } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    description: string;
    itemName?: string;
    itemCount?: number;
    requireNameConfirmation?: boolean;
    isRecoverable?: boolean;
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemName,
    itemCount = 1,
    requireNameConfirmation = false,
    isRecoverable = true
}: DeleteConfirmationModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const canConfirm = requireNameConfirmation
        ? confirmText === itemName
        : true;

    const handleConfirm = async () => {
        if (!canConfirm) return;

        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
            setConfirmText('');
        }
    };

    const handleClose = () => {
        if (isDeleting) return;
        setConfirmText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-600">{description}</p>

                    {/* Item info */}
                    {itemName && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-sm text-gray-500">
                                {itemCount > 1 ? 'Registros a eliminar:' : 'Registro a eliminar:'}
                            </p>
                            <p className="font-bold text-gray-900 mt-1">
                                {itemCount > 1 ? `${itemCount} registros` : itemName}
                            </p>
                        </div>
                    )}

                    {/* Recoverable indicator */}
                    {isRecoverable && (
                        <div className="flex items-start gap-3 bg-green-50 rounded-xl p-4">
                            <RotateCcw className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-green-800">
                                    Recuperable por 30 dias
                                </p>
                                <p className="text-xs text-green-600 mt-0.5">
                                    Podras restaurar este registro desde la papelera
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Name confirmation */}
                    {requireNameConfirmation && itemName && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Escribe <span className="font-bold text-red-600">{itemName}</span> para confirmar:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Escribe el nombre exacto"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                disabled={isDeleting}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isDeleting}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
