import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface PriceAlert {
    articulo_erp_id: string;
    nombre: string;
    precio_anterior: number;
    precio_nuevo: number;
    variacion_porcentaje: number;
    fecha_cambio: string;
}

export async function POST(request: NextRequest) {
    try {
        // Verify CRON_SECRET
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get price alerts from the last 24 hours with >= 10% variation
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: priceChanges, error: queryError } = await supabase
            .from('historico_precios_erp')
            .select(`
                id,
                articulo_erp_id,
                fecha,
                precio_calculado,
                variacion_porcentaje,
                articulos_erp:articulo_erp_id (
                    nombre
                )
            `)
            .gte('fecha', oneDayAgo.toISOString())
            .order('fecha', { ascending: false });

        if (queryError) throw queryError;

        // Filter alerts with >= 10% variation
        const alerts: PriceAlert[] = [];
        if (priceChanges) {
            priceChanges.forEach((record: any) => {
                if (record.variacion_porcentaje && Math.abs(record.variacion_porcentaje) >= 10) {
                    alerts.push({
                        articulo_erp_id: record.articulo_erp_id,
                        nombre: record.articulos_erp?.nombre || 'Artículo Desconocido',
                        precio_anterior: 0, // Will be calculated from history
                        precio_nuevo: record.precio_calculado,
                        variacion_porcentaje: record.variacion_porcentaje,
                        fecha_cambio: record.fecha,
                    });
                }
            });
        }

        // If no alerts, return success without sending email
        if (alerts.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No price alerts to send',
                alertsCount: 0,
            });
        }

        // Generate HTML email template
        const htmlContent = generateEmailTemplate(alerts);

        // Send email to admin
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@micecatering.com',
            to: process.env.ADMIN_EMAIL || 'guillermo.otero@micecatering.com',
            subject: `⚠️ Alertas de Cambio de Precio - ${new Date().toLocaleDateString('es-ES')}`,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: `Email enviado con ${alerts.length} alertas de precio`,
            alertsCount: alerts.length,
        });
    } catch (error) {
        console.error('Error sending price alerts:', error);
        return NextResponse.json(
            {
                error: 'Error sending price alerts',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

function generateEmailTemplate(alerts: PriceAlert[]): string {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const alertRows = alerts
        .map(
            (alert) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; text-align: left;">${escapeHtml(alert.nombre)}</td>
            <td style="padding: 12px; text-align: right;">€${alert.precio_nuevo.toFixed(2)}</td>
            <td style="padding: 12px; text-align: center;">
                <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: ${alert.variacion_porcentaje > 0 ? '#fee2e2' : '#dcfce7'}; color: ${alert.variacion_porcentaje > 0 ? '#991b1b' : '#166534'}; font-weight: 600;">
                    ${alert.variacion_porcentaje > 0 ? '+' : ''}${alert.variacion_porcentaje.toFixed(2)}%
                </span>
            </td>
            <td style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px;">
                ${new Date(alert.fecha_cambio).toLocaleDateString('es-ES')}
            </td>
        </tr>
    `
        )
        .join('');

    return `
    <!DOCTYPE html>
    <html dir="ltr" lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alertas de Cambio de Precio</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">⚠️ Cambios de Precio Detectados</h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${formattedDate}</p>
                </div>

                <!-- Content -->
                <div style="padding: 30px 20px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 14px;">
                        Se han detectado <strong style="color: #dc2626;">${alerts.length}</strong> artículo(s) con cambios de precio ≥ 10%.
                    </p>

                    <!-- Table -->
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                                <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600; font-size: 12px; text-transform: uppercase;">Artículo</th>
                                <th style="padding: 12px; text-align: right; color: #374151; font-weight: 600; font-size: 12px; text-transform: uppercase;">Precio</th>
                                <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600; font-size: 12px; text-transform: uppercase;">Variación</th>
                                <th style="padding: 12px; text-align: center; color: #374151; font-weight: 600; font-size: 12px; text-transform: uppercase;">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alertRows}
                        </tbody>
                    </table>

                    <!-- Action Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bd/erp" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                            Ver en el Sistema
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">
                        Este es un informe automático del sistema de monitoreo de precios.
                    </p>
                    <p style="margin: 5px 0 0 0;">
                        © ${new Date().getFullYear()} MICE Catering. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
