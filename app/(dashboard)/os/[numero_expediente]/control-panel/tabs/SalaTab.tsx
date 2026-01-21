'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';
import { KPICard } from '@/components/os/os-panel/KPICard';
import { Lock, Users, Briefcase, CheckCircle2, ShieldAlert } from 'lucide-react';
import { FieldComment } from '@/components/os/os-panel/FieldComment';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SalaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
  osId: string;
}

const CHECKBOX_ITEMS = [
  { field: 'pedido_ett' as const, label: 'ETT', icon: '👔' },
  { field: 'ped_almacen_bio_bod' as const, label: 'Almacén-Bio', icon: '📦' },
  { field: 'pedido_walkies' as const, label: 'Walkies', icon: '📻' },
  { field: 'pedido_hielo' as const, label: 'Hielo', icon: '🧊' },
  { field: 'pedido_transporte' as const, label: 'Transporte', icon: '🚐' },
];

export function SalaTab({
  form,
  personalLookup,
  osId,
}: SalaTabProps) {
  const { watch } = form;
  const camarerosExt = watch('camareros_ext') || 0;
  const logisticosExt = watch('logisticos_ext') || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {/* EQUIPO SALA (ROOT LEVEL) */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight">
              👥 EQUIPO SALA
            </h3>
          </div>

          <FormField
            control={form.control}
            name="revision_pm"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm border w-fit",
                  field.value 
                    ? "bg-emerald-500 border-emerald-600 text-white" 
                    : "bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200"
                )}
              >
                {field.value ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Revisado por PM
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Pendiente revisión PM
                  </>
                )}
              </button>
            )}
          />

          <FormField
            control={form.control}
            name="metres"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-400 mb-0">Responsables (Metres)</FormLabel>
                  <FieldComment osId={osId} fieldName="metres" />
                </div>
                <div className="space-y-2">
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {field.value.map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px] py-0 px-2 flex items-center gap-1 bg-white border border-slate-200">
                          {personalLookup.getCompactName(personalLookup.getById(id)!)}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter(i => i !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Select
                    onValueChange={(val) => {
                      if (!field.value.includes(val)) {
                        field.onChange([...field.value, val]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs bg-white/50">
                        <SelectValue placeholder="Agregar responsable sala..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(personalLookup?.sala || []).filter(p => !field.value.includes(p.id)).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {personalLookup.getCompactName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* EXTERNOS KPIs */}
        <div className="grid grid-cols-2 gap-4">
           <div className="relative">
             <KPICard 
               label="Camarero Ext." 
               value={camarerosExt} 
               variant="blue"
               icon={<Users className="h-3 w-3" />}
               subtitle="Externos"
             />
             <div className="absolute bottom-1.5 right-1.5 z-10">
               <FieldComment osId={osId} fieldName="camareros_ext" />
             </div>
           </div>
           <div className="relative">
             <KPICard 
               label="Logístico Ext." 
               value={logisticosExt} 
               variant="slate"
               icon={<Briefcase className="h-3 w-3" />}
               subtitle="Externos"
             />
             <div className="absolute bottom-1.5 right-1.5 z-10">
               <FieldComment osId={osId} fieldName="logisticos_ext" />
             </div>
           </div>
        </div>
      </div>

      <div>
        <Card className="border-0 bg-green-50 shadow-sm border border-green-100 h-full">
          <Accordion type="single" collapsible defaultValue="pedidos">
            <AccordionItem value="pedidos" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-green-100/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  📋 ACCIONES Y PEDIDOS
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 border-t border-green-200 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {CHECKBOX_ITEMS.map(({ field, label, icon }) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={field}
                      render={({ field: f }) => (
                        <FormItem className="space-y-0 relative">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => f.onChange(!f.value)}
                              className={`w-full p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center min-h-[70px] ${
                                f.value
                                  ? 'bg-green-100 border-green-300 text-green-900 shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-lg mb-1">{icon}</div>
                              <div className="text-[10px] font-bold uppercase tracking-tighter leading-tight">{label}</div>
                            </button>
                          </FormControl>
                          <div className="absolute top-1 right-1 pointer-events-auto">
                             <FieldComment osId={osId} fieldName={field} />
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
