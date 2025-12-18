
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
import type { SolicitudPersonalCPR } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFormContext } from 'react-hook-form';

interface FeedbackDialogProps {
  initialRating?: number;
  initialComment?: string;
  initialHoraEntrada?: string;
  initialHoraSalida?: string;
  workerName?: string;
  turnoInfo?: SolicitudPersonalCPR | null;
  onSave?: (feedback: { rating: number; comment: string; horaEntradaReal?: string, horaSalidaReal?: string }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  saveButtonText?: string;
  // Props for react-hook-form integration
  form?: any;
  turnoIndex?: number;
  asigIndex?: number;
}

export function FeedbackDialog({
  initialRating,
  initialComment,
  initialHoraEntrada,
  initialHoraSalida,
  workerName,
  turnoInfo,
  onSave,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  title: parentTitle,
  description,
  saveButtonText,
  form,
  turnoIndex,
  asigIndex,
}: FeedbackDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const onOpenChange = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

    // Logic for standalone component
    const [rating, setRating] = useState(initialRating || 3);
    const [comment, setComment] = useState(initialComment || '');
    const [horaEntrada, setHoraEntrada] = useState(initialHoraEntrada || '');
    const [horaSalida, setHoraSalida] = useState(initialHoraSalida || '');

    // Logic for react-hook-form integration
    let rhfProps: any = {};
    if (form && turnoIndex !== undefined && asigIndex !== undefined) {
        const { getValues, setValue } = form;
        const asignacion = getValues(`turnos.${turnoIndex}.asignaciones.${asigIndex}`);
        
        rhfProps.workerName = asignacion.nombre;
        rhfProps.initialRating = asignacion.rating;
        rhfProps.initialComment = asignacion.comentariosMice;
        rhfProps.initialHoraEntrada = asignacion.horaEntradaReal;
        rhfProps.initialHoraSalida = asignacion.horaSalidaReal;
        
        rhfProps.onSave = (feedback: any) => {
            setValue(`turnos.${turnoIndex}.asignaciones.${asigIndex}.rating`, feedback.rating, { shouldDirty: true });
            setValue(`turnos.${turnoIndex}.asignaciones.${asigIndex}.comentariosMice`, feedback.comment, { shouldDirty: true });
            setValue(`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaEntradaReal`, feedback.horaEntradaReal, { shouldDirty: true });
            setValue(`turnos.${turnoIndex}.asignaciones.${asigIndex}.horaSalidaReal`, feedback.horaSalidaReal, { shouldDirty: true });
            onOpenChange(false);
        };
        rhfProps.trigger = <Button variant="ghost" size="icon" className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>;
        rhfProps.title = `Valoración para ${rhfProps.workerName}`;
    }

    const finalProps = {
        initialRating, initialComment, initialHoraEntrada, initialHoraSalida,
        workerName, turnoInfo, onSave, trigger, open, onOpenChange, title: parentTitle,
        description, saveButtonText,
        ...rhfProps
    };

    useEffect(() => {
        if(finalProps.open) {
            setRating(finalProps.initialRating || 3);
            setComment(finalProps.initialComment || '');
            setHoraEntrada(finalProps.initialHoraEntrada || '');
            setHoraSalida(finalProps.initialHoraSalida || '');
        }
    }, [finalProps.open, finalProps.initialRating, finalProps.initialComment, finalProps.initialHoraEntrada, finalProps.initialHoraSalida]);

    const handleSave = () => {
        if (finalProps.onSave) {
            finalProps.onSave({ rating, comment, horaEntradaReal: horaEntrada, horaSalidaReal: horaSalida });
        }
        if (finalProps.onOpenChange) {
          finalProps.onOpenChange(false);
        }
    };
    
    const dialogContent = (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>{finalProps.title}</DialogTitle>
                <DialogDescription>{finalProps.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                 <div className="text-sm p-2 bg-secondary rounded-md">
                    <p><strong>Trabajador:</strong> {finalProps.workerName}</p>
                    {finalProps.turnoInfo && (
                        <>
                        <p><strong>Categoría:</strong> {finalProps.turnoInfo.categoria} ({finalProps.turnoInfo.partida})</p>
                        <p><strong>Fecha y Hora (Plan):</strong> {format(new Date(finalProps.turnoInfo.fechaServicio), 'dd/MM/yyyy')} de {finalProps.turnoInfo.horaInicio} a {finalProps.turnoInfo.horaFin}</p>
                        </>
                    )}
                </div>
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
                <Button variant="secondary" onClick={() => finalProps.onOpenChange?.(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{finalProps.saveButtonText || 'Guardar'}</Button>
            </DialogFooter>
        </DialogContent>
    );

    return (
        <Dialog open={finalProps.open} onOpenChange={finalProps.onOpenChange}>
            {finalProps.trigger && <DialogTrigger asChild>{finalProps.trigger}</DialogTrigger>}
            {finalProps.open && dialogContent}
        </Dialog>
    );
}
