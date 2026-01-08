'use client';

import React, { useRef, useCallback } from 'react';
import Link from 'next/link';
import { Utensils, Users, MapPin } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { VariableSizeList as List } from 'react-window';

interface ServicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    title: string;
}

const Row = ({ index, style, data }: any) => {
    const service = data[index];
    const hasComment = service.comentario || service.comentarios;

    return (
        <div style={style}>
            <div className="p-2 px-3 mr-2 mb-2 rounded-lg border border-border/30 bg-muted/20 flex flex-col gap-1 hover:bg-muted/30 transition-colors overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex flex-col shrink-0">
                            <span className="text-[7px] font-black text-muted-foreground uppercase leading-none mb-0.5">
                                {service.fecha ? format(new Date(service.fecha), "eee d MMM", { locale: es }) : 'Sin fecha'}
                            </span>
                            <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1.5 bg-primary/10 text-primary border-none">
                                {service.horaInicio || '??'} - {service.horaFin || '??'}
                            </Badge>
                        </div>
                        {service.numero_expediente && (
                            <Link 
                                href={`/os/${service.numero_expediente}`}
                                className="text-[9px] font-mono font-bold text-primary hover:underline shrink-0 bg-primary/5 px-1 rounded border border-primary/10"
                            >
                                {service.numero_expediente}
                            </Link>
                        )}
                        <h4 className="font-bold text-[11px] uppercase tracking-tight truncate text-foreground">
                            {service.descripcion || service.tipo || 'Servicio'}
                        </h4>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/40 border border-border/20 shrink-0">
                        <Users className="w-3 h-3 text-primary/70" />
                        <span className="font-bold text-[11px]">{service.asistentes}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                    <div className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate font-bold text-foreground/70">{service.nombreEspacio || 'Sin espacio'}</span>
                    </div>
                    {service.sala && (
                        <>
                            <span>•</span>
                            <span className="truncate font-medium">{service.sala}</span>
                        </>
                    )}
                    {service.conGastronomia && (
                        <>
                            <span>•</span>
                            <span className="text-emerald-600 font-bold uppercase text-[8px]">Gastro</span>
                        </>
                    )}
                </div>

                { hasComment && (
                    <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1 border-l-2 border-primary/20 pl-2 mt-0.5">
                        {service.comentario || service.comentarios}
                    </p>
                )}
            </div>
        </div>
    );
};

export const ServicesModal = React.memo(function ServicesModal({ isOpen, onClose, data, title }: ServicesModalProps) {
    const listRef = useRef<any>(null);

    const getItemSize = useCallback((index: number) => {
        const item = data[index];
        const hasComment = item.comentario || item.comentarios;
        // Base size 60px, +16px if it has a comment
        return hasComment ? 82 : 66;
    }, [data]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] rounded-2xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground">
                        Desglose de los servicios operativos y logísticos del día.
                    </DialogDescription>
                </DialogHeader>
                
                {data.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground font-medium">No hay servicios registrados.</p>
                ) : (
                    <div className="h-[450px] w-full">
                        <List
                            ref={listRef}
                            height={450}
                            itemCount={data.length}
                            itemSize={getItemSize}
                            width="100%"
                            itemData={data}
                        >
                            {Row}
                        </List>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});
