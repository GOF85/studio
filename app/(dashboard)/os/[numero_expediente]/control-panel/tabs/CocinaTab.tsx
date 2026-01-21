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
import { Card, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';
import { KPICard } from '@/components/os/os-panel/KPICard';
import { Lock, Utensils, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import { FieldComment } from '@/components/os/os-panel/FieldComment';
import { cn } from '@/lib/utils';

interface CocinaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
  osId: string;
}

const SERVICIOS_EXTRA_OPTIONS = [
  { value: 'Jamonero', label: 'Jamonero', icon: '🍖' },
  { value: 'Sushi', label: 'Sushi', icon: '🍣' },
  { value: 'Pan', label: 'Pan', icon: '🥖' },
  { value: 'Ostras', label: 'Ostras', icon: '🦪' },
  { value: 'No', label: 'No', icon: '✕' },
];

const CHECKBOXES = [
  { field: 'gastro_actualizada' as const, label: 'Gastro Actualizada', icon: '📋' },
  { field: 'pedido_gastro' as const, label: 'Pedido Gastro', icon: '🍽️' },
  { field: 'pedido_cocina' as const, label: 'Pedido Cocina', icon: '👨‍🍳' },
  { field: 'personal_cocina' as const, label: 'Personal Cocina', icon: '👥' },
];

export function CocinaTab({
  form,
  personalLookup,
  osId,
}: CocinaTabProps) {
  const { watch } = form;
  const cocinerosExt = watch('cocineros_ext') || 0;
  const logisticosExtCocina = watch('logisticos_ext_cocina') || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {/* EQUIPO COCINA (ROOT LEVEL) */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight">
              👥 EQUIPO COCINA
            </h3>
          </div>

          <FormField
            control={form.control}
            name="cocina"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-400 mb-0">Responsables (Cocina)</FormLabel>
                  <FieldComment osId={osId} fieldName="cocina" />
                </div>
                <div className="space-y-2">
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {field.value.map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px] py-0 px-2 flex items-center gap-1 bg-white border border-slate-200 text-slate-700">
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
                        <SelectValue placeholder="Agregar cocinero..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(personalLookup?.all || [])
                        .filter(p => p.departamento?.includes('Cocina') || p.departamento?.includes('CPR'))
                        .filter(p => !field.value.includes(p.id))
                        .map((p) => (
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
               label="Cocinero Ext." 
               value={cocinerosExt} 
               variant="amber"
               icon={<Utensils className="h-3 w-3" />}
             />
             <div className="absolute bottom-1.5 right-1.5 z-10">
               <FieldComment osId={osId} fieldName="cocineros_ext" />
             </div>
           </div>
           <div className="relative">
             <KPICard 
               label="Logístico Ext." 
               value={logisticosExtCocina} 
               variant="slate"
               icon={<Users className="h-3 w-3" />}
             />
             <div className="absolute bottom-1.5 right-1.5 z-10">
               <FieldComment osId={osId} fieldName="logisticos_ext_cocina" />
             </div>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Items Checkbox Section */}
        <Card className="border-0 bg-green-50 shadow-sm border border-green-100">
          <Accordion type="single" collapsible defaultValue="items">
            <AccordionItem value="items" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-green-100/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  📋 ACCIONES Y PEDIDOS
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 border-t border-green-200 pt-4">
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                  {CHECKBOXES.map((item) => (
                    <FormField
                      key={item.field}
                      control={form.control}
                      name={item.field}
                      render={({ field }) => (
                        <FormItem className="space-y-0 relative">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className={`w-full p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center min-h-[70px] ${
                                field.value
                                  ? 'bg-green-100 border-green-300 text-green-900 shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-lg mb-1">{item.icon}</div>
                              <div className="text-[10px] font-bold uppercase tracking-tighter leading-tight">{item.label}</div>
                            </button>
                          </FormControl>
                          <div className="absolute top-1 right-1 pointer-events-auto">
                             <FieldComment osId={osId} fieldName={item.field} />
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

        {/* Servicios Section */}
        <Card className="border-0 bg-white shadow-sm border border-gray-200">
          <Accordion type="single" collapsible defaultValue="servicios">
            <AccordionItem value="servicios" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  🥘 SERVICIOS EXTRA
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SERVICIOS_EXTRA_OPTIONS.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name="servicios_extra"
                      render={({ field }) => (
                        <FormItem className="space-y-0 relative">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => {
                                const isSelected = (field.value || []).includes(
                                  option.value as any
                                );
                                field.onChange(
                                  isSelected
                                    ? field.value.filter((v: any) => v !== option.value)
                                    : [...(field.value || []), option.value]
                                );
                              }}
                              className={`w-full p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center min-h-[70px] ${
                                (field.value || []).includes(option.value as any)
                                  ? 'bg-orange-100 border-orange-300 text-orange-900 shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-lg mb-1">{option.icon}</div>
                              <div className="text-[10px] font-bold uppercase tracking-tighter">{option.label}</div>
                            </button>
                          </FormControl>
                          <div className="absolute top-1 right-1 pointer-events-auto">
                             <FieldComment osId={osId} fieldName={`servicios_extra_${option.value.toLowerCase()}`} />
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
