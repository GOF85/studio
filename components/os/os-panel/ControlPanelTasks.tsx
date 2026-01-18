'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  titulo: string;
  rol_asignado: string;
  estado: 'pending' | 'completed' | 'cancelled';
  automatica: boolean;
  created_at: string;
}

interface ControlPanelTasksProps {
  osId: string;
}

export function ControlPanelTasks({ osId }: ControlPanelTasksProps) {
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['osPanelTasks', osId],
    queryFn: async () => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('os_panel_tareas')
        .select('*')
        .eq('os_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
  });

  // Mutation to toggle state
  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, currentState }: { taskId: string; currentState: string }) => {
      const newState = currentState === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('os_panel_tareas')
        .update({ estado: newState })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osPanelTasks', osId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <Clock className="h-8 w-8 text-slate-200" />
        <p className="text-sm text-slate-400 italic">No hay tareas pendientes para esta OS.</p>
        <p className="text-[10px] text-slate-300 max-w-[200px]">
          Las tareas se generarán automáticamente cuando marques opciones críticas (Hielo, ETT, Transporte).
        </p>
      </div>
    );
  }

  const pendingCount = tasks.filter(t => t.estado === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Checklist de Operaciones
        </h4>
        <Badge variant={pendingCount > 0 ? "secondary" : "outline"} className="text-[10px]">
          {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              task.estado === 'completed' 
                ? "bg-slate-50/50 border-slate-100 opacity-60" 
                : "bg-white border-slate-200 shadow-sm hover:border-primary/30"
            )}
          >
            <div className="flex-shrink-0">
              <Checkbox
                checked={task.estado === 'completed'}
                onCheckedChange={() => toggleMutation.mutate({ taskId: task.id, currentState: task.estado })}
                disabled={toggleMutation.isPending}
                className="h-5 w-5 rounded-full border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                task.estado === 'completed' && "line-through text-slate-400"
              )}>
                {task.titulo}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 font-normal text-slate-400 uppercase">
                  {task.rol_asignado}
                </Badge>
                {task.automatica && (
                  <span className="text-[9px] text-blue-400 font-medium">Auto-Gen</span>
                )}
              </div>
            </div>

            {task.estado === 'pending' && (
              <AlertCircle className="h-4 w-4 text-amber-400 opacity-50 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
