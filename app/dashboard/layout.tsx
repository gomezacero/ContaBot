'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { FeedbackProvider } from '@/components/feedback';
import { ClientProvider, useClient } from '@/lib/context/ClientContext';
import { ClientEditModal } from '@/components/client/ClientEditModal';
import {
    LayoutDashboard,
    ScanLine,
    CalendarDays,
    User,
    LogOut,
    LogIn,
    Menu,
    X,
    ChevronDown,
    Trash2,
    Building2,
    Pencil
} from 'lucide-react';
import Footer from '@/components/Footer';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

// Componente para mostrar el cliente activo en el header
function ActiveClientIndicator() {
    const { selectedClient, isAuthenticated, refreshClients } = useClient();
    const [showEditModal, setShowEditModal] = useState(false);
    const { addToast } = useToast();

    if (!isAuthenticated || !selectedClient) return null;

    const handleSave = () => {
        refreshClients();
        addToast({
            type: 'success',
            title: 'Guardado',
            description: 'Los datos de la empresa fueron actualizados'
        });
    };

    return (
        <>
            <button
                onClick={() => setShowEditModal(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 transition-colors cursor-pointer group"
            >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-zinc-700 max-w-[200px] truncate">
                    {selectedClient.name}
                </span>
                {selectedClient.nit && (
                    <span className="text-xs text-zinc-400 font-mono">
                        {selectedClient.nit}
                    </span>
                )}
                <Pencil className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {showEditModal && (
                <ClientEditModal
                    clientId={selectedClient.id}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleSave}
                />
            )}
        </>
    );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<{ email?: string; profile?: { name?: string } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const navItems = [
        { id: 'nomina', label: 'Nómina', icon: LayoutDashboard, href: '/dashboard/nomina', premium: false },
        { id: 'gastos', label: 'Digitador', icon: ScanLine, href: '/dashboard/gastos', premium: true },
        { id: 'calendario', label: 'Calendario', icon: CalendarDays, href: '/dashboard/calendario', premium: false },
    ];

    const isGuest = !user;

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (authUser) {
                // Fetch profile data
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                setUser({
                    ...authUser,
                    profile: profile || { name: authUser.email?.split('@')[0] }
                });
            }
            setLoading(false);
        };

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (_e: MouseEvent) => {
            if (userMenuOpen) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [userMenuOpen]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <ToastProvider>
        <FeedbackProvider>
        <ClientProvider>
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-100">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
                    <div className="flex items-center gap-12">
                        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer group">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
                                <span className="text-white font-black text-xl">C</span>
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-zinc-900">Contabio</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-8">
                            {navItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`text-sm font-semibold transition-all ${isActive ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-900'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Active Client Indicator */}
                        <ActiveClientIndicator />

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setUserMenuOpen(!userMenuOpen);
                                }}
                                className="flex items-center gap-2 hover:bg-zinc-100 rounded-xl px-3 py-2 transition-colors"
                            >
                                <div className={`w-10 h-10 ${isGuest ? 'bg-zinc-400' : 'bg-emerald-600'} text-white rounded-full flex items-center justify-center font-bold`}>
                                    {isGuest ? 'I' : (user?.profile?.name?.[0]?.toUpperCase() || 'U')}
                                </div>
                                <span className="hidden md:block text-sm font-semibold text-zinc-700">
                                    {isGuest ? 'Invitado' : (user?.profile?.name || 'Usuario')}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {userMenuOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 animate-fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isGuest ? (
                                        // Guest Menu
                                        <>
                                            <div className="px-4 py-3 border-b border-zinc-100">
                                                <p className="font-bold text-zinc-600">Modo Invitado</p>
                                                <p className="text-xs text-zinc-400">Tus datos se guardan localmente</p>
                                            </div>
                                            <Link
                                                href="/login"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-semibold"
                                            >
                                                <LogIn className="w-4 h-4" />
                                                Iniciar Sesión
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Crear Cuenta Gratis
                                            </Link>
                                        </>
                                    ) : (
                                        // Authenticated User Menu
                                        <>
                                            <div className="px-4 py-2 border-b border-zinc-100">
                                                <p className="font-bold text-zinc-900">{user?.profile?.name}</p>
                                                <p className="text-xs text-zinc-400">{user?.email}</p>
                                            </div>
                                            <Link
                                                href="/dashboard/perfil"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Mi Perfil
                                            </Link>
                                            <Link
                                                href="/dashboard/papelera"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Papelera
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Cerrar Sesión
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="lg:hidden p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {menuOpen && (
                    <nav className="lg:hidden bg-white border-t border-zinc-100 px-6 py-4 animate-fade-in">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center gap-3 py-3 text-sm font-semibold transition-all ${isActive ? 'text-emerald-600' : 'text-zinc-500'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 max-w-7xl py-8 flex-1">
                {children}
            </main>

            {/* Footer */}
            <Footer variant="minimal" />
        </div>
        </ClientProvider>
        </FeedbackProvider>
        </ToastProvider>
    );
}
