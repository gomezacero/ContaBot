import { NextResponse } from 'next/server';
import { getTRM } from '@/lib/services/trm-service';

/**
 * GET /api/trm
 * Returns current TRM (Tasa Representativa del Mercado) - USD to COP exchange rate
 * Free API from Colombian Central Bank data
 */
export async function GET() {
    try {
        const trm = await getTRM();

        return NextResponse.json({
            success: true,
            rate: trm.rate,
            date: trm.date,
            source: trm.source,
            currency: {
                from: 'USD',
                to: 'COP'
            }
        });
    } catch (error) {
        console.error('Error fetching TRM:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener la TRM',
                // Return fallback rate even on error
                rate: 4350,
                date: new Date().toISOString().split('T')[0],
                source: 'fallback'
            },
            { status: 200 } // Return 200 with fallback to not break client
        );
    }
}
