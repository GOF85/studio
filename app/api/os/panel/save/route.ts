import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { osPanelSchema } from '@/lib/validations/os-panel';
import { resolveOsId } from '@/lib/supabase';
import type { OsPanelSaveResponse } from '@/types/os-panel';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { osId, panelData } = await request.json();

    if (!osId || !panelData) {
      return NextResponse.json(
        { success: false, error: 'Missing osId or panelData' },
        { status: 400 }
      );
    }

    // Resolve OS ID
    const targetId = await resolveOsId(osId);

    // Validate with Zod
    const validatedData = osPanelSchema.parse({
      ...panelData,
      os_id: targetId,
    });

    // Get current data to detect changes
    const { data: currentData, error: fetchError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Detect changes
    const cambios: Array<{
      campo: string;
      valor_anterior: any;
      valor_nuevo: any;
    }> = [];

    Object.entries(validatedData).forEach(([key, newValue]) => {
      if (key === 'os_id' || key === 'numero_expediente') return;

      const oldValue = (currentData as any)?.[key];
      
      // Compare (handle arrays and objects)
      const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      
      if (hasChanged && oldValue !== newValue) {
        cambios.push({
          campo: key,
          valor_anterior: oldValue,
          valor_nuevo: newValue,
        });
      }
    });

    // Prepare update data
    const updateData: any = { ...validatedData };
    delete updateData.os_id;
    delete updateData.numero_expediente;

    // Update eventos table
    const { error: updateError } = await supabase
      .from('eventos')
      .update(updateData)
      .eq('id', targetId);

    if (updateError) throw updateError;

    // Log changes to audit table
    const { data: user } = await supabase.auth.getUser();
    
    if (cambios.length > 0) {
      const { error: logError } = await supabase
        .from('os_panel_cambios')
        .insert({
          os_id: targetId,
          numero_expediente: validatedData.numero_expediente,
          usuario_id: user?.user?.id || 'sistema',
          usuario_email: user?.user?.email,
          pestaña: 'Sala', // TODO: detect from changes
          cambios,
          timestamp: new Date().toISOString(),
          auto_guardado: true,
        });

      if (logError) {
        console.error('Error logging changes:', logError);
        // Don't throw - continue anyway
      }
    }

    const response: OsPanelSaveResponse = {
      success: true,
      data: validatedData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving OS panel:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
