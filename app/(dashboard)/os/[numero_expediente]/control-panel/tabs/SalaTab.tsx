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
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  { field: 'ped_almacen_bio_bod' as const, label: 'Almacén-Bio', icon: '📦' },
  { field: 'pedido_walkies' as const, label: 'Walkies', icon: '📻' },
  { field: 'pedido_hielo' as const, label: 'Hielo', icon: '🧊' },
  { field: 'pedido_transporte' as const, label: 'Transporte', icon: '🚐' },
];

export function SalaTab({
  form,
  personalLookup,
}: SalaTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card className="border-0 bg-white shadow-sm border border-gray-200">
          <Accordion type="single" collapsible defaultValue="personal">
            <AccordionItem value="personal" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  👥 PERSONAL
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <FormField
                  control={form.control}
                  name="produccion_sala"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Responsable producción</FormLabel>
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
                          {[...(personalLookup?.sala || []), ...(personalLookup?.operaciones || [])].map((p) => (
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
                  name="metre_responsable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Metre Responsable</FormLabel>
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
                          {(personalLookup?.sala || []).map((p) => (
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
                  name="metres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Metres</FormLabel>
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
                            {(personalLookup?.sala || [])
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
                <FormField
                  control={form.control}
                  name="revision_pm"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 pt-1">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-medium cursor-pointer mb-0">
                        Revisión PM
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logistica_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Logística</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
        <Card className="border-0 bg-slate-50 shadow-sm">
          <Accordion type="single" collapsible>
            <AccordionItem value="recursos" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  👔 EXTERNOS
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <FormField
                  control={form.control}
                  name="camareros_ext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Camareros</FormLabel>
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
                  name="logisticos_ext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Logísticos</FormLabel>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
      <div>
        <Card className="border-0 bg-green-50 shadow-sm">
          <Accordion type="single" collapsible defaultValue="pedidos">
            <AccordionItem value="pedidos" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  📋 SERVICIOS
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 border-t border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                              className={`w-full px-2 py-2 rounded-md border text-center text-xs font-semibold transition-all ${
                                field.value
                                  ? 'bg-emerald-200 border-emerald-400 text-emerald-900'
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
      </div>
    </div>
  );
}
