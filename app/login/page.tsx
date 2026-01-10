'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Footer from '@/components/Footer';

// Mapeo de mensajes de error de Supabase a español
const ERROR_MESSAGES: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos',
    'Email not confirmed': 'Por favor confirma tu correo electrónico antes de iniciar sesión',
    'Invalid email or password': 'Correo o contraseña incorrectos',
    'User not found': 'No existe una cuenta con este correo',
    'Too many requests': 'Demasiados intentos. Por favor espera unos minutos.',
    'Network request failed': 'Error de conexión. Verifica tu internet.',
};

function getErrorMessage(error: string): string {
    // Buscar coincidencia parcial en las claves
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    return 'Error al iniciar sesión. Intenta de nuevo.';
}

// Componente interno que usa useSearchParams
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mostrar mensaje si viene de callback con error
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            setError(decodeURIComponent(errorParam));
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
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
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(getErrorMessage(error.message));
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('Error al iniciar sesión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <Link href="/" className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <span className="text-white font-black text-2xl">C</span>
                </div>
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900">Contabio</span>
            </Link>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-zinc-900 mb-2">Bienvenido de vuelta</h1>
                    <p className="text-zinc-500 text-sm">Ingresa tus credenciales para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">
                            Correo electrónico
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full pl-12 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">
                            Contraseña
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

                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-semibold text-emerald-600 hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                Iniciar Sesión <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-zinc-500 text-sm">
                        ¿No tienes cuenta?{' '}
                        <Link href="/register" className="font-bold text-emerald-600 hover:underline">
                            Regístrate gratis
                        </Link>
                    </p>
                </div>
            </div>

            <Footer variant="compact" />
        </div>
    );
}

// Loading fallback para Suspense
function LoginFormSkeleton() {
    return (
        <div className="w-full max-w-md animate-pulse">
            <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-12 h-12 bg-zinc-200 rounded-xl" />
                <div className="h-8 w-32 bg-zinc-200 rounded" />
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8">
                <div className="text-center mb-8">
                    <div className="h-7 w-48 bg-zinc-200 rounded mx-auto mb-2" />
                    <div className="h-4 w-64 bg-zinc-200 rounded mx-auto" />
                </div>
                <div className="space-y-5">
                    <div className="h-12 bg-zinc-200 rounded-xl" />
                    <div className="h-12 bg-zinc-200 rounded-xl" />
                    <div className="h-12 bg-zinc-200 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// Página principal con Suspense boundary
export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
            <Suspense fallback={<LoginFormSkeleton />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
