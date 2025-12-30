'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/ui/Toast';
import {
    Bot,
    LayoutDashboard,
    ScanLine,
    CalendarDays,
    User,
    LogOut,
    LogIn,
    Menu,
    X,
    ChevronDown,
    Sparkles,
    Trash2
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<any>(null);
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuOpen) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [userMenuOpen]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#1AB1B1] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <ToastProvider>
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
                    <div className="flex items-center gap-12">
                        <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-10 h-10 bg-[#002D44] text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                <Bot className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-[#002D44]">ContaBot</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-8">
                            {navItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`text-sm font-semibold transition-all ${isActive ? 'text-[#1AB1B1]' : 'text-gray-400 hover:text-[#002D44]'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setUserMenuOpen(!userMenuOpen);
                                }}
                                className="flex items-center gap-2 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors"
                            >
                                <div className={`w-10 h-10 ${isGuest ? 'bg-gray-400' : 'bg-[#1AB1B1]'} text-white rounded-full flex items-center justify-center font-bold`}>
                                    {isGuest ? 'I' : (user?.profile?.name?.[0]?.toUpperCase() || 'U')}
                                </div>
                                <span className="hidden md:block text-sm font-semibold text-gray-700">
                                    {isGuest ? 'Invitado' : (user?.profile?.name || 'Usuario')}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {userMenuOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isGuest ? (
                                        // Guest Menu
                                        <>
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="font-bold text-gray-600">Modo Invitado</p>
                                                <p className="text-xs text-gray-400">Tus datos se guardan localmente</p>
                                            </div>
                                            <Link
                                                href="/login"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-[#1AB1B1] hover:bg-teal-50 transition-colors font-semibold"
                                            >
                                                <LogIn className="w-4 h-4" />
                                                Iniciar Sesión
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Crear Cuenta Gratis
                                            </Link>
                                        </>
                                    ) : (
                                        // Authenticated User Menu
                                        <>
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <p className="font-bold text-[#002D44]">{user?.profile?.name}</p>
                                                <p className="text-xs text-gray-400">{user?.email}</p>
                                            </div>
                                            <Link
                                                href="/dashboard/perfil"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <User className="w-4 h-4" />
                                                Mi Perfil
                                            </Link>
                                            <Link
                                                href="/dashboard/papelera"
                                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {menuOpen && (
                    <nav className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 animate-fade-in">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center gap-3 py-3 text-sm font-semibold transition-all ${isActive ? 'text-[#1AB1B1]' : 'text-gray-500'
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
            <main className="container mx-auto px-6 max-w-7xl py-8">
                {children}
            </main>
        </div>
        </ToastProvider>
    );
}
