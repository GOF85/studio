'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Plus, 
  GripVertical,
  MessageSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FieldComment } from './FieldComment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Task {
  id: string;
  titulo: string;
  rol_asignado: string;
  autor_nombre?: string;
  estado: 'pending' | 'completed' | 'cancelled';
  automatica: boolean;
  created_at: string;
  sort_order?: number;
}

interface ControlPanelTasksProps {
  osId: string;
  isAddingManual?: boolean;
  onAddComplete?: () => void;
}

function SortableTaskItem({ 
  task, 
  onToggle, 
  isPending,
  osId 
}: { 
  task: Task; 
  onToggle: (id: string, state: string) => void;
  isPending: boolean;
  osId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all relative group",
        task.estado === 'completed' 
          ? "bg-slate-50/50 border-slate-100 opacity-60" 
          : "bg-white border-slate-200 shadow-sm hover:border-primary/30"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 p-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-shrink-0">
        <Checkbox
          checked={task.estado === 'completed'}
          onCheckedChange={() => onToggle(task.id, task.estado)}
          disabled={isPending}
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
          {task.autor_nombre && (
            <span className="text-[9px] text-slate-400 font-medium italic">
              por {task.autor_nombre}
            </span>
          )}
          {task.automatica && (
            <span className="text-[9px] text-blue-400 font-medium">Auto-Gen</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <FieldComment osId={osId} fieldName={`task_${task.id}`} icon={<MessageSquare className="h-3.5 w-3.5" />} />
        {task.estado === 'pending' && (
          <AlertCircle className="h-4 w-4 text-amber-400 opacity-50 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

export function ControlPanelTasks({ osId, isAddingManual, onAddComplete }: ControlPanelTasksProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRol, setNewTaskRol] = useState('PM');
  const [newTaskAutor, setNewTaskAutor] = useState('');

  // Sync internal isAdding with prop
  React.useEffect(() => {
    if (isAddingManual) setIsAdding(true);
  }, [isAddingManual]);

  const handleCloseAdding = () => {
    setIsAdding(false);
    onAddComplete?.();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['osPanelTasks', osId],
    queryFn: async () => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('os_panel_tareas')
        .select('*')
        .eq('os_id', targetId)
        .order('sort_order', { ascending: true })
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

  const addTaskMutation = useMutation({
    mutationFn: async ({ titulo, rol, autor }: { titulo: string; rol: string; autor: string }) => {
      const targetId = await resolveOsId(osId);
      const { error } = await supabase
        .from('os_panel_tareas')
        .insert({
          os_id: targetId,
          titulo,
          rol_asignado: rol,
          autor_nombre: autor || null,
          estado: 'pending',
          automatica: false,
          sort_order: tasks.length
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osPanelTasks', osId] });
      handleCloseAdding();
      setNewTaskTitle('');
      setNewTaskAutor('');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (newTasks: Task[]) => {
      const updates = newTasks.map((t, idx) => ({
        id: t.id,
        sort_order: idx
      }));

      // Bulk update sort order
      for (const update of updates) {
        await supabase
          .from('os_panel_tareas')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osPanelTasks', osId] });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(tasks, oldIndex, newIndex);
      
      // Optimistic update
      queryClient.setQueryData(['osPanelTasks', osId], newOrder);
      reorderMutation.mutate(newOrder);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
        <div className="flex items-center gap-3">
          <Badge variant={pendingCount > 0 ? "secondary" : "outline"} className="text-[10px]">
            {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Concepto / Tarea</label>
              <Input 
                autoFocus
                placeholder="Ej. Revisar mantelería..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Dpto. Responsable</label>
              <Select value={newTaskRol} onValueChange={setNewTaskRol}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="Seleccionar dpto..." />
                </SelectTrigger>
                <SelectContent>
                  {['Maître', 'Cocina', 'Logística', 'PM', 'Sala'].map(rol => (
                    <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Asignado por</label>
              <Input 
                placeholder="Tu nombre..."
                value={newTaskAutor}
                onChange={(e) => setNewTaskAutor(e.target.value)}
                className="h-9 text-sm bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                className="flex-1 h-9"
                onClick={() => {
                  if (newTaskTitle) {
                    addTaskMutation.mutate({ 
                      titulo: newTaskTitle, 
                      rol: newTaskRol, 
                      autor: newTaskAutor 
                    });
                  }
                }}
                disabled={addTaskMutation.isPending || !newTaskTitle}
              >
                Crear Tarea
              </Button>
              <Button variant="ghost" className="h-9" onClick={handleCloseAdding}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Clock className="h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400 italic">No hay tareas pendientes.</p>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="mt-2">
            Añadir primera tarea
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks.map((task) => (
                <SortableTaskItem 
                  key={task.id} 
                  task={task} 
                  osId={osId}
                  isPending={toggleMutation.isPending}
                  onToggle={(id, state) => toggleMutation.mutate({ taskId: id, currentState: state })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
