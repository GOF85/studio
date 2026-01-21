'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOsPanel } from '@/hooks/useOsPanel';
import { useOsPanelAutoSave } from '@/hooks/useOsPanelAutoSave';
import { useOsPanelHistory } from '@/hooks/useOsPanelHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { osPanelSchema } from '@/lib/validations/os-panel';
import { Form } from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HistorialModal } from '@/components/os/os-panel/HistorialModal';
import ResponsableModal from '@/components/os/ResponsableModal';
import { ControlPanelCard } from '@/components/os/os-panel/ControlPanelCard';
import { MobileSheetEditor } from '@/components/os/os-panel/MobileSheetEditor';
import { ControlPanelTasks } from '@/components/os/os-panel/ControlPanelTasks';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCard } from '@/components/os/os-panel/SortableCard';

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
  Wrench,
  CheckSquare,
  AlertCircle,
  History,
  FileText,
  GripVertical,
  Plus,
  Share2,
  ChevronUp,
  ChevronDown,
  PersonStanding,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  Minimize2,
  Maximize2
} from 'lucide-react';

import { AutoSaveIndicator } from '@/components/os/os-panel/AutoSaveIndicator';

interface OsPanelPageProps {
  params: Promise<{
    numero_expediente: string;
  }>;
}

const DEFAULT_SECTIONS = [
  { id: 'sala', title: 'Operativa de Sala', icon: Users, component: SalaTab, color: 'amber' as const },
  { id: 'cocina', title: 'Operativa de Cocina', icon: Utensils, component: CocinaTab, color: 'orange' as const },
  { id: 'logistica', title: 'Logística y Transporte', icon: Package, component: LogisticaTab, color: 'emerald' as const },
  { id: 'personal', title: 'Personal Asignado', icon: Users, color: 'default' as const },
];

const TAB_FIELDS = {
  sala: ['metres', 'camareros_ext', 'logisticos_ext', 'pedido_ett', 'ped_almacen_bio_bod', 'pedido_walkies', 'pedido_hielo', 'pedido_transporte'],
  cocina: ['cocina', 'cocineros_ext', 'logisticos_ext_cocina', 'gastro_actualizada', 'pedido_gastro', 'pedido_cocina', 'personal_cocina', 'servicios_extra'],
  logistica: ['edo_almacen', 'estado_logistica', 'carambucos', 'jaulas', 'pallets', 'proveedor', 'h_recogida_cocina', 'transporte', 'h_recogida_pre_evento', 'h_descarga_evento', 'h_recogida_pos_evento', 'h_descarga_pos_evento', 'alquiler_lanzado'],
};

export default function OsPanelPage({ params }: OsPanelPageProps) {
  const { numero_expediente: osId } = React.use(params);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile);
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [respModalOpen, setRespModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Card Order State
  const [sectionOrder, setSectionOrder] = useState<string[]>(['sala', 'cocina', 'logistica', 'personal']);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  // Load preferences from Supabase
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadPrefs = async () => {
      const { data, error } = await supabase
        .from('os_panel_user_preferences')
        .select('dashboard_order, collapsed_sections')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data?.dashboard_order) {
        setSectionOrder(data.dashboard_order as string[]);
      }
      if (data?.collapsed_sections) {
        setCollapsedSections(data.collapsed_sections as string[]);
      }
    };

    loadPrefs();
  }, [session?.user?.id, supabase]);

  const [isAddingTask, setIsAddingTask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistPreferences = async (order: string[], collapsed: string[]) => {
    if (!session?.user?.id) return;
    
    await supabase
      .from('os_panel_user_preferences')
      .upsert({ 
        user_id: session.user.id, 
        dashboard_order: order,
        collapsed_sections: collapsed,
        updated_at: new Date().toISOString()
      });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      
      setSectionOrder(newOrder);
      persistPreferences(newOrder, collapsedSections);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = collapsedSections.includes(sectionId)
      ? collapsedSections.filter(id => id !== sectionId)
      : [...collapsedSections, sectionId];
    
    setCollapsedSections(newCollapsed);
    persistPreferences(sectionOrder, newCollapsed);
  };

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

  const sortedSections = useMemo(() => {
    return sectionOrder.map(id => DEFAULT_SECTIONS.find(s => s.id === id)!).filter(Boolean);
  }, [sectionOrder]);

  const toggleAllSections = (collapse: boolean) => {
    const allIds = [...sectionOrder, 'tareas'];
    const newCollapsed = collapse ? allIds : [];
    setCollapsedSections(newCollapsed);
    persistPreferences(sectionOrder, newCollapsed);
  };

  const allCollapsed = useMemo(() => {
    const allIds = [...sectionOrder, 'tareas'];
    return allIds.every(id => collapsedSections.includes(id));
  }, [sectionOrder, collapsedSections]);

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

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const response = await fetch('/api/os/panel/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osId: osData?.id || osId }),
      });
      const data = await response.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      alert('Error al compartir');
    } finally {
      setIsSharing(false);
    }
  };

  const getResponsablesFromEvento = (evento: any) => {
    if (!evento) return [];
    const responsablesList: any[] = [];
    
    // El objeto responsables puede venir en una columna JSONB o en columnas sueltas
    const respObj = (typeof evento.responsables === 'string' 
      ? JSON.parse(evento.responsables) 
      : (evento.responsables || {}));

    const getVal = (jsonKey: string, camelKey: string, snakeKey: string) => {
      return respObj[jsonKey] || evento[camelKey] || evento[snakeKey];
    }

    const rolesMap = [
      { id: 'metre', label: 'Metre', json: 'metre', camel: 'respMetre', snake: 'metre_responsable' },
      { id: 'pase', label: 'Pase', json: 'pase', camel: 'respPase', snake: 'resp_pase' },
      { id: 'cocina_pase', label: 'Cocina Pase', json: 'cocina_pase', camel: 'respCocinaPase', snake: 'resp_cocina_pase' },
      { id: 'cocina_cpr', label: 'Cocina CPR', json: 'cocina_cpr', camel: 'respCocinaCPR', snake: 'produccion_cocina_cpr' },
      { id: 'pm', label: 'Project Manager', json: 'project_manager', camel: 'respProjectManager', snake: 'project_manager' },
      { id: 'logistica', label: 'Logística', json: 'logistica', camel: 'respLogistica', snake: 'logistica_evento' },
      { id: 'comercial', label: 'Comercial', json: 'comercial', camel: 'comercial', snake: 'comercial' },
      { id: 'rrhh', label: 'RRHH', json: 'rrhh', camel: 'respRRHH', snake: 'resp_rrhh' },
    ];

    rolesMap.forEach(role => {
      let name = getVal(role.json, role.camel, role.snake);
      
      // Fallbacks específicos para campos que pueden estar en otros lugares
      if (!name && role.id === 'pm') name = evento.revision_pm_name;
      if (!name && role.id === 'logistica') name = evento.mozo;
      if (!name && role.id === 'cocina_cpr') name = evento.jefe_cocina;

      if (name) {
        let telefono = getVal(`${role.json}_phone`, `${role.camel}Phone`, `${role.snake}_phone`);
        let mail = getVal(`${role.json}_mail`, `${role.camel}Mail`, `${role.snake}_mail`);

        // Intento de resolución por ID o por Nombre si faltan datos
        const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-.*$/i.test(name) || (name.length > 5 && !name.includes(' '));
        if (personalLookup) {
          const person = isId ? personalLookup.getById(name) : personalLookup.all.find((p: any) => personalLookup.getFullName(p) === name);
          
          if (person) {
            if (isId) name = personalLookup.getFullName(person);
            if (!telefono) telefono = person.telefono || '';
            if (!mail) mail = person.email || '';
          }
        }

        responsablesList.push({
          nombre: name,
          rol: role.label,
          telefono,
          mail
        });
      }
    });

    return responsablesList;
  };

  return (
    <QueryErrorBoundary>
      <Form {...form}>
        <div className="flex flex-col min-h-screen bg-slate-50/30">
          <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
            {/* Quick Navigation & Actions Row */}
            <div className="flex flex-col gap-6 mb-8">
              {/* Acciones Grid */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Acciones Rápidas</div>
                <div className="flex items-center gap-3">
                  <AutoSaveIndicator status={syncStatus} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] uppercase font-bold text-slate-500 hover:text-slate-900 px-2"
                    onClick={() => toggleAllSections(allCollapsed ? false : true)}
                  >
                    {allCollapsed ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronUp className="h-3 w-3 mr-1" />}
                    {allCollapsed ? 'Expandir Todo' : 'Colapsar Todo'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button 
                  variant="outline" 
                  className="h-7 text-[11px] justify-start px-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                  onClick={() => setRespModalOpen(true)}
                >
                  <PersonStanding className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Responsables
                </Button>
                <Button 
                  variant="outline" 
                  className="h-7 text-[11px] justify-start px-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                  onClick={() => manualSave()}
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  Guardar Checklist
                </Button>
                <Button 
                  variant="outline" 
                  className="h-7 text-[11px] justify-start px-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                  onClick={() => setIsHistorialOpen(true)}
                >
                  <History className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  Historial (H)
                </Button>
                <Button 
                  variant="outline" 
                  className="h-7 text-[11px] justify-start px-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  <Share2 className={`h-3.5 w-3.5 mr-2 text-indigo-500 ${isSharing ? 'animate-pulse' : ''}`} />
                  Compartir
                </Button>
                <Button 
                  variant="outline" 
                  className="h-7 text-[11px] justify-start px-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                  onClick={handleExport}
                >
                  <FileText className="h-3.5 w-3.5 mr-2 text-red-500" />
                  Exportar PDF
                </Button>
              </div>

              {/* Responsables Grid */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Saltar a Responsabilidad</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Button 
                    variant="secondary" 
                    className="h-7 text-[11px] justify-start px-2 bg-slate-100 hover:bg-white text-slate-700 border border-slate-200/50"
                    onClick={() => document.getElementById('card-sala')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <div className="relative mr-2">
                       <Users className="h-3.5 w-3.5 text-amber-600" />
                       <div className={cn(
                         "absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-white",
                         completionDetails.sala === 100 ? "bg-emerald-500" : "bg-amber-500"
                       )} />
                    </div>
                    Maître / Sala
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="h-7 text-[11px] justify-start px-2 bg-slate-100 hover:bg-white text-slate-700 border border-slate-200/50"
                    onClick={() => document.getElementById('card-cocina')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <div className="relative mr-2">
                       <Utensils className="h-3.5 w-3.5 text-orange-600" />
                       <div className={cn(
                         "absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-white",
                         completionDetails.cocina === 100 ? "bg-emerald-500" : "bg-amber-500"
                       )} />
                    </div>
                    Cocina
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="h-7 text-[11px] justify-start px-2 bg-slate-100 hover:bg-white text-slate-700 border border-slate-200/50"
                    onClick={() => document.getElementById('card-logistica')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <div className="relative mr-2">
                       <Package className="h-3.5 w-3.5 text-emerald-600" />
                       <div className={cn(
                         "absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-white",
                         completionDetails.logistica === 100 ? "bg-emerald-500" : "bg-amber-500"
                       )} />
                    </div>
                    Logística
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="h-7 text-[11px] justify-start px-2 bg-slate-100 hover:bg-white text-slate-700 border border-slate-200/50"
                    onClick={() => document.getElementById('card-personal')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Users className="h-3.5 w-3.5 mr-2 text-blue-600" />
                    Personal
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="h-7 text-[11px] justify-start px-2 bg-slate-100 hover:bg-white text-slate-700 border border-slate-200/50"
                    onClick={() => document.getElementById('card-tareas')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-2 text-slate-600" />
                    Tareas
                  </Button>
                </div>
              </div>
            </div>

            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={sectionOrder}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
                  {sortedSections.map((section) => {
                    const TabComponent = (section as any).component;
                    const completion = (completionDetails as any)[section.id] || 0;
                    const isCollapsed = collapsedSections.includes(section.id);
                    
                    return (
                      <SortableCard
                        key={section.id}
                        id={section.id}
                        domId={`card-${section.id}`}
                        title={section.title}
                        icon={section.icon}
                        onClick={isMobile ? () => setOpenSheet(section.id) : undefined}
                        className={isMobile ? "active:scale-95 transition-transform" : ""}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => toggleSectionCollapse(section.id)}
                      >
                        {!isMobile ? (
                          <div className="min-h-[200px]">
                            {section.id === 'personal' ? (
                              <PersonalTab osId={osId} />
                            ) : (
                              <TabComponent 
                                form={form} 
                                personalLookup={personalLookup} 
                                osData={osData as any} 
                                osId={osId}
                              />
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
                      </SortableCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
              
            <ControlPanelCard
              title="Tareas y Seguimiento"
              icon={CheckSquare}
              className="lg:col-span-2 mt-6"
              isCollapsed={collapsedSections.includes('tareas')}
              onToggleCollapse={() => toggleSectionCollapse('tareas')}
              domId="card-tareas"
              headerRight={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded-full hover:bg-white/20 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setIsAddingTask(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              <ControlPanelTasks 
                osId={osId} 
                isAddingManual={isAddingTask} 
                onAddComplete={() => setIsAddingTask(false)} 
              />
            </ControlPanelCard>
          </main>

          {DEFAULT_SECTIONS.map((section) => {
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
                   <TabComponent 
                    form={form} 
                    personalLookup={personalLookup} 
                    osData={osData as any} 
                    osId={osId}
                  />
                 )}
              </MobileSheetEditor>
            );
          })}

          <HistorialModal
            isOpen={isHistorialOpen}
            onOpenChange={setIsHistorialOpen}
            osId={osId}
          />

          <ResponsableModal
            open={respModalOpen}
            onOpenChange={setRespModalOpen}
            responsables={getResponsablesFromEvento(osData)}
            numeroExpediente={osData?.numero_expediente}
          />
        </div>
      </Form>
    </QueryErrorBoundary>
  );
}
