'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Activity, Database, Shield, Sparkles } from 'lucide-react';

interface ServiceStatus {
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latency?: number;
    message?: string;
}

interface HealthResponse {
    status: 'healthy' | 'degraded' | 'down';
    timestamp: string;
    services: ServiceStatus[];
}

const statusColors = {
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    healthy: 'bg-green-500'
};

const statusIcons = {
    ok: CheckCircle,
    degraded: AlertTriangle,
    down: XCircle,
    healthy: CheckCircle
};

const serviceIcons: Record<string, any> = {
    'Database': Database,
    'Auth': Shield,
    'AI (Gemini)': Sparkles
};

export default function StatusPage() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/health', { cache: 'no-store' });
            const data = await res.json();
            setHealth(data);
            setLastUpdated(new Date());
        } catch (error) {
            setHealth({ status: 'down', timestamp: new Date().toISOString(), services: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const StatusIcon = health ? statusIcons[health.status] : RefreshCw;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <Activity className="w-8 h-8 text-blue-400" />
                        <h1 className="text-3xl font-black text-white">ContaBot Status</h1>
                    </div>
                    <p className="text-slate-400">Monitoreo en tiempo real de servicios</p>
                </div>

                {/* Overall Status Card */}
                <div className={`rounded-3xl p-8 mb-8 border border-white/10 backdrop-blur-sm ${health?.status === 'healthy' ? 'bg-green-500/10' :
                        health?.status === 'degraded' ? 'bg-yellow-500/10' :
                            'bg-red-500/10'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {loading ? (
                                <RefreshCw className="w-12 h-12 text-slate-400 animate-spin" />
                            ) : (
                                <StatusIcon className={`w-12 h-12 ${health?.status === 'healthy' ? 'text-green-400' :
                                        health?.status === 'degraded' ? 'text-yellow-400' :
                                            'text-red-400'
                                    }`} />
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {loading ? 'Verificando...' :
                                        health?.status === 'healthy' ? 'Todos los sistemas operativos' :
                                            health?.status === 'degraded' ? 'Algunos servicios degradados' :
                                                'Servicios no disponibles'}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {lastUpdated && `Última actualización: ${lastUpdated.toLocaleTimeString('es-CO')}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={fetchHealth}
                            disabled={loading}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Services Grid */}
                <div className="space-y-4">
                    {health?.services.map((service, idx) => {
                        const Icon = serviceIcons[service.name] || Activity;
                        const StatusIndicator = statusIcons[service.status];

                        return (
                            <div
                                key={idx}
                                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 flex items-center justify-between hover:bg-white/[0.07] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{service.name}</h3>
                                        {service.message && (
                                            <p className="text-slate-400 text-sm">{service.message}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {service.latency !== undefined && (
                                        <span className="text-slate-500 text-sm font-mono">
                                            {service.latency}ms
                                        </span>
                                    )}
                                    <div className={`w-3 h-3 rounded-full ${statusColors[service.status]} ${service.status === 'ok' ? 'animate-pulse' : ''
                                        }`} />
                                    <StatusIndicator className={`w-5 h-5 ${service.status === 'ok' ? 'text-green-400' :
                                            service.status === 'degraded' ? 'text-yellow-400' :
                                                'text-red-400'
                                        }`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-slate-500 text-sm">
                    <p>Auto-refresh cada 30 segundos • <a href="/api/health" className="underline hover:text-slate-300">API Endpoint</a></p>
                </div>
            </div>
        </div>
    );
}
