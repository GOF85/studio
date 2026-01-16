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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';

interface CocinaTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  personalLookup: PersonalLookup;
}

const SERVICIOS_EXTRA_OPTIONS = [
  { value: 'Jamonero', label: 'Jamonero', icon: '🍖' },
  { value: 'Sushi', label: 'Sushi', icon: '🍣' },
  { value: 'Pan', label: 'Pan', icon: '🥖' },
  { value: 'No', label: 'No', icon: '✕' },
];

const CHECKBOXES = [
  { field: 'gastro_actualizada' as const, label: 'Gastro Actualizada', icon: '📋' },
  { field: 'pedido_gastro' as const, label: 'Pedido Gastro', icon: '🍽️' },
  { field: 'pedido_cocina' as const, label: 'Pedido Cocina', icon: '👨‍🍳' },
  { field: 'personal_cocina' as const, label: 'Personal Cocina', icon: '👥' },
];

const TOOLTIPS = {
  gastro_actualizada: 'Marca cuando el listado de artículos de cocina ha sido revisado y confirmado',
  pedido_cocina: 'Marca si se necesita realizar pedido de ingredientes y suministros',
};

export function CocinaTab({
  form,
  personalLookup,
}: CocinaTabProps) {
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    recursos: false,
    servicios: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter personnel para CPR o Pase
  const personalCocina = personalLookup.all.filter(
    (p) =>
      p.departamento === 'CPR (Centro de Producción)' ||
      p.departamento === 'CPR' ||
      p.departamento === 'Pase'
  );

  return (
    <div className="space-y-6">
      {/* SECCIÓN: PERSONAL COCINA */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('personal')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              👨‍🍳 PERSONAL COCINA
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
            {/* Producción Cocina */}
            <FormField
              control={form.control}
              name="produccion_cocina_cpr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Producción Cocina - CPR/Pase
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
                      {personalCocina.map((p) => (
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

            {/* Jefe de Cocina */}
            <FormField
              control={form.control}
              name="jefe_cocina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Jefe de Cocina
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
                      {personalCocina.map((p) => (
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

            {/* Cocina (múltiple) */}
            <FormField
              control={form.control}
              name="cocina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Personal Cocina (Múltiple)
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
                        <SelectValue placeholder="+ Agregar cocinero..." />
                      </SelectTrigger>
                      <SelectContent>
                        {personalCocina
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
              🥘 RECURSOS EXTERNOS
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
            {/* Cocineros EXT */}
            <FormField
              control={form.control}
              name="cocineros_ext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase">
                    Cocineros Externos
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

            {/* Logísticos EXT Cocina */}
            <FormField
              control={form.control}
              name="logisticos_ext_cocina"
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

      {/* SECCIÓN: SERVICIOS Y PEDIDOS */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection('servicios')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              📋 SERVICIOS Y PEDIDOS
            </CardTitle>
            {expandedSections.servicios ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>

        {expandedSections.servicios && (
          <CardContent className="space-y-4">
            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-3">
              {CHECKBOXES.map((item) => (
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
                          className={`w-full px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
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

            {/* Servicios Extra */}
            <div>
              <FormLabel className="text-xs font-semibold uppercase block mb-3">
                Servicios Extra
              </FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SERVICIOS_EXTRA_OPTIONS.map((option) => (
                  <FormField
                    key={option.value}
                    control={form.control}
                    name="servicios_extra"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => {
                              const isSelected = field.value.includes(
                                option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No')
                              );
                              field.onChange(
                                isSelected
                                  ? field.value.filter(
                                      (v) => v !== option.value
                                    )
                                  : [...field.value, option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No')]
                              );
                            }}
                            className={`w-full px-2 py-2 rounded-lg border transition-all text-xs font-semibold ${
                              field.value.includes(option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No'))
                                ? 'bg-blue-100 border-blue-300 text-blue-900'
                                : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                            }`}
                          >
                            {field.value.includes(option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No')) ? '✓' : '○'}{' '}
                            {option.icon} {option.label}
                          </button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
