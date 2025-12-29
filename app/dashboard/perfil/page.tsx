'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UsageIndicator } from '@/components/usage/UsageIndicator';
import {
    User,
    Mail,
    Phone,
    Building2,
    Briefcase,
    Shield,
    Calendar,
    Loader2,
    Save,
    CheckCircle2,
    AlertCircle,
    Zap,
    Crown,
    Activity
} from 'lucide-react';

interface Profile {
    id: string;
    name: string | null;
    phone: string | null;
    firm_name: string | null;
    occupation: string | null;
    role: string | null;
    membership_type: string | null;
    created_at: string | null;
}

const OCCUPATION_LABELS: Record<string, string> = {
    INDEPENDENT: 'Contador Independiente',
    OUTSOURCING: 'Outsourcing Contable',
    INHOUSE: 'Contador de Planta',
};

const MEMBERSHIP_LABELS: Record<string, { label: string; color: string; icon: typeof Crown }> = {
    FREEMIUM: { label: 'Plan Gratuito', color: 'bg-gray-100 text-gray-700', icon: Zap },
    PRO: { label: 'Plan Pro', color: 'bg-purple-100 text-purple-700', icon: Crown },
    ENTERPRISE: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700', icon: Shield },
};

export default function PerfilPage() {
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        firm_name: '',
        occupation: 'INDEPENDENT',
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (!authUser) {
                    router.push('/login');
                    return;
                }

                setUser(authUser);

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    throw profileError;
                }

                if (profileData) {
                    setProfile(profileData);
                    setFormData({
                        name: profileData.name || '',
                        phone: profileData.phone || '',
                        firm_name: profileData.firm_name || '',
                        occupation: profileData.occupation || 'INDEPENDENT',
                    });
                }
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Error al cargar el perfil');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [supabase, router]);

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name: formData.name,
                    phone: formData.phone || null,
                    firm_name: formData.firm_name || null,
                    occupation: formData.occupation,
                }, {
                    onConflict: 'id',
                });

            if (updateError) throw updateError;

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            // Actualizar profile local
            setProfile(prev => prev ? { ...prev, ...formData } : null);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1AB1B1]" />
            </div>
        );
    }

    const membershipInfo = MEMBERSHIP_LABELS[profile?.membership_type?.toUpperCase() || 'FREEMIUM'] || MEMBERSHIP_LABELS.FREEMIUM;
    const MembershipIcon = membershipInfo.icon;

    return (
        <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-4 bg-[#1AB1B1]/10 text-[#1AB1B1] rounded-2xl">
                    <User className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-[#002D44]">Mi Perfil</h1>
                    <p className="text-gray-500">Administra tu información personal y configuración</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {saved && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">Cambios guardados correctamente</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Account Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-[#1AB1B1]" />
                                Información de la Cuenta
                            </h2>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Correo electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar</p>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Nombre completo
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Tu nombre"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]/20 focus:border-[#1AB1B1] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Teléfono
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="300 123 4567"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]/20 focus:border-[#1AB1B1] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Firm Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    Firma / Empresa
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.firm_name}
                                        onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                                        placeholder="Nombre de tu firma o empresa"
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]/20 focus:border-[#1AB1B1] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Occupation */}
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">
                                    ¿Cómo trabajas?
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1AB1B1]/20 focus:border-[#1AB1B1] outline-none transition-all bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="INDEPENDENT">Contador Independiente</option>
                                        <option value="OUTSOURCING">Outsourcing Contable</option>
                                        <option value="INHOUSE">Contador de Planta</option>
                                    </select>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 bg-[#1AB1B1] text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Usage & Membership */}
                <div className="space-y-6">
                    {/* Membership Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-500" />
                                Mi Membresía
                            </h2>
                        </div>

                        <div className="p-6">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${membershipInfo.color} font-bold text-sm mb-4`}>
                                <MembershipIcon className="w-4 h-4" />
                                {membershipInfo.label}
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Solicitudes OCR / día</span>
                                    <span className="font-bold text-gray-900">
                                        {profile?.membership_type?.toUpperCase() === 'PRO' ? '100' :
                                            profile?.membership_type?.toUpperCase() === 'ENTERPRISE' ? '1,000' : '10'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-500">Archivos / mes</span>
                                    <span className="font-bold text-gray-900">
                                        {profile?.membership_type?.toUpperCase() === 'PRO' ? '1,000' :
                                            profile?.membership_type?.toUpperCase() === 'ENTERPRISE' ? '10,000' : '100'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-500">Tamaño máx. archivo</span>
                                    <span className="font-bold text-gray-900">
                                        {profile?.membership_type?.toUpperCase() === 'PRO' ? '25 MB' :
                                            profile?.membership_type?.toUpperCase() === 'ENTERPRISE' ? '50 MB' : '10 MB'}
                                    </span>
                                </div>
                            </div>

                            {profile?.membership_type?.toUpperCase() === 'FREEMIUM' && (
                                <button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2">
                                    <Crown className="w-5 h-5" />
                                    Actualizar a Pro
                                </button>
                            )}
                        </div>
                    </div>

                    {/* API Usage Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[#1AB1B1]" />
                                Uso de API
                            </h2>
                        </div>

                        <div className="p-6">
                            <UsageIndicator />
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                Información
                            </h2>
                        </div>

                        <div className="p-6 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Miembro desde</span>
                                <span className="font-medium text-gray-900">
                                    {profile?.created_at
                                        ? new Date(profile.created_at).toLocaleDateString('es-CO', {
                                            year: 'numeric',
                                            month: 'long',
                                        })
                                        : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Rol</span>
                                <span className="font-medium text-gray-900">
                                    {profile?.role === 'ADMIN' ? 'Administrador' : 'Contador'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
