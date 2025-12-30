'use client';

import Link from 'next/link';
import {
    LayoutDashboard,
    ScanLine,
    CalendarDays,
    ArrowUpRight,
    TrendingUp,
    Users,
    FileText,
    Bell,
    Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTaxDeadlines, getUpcomingEvents, TaxClientConfig } from '@/lib/tax-deadlines';

export default function DashboardPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeClients: 0,
        processedPayrolls: 0, // This will track employees count actually as per plan
        processedDocuments: 0,
        pendingAlerts: 0,
        documentsTrend: 0
    });

    const modules = [
        {
            id: 'nomina',
            title: 'Nómina',
            description: 'Cálculos automáticos bajo ley 2025, provisiones y liquidaciones.',
            icon: LayoutDashboard,
            href: '/dashboard/nomina',
            color: 'bg-[#1AB1B1]',
            stats: `${stats.processedPayrolls} empleados activos`
        },
        {
            id: 'gastos',
            title: 'Digitador OCR',
            description: 'Digitaliza facturas y documentos con inteligencia artificial.',
            icon: ScanLine,
            href: '/dashboard/gastos',
            color: 'bg-purple-500',
            stats: `${stats.documentsTrend} documentos este mes`
        },
        {
            id: 'calendario',
            title: 'Calendario Tributario',
            description: 'Vigilancia de NITs y alertas de vencimientos DIAN.',
            icon: CalendarDays,
            href: '/dashboard/calendario',
            color: 'bg-[#002D44]',
            stats: `${stats.pendingAlerts} vencimientos próximos`
        },
    ];

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // 1. Fetch Clients Count
                const { count: clientsCount, data: clientsData } = await supabase
                    .from('clients')
                    .select('nit, classification, tax_regime, iva_periodicity, is_retention_agent', { count: 'exact' });

                // 2. Fetch Employees Count (Active employees for "processed payrolls/active" stat)
                const { count: employeesCount } = await supabase
                    .from('employees')
                    .select('*', { count: 'exact' });

                // 3. Fetch OCR Results Count (Total Documents)
                const { count: documentsCount } = await supabase
                    .from('expense_documents')
                    .select('*', { count: 'exact' });

                // 3.1 Fetch documents for current month trend
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const { count: documentsMonthCount } = await supabase
                    .from('expense_documents')
                    .select('*', { count: 'exact' })
                    .gte('created_at', startOfMonth.toISOString());


                // 4. Calculate Tax Alerts
                let totalAlerts = 0;
                if (clientsData) {
                    clientsData.forEach(client => {
                        // Map DB client to TaxClientConfig
                        // Defaulting missing fields to safe values
                        const config: TaxClientConfig = {
                            nit: client.nit || '',
                            classification: (client.classification as any) || 'JURIDICA',
                            taxRegime: (client.tax_regime as any) === 'SIMPLE' ? 'SIMPLE' : 'ORDINARIO',
                            ivaPeriodicity: (client.iva_periodicity as any) || 'CUATRIMESTRAL',
                            isRetentionAgent: client.is_retention_agent || false,
                            hasGmf: false,
                            requiresExogena: false,
                            hasPatrimonyTax: false
                        };

                        if (!config.nit) return;

                        const events = getTaxDeadlines(config);
                        const upcoming = getUpcomingEvents(events, 30); // Look ahead 30 days
                        totalAlerts += upcoming.length;
                    });
                }

                setStats({
                    activeClients: clientsCount || 0,
                    processedPayrolls: employeesCount || 0,
                    processedDocuments: documentsCount || 0,
                    pendingAlerts: totalAlerts,
                    documentsTrend: documentsMonthCount || 0
                });

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [supabase]);

    const quickStats = [
        { label: 'Clientes Activos', value: stats.activeClients.toString(), icon: Users, trend: 'Total registrados' },
        { label: 'Empleados Gestionados', value: stats.processedPayrolls.toString(), icon: FileText, trend: 'En sistema' },
        { label: 'Alertas Pendientes', value: stats.pendingAlerts.toString(), icon: Bell, trend: 'Próximos 30 días' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <Loader2 className="w-10 h-10 animate-spin text-[#1AB1B1]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#002D44] to-[#1AB1B1] rounded-3xl p-8 text-white shadow-lg">
                <h1 className="text-3xl font-black mb-2">¡Bienvenido a ContaBot!</h1>
                <p className="text-white/80 max-w-xl text-lg">
                    Tu sistema operativo financiero. Tienes <span className="font-bold text-white underline decoration-wavy decoration-[#1AB1B1]">{stats.pendingAlerts} vencimientos tributarios</span> pendientes para los próximos 30 días.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickStats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-[#002D44]" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-[#1AB1B1] bg-teal-50 px-2 py-1 rounded-full">
                                    <TrendingUp className="w-3 h-3" />
                                    {stat.trend}
                                </div>
                            </div>
                            <p className="text-4xl font-black text-[#002D44] tracking-tight">{stat.value}</p>
                            <p className="text-sm text-gray-400 font-medium mt-1">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Module Cards */}
            <div>
                <h2 className="text-xl font-black text-[#002D44] mb-6 flex items-center gap-2">
                    Módulos Disponibles
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v2.5</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <Link
                                key={module.id}
                                href={module.href}
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                            >
                                <div className={`${module.color} p-6 relative h-32`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                        <Icon className="w-32 h-32 text-white" />
                                    </div>
                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-xl font-black text-white leading-none">{module.title}</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-gray-500 text-sm mb-6 min-h-[40px] leading-relaxed">{module.description}</p>
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                            {module.stats}
                                        </span>
                                        <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-[#002D44] group-hover:text-white transition-all transform group-hover:-rotate-45">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
