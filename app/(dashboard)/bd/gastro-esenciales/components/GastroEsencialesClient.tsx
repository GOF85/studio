'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  GastroEsencial, 
  addGastroEsencial, 
  removeGastroEsencial, 
  updateGastroEsencialOrdenes 
} from '@/services/gastro-esenciales-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Trash2, GripVertical, Plus, Check, ChevronsUpDown, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Badge } from '@/components/ui/badge';

interface Props {
  initialEsenciales: GastroEsencial[];
  availableRecetas: any[];
}

interface SortableRowProps {
  esencial: GastroEsencial;
  onRemove: (id: string) => void;
}

function SortableRow({ esencial, onRemove }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: esencial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[50px]">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-bold">
        {esencial.receta?.nombre || 'Receta no encontrada'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-slate-100 uppercase text-[10px]">
          {esencial.receta?.categoria || '-'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(esencial.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function GastroEsencialesClient({ initialEsenciales, availableRecetas }: Props) {
  const [esenciales, setEsenciales] = useState<GastroEsencial[]>(initialEsenciales);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAdd = async (recetaId: string) => {
    if (esenciales.some(e => e.receta_id === recetaId)) {
      toast({
        title: 'Artículo duplicado',
        description: 'Este artículo ya está en la lista de esenciales',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await addGastroEsencial(supabase, recetaId);
      toast({
        title: 'Éxito',
        description: 'Añadido a esenciales',
        variant: 'success'
      });
      setOpen(false);
      router.refresh();
      // En un entorno ideal usaríamos optimistic updates o react-query, 
      // pero seguimos el patrón del proyecto de router.refresh()
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo añadir el esencial',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeGastroEsencial(supabase, id);
      setEsenciales(prev => prev.filter(e => e.id !== id));
      toast({
        title: 'Éxito',
        description: 'Eliminado de esenciales',
        variant: 'success'
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el artículo',
        variant: 'destructive'
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = esenciales.findIndex((e) => e.id === active.id);
      const newIndex = esenciales.findIndex((e) => e.id === over.id);

      const newArray = arrayMove(esenciales, oldIndex, newIndex);
      setEsenciales(newArray);

      // Update in DB
      try {
        const updates = newArray.map((e, index) => ({
          id: e.id,
          orden: index
        }));
        await updateGastroEsencialOrdenes(supabase, updates);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'No se pudo guardar el orden',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight">ARTÍCULOS ESENCIALES</h2>
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir Artículo
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar receta..." />
                <CommandList>
                  <CommandEmpty>No se encontraron recetas.</CommandEmpty>
                  <CommandGroup>
                    {availableRecetas.map((receta) => (
                      <CommandItem
                        key={receta.id}
                        value={receta.nombre}
                        onSelect={() => handleAdd(receta.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            esenciales.some(e => e.receta_id === receta.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{receta.nombre}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{receta.categoria}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-x-auto">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>ARTÍCULO</TableHead>
                  <TableHead>CATEGORÍA</TableHead>
                  <TableHead className="text-right">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esenciales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No hay artículos esenciales configurados.
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext 
                    items={esenciales.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {esenciales.map((esencial) => (
                      <SortableRow 
                        key={esencial.id} 
                        esencial={esencial} 
                        onRemove={handleRemove} 
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </CardContent>
    </Card>
  );
}
