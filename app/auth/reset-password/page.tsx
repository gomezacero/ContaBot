'use client';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Validar fortaleza de contraseña
    const validatePassword = (pwd: string): { valid: boolean; message?: string } => {
        if (pwd.length < 8) {
            return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
        }
        if (!/[A-Z]/.test(pwd)) {
            return { valid: false, message: 'La contraseña debe tener al menos una mayúscula' };
        }
        if (!/[a-z]/.test(pwd)) {
            return { valid: false, message: 'La contraseña debe tener al menos una minúscula' };
        }
        if (!/[0-9]/.test(pwd)) {
            return { valid: false, message: 'La contraseña debe tener al menos un número' };
        }
        return { valid: true };
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        // Validar fortaleza de contraseña
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.message || 'Contraseña inválida');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                if (error.message.includes('same')) {
                    setError('La nueva contraseña debe ser diferente a la anterior');
                } else {
                    setError(error.message);
                }
                return;
            }

            setSuccess(true);

            // Redirigir al dashboard después de 3 segundos
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        } catch (err) {
            setError('Error al actualizar la contraseña. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                            <span className="text-2xl font-black">C</span>
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-zinc-900">Contabio</span>
                    </Link>

                    {/* Success Card */}
                    <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>

                        <h1 className="text-2xl font-black text-zinc-900 mb-4">
                            ¡Contraseña actualizada!
                        </h1>

                        <p className="text-zinc-500 mb-6">
                            Tu contraseña ha sido actualizada correctamente. Serás redirigido al dashboard en unos segundos.
                        </p>

                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 hover:scale-[1.02] transition-all"
                        >
                            Ir al Dashboard <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                        <span className="text-2xl font-black">C</span>
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-zinc-900">Contabio</span>
                </Link>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-zinc-900 mb-2">
                            Crear nueva contraseña
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
                        </p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">
                                Nueva contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Password strength indicators */}
                        <div className="text-xs text-zinc-500 space-y-1">
                            <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                Mínimo 8 caracteres
                            </div>
                            <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                Una letra mayúscula
                            </div>
                            <div className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                Una letra minúscula
                            </div>
                            <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                Un número
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Actualizar contraseña'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
