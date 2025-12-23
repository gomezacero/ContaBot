import { createClient } from '@/lib/supabase/client';
import { getTaxDeadlines, getUpcomingEvents, TaxClientConfig } from '@/lib/tax-deadlines';
import { NextResponse } from 'next/server';

// This would typically be a secure server-side client
// import { createClient } from '@supabase/supabase-js';

export async function GET() {
    console.log('Starting Tax Calendar Cron Job...');

    // 1. Fetch Clients
    const supabase = createClient();
    const { data: clients, error } = await supabase
        .from('clients')
        .select('*');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const alertsSent = [];

    // 2. Check Deadlines
    for (const client of clients) {
        if (!client.email_alert && !client.whatsapp_alert) continue;

        const config: TaxClientConfig = {
            nit: client.nit,
            classification: client.classification,
            taxRegime: client.tax_regime || 'ORDINARIO',
            ivaPeriodicity: client.iva_periodicity,
            isRetentionAgent: client.is_retention_agent,
            hasGmf: client.has_gmf,
            requiresExogena: client.requires_exogena,
            hasPatrimonyTax: client.has_patrimony_tax
        };

        const events = getTaxDeadlines(config);
        const upcoming = getUpcomingEvents(events, 15); // Look 15 days ahead

        if (upcoming.length > 0) {
            // 3. Send Alert
            const criticalEvents = upcoming.filter(e => {
                const days = Math.ceil((new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return days <= 5;
            });

            if (criticalEvents.length > 0) {
                // Mock sending email
                console.log(`[ALERT] Sending email to client ${client.name} for ${criticalEvents.length} critical events.`);
                alertsSent.push({ client: client.name, events: criticalEvents.length });
                // await sendEmail(...)
            }
        }
    }

    return NextResponse.json({
        success: true,
        clientsChecked: clients.length,
        alertsTriggered: alertsSent
    });
}
