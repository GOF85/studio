'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { OsPanelFormValues } from '@/types/os-panel';

interface UseOsPanelAutoSaveOptions {
  debounceMs?: number;
  onSave?: (data: OsPanelFormValues) => Promise<void>;
  onError?: (error: Error) => void;
  onSyncStatus?: (status: 'idle' | 'syncing' | 'saved' | 'error') => void;
}

export function useOsPanelAutoSave(
  osId: string | undefined,
  formData: OsPanelFormValues | null,
  options?: UseOsPanelAutoSaveOptions
) {
  const {
    debounceMs = 2000,
    onSave,
    onError,
    onSyncStatus,
  } = options || {};

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Callback: perform save
  const performSave = useCallback(
    async (data: OsPanelFormValues) => {
      if (!osId) return;


      try {
        setSyncStatus('syncing');
        onSyncStatus?.('syncing');

        if (onSave) {
          await onSave(data);
        } else {
          // Default: POST to API
          const payload = { osId, panelData: data };
          
          const response = await fetch('/api/os/panel/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }

        // Success
        setSyncStatus('saved');
        onSyncStatus?.('saved');
        setLastSyncTime(new Date());
        lastSavedRef.current = JSON.stringify(data);

        // Show success toast (auto-hide after 3s)
        toast({
          title: '✓ Guardado',
          description: `Cambios guardados a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          variant: 'default',
          duration: 3000,
        });

        queryClient.setQueryData(['eventos', osId], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            ...data, // Merge saved data into cached data
            os_id: oldData.id, // Preserve id as os_id
          };
        });
        await queryClient.invalidateQueries({ queryKey: ['eventos', osId] });

        // Reset status after 3s
        setTimeout(() => {
          setSyncStatus('idle');
          onSyncStatus?.('idle');
        }, 3000);
      } catch (error) {
        setSyncStatus('error');
        onSyncStatus?.('error');

        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);

        toast({
          title: '⚠️ Error al guardar',
          description: `${err.message} - Reintenta guardando manualmente (Cmd+S)`,
          variant: 'destructive',
          duration: 5000,
        });

        // Reset after 5s
        setTimeout(() => {
          setSyncStatus('idle');
          onSyncStatus?.('idle');
        }, 5000);
      }
    },
    [osId, onSave, onError, onSyncStatus, toast, queryClient]
  );

  // Main effect: debounced save on data change
  useEffect(() => {
    if (!formData || !osId) return;

    // Don't save if os_id is not set properly (UUID format)
    if (!formData.os_id || formData.os_id.length < 32) return;

    const formDataStr = JSON.stringify(formData);

    // CRITICAL: Don't save if this is the first data load (lastSavedRef is empty)
    // This prevents overwriting DB data with the initial form state on page load
    if (!lastSavedRef.current) {
      lastSavedRef.current = formDataStr;
      return;
    }

    // Skip if hasn't changed
    if (formDataStr === lastSavedRef.current) return;

    // Clear pending timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSave(formData);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, osId, debounceMs, performSave]);

  // Manual save trigger
  const manualSave = useCallback(async () => {
    if (formData && osId) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      await performSave(formData);
    }
  }, [formData, osId, performSave]);

  // Persist to localStorage as backup
  useEffect(() => {
    if (formData && osId) {
      try {
        sessionStorage.setItem(`os_panel_backup_${osId}`, JSON.stringify(formData));
      } catch {
        // Storage full or unavailable
      }
    }
  }, [formData, osId]);

  return {
    syncStatus,
    lastSyncTime,
    manualSave,
    isAutoSaving: syncStatus === 'syncing',
    isSaveError: syncStatus === 'error',
  };
}
