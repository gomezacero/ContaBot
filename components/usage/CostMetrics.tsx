'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BadgeDollarSign, TrendingUp, Activity } from 'lucide-react';

export function CostMetrics() {
    const [totalCost, setTotalCost] = useState<number>(0);
    const [totalTokens, setTotalTokens] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch metrics from ocr_results
            const { data, error } = await supabase
                .from('ocr_results')
                .select('cost_estimated, tokens_input, tokens_output')
                .eq('user_id', user.id);

            if (!error && data) {
                const cost = data.reduce((acc, curr) => acc + (curr.cost_estimated || 0), 0);
                const tokens = data.reduce((acc, curr) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0);
                setTotalCost(cost);
                setTotalTokens(tokens);
            }
            setLoading(false);
        };

        loadMetrics();
    }, []);

    if (loading) return null;

    // Formatter for very small USD amounts
    const formatCost = (cost: number) => {
        if (cost === 0) return '$0.00';
        if (cost < 0.01) return '<$0.01';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-gray-700 text-sm">Métricas de Consumo AI</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                        <BadgeDollarSign className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Costo Est.</span>
                    </div>
                    <div className="text-xl font-black text-indigo-900">
                        {formatCost(totalCost)}
                    </div>
                    <p className="text-[10px] text-indigo-500/80 leading-tight mt-1">
                        Basado en Gemini Flash 2.0
                    </p>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Tokens</span>
                    </div>
                    <div className="text-xl font-black text-emerald-900">
                        {(totalTokens / 1000).toFixed(1)}k
                    </div>
                    <p className="text-[10px] text-emerald-500/80 leading-tight mt-1">
                        Input + Output procesados
                    </p>
                </div>
            </div>
        </div>
    );
}
