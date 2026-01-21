'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings2, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ConfigItem {
  id: string;
  campo_trigger: string;
  valor_trigger: string;
  tarea_titulo: string;
  tarea_rol: string;
}

const ROLES = ['Maître', 'Cocina', 'Logística', 'PM', 'Sala'];

export default function ChecksConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ConfigItem>>({
    campo_trigger: '',
    valor_trigger: 'true',
    tarea_titulo: '',
    tarea_rol: 'PM',
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['tasks-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asignaciones_tareas_config')
        .select('*')
        .order('campo_trigger', { ascending: true });
      if (error) throw error;
      return data as ConfigItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (item: Partial<ConfigItem>) => {
      const { data, error } = await supabase
        .from('asignaciones_tareas_config')
        .insert([item]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-config'] });
      setIsAdding(false);
      setNewItem({ campo_trigger: '', valor_trigger: 'true', tarea_titulo: '', tarea_rol: 'PM' });
      toast({
        title: 'Regla añadida',
        description: 'La regla de automatización se guardó correctamente.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asignaciones_tareas_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-config'] });
      toast({
        title: 'Regla eliminada',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link 
              href="/" 
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Settings2 className="h-8 w-8 text-amber-500" />
              Configurador de Checks
            </h1>
            <p className="text-slate-500 text-sm italic">
              Define qué campos del Panel de Control disparan tareas automáticas.
            </p>
          </div>

          <Button 
            onClick={() => setIsAdding(true)} 
            disabled={isAdding}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
          >
            <Plus className="h-4 w-4" /> Nueva Regla
          </Button>
        </div>

        <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-white border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
                  Reglas de Automatización
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Mapeo de campos de OS a tareas colaborativas
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-bold">
                {configs.length} ACTIVAS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-widest text-slate-400">Campo Trigger</TableHead>
                  <TableHead className="w-[100px] text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Valor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarea a Generar</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-widest text-slate-400">Responsable</TableHead>
                  <TableHead className="w-[80px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAdding && (
                  <TableRow className="bg-amber-50/30 animate-in fade-in duration-500">
                    <TableCell>
                      <Input 
                        placeholder="ej: pedido_hielo" 
                        value={newItem.campo_trigger}
                        onChange={(e) => setNewItem({...newItem, campo_trigger: e.target.value})}
                        className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder="true" 
                        value={newItem.valor_trigger}
                        onChange={(e) => setNewItem({...newItem, valor_trigger: e.target.value})}
                        className="h-8 text-xs text-center border-amber-200 focus-visible:ring-amber-500"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder="ej: Revisar stock de bolsas de hielo" 
                        value={newItem.tarea_titulo}
                        onChange={(e) => setNewItem({...newItem, tarea_titulo: e.target.value})}
                        className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={newItem.tarea_rol}
                        onValueChange={(val) => setNewItem({...newItem, tarea_rol: val})}
                      >
                        <SelectTrigger className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right flex gap-1 justify-end">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-100"
                        onClick={() => addMutation.mutate(newItem)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-red-400 hover:bg-red-50"
                        onClick={() => setIsAdding(false)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}

                {configs.length === 0 && !isAdding && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <AlertCircle className="h-10 w-10 stroke-1" />
                        <p className="text-sm">No hay reglas de automatización configuradas.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {configs.map((config) => (
                  <TableRow key={config.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell>
                      <code className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                        {config.campo_trigger}
                      </code>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-slate-500">
                      {config.valor_trigger}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {config.tarea_titulo}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                        {config.tarea_rol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          if (confirm('¿Eliminar esta regla?')) deleteMutation.mutate(config.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* HELP FOOTER */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-4">
           <div className="bg-white rounded-full p-2 h-fit border border-amber-200 text-amber-500">
              <CheckCircle2 className="h-5 w-5" />
           </div>
           <div>
              <h4 className="text-sm font-bold text-amber-900 mb-1 leading-none">¿Cómo funciona?</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Cada vez que se guarda una OS, el sistema revisa estas reglas. Si el <strong>campo trigger</strong> tiene el 
                <strong> valor</strong> especificado, se creará automáticamente una tarea en el Panel de Control bajo el rol asignado. 
                Ideal para automatizar peticiones de transporte, hielo, personal externo, etc.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
