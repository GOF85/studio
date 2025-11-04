

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

interface FeedbackDialogProps {
  initialRating?: number;
  initialComment?: string;
  workerName: string;
  onSave: (feedback: { rating: number; comment: string }) => void;
  trigger: React.ReactNode;
}

export function FeedbackDialog({ initialRating, initialComment, workerName, onSave, trigger }: FeedbackDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(initialRating || 3);
    const [comment, setComment] = useState(initialComment || '');
    
    useEffect(() => {
        if(isOpen) {
            setRating(initialRating || 3);
            setComment(initialComment || '');
        }
    }, [isOpen, initialRating, initialComment]);

    const handleSave = () => {
        onSave({ rating, comment });
        setIsOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    }
    
    const tooltipText = initialComment || (initialRating && initialRating !== 3) ? `Valoración: ${'⭐'.repeat(initialRating || 0)} - ${initialComment || 'Sin comentarios'}` : 'Añadir valoración';

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                 <Tooltip>
                    <TooltipTrigger asChild>
                       {trigger}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Valoración para: {workerName}</DialogTitle>
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
