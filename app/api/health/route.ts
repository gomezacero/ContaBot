import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ServiceStatus {
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latency?: number;
    message?: string;
}

async function checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
        const supabase = createClient();
        const { error } = await supabase.from('clients').select('id').limit(1);
        const latency = Date.now() - start;

        if (error) {
            return { name: 'Database', status: 'down', latency, message: error.message };
        }
        return { name: 'Database', status: 'ok', latency };
    } catch (e) {
        return { name: 'Database', status: 'down', latency: Date.now() - start, message: String(e) };
    }
}

async function checkAuth(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
        const supabase = createClient();
        const { error } = await supabase.auth.getSession();
        const latency = Date.now() - start;

        if (error) {
            return { name: 'Auth', status: 'degraded', latency, message: error.message };
        }
        return { name: 'Auth', status: 'ok', latency };
    } catch (e) {
        return { name: 'Auth', status: 'down', latency: Date.now() - start, message: String(e) };
    }
}

async function checkAI(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
        // Check if API key is configured
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const latency = Date.now() - start;

        if (!apiKey) {
            return { name: 'AI (Gemini)', status: 'degraded', latency, message: 'API key not configured' };
        }
        return { name: 'AI (Gemini)', status: 'ok', latency };
    } catch (e) {
        return { name: 'AI (Gemini)', status: 'down', latency: Date.now() - start, message: String(e) };
    }
}

export async function GET() {
    const [database, auth, ai] = await Promise.all([
        checkDatabase(),
        checkAuth(),
        checkAI()
    ]);

    const services = [database, auth, ai];
    const allOk = services.every(s => s.status === 'ok');
    const anyDown = services.some(s => s.status === 'down');

    const overallStatus = anyDown ? 'down' : allOk ? 'healthy' : 'degraded';

    return NextResponse.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}
