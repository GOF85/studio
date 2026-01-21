import type { OsPanelData, OsPanelChangeLog } from '@/lib/validations/os-panel';
import type { Personal } from './index';

// Re-export OsPanelChangeLog for easier access
export type { OsPanelChangeLog };

// OS Panel Form Values
export interface OsPanelFormValues {
  os_id: string;
  numero_expediente: string;
  
  // Sala
  produccion_sala: string | null;
  revision_pm: boolean;
  metre_responsable: string | null;
  metres: string[];
  logistica_evento: string | null;
  camareros_ext: number;
  logisticos_ext: number;
  pedido_ett: boolean;
  ped_almacen_bio_bod: boolean;
  pedido_walkies: boolean;
  pedido_hielo: boolean;
  pedido_transporte: boolean;
  
  // Cocina
  produccion_cocina_cpr: string | null;
  jefe_cocina: string | null;
  cocina: string[];
  cocineros_ext: number;
  logisticos_ext_cocina: number;
  gastro_actualizada: boolean;
  pedido_gastro: boolean;
  pedido_cocina: boolean;
  personal_cocina: boolean;
  servicios_extra: ('Jamonero' | 'Sushi' | 'Pan' | 'No' | 'Ostras')[];
  
  // Logística
  edo_almacen: 'EP' | 'Ok' | 'Sin producir';
  mozo: string | null;
  estado_logistica: 'Pendiente' | 'Ok';
  carambucos: number;
  jaulas: 'Si' | 'No' | null;
  pallets: 'Si' | 'No' | null;
  proveedor: ('Mice' | 'Cristian' | 'Sánchez' | 'Victor' | 'MRW' | 'Raptor' | 'Armando')[];
  h_recogida_cocina: string | null;
  transporte: ('Furgoneta' | 'Furgoneta x2' | 'Furgoneta x3' | 'Carrozado' | 'Carrozado x2' | 'Carrozado x3' | 'Trailer' | 'Trailer x2' | 'Trailer x3')[];
  h_recogida_pre_evento: string | null;
  h_descarga_evento: string | null;
  h_recogida_pos_evento: string | null;
  h_descarga_pos_evento: string | null;
  alquiler_lanzado: boolean;
}

// OS Panel State with personal lookup
export interface OsPanelState {
  data: OsPanelFormValues;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  lastSaved: Date | null;
  isDirty: boolean;
}

// API Response types
export interface OsPanelSaveResponse {
  success: boolean;
  data: OsPanelFormValues;
  timestamp: string;
  changeLog?: OsPanelChangeLog;
}

export interface OsPanelHistoryResponse {
  success: boolean;
  data: OsPanelChangeLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface OsPanelExportResponse {
  success: boolean;
  blob: Blob;
  filename: string;
}

// Personal lookup enhanced
export interface PersonalLookup {
  all: Personal[];
  sala: Personal[];
  cpr: Personal[];
  pase: Personal[];
  almacen: Personal[];
  operaciones: Personal[];
  
  // Helpers
  getFullName: (p: Personal) => string;
  getCompactName: (p: Personal) => string;
  getById: (id: string) => Personal | undefined;
}

// Keyboard shortcuts map
export interface KeyboardShortcutsMap {
  'cmd+s': () => void;
  'cmd+h': () => void;
}

// Export options
export interface ExportPDFOptions {
  includeTimeline?: boolean;
  includeImages?: boolean;
}
