
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

export function FeedbackDialog({ turnoIndex, asigIndex, form, onSave }: { turnoIndex: number; asigIndex: number, form: any, onSave: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const { getValues, setValue } = form;

    const ratingFieldName = `turnos.${turnoIndex}.asignaciones.${asigIndex}.rating`;
    const commentFieldName = `turnos.${turnoIndex}.asignaciones.${asigIndex}.comentariosMice`;
    const asignacion = getValues(`turnos.${turnoIndex}.asignaciones.${asigIndex}`);
    
    const [rating, setRating] = useState(getValues(ratingFieldName) || 3);
    const [comment, setComment] = useState(getValues(commentFieldName) || '');
    
    useEffect(() => {
        if(isOpen) {
            setRating(getValues(ratingFieldName) || 3);
            setComment(getValues(commentFieldName) || '');
        }
    }, [isOpen, getValues, ratingFieldName, commentFieldName]);

    const handleSave = () => {
        setValue(ratingFieldName, rating, { shouldDirty: true });
        setValue(commentFieldName, comment, { shouldDirty: true });
        onSave();
        setIsOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    }
    
    const tooltipText = asignacion.comentariosMice || (asignacion.rating && asignacion.rating !== 3) ? `Valoración: ${'⭐'.repeat(asignacion.rating || 0)} - ${asignacion.comentariosMice || 'Sin comentarios'}` : 'Añadir valoración';


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center justify-center cursor-pointer">
                            <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                                <Pencil className={cn("h-4 w-4", getValues(commentFieldName) && "text-primary")} />
                            </Button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Valoración para: {asignacion?.nombre}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Desempeño (1-5)</Label>
                        <div className="flex items-center gap-4 pt-2">
                            <span className="text-sm text-muted-foreground">Bajo</span>
                            <Slider
                                value={[rating]}
                                onValueChange={(value) => setRating(value[0])}
                                max={5}
                                min={1}
                                step={1}
                            />
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
                    <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
