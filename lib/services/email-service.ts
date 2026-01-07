import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TaxAlertEmailParams {
    to: string[];
    clientName: string;
    clientNit?: string;
    events: {
        title: string;
        date: string;
        type: string;
        daysUntil: number;
        description?: string;
    }[];
}

// Iconos por tipo de impuesto
const getEventIcon = (type: string): string => {
    const icons: Record<string, string> = {
        'IVA': '📊',
        'RENTA': '📋',
        'RETENCION': '💰',
        'SIMPLE': '📝',
        'PATRIMONIO': '🏛️',
        'EXOGENA': '📁',
        'GMF': '🏦',
        'CONSUMO': '🛒',
        'ICA': '🏢',
        'GASOLINA': '⛽',
        'BEBIDAS': '🥤',
        'PLASTICOS': '♻️',
        'CARBON': '🌿',
    };
    return icons[type] || '📅';
};

// Colores por urgencia
const getUrgencyStyles = (daysUntil: number): { bg: string; text: string; label: string; border: string } => {
    if (daysUntil <= 3) return { bg: '#fef2f2', text: '#dc2626', label: 'URGENTE', border: '#fecaca' };
    if (daysUntil <= 7) return { bg: '#fff7ed', text: '#ea580c', label: 'PRONTO', border: '#fed7aa' };
    if (daysUntil <= 15) return { bg: '#fefce8', text: '#ca8a04', label: 'PRÓXIMO', border: '#fef08a' };
    return { bg: '#f0fdf4', text: '#16a34a', label: 'PROGRAMADO', border: '#bbf7d0' };
};

// Formatear NIT con puntos
const formatNit = (nit: string): string => {
    if (!nit) return '';
    const clean = nit.replace(/\D/g, '');
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const number = clean.slice(0, -1);
    const formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
};

export async function sendTaxAlertEmail(params: TaxAlertEmailParams) {
    const { to, clientName, clientNit, events } = params;

    if (!to || to.length === 0) {
        console.log('No recipients for email alert');
        return null;
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Generar cards de eventos
    const eventsHtml = events.map(e => {
        const urgency = getUrgencyStyles(e.daysUntil);
        const icon = getEventIcon(e.type);
        const eventDate = new Date(e.date).toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
            <tr>
                <td style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
                    <!-- Card Header -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 16px 20px; border-bottom: 1px solid #f3f4f6;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="font-size: 24px; width: 40px; vertical-align: middle;">
                                            ${icon}
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <span style="font-size: 16px; font-weight: 600; color: #1f2937;">
                                                ${e.title}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <!-- Card Body -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 16px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <!-- Urgency Badge -->
                                            <span style="display: inline-block; background: ${urgency.bg}; color: ${urgency.text}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; border: 1px solid ${urgency.border};">
                                                ${urgency.label} · ${e.daysUntil} día${e.daysUntil !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 12px;">
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="font-size: 18px; padding-right: 8px; vertical-align: middle;">📅</td>
                                                    <td style="color: #4b5563; font-size: 14px; vertical-align: middle;">
                                                        ${eventDate}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ${e.description ? `
                                    <tr>
                                        <td style="padding-top: 8px; color: #6b7280; font-size: 13px;">
                                            ${e.description}
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alertas Tributarias - Contabio</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">

                        <!-- Header con gradiente -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px 40px; text-align: center;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <!-- Logo -->
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); width: 56px; height: 56px; border-radius: 14px; text-align: center; vertical-align: middle;">
                                                        <span style="color: white; font-size: 28px; font-weight: bold; line-height: 56px;">C</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 16px;">
                                            <span style="color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Contabio</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 4px;">
                                            <span style="color: #a1a1aa; font-size: 14px;">Alertas Tributarias</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 8px;">
                                            <span style="color: #71717a; font-size: 12px;">${formattedDate}</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Sección Cliente -->
                        <tr>
                            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f3f4f6;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="background: #f3f4f6; width: 44px; height: 44px; border-radius: 22px; text-align: center; vertical-align: middle;">
                                                        <span style="font-size: 20px;">🏢</span>
                                                    </td>
                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                        <table cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="font-size: 18px; font-weight: 700; color: #1f2937;">
                                                                    ${clientName}
                                                                </td>
                                                            </tr>
                                                            ${clientNit ? `
                                                            <tr>
                                                                <td style="font-size: 13px; color: #6b7280; padding-top: 2px;">
                                                                    NIT: ${formatNit(clientNit)}
                                                                </td>
                                                            </tr>
                                                            ` : ''}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        <td align="right" valign="middle">
                                            <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid #fcd34d;">
                                                ⚠️ ${events.length} vencimiento${events.length !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Mensaje introductorio -->
                        <tr>
                            <td style="padding: 24px 32px 8px 32px;">
                                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                    Te recordamos las siguientes obligaciones tributarias próximas a vencer:
                                </p>
                            </td>
                        </tr>

                        <!-- Cards de eventos -->
                        <tr>
                            <td style="padding: 16px 32px;">
                                ${eventsHtml}
                            </td>
                        </tr>

                        <!-- CTA Button -->
                        <tr>
                            <td style="padding: 8px 32px 32px 32px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="https://contabio.pro/dashboard/calendario"
                                               style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(22, 163, 74, 0.4);">
                                                Ver Calendario Completo →
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 16px;">
                                            <span style="color: #9ca3af; font-size: 13px;">
                                                Gestiona todas tus obligaciones en Contabio
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background: #fafafa; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
                                                Este email fue enviado a <strong>${to[0]}</strong>
                                            </p>
                                            <a href="https://contabio.pro/dashboard/calendario"
                                               style="color: #16a34a; font-size: 13px; text-decoration: none;">
                                                ⚙️ Configurar alertas
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 20px;">
                                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                                © 2026 Contabio by Valueum. Todos los derechos reservados.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Contabio <alertas@send.contabio.pro>';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to,
            subject: `⚠️ ${events.length} vencimiento${events.length > 1 ? 's' : ''} próximo${events.length > 1 ? 's' : ''} - ${clientName}`,
            html,
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
            throw error;
        }

        console.log('Email sent successfully:', data);
        return data;
    } catch (err) {
        console.error('Failed to send tax alert email:', err);
        throw err;
    }
}

// Email de prueba para verificar configuración
export async function sendTestEmail(to: string) {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Contabio <alertas@send.contabio.pro>';

    const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: '✅ Contabio - Prueba de notificaciones',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px 20px; margin: 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center">
                        <table width="500" cellpadding="0" cellspacing="0" style="max-width: 500px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <tr>
                                <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px; text-align: center;">
                                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); width: 56px; height: 56px; border-radius: 14px; text-align: center; vertical-align: middle;">
                                                <span style="color: white; font-size: 28px; font-weight: bold; line-height: 56px;">C</span>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="color: white; margin: 16px 0 0 0; font-size: 22px; font-weight: 700;">Contabio</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 32px; text-align: center;">
                                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background: #dcfce7; width: 72px; height: 72px; border-radius: 36px; text-align: center; vertical-align: middle;">
                                                <span style="font-size: 36px; line-height: 72px;">✓</span>
                                            </td>
                                        </tr>
                                    </table>
                                    <h2 style="color: #1f2937; margin: 20px 0 12px 0; font-size: 22px; font-weight: 700;">¡Configuración exitosa!</h2>
                                    <p style="color: #6b7280; margin: 0; font-size: 15px; line-height: 1.6;">
                                        Las notificaciones por email están funcionando correctamente.<br>
                                        Recibirás alertas cuando tus obligaciones tributarias estén próximas a vencer.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        © 2026 Contabio by Valueum. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    });

    if (error) {
        console.error('Error sending test email:', error);
        throw error;
    }

    return data;
}
