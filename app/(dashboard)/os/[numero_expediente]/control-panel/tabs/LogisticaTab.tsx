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

interface LogisticaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
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

export function LogisticaTab({ form, personalLookup }: LogisticaTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Accordion type="single" collapsible className="col-span-1">
        {/* PROVEEDOR & TRANSPORTE */}
        <AccordionItem value="proveedor" className="border-0">
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-gray-200">
            <AccordionTrigger className="px-4 py-3 hover:bg-gray-100 text-sm font-semibold flex items-center gap-2">
              📦 Proveedor & Transporte
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 space-y-3 bg-white/50">
              {/* Proveedor */}
              <FormField
                control={form.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Proveedor
                    </FormLabel>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {field.value.map((prov) => (
                        <Badge
                          key={prov}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() =>
                            field.onChange(
                              field.value.filter((v) => v !== prov)
                            )
                          }
                        >
                          {prov}
                          <span className="ml-1">×</span>
                        </Badge>
                      ))}
                    </div>
                    <Select>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Agregar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVEEDORES_OPTIONS.filter(
                          (p) => !field.value.includes(p as any)
                        ).map((prov) => (
                          <SelectItem
                            key={prov}
                            value={prov}
                            onClick={() =>
                              field.onChange([...field.value, prov as any])
                            }
                          >
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
                    <FormLabel className="text-xs font-semibold uppercase">
                      Transporte
                    </FormLabel>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {field.value.map((trans) => (
                        <Badge
                          key={trans}
                          variant="outline"
                          className="text-xs cursor-pointer"
                          onClick={() =>
                            field.onChange(
                              field.value.filter((v) => v !== trans)
                            )
                          }
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {trans}
                          <span className="ml-1">×</span>
                        </Badge>
                      ))}
                    </div>
                    <Select>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Agregar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSPORTE_OPTIONS.filter(
                          (t) => !field.value.includes(t as any)
                        ).map((trans) => (
                          <SelectItem
                            key={trans}
                            value={trans}
                            onClick={() =>
                              field.onChange([...field.value, trans as any])
                            }
                          >
                            {trans}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>

      {/* ALMACÉN */}
      <Accordion type="single" collapsible className="col-span-1">
        <AccordionItem value="almacen" className="border-0">
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 text-sm font-semibold flex items-center gap-2">
              🏭 Almacén
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 space-y-3 bg-white/50">
              {/* Carambucos */}
              <FormField
                control={form.control}
                name="carambucos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Carambucos
                    </FormLabel>
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

              {/* Jaulas */}
              <FormField
                control={form.control}
                name="jaulas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Jaulas
                    </FormLabel>
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
                    <FormLabel className="text-xs font-semibold uppercase">
                      Pallets
                    </FormLabel>
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

              {/* Mozo */}
              <FormField
                control={form.control}
                name="mozo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Mozo asignado
                    </FormLabel>
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
                        {(personalLookup?.almacen || []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {personalLookup.getCompactName(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>

      {/* ESTADO GENERAL */}
      <Accordion type="single" collapsible className="col-span-1">
        <AccordionItem value="estado" className="border-0">
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-gray-200">
            <AccordionTrigger className="px-4 py-3 hover:bg-gray-100 text-sm font-semibold flex items-center gap-2">
              📊 Estado General
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 space-y-3 bg-white/50">
              {/* Estado Almacén */}
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
                        <SelectItem value="Sin producir">
                          Sin producir
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado Logística */}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Alquiler Lanzado */}
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
                            ? 'bg-green-100 border-green-300 text-green-900'
                            : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                        }`}
                      >
                        {field.value ? '✓' : '○'} Alquiler Lanzado
                      </button>
                    </FormControl>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>

      {/* HORARIOS (spans both columns on mobile, single on desktop) */}
      <Accordion type="single" collapsible className="col-span-1 lg:col-span-2">
        <AccordionItem value="horarios" className="border-0">
          <div className="bg-green-50 rounded-lg overflow-hidden border border-green-200">
            <AccordionTrigger className="px-4 py-3 hover:bg-green-100 text-sm font-semibold flex items-center gap-2">
              🕐 Horarios & Timeline
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* H. Recogida Cocina */}
                <FormField
                  control={form.control}
                  name="h_recogida_cocina"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase">
                        Recogida a Cocina
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* H. Recogida Pre-Evento */}
                <FormField
                  control={form.control}
                  name="h_recogida_pre_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase">
                        Recogida Pre-Evento
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* H. Descarga Evento */}
                <FormField
                  control={form.control}
                  name="h_descarga_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase">
                        Descarga en Evento
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* H. Recogida Post-Evento */}
                <FormField
                  control={form.control}
                  name="h_recogida_pos_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase">
                        Recogida Post-Evento
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* H. Descarga Post-Evento */}
                <FormField
                  control={form.control}
                  name="h_descarga_pos_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase">
                        Descarga Post-Evento
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="h-8 text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
