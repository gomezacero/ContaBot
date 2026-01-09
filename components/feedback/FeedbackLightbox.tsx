'use client';

import { useState, useEffect } from 'react';
import { Star, Send, Loader2, ThumbsUp, X, MessageSquare, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStatus } from '@/lib/hooks/useAuthStatus';
import { FeedbackModule, FeedbackAction, RATING_LABELS } from '@/types/feedback';
import Link from 'next/link';

interface FeedbackLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    module: FeedbackModule | null;
    action: FeedbackAction | null;
    title?: string;
    subtitle?: string;
}

export default function FeedbackLightbox({
    isOpen,
    onClose,
    module,
    action,
    title = 'Tu opinión nos importa',
    subtitle = '¿Qué tan útil te parece esta funcionalidad?'
}: FeedbackLightboxProps) {
    const supabase = createClient();
    const { isAuthenticated, user } = useAuthStatus();

    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showLoginCTA, setShowLoginCTA] = useState(false);

    // Reset state cuando el modal se abre
    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHoveredRating(0);
            setComment('');
            setSubmitted(false);
            setShowLoginCTA(false);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (rating === 0) return;

        setSubmitting(true);
        try {
            await supabase.from('module_feedback').insert({
                user_id: user?.id || null,
                module_name: module,
                action_type: action,
                rating,
                comment: comment.trim() || null,
                is_guest: !isAuthenticated
            });

            setSubmitted(true);

            // Para guests, mostrar CTA de login después del feedback exitoso
            if (!isAuthenticated) {
                setTimeout(() => setShowLoginCTA(true), 1500);
            } else {
                // Auto-cerrar para usuarios autenticados
                setTimeout(onClose, 2000);
            }
        } catch (error) {
            console.error('Error enviando feedback:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    // Cerrar con Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !submitting) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, submitting, onClose]);

    if (!isOpen) return null;

    const displayRating = hoveredRating || rating;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Estado de éxito (sin CTA de login) */}
                {submitted && !showLoginCTA && (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <ThumbsUp className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 mb-2">
                            ¡Gracias por tu feedback!
                        </h2>
                        <p className="text-zinc-600">
                            Tu opinión nos ayuda a mejorar Contabio.
                        </p>
                    </div>
                )}

                {/* CTA de login para guests */}
                {submitted && showLoginCTA && (
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ThumbsUp className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-bold text-zinc-900 mb-1">
                                ¡Feedback recibido!
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Gracias por ayudarnos a mejorar
                            </p>
                        </div>

                        {/* Sugerencia sutil de login */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                            <p className="text-sm text-zinc-700 mb-4 text-center">
                                <strong>¿Sabías que con una cuenta gratuita</strong> puedes guardar tu trabajo y acceder desde cualquier dispositivo?
                            </p>
                            <div className="flex gap-3">
                                <Link
                                    href="/register"
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Crear cuenta
                                </Link>
                                <Link
                                    href="/login"
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-zinc-200 text-zinc-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-zinc-50 transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Iniciar sesión
                                </Link>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-4 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            Continuar sin cuenta
                        </button>
                    </div>
                )}

                {/* Formulario de feedback */}
                {!submitted && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl">
                                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 space-y-5">
                            {/* Rating de estrellas */}
                            <div>
                                <p className="text-sm text-zinc-600 mb-3">{subtitle}</p>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                                            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                                        >
                                            <Star
                                                className={`w-10 h-10 transition-colors ${
                                                    star <= displayRating
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-zinc-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-sm text-zinc-500 mt-2 h-5">
                                    {RATING_LABELS[displayRating]}
                                </p>
                            </div>

                            {/* Comentario */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-2">
                                    Comentarios (opcional)
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="¿Qué podríamos mejorar? ¿Qué te gustaría ver?"
                                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none transition-shadow"
                                    rows={3}
                                    maxLength={500}
                                />
                                <p className="text-xs text-zinc-400 text-right mt-1">
                                    {comment.length}/500
                                </p>
                            </div>

                            {/* Botón de enviar */}
                            <button
                                onClick={handleSubmit}
                                disabled={rating === 0 || submitting}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Feedback
                                    </>
                                )}
                            </button>

                            {/* Link para omitir */}
                            <button
                                onClick={handleClose}
                                className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                Ahora no
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
