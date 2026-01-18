import { z } from 'zod';

// Enums
export const DEPARTAMENTOS_PANEL = {
  SALA: 'Sala',
  CPR: 'CPR (Centro de Producción)',
  PASE: 'Pase',
  ALMACEN: 'Almacén',
} as const;

export const EDO_ALMACEN_OPTIONS = ['EP', 'Ok', 'Sin producir'] as const;
export const ESTADO_LOGISTICA_OPTIONS = ['Pendiente', 'Ok'] as const;
export const SI_NO_OPTIONS = ['Si', 'No'] as const;
export const PROVEEDORES_OPTIONS = ['Mice', 'Cristian', 'Sánchez', 'Victor', 'MRW', 'Raptor', 'Armando'] as const;
export const TRANSPORTE_OPTIONS = [
  'Furgoneta',
  'Furgoneta x2',
  'Furgoneta x3',
  'Carrozado',
  'Carrozado x2',
  'Carrozado x3',
  'Trailer',
  'Trailer x2',
  'Trailer x3',
] as const;
export const SERVICIOS_EXTRA_OPTIONS = ['Jamonero', 'Sushi', 'Pan', 'No'] as const;

// Sala Tab Schema
export const salaPanelSchema = z.object({
  produccion_sala: z.string().nullable().catch(null),
  revision_pm: z.boolean().default(false),
  metre_responsable: z.string().nullable().catch(null),
  metres: z.array(z.string()).default([]),
  logistica_evento: z.string().nullable().catch(null),
  camareros_ext: z.coerce.number().min(0).default(0),
  logisticos_ext: z.coerce.number().min(0).default(0),
  pedido_ett: z.boolean().default(false),
  ped_almacen_bio_bod: z.boolean().default(false),
  pedido_walkies: z.boolean().default(false),
  pedido_hielo: z.boolean().default(false),
  pedido_transporte: z.boolean().default(false),
});

// Cocina Tab Schema
export const cocinaPanelSchema = z.object({
  produccion_cocina_cpr: z.string().nullable().catch(null),
  jefe_cocina: z.string().nullable().catch(null),
  cocina: z.array(z.string()).default([]),
  cocineros_ext: z.coerce.number().min(0).default(0),
  logisticos_ext_cocina: z.coerce.number().min(0).default(0),
  gastro_actualizada: z.boolean().default(false),
  pedido_gastro: z.boolean().default(false),
  pedido_cocina: z.boolean().default(false),
  personal_cocina: z.boolean().default(false),
  servicios_extra: z.array(z.enum(SERVICIOS_EXTRA_OPTIONS)).default([]),
});

// Logistica Tab Schema
export const logisticaPanelSchema = z.object({
  edo_almacen: z.enum(EDO_ALMACEN_OPTIONS).default('EP'),
  mozo: z.string().nullable().catch(null),
  estado_logistica: z.enum(ESTADO_LOGISTICA_OPTIONS).default('Pendiente'),
  carambucos: z.coerce.number().min(0).default(0),
  jaulas: z.enum(SI_NO_OPTIONS).nullable().catch(null),
  pallets: z.enum(SI_NO_OPTIONS).nullable().catch(null),
  proveedor: z.array(z.enum(PROVEEDORES_OPTIONS)).default([]),
  h_recogida_cocina: z.string().nullable().catch(null),
  transporte: z.array(z.enum(TRANSPORTE_OPTIONS)).default([]),
  h_recogida_pre_evento: z.string().nullable().catch(null),
  h_descarga_evento: z.string().nullable().catch(null),
  h_recogida_pos_evento: z.string().nullable().catch(null),
  h_descarga_pos_evento: z.string().nullable().catch(null),
  alquiler_lanzado: z.boolean().default(false),
});

// Complete Panel Schema with cross-field validations
export const osPanelSchema = z.object({
  os_id: z.string(), // Allow both UUID and legacy TEXT IDs
  numero_expediente: z.string(),
  ...salaPanelSchema.shape,
  ...cocinaPanelSchema.shape,
  ...logisticaPanelSchema.shape,
}).refine(
  (data) => {
    // Si pedido_ett = true, debe haber camareros_ext > 0 O logisticos_ext > 0
    if (data.pedido_ett && data.camareros_ext === 0 && data.logisticos_ext === 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Si pide ETT, debe haber al menos 1 camarero o logístico externo',
    path: ['camareros_ext'],
  }
).refine(
  (data) => {
    // Si hay transporte, debe haber hora de recogida
    if (data.transporte.length > 0 && !data.h_recogida_pre_evento) {
      return false;
    }
    return true;
  },
  {
    message: 'Si especifica transporte, debe indicar la hora de recogida pre-evento',
    path: ['h_recogida_pre_evento'],
  }
).refine(
  (data) => {
    // Si pedido_cocina = true, jefe_cocina debe estar asignado
    if (data.pedido_cocina && !data.jefe_cocina) {
      return false;
    }
    return true;
  },
  {
    message: 'Si pide cocina, debe asignar un Jefe de Cocina',
    path: ['jefe_cocina'],
  }
);

// Type definitions
export type SalaPanelData = z.infer<typeof salaPanelSchema>;
export type CocinaPanelData = z.infer<typeof cocinaPanelSchema>;
export type LogisticaPanelData = z.infer<typeof logisticaPanelSchema>;
export type OsPanelData = z.infer<typeof osPanelSchema>;

// Change tracking
export const osPanelChangeSchema = z.object({
  campo: z.string(),
  valor_anterior: z.unknown(),
  valor_nuevo: z.unknown(),
});

export const osPanelChangeLogSchema = z.object({
  id: z.string().uuid(),
  os_id: z.string(), // Changed from .uuid()
  numero_expediente: z.string(),
  usuario_id: z.string(),
  usuario_email: z.string().optional(),
  pestaña: z.enum(['Espacio', 'Sala', 'Cocina', 'Logística', 'Personal']),
  cambios: z.array(osPanelChangeSchema),
  timestamp: z.string().datetime(),
  auto_guardado: z.boolean().default(true),
});

export type OsPanelChange = z.infer<typeof osPanelChangeSchema>;
export type OsPanelChangeLog = z.infer<typeof osPanelChangeLogSchema>;

// Validation helpers for contextual warnings
export function validateSalaWarnings(data: SalaPanelData): string[] {
  const warnings: string[] = [];

  if (data.revision_pm && !data.metre_responsable) {
    warnings.push('REVISIÓN PM activada pero sin METRE RESPONSABLE asignado');
  }

  if (data.pedido_ett && data.camareros_ext === 0 && data.logisticos_ext === 0) {
    warnings.push('Pedido ETT sin personal externo asignado');
  }

  if (data.camareros_ext > 0 && !data.logistica_evento) {
    warnings.push('Hay camareros externos pero sin LOGÍSTICA EVENTO asignada');
  }

  return warnings;
}

export function validateCocinaWarnings(data: CocinaPanelData): string[] {
  const warnings: string[] = [];

  if (data.pedido_cocina && !data.jefe_cocina) {
    warnings.push('Pedido Cocina sin Jefe de Cocina asignado');
  }

  if (data.cocineros_ext > 0 && data.cocina.length === 0) {
    warnings.push('Hay cocineros externos pero sin equipo de cocina MICE asignado');
  }

  if (data.gastro_actualizada && data.cocina.length === 0) {
    warnings.push('Gastro marcada actualizada pero sin cocineros asignados');
  }

  return warnings;
}

export function validateLogisticaWarnings(data: LogisticaPanelData): string[] {
  const warnings: string[] = [];

  if (data.transporte.length > 0 && !data.h_recogida_pre_evento) {
    warnings.push('Transporte especificado sin hora de recogida pre-evento');
  }

  if (data.transporte.length > 0 && !data.h_descarga_evento) {
    warnings.push('Transporte especificado sin hora de descarga en evento');
  }

  if (data.edo_almacen === 'Ok' && !data.mozo) {
    warnings.push('Almacén OK pero sin MOZO asignado');
  }

  if (data.alquiler_lanzado && data.transporte.length === 0) {
    warnings.push('Alquiler lanzado pero sin transporte especificado');
  }

  return warnings;
}
