import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Cron endpoint for daily Factusol synchronization
 * This endpoint triggers the sync-articulos endpoint
 * 
 * Environment variables required:
 * - CRON_SECRET: Bearer token for authentication
 */
export async function GET(request: NextRequest) {
    try {
        // Verify CRON_SECRET from Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Call the sync-articulos endpoint
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const syncUrl = `${baseUrl}/api/factusol/sync-articulos`;

        console.log(`[CRON] Starting Factusol sync at ${new Date().toISOString()}`);

        const syncResponse = await fetch(syncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const syncData = await syncResponse.json();

        // If sync completed, trigger price alerts check
        if (syncResponse.ok) {
            console.log(`[CRON] Sync completed. Triggering price alerts...`);

            const alertsUrl = `${baseUrl}/api/email/price-alerts`;
            const alertsResponse = await fetch(alertsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
                },
            });

            const alertsData = await alertsResponse.json();

            return NextResponse.json({
                success: true,
                timestamp: new Date().toISOString(),
                sync: syncData,
                alerts: alertsData,
            });
        } else {
            return NextResponse.json(
                {
                    error: 'Sync failed',
                    details: syncData,
                },
                { status: syncResponse.status }
            );
        }
    } catch (error) {
        console.error('[CRON] Error during sync:', error);
        return NextResponse.json(
            {
                error: 'Cron execution failed',
                details: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

/**
 * POST handler for manual triggering
 */
export async function POST(request: NextRequest) {
    return GET(request);
}
