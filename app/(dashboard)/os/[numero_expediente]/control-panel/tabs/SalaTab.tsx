'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';

interface SalaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
}

const CHECKBOX_ITEMS = [
  { field: 'pedido_ett' as const, label: 'ETT', icon: '👔' },
  { field: 'ped_almacen_bio_bod' as const, label: 'Almacén-Bio-Bod', icon: '📦' },
  { field: 'pedido_walkies' as const, label: 'Walkies', icon: '📻' },
  { field: 'pedido_hielo' as const, label: 'Hielo', icon: '🧊' },
  { field: 'pedido_transporte' as const, label: 'Transporte', icon: '🚐' },
];

const TOOLTIPS = {
  revision_pm: 'Marca si el Project Manager debe revisar la disposición de sala',
  pedido_ett: 'External Trabajo Temporal - requiere camareros o logísticos externos',
};

export function SalaTab({
  form,
  personalLookup,
}: SalaTabProps) {
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    recursos: false,
    pedidos: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN: PERSONAL */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('personal')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              👥 PERSONAL SALA
            </CardTitle>
            {expandedSections.personal ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.personal && (
          <CardContent className="space-y-4">
            {/* Producción Sala */}
            <FormField
              control={form.control}
              name="produccion_sala"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Producción Sala
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personalLookup.sala.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {personalLookup.getCompactName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Revisión PM */}
            <FormField
              control={form.control}
              name="revision_pm"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-xs font-semibold uppercase cursor-pointer">
                      Revisión PM
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {TOOLTIPS.revision_pm}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </FormItem>
              )}
            />

            {/* Metre Responsable */}
            <FormField
              control={form.control}
              name="metre_responsable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Metre Responsable
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personalLookup.sala.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {personalLookup.getCompactName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metres (múltiple - simplificado sin MultiSelect) */}
            <FormField
              control={form.control}
              name="metres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Metres (Múltiple)
                  </FormLabel>
                  <div className="space-y-2">
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {field.value.map((id) => {
                          const person = personalLookup.getById(id);
                          return (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {person ? personalLookup.getCompactName(person) : '—'}
                              <button
                                className="ml-1 hover:text-destructive"
                                onClick={() =>
                                  field.onChange(
                                    field.value.filter((v) => v !== id)
                                  )
                                }
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="+ Agregar metre..." />
                      </SelectTrigger>
                      <SelectContent>
                        {personalLookup.sala
                          .filter((p) => !field.value.includes(p.id))
                          .map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              onClick={() =>
                                field.onChange([...field.value, p.id])
                              }
                            >
                              {personalLookup.getFullName(p)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logística Evento */}
            <FormField
              control={form.control}
              name="logistica_evento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Logística Evento
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personalLookup.almacen.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {personalLookup.getCompactName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        )}
      </Card>

      {/* SECCIÓN: RECURSOS EXTERNOS */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('recursos')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              👔 RECURSOS EXTERNOS
            </CardTitle>
            {expandedSections.recursos ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.recursos && (
          <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2">
            {/* Camareros EXT */}
            <FormField
              control={form.control}
              name="camareros_ext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Camareros Externos
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logísticos EXT */}
            <FormField
              control={form.control}
              name="logisticos_ext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Logísticos Externos
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        )}
      </Card>

      {/* SECCIÓN: PEDIDOS & SERVICIOS */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('pedidos')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              📋 PEDIDOS & SERVICIOS
            </CardTitle>
            {expandedSections.pedidos ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.pedidos && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {CHECKBOX_ITEMS.map((item) => (
                <FormField
                  key={item.field}
                  control={form.control}
                  name={item.field}
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`w-full px-3 py-2 rounded-lg border transition-all text-center text-xs font-semibold ${
                            field.value
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                              : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                          }`}
                        >
                          {field.value ? '✓' : '○'} {item.icon} {item.label}
                        </button>
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
