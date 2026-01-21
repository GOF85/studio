'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  field_name: string;
  comentario: string;
  autor_nombre: string;
  created_at: string;
}

interface FieldCommentProps {
  osId: string;
  fieldName: string;
  icon?: React.ReactNode;
}

export function FieldComment({ osId, fieldName, icon }: FieldCommentProps) {
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['os-comments', osId, fieldName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_panel_comentarios')
        .select('*')
        .eq('os_id', osId)
        .eq('field_name', fieldName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.from('os_panel_comentarios').insert([
        {
          os_id: osId,
          field_name: fieldName,
          comentario: text,
          autor_id: session?.user?.id,
          autor_nombre: session?.user?.user_metadata?.full_name || 'Usuario',
        },
      ]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-comments', osId, fieldName] });
      setNewComment('');
      toast({
        title: 'Comentario añadido',
        description: 'La nota se guardó correctamente.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('os_panel_comentarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-comments', osId, fieldName] });
      toast({
        title: 'Comentario eliminado',
        variant: 'destructive',
      });
    },
  });

  const hasComments = comments.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 rounded-full transition-colors ${
            hasComments 
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
              : 'text-gray-300 hover:text-amber-500'
          }`}
        >
          {icon || <StickyNote className="h-3.5 w-3.5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-amber-100" align="start">
        <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
            <StickyNote className="h-3 w-3" /> Notas: {fieldName}
          </h4>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto p-3 space-y-3 bg-white">
          {comments.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic text-center py-4">
              Sin notas adicionales
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="group relative bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-amber-700">{c.autor_nombre}</span>
                  <span className="text-[9px] text-gray-400">
                    {format(new Date(c.created_at), 'd MMM HH:mm', { locale: es })}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.comentario}</p>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            <Textarea
              placeholder="Añadir nota..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] text-xs resize-none focus-visible:ring-amber-500"
            />
            <Button
              size="icon"
              className="h-auto aspect-square bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              disabled={!newComment.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate(newComment)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
