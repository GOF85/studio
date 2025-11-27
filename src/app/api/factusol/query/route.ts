import { NextRequest, NextResponse } from 'next/server';
import { FactusolService } from '@/services/factusol-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sql } = body;

        if (!sql) {
            return NextResponse.json(
                { error: 'SQL query is required' },
                { status: 400 }
            );
        }

        // Use hardcoded credentials
        const credentials = {
            codfab: process.env.NEXT_PUBLIC_FACTUSOL_CODFAB || '1078',
            codcli: process.env.NEXT_PUBLIC_FACTUSOL_CODCLI || '57237',
            basedatos: process.env.NEXT_PUBLIC_FACTUSOL_BASEDATOS || 'FS150',
            password: process.env.NEXT_PUBLIC_FACTUSOL_PASSWORD || 'AiQe4HeWrj6Q',
        };

        const debugLog: string[] = [];
        const factusolService = new FactusolService(credentials, debugLog);
        const result = await factusolService.executeQuery(sql);

        return NextResponse.json({
            success: true,
            data: result,
            debugLog,
        });
    } catch (error) {
        console.error('Factusol API error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                debugLog: []
            },
            { status: 500 }
        );
    }
}
