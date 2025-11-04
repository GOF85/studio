
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';

interface FeedbackDialogProps {
  initialRating?: number;
  initialComment?: string;
  initialHoraEntrada?: string;
  initialHoraSalida?: string;
  workerName: string;
  onSave: (feedback: { rating: number; comment: string; horaEntradaReal?: string, horaSalidaReal?: string }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isCloseMode?: boolean;
  title?: string;
  description?: string;
  saveButtonText?: string;
}

export function FeedbackDialog({
  initialRating,
  initialComment,
  initialHoraEntrada,
  initialHoraSalida,
  workerName,
  onSave,
  trigger,
  open,
  onOpenChange,
  isCloseMode = false,
  title = "Valoración",
  description = "Deja una valoración y comentarios sobre el desempeño.",
  saveButtonText = "Guardar Valoración"
}: FeedbackDialogProps) {
    const [rating, setRating] = useState(initialRating || 3);
    const [comment, setComment] = useState(initialComment || '');
    const [horaEntrada, setHoraEntrada] = useState(initialHoraEntrada || '');
    const [horaSalida, setHoraSalida] = useState(initialHoraSalida || '');
    
    useEffect(() => {
        if(open) {
            setRating(initialRating || 3);
            setComment(initialComment || '');
            setHoraEntrada(initialHoraEntrada || '');
            setHoraSalida(initialHoraSalida || '');
        }
    }, [open, initialRating, initialComment, initialHoraEntrada, initialHoraSalida]);

    const handleSave = () => {
        onSave({ rating, comment, horaEntradaReal: horaEntrada, horaSalidaReal: horaSalida });
    };

    const dialogContent = (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                 {isCloseMode && (
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label>Hora Entrada Real</Label>
                             <Input type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} />
                         </div>
                         <div className="space-y-2">
                            <Label>Hora Salida Real</Label>
                            <Input type="time" value={horaSalida} onChange={e => setHoraSalida(e.target.value)} />
                         </div>
                    </div>
                 )}
                <div className="space-y-2">
                    <Label>Desempeño (1-5)</Label>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-sm text-muted-foreground">Bajo</span>
                        <Slider value={[rating]} onValueChange={(value) => setRating(value[0])} max={5} min={1} step={1} />
                        <span className="text-sm text-muted-foreground">Alto</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Comentarios Internos MICE</Label>
                    <Textarea 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder="Añade aquí comentarios internos sobre el desempeño..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange?.(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{saveButtonText}</Button>
            </DialogFooter>
        </DialogContent>
    );

    if (trigger) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                {dialogContent}
            </Dialog>
        );
    }
    
    return open ? dialogContent : null;
}
