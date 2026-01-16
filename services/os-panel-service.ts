import { supabase } from '@/lib/supabase';
import type { OsPanelFormValues } from '@/types/os-panel';

/**
 * Save OS panel data to Supabase
 */
export async function saveOsPanelData(
  osId: string,
  panelData: OsPanelFormValues
): Promise<OsPanelFormValues> {
  const response = await fetch('/api/os/panel/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ osId, panelData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Detect changes between two datasets
 */
export function detectChanges(oldData: any, newData: any): Array<{
  campo: string;
  valor_anterior: any;
  valor_nuevo: any;
}> {
  const changes: Array<{
    campo: string;
    valor_anterior: any;
    valor_nuevo: any;
  }> = [];

  Object.keys(newData).forEach((key) => {
    if (key === 'os_id' || key === 'numero_expediente') return;

    const oldValue = oldData?.[key];
    const newValue = newData[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        campo: key,
        valor_anterior: oldValue,
        valor_nuevo: newValue,
      });
    }
  });

  return changes;
}

/**
 * Fetch OS panel history
 */
export async function fetchOsPanelHistory(
  osId: string,
  limit: number = 10,
  offset: number = 0
) {
  const response = await fetch(
    `/api/os/panel/history?osId=${osId}&limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Export OS panel to PDF
 */
export async function exportOsPanelPdf(osId: string): Promise<Blob> {
  const response = await fetch(`/api/os/panel/export?osId=${osId}`);

  if (!response.ok) {
    throw new Error(`Failed to export PDF: HTTP ${response.status}`);
  }

  return response.blob();
}

/**
 * Get completion percentage for a tab
 */
export function getTabCompletionPercentage(
  data: Record<string, any>,
  fields: string[]
): number {
  if (fields.length === 0) return 0;

  const completed = fields.filter((field) => {
    const value = data[field];
    return (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      (!Array.isArray(value) || value.length > 0)
    );
  }).length;

  return Math.round((completed / fields.length) * 100);
}

/**
 * Get overall completion percentage
 */
export function getOverallCompletionPercentage(
  panelData: OsPanelFormValues
): number {
  const allFields = Object.keys(panelData).filter(
    (k) => k !== 'os_id' && k !== 'numero_expediente'
  );

  return getTabCompletionPercentage(panelData, allFields);
}
