'use client';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bot, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor ingresa un correo electrónico válido');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

            if (error) {
                // No revelar si el email existe o no por seguridad
                if (error.message.includes('rate limit')) {
                    setError('Demasiados intentos. Por favor espera unos minutos.');
                } else {
                    // Mostrar éxito incluso si hay error para no revelar emails válidos
                    setSuccess(true);
                }
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError('Error al procesar la solicitud. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                        <div className="w-12 h-12 bg-[#002D44] text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Bot className="w-7 h-7" />
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-[#002D44]">ContaBot</span>
                    </Link>

                    {/* Success Card */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>

                        <h1 className="text-2xl font-black text-[#002D44] mb-4">
                            Revisa tu correo
                        </h1>

                        <p className="text-gray-500 mb-6">
                            Si existe una cuenta con el correo <strong className="text-[#002D44]">{email}</strong>,
                            recibirás un enlace para restablecer tu contraseña.
                        </p>

                        <p className="text-sm text-gray-400 mb-8">
                            El enlace expirará en 1 hora. Si no encuentras el correo, revisa tu carpeta de spam.
                        </p>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-[#1AB1B1] font-bold hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-12 h-12 bg-[#002D44] text-white rounded-xl flex items-center justify-center shadow-lg">
                        <Bot className="w-7 h-7" />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-[#002D44]">ContaBot</span>
                </Link>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-[#002D44] mb-2">
                            ¿Olvidaste tu contraseña?
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1AB1B1] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Enviar enlace de recuperación'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1AB1B1] text-sm font-semibold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    ¿Necesitas ayuda? Contacta a soporte@contabot.co
                </p>
            </div>
        </div>
    );
}
