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
    Bell
} from 'lucide-react';

export default function DashboardPage() {
    const modules = [
        {
            id: 'nomina',
            title: 'Nómina',
            description: 'Cálculos automáticos bajo ley 2025, provisiones y liquidaciones.',
            icon: LayoutDashboard,
            href: '/dashboard/nomina',
            color: 'bg-[#1AB1B1]',
            stats: '3 empleados activos'
        },
        {
            id: 'gastos',
            title: 'Digitador OCR',
            description: 'Digitaliza facturas y documentos con inteligencia artificial.',
            icon: ScanLine,
            href: '/dashboard/gastos',
            color: 'bg-purple-500',
            stats: '12 documentos este mes'
        },
        {
            id: 'calendario',
            title: 'Calendario Tributario',
            description: 'Vigilancia de NITs y alertas de vencimientos DIAN.',
            icon: CalendarDays,
            href: '/dashboard/calendario',
            color: 'bg-[#002D44]',
            stats: '5 vencimientos próximos'
        },
    ];

    const quickStats = [
        { label: 'Clientes Activos', value: '12', icon: Users, trend: '+2 este mes' },
        { label: 'Nóminas Procesadas', value: '34', icon: FileText, trend: '+8 esta semana' },
        { label: 'Alertas Pendientes', value: '3', icon: Bell, trend: 'Próximo: 2 días' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#002D44] to-[#1AB1B1] rounded-3xl p-8 text-white">
                <h1 className="text-3xl font-black mb-2">¡Bienvenido a ContaBot!</h1>
                <p className="text-white/70 max-w-xl">
                    Tu asistente contable inteligente. Selecciona un módulo para comenzar a automatizar tu trabajo.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickStats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <Icon className="w-6 h-6 text-[#002D44]" />
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    <TrendingUp className="w-3 h-3" />
                                    {stat.trend}
                                </div>
                            </div>
                            <p className="text-3xl font-black text-[#002D44]">{stat.value}</p>
                            <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Module Cards */}
            <div>
                <h2 className="text-xl font-black text-[#002D44] mb-6">Módulos Disponibles</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <Link
                                key={module.id}
                                href={module.href}
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                            >
                                <div className={`${module.color} p-6 relative`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                        <Icon className="w-20 h-20 text-white" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-black text-white">{module.title}</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-gray-500 text-sm mb-4">{module.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-400">{module.stats}</span>
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#1AB1B1] group-hover:text-white transition-colors">
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
