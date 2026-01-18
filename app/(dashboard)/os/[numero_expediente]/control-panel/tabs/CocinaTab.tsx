'use client';

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
import { Card, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

export function CocinaTab({
  form,
  personalLookup,
}: CocinaTabProps) {
  const personalCocina = (personalLookup?.all || []).filter(
    (p) =>
      p.departamento === 'CPR (Centro de Producción)' ||
      p.departamento === 'CPR' ||
      p.departamento === 'Pase'
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {/* Chef Section */}
        <Card className="border-0 bg-slate-50 shadow-sm">
          <Accordion type="single" collapsible defaultValue="chef">
            <AccordionItem value="chef" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  👨‍🍳 CHEF
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <FormField
                  control={form.control}
                  name="jefe_cocina"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Chef Jefe</FormLabel>
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
                          {(personalCocina || []).map((p) => (
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
                <FormField
                  control={form.control}
                  name="produccion_cocina_cpr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Chef Pastelería</FormLabel>
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
                          {(personalCocina || []).map((p) => (
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Servicios Section */}
        <Card className="border-0 bg-slate-50 shadow-sm">
          <Accordion type="single" collapsible>
            <AccordionItem value="servicios" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  🥘 SERVICIOS
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <FormField
                  control={form.control}
                  name="cocineros_ext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Cocineros Externos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-sm"
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
                <FormField
                  control={form.control}
                  name="logisticos_ext_cocina"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Logísticos Externos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-sm"
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
                <div>
                  <FormLabel className="text-xs font-medium block mb-2">
                    Servicios Extra
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-2">
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
                                className={`w-full px-2 py-2 rounded-md border text-center text-xs font-semibold transition-all ${
                                  field.value.includes(option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No'))
                                    ? 'bg-green-200 border-green-400 text-green-900'
                                    : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                                }`}
                              >
                                {field.value.includes(option.value as ('Jamonero' | 'Sushi' | 'Pan' | 'No')) ? '✓' : '○'}{' '}
                                {option.icon}
                                <br />
                                {option.label}
                              </button>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      <div>
        {/* Items Checkbox Section */}
        <Card className="border-0 bg-green-50 shadow-sm">
          <Accordion type="single" collapsible defaultValue="items">
            <AccordionItem value="items" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-green-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  📋 CHECKBOXES
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 border-t border-green-200">
                <div className="grid grid-cols-2 gap-2">
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
                              className={`w-full px-2 py-2 rounded-md border text-center text-xs font-semibold transition-all ${
                                field.value
                                  ? 'bg-green-200 border-green-400 text-green-900'
                                  : 'bg-background border-muted text-muted-foreground hover:border-muted-foreground/50'
                              }`}
                            >
                              {field.value ? '✓' : '○'} {item.icon}
                              <br />
                              {item.label}
                            </button>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Personal Multiple Section */}
        <Card className="border-0 bg-white border border-gray-200 shadow-sm mt-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="personal" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  👥 PERSONAL COCINA
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <FormField
                  control={form.control}
                  name="cocina"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Personal</FormLabel>
                      <div className="space-y-2">
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {field.value.map((id) => {
                              const person = personalLookup.getById(id);
                              return (
                                <Badge key={id} variant="secondary" className="text-xs h-6">
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
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="+ Agregar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(personalCocina || [])
                              .filter((p) => !field.value.includes(p.id))
                              .map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={p.id}
                                  onClick={() =>
                                    field.onChange([...field.value, p.id])
                                  }
                                >
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
