import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { osPanelSchema } from '@/lib/validations/os-panel';
import type { OsPanelSaveResponse } from '@/types/os-panel';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Server-side resolver using service role (no RLS blocking)
async function resolveOsIdServer(osId: string): Promise<string | null> {
  if (!osId) return null;
  if (osId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return osId;
  }

  console.log('[OS Panel Save] Resolving osId by numero_expediente:', osId);

  const { data: eventoData } = await supabase
    .from('eventos')
    .select('id')
    .eq('numero_expediente', osId)
    .maybeSingle();

  if (eventoData?.id) return eventoData.id;

  const { data: entregaData } = await supabase
    .from('entregas')
    .select('id')
    .eq('numero_expediente', osId)
    .maybeSingle();

  if (entregaData?.id) return entregaData.id;

  // Last attempt: lowercase check
  const { data: lowData } = await supabase
    .from('eventos')
    .select('id')
    .ilike('numero_expediente', osId)
    .maybeSingle();

  return lowData?.id || null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { osId, panelData } = await request.json();

    console.log('[OS Panel Save] START ===================================');
    console.log('[OS Panel Save] osId received:', osId);
    console.log('[OS Panel Save] panelData keys:', Object.keys(panelData));
    console.log('[OS Panel Save] 🔍 panelData.metre_responsable:', panelData.metre_responsable, 'type:', typeof panelData.metre_responsable);

    if (!osId || !panelData) {
      console.error('[OS Panel Save] ERROR: Missing osId or panelData');
      return NextResponse.json(
        { success: false, error: 'Missing osId or panelData' },
        { status: 400 }
      );
    }

    // Resolve OS ID server-side
    const targetId = await resolveOsIdServer(osId);
    console.log('[OS Panel Save] targetId resolved:', targetId, 'for osId:', osId);
    
    if (!targetId) {
      console.error('[OS Panel Save] ERROR: Could not resolve targetId for osId:', osId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'OS ID not found',
          details: `The ID or Expediente "${osId}" does not exist in events/deliveries table.`
        },
        { status: 400 }
      );
    }

    // Clean panelData: allow legacy IDs (string) and UUIDs
    const cleanedData: any = {};
    const idFields = [
      'metre_responsable', 
      'jefe_cocina', 
      'mozo', 
      'produccion_sala', 
      'produccion_cocina_cpr',
      'logistica_evento'
    ];
    const idArrayFields = ['metres', 'cocina'];

    const isValidId = (val: any) => 
      typeof val === 'string' && val.length > 0;

    Object.entries(panelData).forEach(([key, value]) => {
      if (value === undefined) return;

      if (idFields.includes(key)) {
        cleanedData[key] = isValidId(value) ? value : null;
      } else if (idArrayFields.includes(key) && Array.isArray(value)) {
        cleanedData[key] = value.filter(v => isValidId(v));
      } else if (Array.isArray(value)) {
        cleanedData[key] = value.filter(v => v !== undefined);
      } else {
        cleanedData[key] = value;
      }
    });

    console.log('[OS Panel Save] 🔍 After cleaning - cleanedData.metre_responsable:', cleanedData.metre_responsable);

    // Validate with Zod (using safeParse to handle errors gracefully)
    const validationResult = osPanelSchema.safeParse({
      ...cleanedData,
      os_id: targetId,
      numero_expediente: panelData.numero_expediente || '',
    });

    if (!validationResult.success) {
      console.warn('[OS Panel Save] Validation errors:', validationResult.error.errors);
    }

    const validatedData = validationResult.success ? validationResult.data : {
      ...cleanedData,
      os_id: targetId,
      numero_expediente: panelData.numero_expediente || '',
    };

    console.log('[OS Panel Save] 🔍 After validation - validatedData.metre_responsable:', validatedData.metre_responsable);

    // Get current data to detect changes
    const { data: currentData, error: fetchError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Detect changes
    const cambios: any[] = [];
    Object.entries(validatedData).forEach(([key, newValue]) => {
      if (key === 'os_id' || key === 'numero_expediente') return;

      const oldValue = (currentData as any)?.[key];
      
      // Handle array/object comparison
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);
      
      if (oldStr !== newStr) {
        cambios.push({
          campo: key,
          valor_anterior: oldValue,
          valor_nuevo: newValue,
        });
      }
    });

    console.log(`[OS Panel Save] Changes count: ${cambios.length}`);

    // Prepare update data
    const updateData: any = {};
    const excludeFromUpdate = ['os_id', 'numero_expediente'];
    
    // ONLY update fields that are in the schema to avoid updating system columns
    Object.keys(validatedData).forEach(key => {
      if (!excludeFromUpdate.includes(key)) {
        updateData[key] = (validatedData as any)[key];
      }
    });

    // Update eventos table
    const { data: updateResult, error: updateError } = await supabase
      .from('eventos')
      .update(updateData)
      .eq('id', targetId)
      .select('id, numero_expediente');

    if (updateError) {
      console.error('[OS Panel Save] ERROR updating eventos:', JSON.stringify(updateError, null, 2));
      throw updateError;
    }

    console.log('[OS Panel Save] Update successful, rows affected:', updateResult?.length || 0);

    // --- Audit Log ---
    try {
      if (cambios.length > 0) {
        // Try to get user from headers if we want to be more precise, 
        // but for now let's just use 'sistema' if getUser() fails
        let usuario_email = 'sistema';
        let usuario_id = 'sistema';

        try {
          const authHeader = request.headers.get('Authorization');
          if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (user && !authError) {
              usuario_email = user.email || 'unknown';
              usuario_id = user.id;
            }
          }
        } catch (e) {
          console.warn('[OS Panel Save] Could not get user from auth:', e);
        }

        const { error: logError } = await supabase
          .from('os_panel_cambios')
          .insert({
            os_id: targetId,
            numero_expediente: validatedData.numero_expediente,
            usuario_id,
            usuario_email,
            pestaña: 'General', // TODO: detect better
            cambios,
            timestamp: new Date().toISOString(),
            auto_guardado: true,
          });

        if (logError) {
          console.error('[OS Panel Save] ERROR logging changes:', logError);
        }
      }
    } catch (auditError) {
      console.error('[OS Panel Save] Audit Log Error:', auditError);
    }

    // --- Tareas Automáticas ---
    try {
      if (cambios.length > 0) {
        const { data: configs } = await supabase
          .from('asignaciones_tareas_config')
          .select('*');

        if (configs && configs.length > 0) {
          for (const cambio of cambios) {
            const relevantConfigs = configs.filter(c => c.campo_trigger === cambio.campo);
            
            for (const config of relevantConfigs) {
              const valNuevo = cambio.valor_nuevo;
              const triggerMatches = Array.isArray(valNuevo) 
                ? valNuevo.includes(config.valor_trigger)
                : String(valNuevo) === String(config.valor_trigger);

              if (triggerMatches) {
                // Check for existing pending task with same title to avoid spam
                const { data: existing } = await supabase
                  .from('os_panel_tareas')
                  .select('id')
                  .eq('os_id', targetId)
                  .eq('titulo', config.tarea_titulo)
                  .eq('estado', 'pending')
                  .maybeSingle();

                if (!existing) {
                  await supabase.from('os_panel_tareas').insert({
                    os_id: targetId,
                    titulo: config.tarea_titulo,
                    rol_asignado: config.tarea_rol,
                    automatica: true
                  });
                  console.log(`[OS Panel Save] Generated Auto-Task: "${config.tarea_titulo}" for ${config.tarea_rol}`);
                }
              }
            }
          }
        }
      }
    } catch (taskError) {
      console.error('[OS Panel Save] Task Generation Error:', taskError);
      // Non-blocking
    }

    const response: OsPanelSaveResponse = {
      success: true,
      data: validatedData,
      timestamp: new Date().toISOString(),
    };

    console.log('[OS Panel Save] SUCCESS ===================================');
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[OS Panel Save] EXCEPTION:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error',
        details: error.details || error.hint || null,
        code: error.code || null
      },
      { status: 400 }
    );
  }
}
