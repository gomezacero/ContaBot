'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bot, Mail, Lock, ArrowRight, Eye, EyeOff, User, Phone, Building2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
    const supabase = createClient();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        firmName: '',
        occupation: 'INDEPENDENT' as 'INDEPENDENT' | 'OUTSOURCING' | 'INHOUSE',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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

    // Mapeo de mensajes de error de Supabase a español
    const getErrorMessage = (error: string): string => {
        if (error.includes('already registered') || error.includes('already exists')) {
            return 'Ya existe una cuenta con este correo electrónico';
        }
        if (error.includes('invalid email')) {
            return 'Por favor ingresa un correo electrónico válido';
        }
        if (error.includes('weak password')) {
            return 'La contraseña es muy débil';
        }
        return 'Error al registrarse. Intenta de nuevo.';
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Por favor ingresa un correo electrónico válido');
            setLoading(false);
            return;
        }

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        // Validar fortaleza de contraseña
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.message || 'Contraseña inválida');
            setLoading(false);
            return;
        }

        // Validar nombre
        if (formData.name.trim().length < 2) {
            setError('Por favor ingresa tu nombre completo');
            setLoading(false);
            return;
        }

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
                    data: {
                        name: formData.name,
                        phone: formData.phone,
                        firm_name: formData.firmName,
                        occupation: formData.occupation,
                    },
                },
            });

            if (authError) {
                setError(getErrorMessage(authError.message));
                return;
            }

            // 2. Create profile record
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        name: formData.name,
                        phone: formData.phone || null,
                        firm_name: formData.firmName || null,
                        occupation: formData.occupation,
                        role: 'ACCOUNTANT',
                        membership_type: 'FREEMIUM',
                    });

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // Si falla la creación del perfil, intentar eliminar el usuario de auth
                    // para mantener consistencia (aunque esto rara vez debería fallar)
                    setError('Error al crear el perfil. Por favor intenta de nuevo.');
                    setLoading(false);
                    return;
                }
            }

            setSuccess(true);
        } catch {
            setError('Error al registrarse. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-black text-[#002D44] mb-2">¡Registro exitoso!</h1>
                        <p className="text-gray-500 mb-6">
                            Revisa tu correo electrónico para confirmar tu cuenta.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 bg-[#1AB1B1] text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            Ir a Login <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 py-12">
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
                        <h1 className="text-2xl font-black text-[#002D44] mb-2">Crea tu cuenta</h1>
                        <p className="text-gray-500 text-sm">Únete a ContaBot y automatiza tu trabajo</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Nombre completo *
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Tu nombre"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Correo electrónico *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="tu@email.com"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Contraseña *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-11 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Confirmar *
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        {/* Password strength indicators */}
                        <div className="text-xs text-gray-500 space-y-1">
                            <div className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                                Mínimo 8 caracteres
                            </div>
                            <div className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                                Una mayúscula
                            </div>
                            <div className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                                Un número
                            </div>
                        </div>

                        {/* Phone & Firm */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="300 123 4567"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Firma/Empresa
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="firmName"
                                        value={formData.firmName}
                                        onChange={handleChange}
                                        placeholder="Nombre"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Occupation */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                ¿Cómo trabajas?
                            </label>
                            <select
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1] focus:border-transparent outline-none transition-all bg-white"
                            >
                                <option value="INDEPENDENT">Contador Independiente</option>
                                <option value="OUTSOURCING">Outsourcing Contable</option>
                                <option value="INHOUSE">Contador de Planta</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1AB1B1] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Crear Cuenta <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="font-bold text-[#1AB1B1] hover:underline">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
