'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, Package, Truck } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { OsPanelFormValues } from '@/types/os-panel';

interface LogisticaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
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

export function LogisticaTab({ form }: LogisticaTabProps) {
  const [expandedSections, setExpandedSections] = useState({
    estado: true,
    recursos: false,
    transporte: false,
    horarios: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN: ESTADO GENERAL */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('estado')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              📊 ESTADO GENERAL
            </CardTitle>
            {expandedSections.estado ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.estado && (
          <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estado Almacén */}
            <FormField
              control={form.control}
              name="edo_almacen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Estado Almacén
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 inline-block">ℹ️</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          EP = En Producción / Ok = Listo / Sin producir = Pendiente
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
                    Estado
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
                <FormItem className="flex items-end space-y-0 pb-1">
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`w-full px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
                        field.value
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      {field.value ? '✓' : '○'} Alquiler Lanzado
                    </button>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        )}
      </Card>

      {/* SECCIÓN: RECURSOS FÍSICOS */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('recursos')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              📦 RECURSOS FÍSICOS
            </CardTitle>
            {expandedSections.recursos ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.recursos && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <SelectTrigger>
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
                        <SelectTrigger>
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

            {/* Proveedores */}
            <FormField
              control={form.control}
              name="proveedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Proveedores (Múltiple)
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
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
                    <SelectTrigger>
                      <SelectValue placeholder="+ Agregar proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVEEDORES_OPTIONS.filter(
                        (p) => !field.value.includes(p as any)
                      ).map((prov) => (
                        <SelectItem
                          key={prov}
                          value={prov}
                          onClick={() =>
                            field.onChange([...field.value, prov as ('Mice' | 'Cristian' | 'Sánchez' | 'Victor' | 'MRW' | 'Raptor' | 'Armando')])
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
          </CardContent>
        )}
      </Card>

      {/* SECCIÓN: TRANSPORTE */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('transporte')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🚐 TRANSPORTE
            </CardTitle>
            {expandedSections.transporte ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.transporte && (
          <CardContent>
            <FormField
              control={form.control}
              name="transporte"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap gap-2 mb-3">
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
                    <SelectTrigger>
                      <SelectValue placeholder="+ Agregar transporte..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSPORTE_OPTIONS.filter(
                        (t) => !field.value.includes(t as any)
                      ).map((trans) => (
                        <SelectItem
                          key={trans}
                          value={trans}
                          onClick={() =>
                            field.onChange([...field.value, trans as ('Furgoneta' | 'Furgoneta x2' | 'Furgoneta x3' | 'Carrozado' | 'Carrozado x2' | 'Carrozado x3' | 'Trailer' | 'Trailer x2' | 'Trailer x3')])
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
          </CardContent>
        )}
      </Card>

      {/* SECCIÓN: TIMELINE DE HORARIOS */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('horarios')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🕐 HORARIOS & LOGÍSTICA
            </CardTitle>
            {expandedSections.horarios ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.horarios && (
          <CardContent>
            {/* Timeline visual */}
            <div className="space-y-4">
              {/* H. Recogida Cocina */}
              <div className="flex items-center gap-3">
                <FormField
                  control={form.control}
                  name="h_recogida_cocina"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs font-semibold uppercase">
                        Recogida a Cocina
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                          className="w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5 rotate-90" />
              </div>

              {/* H. Recogida Pre-Evento */}
              <FormField
                control={form.control}
                name="h_recogida_pre_evento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase">
                      Recogida Pre-Evento (Material)
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ''} className="w-full" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5 rotate-90" />
              </div>

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
                      <Input type="time" {...field} value={field.value || ''} className="w-full" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5 rotate-90" />
              </div>

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
                      <Input type="time" {...field} value={field.value || ''} className="w-full" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5 rotate-90" />
              </div>

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
                      <Input type="time" {...field} value={field.value || ''} className="w-full" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
