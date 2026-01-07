import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint should be called daily by Vercel cron
// Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup-deleted", "schedule": "0 3 * * *" }] }

export async function GET(request: Request) {
    // SEGURIDAD: CRON_SECRET es OBLIGATORIO
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('CRON_SECRET not configured - endpoint disabled for security');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron cleanup attempt');
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // Use service role to execute cleanup function
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Execute the cleanup function
        const { error } = await supabase.rpc('cleanup_old_soft_deleted_records');

        if (error) {
            console.error('Cleanup error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        console.log('Cleanup completed successfully at', new Date().toISOString());

        return NextResponse.json({
            success: true,
            message: 'Cleanup completed successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cleanup cron error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
