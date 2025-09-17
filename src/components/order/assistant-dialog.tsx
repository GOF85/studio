'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { orderCompletionAssistant, OrderCompletionAssistantOutput } from '@/ai/flows/order-completion-assistant';
import type { CateringItem } from '@/types';
import { CATERING_ITEMS } from '@/lib/data';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';

interface AssistantDialogProps {
  onAddSuggestedItem: (item: CateringItem, quantity: number) => void;
}

export function AssistantDialog({ onAddSuggestedItem }: AssistantDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<OrderCompletionAssistantOutput>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Descripción vacía',
        description: 'Por favor, describe tu evento.',
      });
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await orderCompletionAssistant({ eventDescription: description });
      setSuggestions(result);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error del asistente',
        description: 'No se pudieron generar las sugerencias. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion: OrderCompletionAssistantOutput[0]) => {
     const itemData = CATERING_ITEMS.find(item => item.itemCode === suggestion.itemCode);
     if (itemData) {
        onAddSuggestedItem(itemData, suggestion.quantity);
        toast({
            title: 'Sugerencia añadida',
            description: `${suggestion.quantity} x ${suggestion.description} se ha añadido a tu pedido.`
        })
     } else {
        toast({
            variant: 'destructive',
            title: 'Artículo no encontrado',
            description: `El artículo sugerido con código ${suggestion.itemCode} no se encontró en el catálogo.`
        })
     }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-accent/30 border-accent text-accent-foreground hover:bg-accent/50">
          <Sparkles className="mr-2 h-4 w-4" />
          Asistente de Pedidos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asistente de Finalización de Pedidos</DialogTitle>
          <DialogDescription>
            Describe tu evento y nuestro asistente IA te sugerirá los artículos y cantidades que podrías necesitar.
            <br/>Ej: "Boda al aire libre para 100 personas"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            id="event-description"
            placeholder="Ej. Evento corporativo para 50 personas con cena y cóctel."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generar Sugerencias
          </Button>
        </DialogFooter>
        
        {(isLoading || suggestions.length > 0) && <Separator />}

        {isLoading && (
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50 animate-pulse">
                        <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                        <div className="h-8 bg-muted-foreground/20 rounded w-20"></div>
                    </div>
                ))}
            </div>
        )}

        {suggestions.length > 0 && (
          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-4">
              <h4 className="font-medium">Sugerencias:</h4>
              {suggestions.map((suggestion) => (
                <div key={suggestion.itemCode} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                  <div>
                    <p className="font-medium">{suggestion.description}</p>
                    <p className="text-sm text-muted-foreground">Cantidad sugerida: {suggestion.quantity}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddSuggestion(suggestion)}>
                    <Plus className="h-4 w-4 mr-1" /> Añadir
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

      </DialogContent>
    </Dialog>
  );
}
