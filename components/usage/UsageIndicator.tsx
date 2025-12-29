'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, Zap, HardDrive, FileText } from 'lucide-react';
import type { ApiUsageStats } from '@/types/database';
import { USAGE_LIMITS, formatBytes } from '@/lib/usage-limits';

interface UsageIndicatorProps {
    className?: string;
    compact?: boolean;
}

export function UsageIndicator({
    className = '',
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
                    daily: { files_processed: 0, bytes_processed: 0 },
                    limits: {
                        daily_files: guestLimits.daily_files,
                        daily_bytes_mb: guestLimits.daily_bytes_mb,
                        max_file_size_mb: guestLimits.max_file_size_mb,
                    },
                    remaining: {
                        daily_files: guestLimits.daily_files,
                        daily_bytes: guestLimits.daily_bytes_mb * 1024 * 1024,
                    },
                    percentage: { files: 0, bytes: 0 },
                });
                setLoading(false);
                return;
            }

            // Obtener uso diario
            const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_usage', {
                p_user_id: user.id,
            });

            if (dailyError) {
                console.error('Error fetching daily usage:', dailyError);
            }

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
                daily_files: membershipLimits.daily_files,
                daily_bytes_mb: membershipLimits.daily_bytes_mb,
                max_file_size_mb: membershipLimits.max_file_size_mb,
            };

            const daily = {
                files_processed: dailyData?.[0]?.files || 0,
                bytes_processed: dailyData?.[0]?.bytes || 0,
            };

            const filesPercentage = Math.min(
                Math.round((daily.files_processed / limits.daily_files) * 100),
                100
            );
            const bytesPercentage = Math.min(
                Math.round((daily.bytes_processed / (limits.daily_bytes_mb * 1024 * 1024)) * 100),
                100
            );

            setStats({
                daily,
                limits,
                remaining: {
                    daily_files: Math.max(0, limits.daily_files - daily.files_processed),
                    daily_bytes: Math.max(0, (limits.daily_bytes_mb * 1024 * 1024) - daily.bytes_processed),
                },
                percentage: {
                    files: filesPercentage,
                    bytes: bytesPercentage,
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

    const filesColor = getStatusColor(stats.percentage.files);

    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-sm ${className}`}>
                <FileText className="w-4 h-4 text-gray-400" />
                <span className={`font-medium ${
                    filesColor === 'red' ? 'text-red-600' :
                    filesColor === 'yellow' ? 'text-amber-600' :
                    'text-gray-600'
                }`}>
                    {stats.remaining.daily_files}/{stats.limits.daily_files}
                </span>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
            {/* Archivos hoy */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-[#1AB1B1]" />
                        <span className="font-bold text-gray-700 text-sm">Archivos hoy</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                        filesColor === 'red' ? 'text-red-600' :
                        filesColor === 'yellow' ? 'text-amber-600' :
                        'text-green-600'
                    }`}>
                        {getStatusIcon(stats.percentage.files)}
                        <span>{stats.daily.files_processed}/{stats.limits.daily_files}</span>
                    </div>
                </div>

                {/* Progress Bar - Archivos */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-500 ${
                            filesColor === 'red' ? 'bg-red-500' :
                            filesColor === 'yellow' ? 'bg-amber-500' :
                            'bg-[#1AB1B1]'
                        }`}
                        style={{ width: `${stats.percentage.files}%` }}
                    />
                </div>

                {/* Status Text */}
                <div className="text-xs text-gray-500">
                    {stats.percentage.files >= 100 ? (
                        <span className="text-red-600 font-medium">
                            Límite alcanzado. Vuelve mañana.
                        </span>
                    ) : stats.percentage.files >= 80 ? (
                        <span className="text-amber-600">
                            Quedan {stats.remaining.daily_files} archivos
                        </span>
                    ) : (
                        <span>
                            {stats.remaining.daily_files} archivos disponibles
                        </span>
                    )}
                </div>
            </div>

            {/* Datos hoy */}
            <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-1 text-gray-500">
                        <HardDrive className="w-4 h-4" />
                        <span>Datos hoy</span>
                    </div>
                    <span className="font-medium text-gray-700">
                        {formatBytes(stats.daily.bytes_processed)} / {stats.limits.daily_bytes_mb}MB
                    </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${
                            stats.percentage.bytes >= 100 ? 'bg-red-500' :
                            stats.percentage.bytes >= 80 ? 'bg-amber-500' :
                            'bg-blue-400'
                        }`}
                        style={{ width: `${stats.percentage.bytes}%` }}
                    />
                </div>
            </div>
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

            const { data: profile } = await supabase
                .from('profiles')
                .select('membership_type')
                .eq('id', user.id)
                .single();

            const membershipType = (profile?.membership_type?.toUpperCase() || 'FREEMIUM') as 'FREEMIUM' | 'PRO' | 'ENTERPRISE';
            const membershipLimits = USAGE_LIMITS[membershipType] || USAGE_LIMITS.FREEMIUM;
            const limits = {
                daily_files: membershipLimits.daily_files,
                daily_bytes_mb: membershipLimits.daily_bytes_mb,
                max_file_size_mb: membershipLimits.max_file_size_mb,
            };

            const daily = {
                files_processed: dailyData?.[0]?.files || 0,
                bytes_processed: dailyData?.[0]?.bytes || 0,
            };

            setStats({
                daily,
                limits,
                remaining: {
                    daily_files: Math.max(0, limits.daily_files - daily.files_processed),
                    daily_bytes: Math.max(0, (limits.daily_bytes_mb * 1024 * 1024) - daily.bytes_processed),
                },
                percentage: {
                    files: Math.min(Math.round((daily.files_processed / limits.daily_files) * 100), 100),
                    bytes: Math.min(Math.round((daily.bytes_processed / (limits.daily_bytes_mb * 1024 * 1024)) * 100), 100),
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
