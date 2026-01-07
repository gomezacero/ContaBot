import { createClient } from '@supabase/supabase-js';
import { getTaxDeadlines, getUpcomingEvents, TaxClientConfig } from '@/lib/tax-deadlines';
import { sendTaxAlertEmail } from '@/lib/services/email-service';
import { NextResponse } from 'next/server';

// Crear cliente de Supabase con service role para acceso server-side
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    console.log('Starting Tax Calendar Cron Job...');

    // Verificar CRON_SECRET para seguridad (opcional pero recomendado)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron job attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch Clients con alertas de email habilitadas
        const { data: clients, error } = await supabase
            .from('clients')
            .select('*')
            .eq('email_alert', true)
            .is('deleted_at', null);

        if (error) {
            console.error('Error fetching clients:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!clients || clients.length === 0) {
            console.log('No clients with email alerts enabled');
            return NextResponse.json({
                success: true,
                clientsChecked: 0,
                alertsTriggered: []
            });
        }

        const alertsSent = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 2. Check Deadlines for each client
        for (const client of clients) {
            try {
                // Obtener configuración de alertas del cliente
                const targetEmails: string[] = client.target_emails || [];
                const alertDays: number[] = client.alert_days || [15, 7, 1];

                // Saltar si no hay emails configurados
                if (targetEmails.length === 0) {
                    console.log(`Client ${client.name} has no target emails configured`);
                    continue;
                }

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

                // Obtener todos los eventos próximos (hasta 30 días)
                const events = getTaxDeadlines(config);
                const upcoming = getUpcomingEvents(events, 30);

                // Filtrar eventos que coincidan con los días de alerta configurados
                const eventsToAlert = upcoming.filter(event => {
                    const eventDate = new Date(event.date);
                    eventDate.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil(
                        (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return alertDays.includes(daysUntil);
                });

                // Enviar email si hay eventos que alertar
                if (eventsToAlert.length > 0) {
                    console.log(`Sending alert to ${client.name} for ${eventsToAlert.length} events to: ${targetEmails.join(', ')}`);

                    const emailEvents = eventsToAlert.map(e => {
                        const eventDate = new Date(e.date);
                        eventDate.setHours(0, 0, 0, 0);
                        const daysUntil = Math.ceil(
                            (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return {
                            title: e.title,
                            date: e.date,
                            type: e.type,
                            daysUntil
                        };
                    });

                    await sendTaxAlertEmail({
                        to: targetEmails,
                        clientName: client.name,
                        clientNit: client.nit,
                        events: emailEvents
                    });

                    alertsSent.push({
                        client: client.name,
                        emails: targetEmails,
                        events: eventsToAlert.length
                    });
                }
            } catch (clientError) {
                console.error(`Error processing client ${client.name}:`, clientError);
                // Continuar con el siguiente cliente
            }
        }

        console.log(`Cron job completed. Checked ${clients.length} clients, sent ${alertsSent.length} alerts`);

        return NextResponse.json({
            success: true,
            clientsChecked: clients.length,
            alertsTriggered: alertsSent
        });
    } catch (err) {
        console.error('Cron job failed:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
