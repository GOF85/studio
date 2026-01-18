'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOsPanel } from '@/hooks/useOsPanel';
import { useOsPanelAutoSave } from '@/hooks/useOsPanelAutoSave';
import { useOsPanelHistory } from '@/hooks/useOsPanelHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { osPanelSchema } from '@/lib/validations/os-panel';
import { Form } from '@/components/ui/form';
import { OsPanelHeader } from '@/components/os/os-panel/OsPanelHeader';
import { HistorialModal } from '@/components/os/os-panel/HistorialModal';
import { ControlPanelCard } from '@/components/os/os-panel/ControlPanelCard';
import { MobileSheetEditor } from '@/components/os/os-panel/MobileSheetEditor';
import { ControlPanelTasks } from '@/components/os/os-panel/ControlPanelTasks';
import { SalaTab, CocinaTab, LogisticaTab, PersonalTab } from './tabs';
import { 
  getOverallCompletionPercentage, 
  getTabCompletionPercentage 
} from '@/services/os-panel-service';
import type { OsPanelFormValues } from '@/types/os-panel';
import { QueryErrorBoundary } from '@/components/error-boundary';
import { 
  LayoutDashboard, 
  Users, 
  Utensils, 
  Package, 
  CheckSquare,
  AlertCircle
} from 'lucide-react';

interface OsPanelPageProps {
  params: Promise<{
    numero_expediente: string;
  }>;
}

const TAB_FIELDS = {
  sala: ['metres', 'camareros_ext', 'logisticos_ext', 'pedido_ett', 'ped_almacen_bio_bod', 'pedido_walkies', 'pedido_hielo', 'pedido_transporte'],
  cocina: ['cocina', 'cocineros_ext', 'logisticos_ext_cocina', 'gastro_actualizada', 'pedido_gastro', 'pedido_cocina', 'personal_cocina', 'servicios_extra'],
  logistica: ['edo_almacen', 'estado_logistica', 'carambucos', 'jaulas', 'pallets', 'proveedor', 'h_recogida_cocina', 'transporte', 'h_recogida_pre_evento', 'h_descarga_evento', 'h_recogida_pos_evento', 'h_descarga_pos_evento', 'alquiler_lanzado'],
};

export default function OsPanelPage({ params }: OsPanelPageProps) {
  const { numero_expediente: osId } = React.use(params);
  const router = useRouter();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();

  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile);
  const [openSheet, setOpenSheet] = useState<string | null>(null);

  const {
    osData,
    formValues,
    personalLookup,
    isLoading: isPanelLoading,
    error: panelError,
  } = useOsPanel(osId);
  
  const memoizedIsVip = useMemo(() => osData?.is_vip || false, [osData?.is_vip]);

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
      servicios_extra: [] as any,
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

  const { syncStatus, manualSave } = useOsPanelAutoSave(
    osId,
    formData,
    {
      debounceMs: 2000,
      onSave: async (data) => {
        const response = await fetch('/api/os/panel/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ osId, panelData: data }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[OS Panel Save] Error from server:', errorData);
          throw new Error(errorData.error || 'Failed to save');
        }
      },
    }
  );

  useKeyboardShortcuts({
    onSave: manualSave,
    onHistorial: () => setIsHistorialOpen(true),
  });

  const completionDetails = useMemo(() => ({
    overall: getOverallCompletionPercentage(formData),
    sala: getTabCompletionPercentage(formData, TAB_FIELDS.sala),
    cocina: getTabCompletionPercentage(formData, TAB_FIELDS.cocina),
    logistica: getTabCompletionPercentage(formData, TAB_FIELDS.logistica),
  }), [formData]);

  if (isPanelLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium">Cargando Panel de Control...</p>
        </div>
      </div>
    );
  }

  if (panelError || !osData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
        <div className="text-destructive font-semibold">Error al cargar el panel</div>
        <button onClick={() => window.location.reload()} className="text-xs text-blue-600 underline">
          Reintentar ahora
        </button>
      </div>
    );
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/os/panel/export?osId=${osId}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${osId}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error en exportación');
    }
  };

  const sections = [
    { id: 'sala', title: 'Operativa de Sala', icon: Users, component: SalaTab, color: 'amber' as const },
    { id: 'cocina', title: 'Operativa de Cocina', icon: Utensils, component: CocinaTab, color: 'orange' as const },
    { id: 'logistica', title: 'Logística y Transporte', icon: Package, component: LogisticaTab, color: 'emerald' as const },
    { id: 'personal', title: 'Personal Asignado', icon: Users, color: 'default' as const },
  ];

  return (
    <QueryErrorBoundary>
      <Form {...form}>
        <div className="flex flex-col min-h-screen bg-slate-50/30">
          <OsPanelHeader
            numeroExpediente={osData.numero_expediente}
            osId={osData.id}
            espacio={osData.space}
            cliente={osData.client}
            clienteFinal={osData.final_client}
            fechaInicio={osData.start_date ? new Date(osData.start_date).toLocaleDateString('es-ES') : undefined}
            fechaFin={osData.end_date ? new Date(osData.end_date).toLocaleDateString('es-ES') : undefined}
            isVip={memoizedIsVip}
            completionPercentage={completionDetails.overall}
            syncStatus={syncStatus}
            onHistorialClick={() => setIsHistorialOpen(true)}
            onExportClick={handleExport}
            isCollapsed={isHeaderCollapsed}
            onToggleCollapse={setIsHeaderCollapsed}
          />

          <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {sections.map((section) => {
                const TabComponent = (section as any).component;
                const completion = (completionDetails as any)[section.id] || 0;
                
                return (
                  <ControlPanelCard
                    key={section.id}
                    title={section.title}
                    icon={section.icon}
                    badge={`${completion}%`}
                    badgeVariant={section.color === 'default' ? 'default' : section.color}
                    onClick={isMobile ? () => setOpenSheet(section.id) : undefined}
                    className={isMobile ? "active:scale-95 transition-transform" : ""}
                  >
                    {!isMobile ? (
                      <div className="min-h-[200px]">
                         {section.id === 'personal' ? (
                           <PersonalTab osId={osId} />
                         ) : (
                           <TabComponent form={form} personalLookup={personalLookup} osData={osData as any} />
                         )}
                      </div>
                    ) : (
                      <div className="py-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Vista Previa</p>
                        <div className="text-xs text-slate-600 line-clamp-2 italic">
                          Toca para editar detalles de {section.title.toLowerCase()}...
                        </div>
                      </div>
                    )}
                  </ControlPanelCard>
                );
              })}
              
              <ControlPanelCard
                title="Tareas y Seguimiento"
                icon={CheckSquare}
                badge="En Vivo"
                badgeVariant="emerald"
                className="lg:col-span-2"
              >
                <ControlPanelTasks osId={osId} />
              </ControlPanelCard>
            </div>
          </main>

          {sections.map((section) => {
            const TabComponent = (section as any).component;
            return (
              <MobileSheetEditor
                key={`sheet-${section.id}`}
                isOpen={openSheet === section.id}
                onClose={() => setOpenSheet(null)}
                title={section.title}
              >
                {section.id === 'personal' ? (
                   <PersonalTab osId={osId} />
                 ) : (
                   <TabComponent form={form} personalLookup={personalLookup} osData={osData as any} />
                 )}
              </MobileSheetEditor>
            );
          })}

          <HistorialModal
            isOpen={isHistorialOpen}
            onOpenChange={setIsHistorialOpen}
            osId={osId}
          />
        </div>
      </Form>
    </QueryErrorBoundary>
  );
}
