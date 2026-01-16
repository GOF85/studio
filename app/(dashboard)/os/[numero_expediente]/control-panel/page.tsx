'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOsPanel } from '@/hooks/useOsPanel';
import { useOsPanelAutoSave } from '@/hooks/useOsPanelAutoSave';
import { useOsPanelHistory } from '@/hooks/useOsPanelHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { osPanelSchema } from '@/lib/validations/os-panel';
import { Form } from '@/components/ui/form';
import { OsPanelHeader } from '@/components/os/os-panel/OsPanelHeader';
import { OsPanelTabs } from '@/components/os/os-panel/OsPanelTabs';
import { HistorialModal } from '@/components/os/os-panel/HistorialModal';
import { ExportarPdfButton } from '@/components/os/os-panel/ExportarPdfButton';
import { EspacioTab } from './tabs/EspacioTab';
import { SalaTab } from './tabs/SalaTab';
import { CocinaTab } from './tabs/CocinaTab';
import { LogisticaTab } from './tabs/LogisticaTab';
import { PersonalTab } from './tabs/PersonalTab';
import { getOverallCompletionPercentage } from '@/services/os-panel-service';
import type { OsPanelFormValues } from '@/types/os-panel';
import { QueryErrorBoundary } from '@/components/error-boundary';

interface OsPanelPageProps {
  params: Promise<{
    numero_expediente: string;
  }>;
}

export default function OsPanelPage({ params }: OsPanelPageProps) {
  const { numero_expediente: osId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlSearchParams, setUrlSearchParams] = useState<URLSearchParams | null>(null);

  // Sincroniza los URL searchParams con el estado local
  useEffect(() => {
    if (searchParams) {
      setUrlSearchParams(new URLSearchParams(searchParams.toString()));
    }
  }, [searchParams?.toString()]);

  const activeTab = ((urlSearchParams?.get('tab')) || 'espacio') as
    | 'espacio'
    | 'sala'
    | 'cocina'
    | 'logistica'
    | 'personal';

  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);



  // Fetch OS panel data
  const {
    osData,
    formValues,
    personalLookup,
    isLoading: isPanelLoading,
    error: panelError,
  } = useOsPanel(osId);

  // Si llegamos con UUID, normaliza la URL al numero_expediente en cuanto lo conocemos
  useEffect(() => {
    const canonicalId = osData?.numero_expediente;
    if (!canonicalId || !osId || osId === canonicalId) return;

    const params = new URLSearchParams(searchParams?.toString() || '');
    // Preserva el tab si ya existe, sino usa espacio
    const currentTab = params.get('tab') || 'espacio';
    params.set('tab', currentTab);

    const newUrl = `/os/${canonicalId}/control-panel?${params.toString()}`;
    
    // Usar window.history.replaceState en lugar de router.replace()
    // Esto evita un reload completo de la página
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newUrl);
    }
  }, [osData?.numero_expediente, osId, searchParams]);

  // Form setup
  const form = useForm<OsPanelFormValues>({
    resolver: zodResolver(osPanelSchema as any),
    values: formValues || {
      os_id: '',
      numero_expediente: osId,
      produccion_sala: null,
      revision_pm: false,
      metre_responsable: null,
      metres: [],
      logistica_evento: null,
      camareros_ext: 0,
      logisticos_ext: 0,
      pedido_ett: false,
      ped_almacen_bio_bod: false,
      pedido_walkies: false,
      pedido_hielo: false,
      pedido_transporte: false,
      produccion_cocina_cpr: null,
      jefe_cocina: null,
      cocina: [],
      cocineros_ext: 0,
      logisticos_ext_cocina: 0,
      gastro_actualizada: false,
      pedido_gastro: false,
      pedido_cocina: false,
      personal_cocina: false,
      servicios_extra: [] as unknown as ('Jamonero' | 'Sushi' | 'Pan' | 'No')[],
      edo_almacen: 'EP' as const,
      mozo: null,
      estado_logistica: 'Pendiente' as const,
      carambucos: 0,
      jaulas: null,
      pallets: null,
      proveedor: [],
      h_recogida_cocina: null,
      transporte: [],
      h_recogida_pre_evento: null,
      h_descarga_evento: null,
      h_recogida_pos_evento: null,
      h_descarga_pos_evento: null,
      alquiler_lanzado: false,
    },
  });

  const formData = form.watch();

  // Auto-save
  const { syncStatus, lastSyncTime, manualSave } = useOsPanelAutoSave(
    osId,
    formData,
    {
      debounceMs: 2000,
      onSave: async (data) => {
        // Auto-save via API
        const response = await fetch('/api/os/panel/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ osId, panelData: data }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save');
        }
      },
    }
  );

  // Fetch history
  const { data: historyData, isLoading: isHistoryLoading } = useOsPanelHistory(
    osId,
    { limit: 50 }
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: manualSave,
    onHistorial: () => setIsHistorialOpen(true),
    onTab: (index) => {
      const tabs = ['espacio', 'sala', 'cocina', 'logistica', 'personal'];
      if (tabs[index]) {
        const params = new URLSearchParams(searchParams || '');
        params.set('tab', tabs[index]);
        window.history.pushState({}, '', `?${params.toString()}`);
        window.location.reload(); // TODO: use router.push instead
      }
    },
  });

  // Calculate completion
  const completionPercentage = useMemo(() => {
    return getOverallCompletionPercentage(formData);
  }, [formData]);

  // Loading state
  if (isPanelLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando panel...</div>
      </div>
    );
  }

  if (panelError || !osData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">
          Error al cargar el panel. Por favor, recarga la página.
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    try {
      const exportUrl = `/api/os/panel/export?osId=${osId}`;
      const response = await fetch(exportUrl);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${osId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error al exportar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <QueryErrorBoundary>
      <Form {...form}>
        <form className="flex flex-col min-h-screen">
          {/* Header */}
          <OsPanelHeader
            numeroExpediente={osData.numero_expediente}
            espacio={osData.space}
            cliente={osData.client}
            clienteFinal={osData.final_client}
            fechaInicio={
              osData.start_date
                ? new Date(osData.start_date).toLocaleDateString('es-ES')
                : undefined
            }
            fechaFin={
              osData.end_date
                ? new Date(osData.end_date).toLocaleDateString('es-ES')
                : undefined
            }
            isVip={osData.is_vip}
            completionPercentage={completionPercentage}
            syncStatus={syncStatus}
            onHistorialClick={() => {
              setIsHistorialOpen(true);
            }}
            onExportClick={handleExport}
            onMoreClick={() => {
              // TODO: Implementar menú de opciones
              console.log('Más opciones');
            }}
            isCollapsed={isHeaderCollapsed}
            onToggleCollapse={setIsHeaderCollapsed}
          />

          {/* Tabs */}
          <OsPanelTabs activeTab={activeTab} />

          {/* Content */}
          <div className="flex-1 container mx-auto px-4 py-6">
            {activeTab === 'espacio' && (
              <EspacioTab
                form={form}
                osData={osData}
                personalLookup={personalLookup}
              />
            )}

            {activeTab === 'sala' && (
              <SalaTab
                form={form}
                personalLookup={personalLookup}
              />
            )}

            {activeTab === 'cocina' && (
              <CocinaTab
                form={form}
                personalLookup={personalLookup}
              />
            )}

            {activeTab === 'logistica' && (
              <LogisticaTab form={form} />
            )}

            {activeTab === 'personal' && (
              <PersonalTab osId={osId} />
            )}
          </div>

          {/* Modals */}
          <HistorialModal
            isOpen={isHistorialOpen}
            onOpenChange={setIsHistorialOpen}
            cambios={historyData?.cambios || []}
            isLoading={isHistoryLoading}
          />
        </form>
      </Form>
    </QueryErrorBoundary>
  );
}
