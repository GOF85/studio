'use client';

import { Package, Truck } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';
import { FieldComment } from '@/components/os/os-panel/FieldComment';

interface LogisticaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
  osId: string;
}

const PROVEEDORES_OPTIONS = [
  'Mice',
  'Cristian',
  'Sánchez',
  'Victor',
  'MRW',
  'Raptor',
  'Armando',
];

const TRANSPORTE_OPTIONS = [
  'Furgoneta',
  'Furgoneta x2',
  'Furgoneta x3',
  'Carrozado',
  'Carrozado x2',
  'Carrozado x3',
  'Trailer',
  'Trailer x2',
  'Trailer x3',
];

export function LogisticaTab({ form, personalLookup, osId }: LogisticaTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* PROVEEDOR & TRANSPORTE */}
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="px-4 py-3 bg-gray-100/50 border-b border-gray-200">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight">
                📦 PROVEEDORES & TRANSPORTE
              </h3>
            </div>
            <div className="p-4 space-y-4 bg-white/50">
              {/* Proveedor */}
              <FormField
                control={form.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                        Proveedores
                      </FormLabel>
                      <FieldComment osId={osId} fieldName="proveedor" />
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(field.value || []).map((prov: string) => (
                        <Badge
                          key={prov}
                          variant="secondary"
                          className="text-[10px] py-0 px-2 flex items-center gap-1 bg-slate-100 text-slate-700"
                        >
                          {prov}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter((v: any) => v !== prov))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      onValueChange={(val) => {
                        if (!(field.value || []).includes(val as any)) {
                          field.onChange([...(field.value || []), val]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="+ Agregar proveedor..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVEEDORES_OPTIONS.filter(
                          (p: string) => !(field.value || []).includes(p as any)
                        ).map((prov) => (
                          <SelectItem key={prov} value={prov}>
                            {prov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Transporte */}
              <FormField
                control={form.control}
                name="transporte"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                        Flota Necesaria
                      </FormLabel>
                      <FieldComment osId={osId} fieldName="transporte" />
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(field.value || []).map((trans: string) => (
                        <Badge
                          key={trans}
                          variant="outline"
                          className="text-[10px] py-0 px-2 flex items-center gap-1 border-slate-200 text-slate-600"
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {trans}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter((v: any) => v !== trans))}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Select
                      onValueChange={(val) => {
                        if (!(field.value || []).includes(val as any)) {
                          field.onChange([...(field.value || []), val]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="+ Agregar vehículo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSPORTE_OPTIONS.filter(
                          (t: string) => !(field.value || []).includes(t as any)
                        ).map((trans) => (
                          <SelectItem key={trans} value={trans}>
                            {trans}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ALMACÉN */}
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight">
                🏭 ALMACÉN OK
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Mozo */}
                <FormField
                  control={form.control}
                  name="mozo"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                          Mozo asignado
                        </FormLabel>
                        <FieldComment osId={osId} fieldName="mozo" />
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(personalLookup?.almacen || []).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {personalLookup.getCompactName(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Carambucos */}
                <FormField
                  control={form.control}
                  name="carambucos"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                          Carambucos
                        </FormLabel>
                        <FieldComment osId={osId} fieldName="carambucos" />
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  {/* Jaulas */}
                  <FormField
                    control={form.control}
                    name="jaulas"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-1">
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                            Jaulas
                          </FormLabel>
                          <FieldComment osId={osId} fieldName="jaulas" />
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Si">Si</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Pallets */}
                  <FormField
                    control={form.control}
                    name="pallets"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-1">
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400">
                            Pallets
                          </FormLabel>
                          <FieldComment osId={osId} fieldName="pallets" />
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Si">Si</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ESTADO Section */}
        <Accordion type="single" collapsible defaultValue="estado">
          <AccordionItem value="estado" className="border-0 bg-slate-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100/50 text-sm font-semibold flex items-center gap-2">
              📊 Estado General
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 space-y-3 bg-white/50 border-t border-gray-200">
              <FormField
                control={form.control}
                name="edo_almacen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Estado Almacén
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EP">EP (En Producción)</SelectItem>
                        <SelectItem value="Ok">✓ Ok</SelectItem>
                        <SelectItem value="Sin producir">Sin producir</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado_logistica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Estado Logística
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                        <SelectItem value="Ok">✓ Ok</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ALQUILER Section */}
        <Accordion type="single" collapsible defaultValue="alquiler">
          <AccordionItem value="alquiler" className="border-0 bg-blue-50 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-blue-100/50 text-sm font-semibold flex items-center gap-2 text-blue-800">
              <Package className="h-4 w-4" /> 🛒 GESTIÓN ALQUILER
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-white/50 space-y-4 border-t border-blue-100">
              <FormField
                control={form.control}
                name="alquiler_lanzado"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`w-full px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
                          field.value
                            ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {field.value ? '✅ Alquiler Lanzado' : '○ Alquiler Pendiente'}
                      </button>
                    </FormControl>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* HORARIOS */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="horarios" className="border-0 bg-green-50 rounded-lg overflow-hidden border border-green-200 shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-green-100/50 text-sm font-semibold flex items-center gap-2">
            🕐 Horarios & Timeline
          </AccordionTrigger>
          <AccordionContent className="px-4 py-3 bg-white/50 border-t border-green-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="h_recogida_cocina"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">Recogida a Cocina</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} className="h-8 text-xs" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="h_recogida_pre_evento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">Recogida Pre-Evento</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} className="h-8 text-xs" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="h_descarga_evento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">Descarga en Evento</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} className="h-8 text-xs" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="h_recogida_pos_evento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">Recogida Post-Evento</FormLabel>
                    <FormControl><Input type="time" {...field} value={field.value || ''} className="h-8 text-xs" /></FormControl>
                  </FormItem>
                )}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
