'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, AlertTriangle, CheckCircle, XCircle, Zap, HardDrive } from 'lucide-react';
import type { ApiUsageStats } from '@/types/database';
import { USAGE_LIMITS, formatBytes } from '@/lib/usage-limits';

interface UsageIndicatorProps {
    className?: string;
    showMonthly?: boolean;
    compact?: boolean;
}

export function UsageIndicator({
    className = '',
    showMonthly = false,
    compact = false,
}: UsageIndicatorProps) {
    const [stats, setStats] = useState<ApiUsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsageStats();
    }, []);

    const loadUsageStats = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Verificar si hay usuario autenticado
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Usuario no autenticado - mostrar límites de invitado
                const guestLimits = USAGE_LIMITS.FREEMIUM;
                setStats({
                    daily: { ocr_requests: 0, files_processed: 0, bytes_processed: 0 },
                    monthly: { total_requests: 0, total_files: 0, total_bytes: 0 },
                    limits: {
                        daily_ocr_requests: guestLimits.daily_ocr_requests,
                        monthly_files: guestLimits.monthly_files,
                        max_file_size_mb: guestLimits.max_file_size_mb,
                        monthly_bytes_mb: guestLimits.monthly_bytes_mb,
                    },
                    remaining: {
                        daily_requests: guestLimits.daily_ocr_requests,
                        monthly_files: guestLimits.monthly_files,
                        monthly_bytes: guestLimits.monthly_bytes_mb * 1024 * 1024,
                    },
                    percentage: { daily: 0, monthly: 0 },
                });
                setLoading(false);
                return;
            }

            // Obtener uso diario
            const { data: dailyData } = await supabase.rpc('get_daily_usage', {
                p_user_id: user.id,
            });

            // Obtener uso mensual
            const { data: monthlyData } = await supabase.rpc('get_monthly_usage', {
                p_user_id: user.id,
            });

            // Obtener tipo de membresía
            const { data: profile } = await supabase
                .from('profiles')
                .select('membership_type')
                .eq('id', user.id)
                .single();

            const membershipType = (profile?.membership_type?.toUpperCase() || 'FREEMIUM') as 'FREEMIUM' | 'PRO' | 'ENTERPRISE';

            // Definir límites según membresía (usando constantes centralizadas)
            const membershipLimits = USAGE_LIMITS[membershipType] || USAGE_LIMITS.FREEMIUM;
            const limits = {
                daily_ocr_requests: membershipLimits.daily_ocr_requests,
                monthly_files: membershipLimits.monthly_files,
                max_file_size_mb: membershipLimits.max_file_size_mb,
                monthly_bytes_mb: membershipLimits.monthly_bytes_mb,
            };

            const daily = {
                ocr_requests: dailyData?.[0]?.ocr_requests || 0,
                files_processed: dailyData?.[0]?.files || 0,
                bytes_processed: dailyData?.[0]?.bytes || 0,
            };

            const monthly = {
                total_requests: monthlyData?.[0]?.total_requests || 0,
                total_files: monthlyData?.[0]?.total_files || 0,
                total_bytes: monthlyData?.[0]?.total_bytes || 0,
            };

            const dailyPercentage = Math.min(
                Math.round((daily.ocr_requests / limits.daily_ocr_requests) * 100),
                100
            );
            const monthlyPercentage = Math.min(
                Math.round((monthly.total_files / limits.monthly_files) * 100),
                100
            );

            const monthlyBytesLimit = limits.monthly_bytes_mb * 1024 * 1024;
            setStats({
                daily,
                monthly,
                limits,
                remaining: {
                    daily_requests: Math.max(0, limits.daily_ocr_requests - daily.ocr_requests),
                    monthly_files: Math.max(0, limits.monthly_files - monthly.total_files),
                    monthly_bytes: Math.max(0, monthlyBytesLimit - monthly.total_bytes),
                },
                percentage: {
                    daily: dailyPercentage,
                    monthly: monthlyPercentage,
                },
            });
        } catch (err) {
            console.error('Error loading usage stats:', err);
            setError('Error al cargar el uso');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
        );
    }

    if (error || !stats) {
        return null;
    }

    const getStatusColor = (percentage: number) => {
        if (percentage >= 100) return 'red';
        if (percentage >= 80) return 'yellow';
        return 'green';
    };

    const getStatusIcon = (percentage: number) => {
        if (percentage >= 100) return <XCircle className="w-4 h-4" />;
        if (percentage >= 80) return <AlertTriangle className="w-4 h-4" />;
        return <CheckCircle className="w-4 h-4" />;
    };

    const dailyColor = getStatusColor(stats.percentage.daily);

    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-sm ${className}`}>
                <Activity className="w-4 h-4 text-gray-400" />
                <span className={`font-medium ${
                    dailyColor === 'red' ? 'text-red-600' :
                    dailyColor === 'yellow' ? 'text-amber-600' :
                    'text-gray-600'
                }`}>
                    {stats.remaining.daily_requests}/{stats.limits.daily_ocr_requests}
                </span>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#1AB1B1]" />
                    <span className="font-bold text-gray-700 text-sm">Uso de hoy</span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                    dailyColor === 'red' ? 'text-red-600' :
                    dailyColor === 'yellow' ? 'text-amber-600' :
                    'text-green-600'
                }`}>
                    {getStatusIcon(stats.percentage.daily)}
                    <span>{stats.daily.ocr_requests}/{stats.limits.daily_ocr_requests}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full transition-all duration-500 ${
                        dailyColor === 'red' ? 'bg-red-500' :
                        dailyColor === 'yellow' ? 'bg-amber-500' :
                        'bg-[#1AB1B1]'
                    }`}
                    style={{ width: `${stats.percentage.daily}%` }}
                />
            </div>

            {/* Status Text */}
            <div className="text-xs text-gray-500">
                {stats.percentage.daily >= 100 ? (
                    <span className="text-red-600 font-medium">
                        Límite alcanzado. Vuelve mañana.
                    </span>
                ) : stats.percentage.daily >= 80 ? (
                    <span className="text-amber-600">
                        ¡Quedan {stats.remaining.daily_requests} solicitudes!
                    </span>
                ) : (
                    <span>
                        {stats.remaining.daily_requests} solicitudes disponibles
                    </span>
                )}
            </div>

            {/* Monthly Stats (optional) */}
            {showMonthly && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {/* Archivos mensuales */}
                    <div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Archivos este mes</span>
                            <span className="font-medium text-gray-700">
                                {stats.monthly.total_files}/{stats.limits.monthly_files}
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    stats.percentage.monthly >= 100 ? 'bg-red-500' :
                                    stats.percentage.monthly >= 80 ? 'bg-amber-500' :
                                    'bg-gray-400'
                                }`}
                                style={{ width: `${stats.percentage.monthly}%` }}
                            />
                        </div>
                    </div>
                    {/* Bytes mensuales */}
                    <div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-gray-500">
                                <HardDrive className="w-3 h-3" />
                                <span>Datos este mes</span>
                            </div>
                            <span className="font-medium text-gray-700">
                                {formatBytes(stats.monthly.total_bytes)} / {stats.limits.monthly_bytes_mb}MB
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    (stats.monthly.total_bytes / (stats.limits.monthly_bytes_mb * 1024 * 1024)) >= 1 ? 'bg-red-500' :
                                    (stats.monthly.total_bytes / (stats.limits.monthly_bytes_mb * 1024 * 1024)) >= 0.8 ? 'bg-amber-500' :
                                    'bg-blue-400'
                                }`}
                                style={{ width: `${Math.min((stats.monthly.total_bytes / (stats.limits.monthly_bytes_mb * 1024 * 1024)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook para usar en otros componentes
export function useUsageStats() {
    const [stats, setStats] = useState<ApiUsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            setLoading(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setStats(null);
                return;
            }

            const { data: dailyData } = await supabase.rpc('get_daily_usage', {
                p_user_id: user.id,
            });

            const { data: monthlyData } = await supabase.rpc('get_monthly_usage', {
                p_user_id: user.id,
            });

            const { data: profile } = await supabase
                .from('profiles')
                .select('membership_type')
                .eq('id', user.id)
                .single();

            const membershipType = (profile?.membership_type?.toUpperCase() || 'FREEMIUM') as 'FREEMIUM' | 'PRO' | 'ENTERPRISE';
            const membershipLimits = USAGE_LIMITS[membershipType] || USAGE_LIMITS.FREEMIUM;
            const limits = {
                daily_ocr_requests: membershipLimits.daily_ocr_requests,
                monthly_files: membershipLimits.monthly_files,
                max_file_size_mb: membershipLimits.max_file_size_mb,
                monthly_bytes_mb: membershipLimits.monthly_bytes_mb,
            };

            const daily = {
                ocr_requests: dailyData?.[0]?.ocr_requests || 0,
                files_processed: dailyData?.[0]?.files || 0,
                bytes_processed: dailyData?.[0]?.bytes || 0,
            };

            const monthly = {
                total_requests: monthlyData?.[0]?.total_requests || 0,
                total_files: monthlyData?.[0]?.total_files || 0,
                total_bytes: monthlyData?.[0]?.total_bytes || 0,
            };

            const monthlyBytesLimit = limits.monthly_bytes_mb * 1024 * 1024;
            setStats({
                daily,
                monthly,
                limits,
                remaining: {
                    daily_requests: Math.max(0, limits.daily_ocr_requests - daily.ocr_requests),
                    monthly_files: Math.max(0, limits.monthly_files - monthly.total_files),
                    monthly_bytes: Math.max(0, monthlyBytesLimit - monthly.total_bytes),
                },
                percentage: {
                    daily: Math.min(Math.round((daily.ocr_requests / limits.daily_ocr_requests) * 100), 100),
                    monthly: Math.min(Math.round((monthly.total_files / limits.monthly_files) * 100), 100),
                },
            });
        } catch (err) {
            console.error('Error loading usage stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    return { stats, loading, refresh };
}
