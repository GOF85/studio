'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FixedSizeList as List } from 'react-window';

interface EventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    title: string;
}

const Row = ({ index, style, data }: any) => {
    const event = data[index];
    return (
        <div style={style}>
            <div className="p-2 px-3 mr-2 mb-2 rounded-lg border border-border/30 bg-muted/20 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors h-[54px]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Link 
                        href={`/os/${event.numero_expediente}`}
                        className="font-mono text-[8px] h-3.5 px-1 bg-primary/5 text-primary border border-primary/10 rounded shrink-0 hover:underline flex items-center justify-center"
                    >
                        {event.numero_expediente}
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[11px] uppercase tracking-tight truncate text-foreground">{event.space || 'Sin espacio'}</h4>
                            <span className="text-[9px] text-muted-foreground/70">•</span>
                            <span className="text-[9px] font-medium text-muted-foreground truncate">
                                {event.start_date ? format(new Date(event.start_date), "eee d MMM", { locale: es }) : 'Sin fecha'}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 truncate">{event.client}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background/40 border border-border/20 shrink-0">
                    <Users className="w-3 h-3 text-primary/70" />
                    <span className="font-bold text-[11px]">{event.asistentes}</span>
                </div>
            </div>
        </div>
    );
};

export const EventsModal = React.memo(function EventsModal({ isOpen, onClose, data, title }: EventsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] rounded-2xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground">
                        Listado detallado de los eventos programados para este periodo.
                    </DialogDescription>
                </DialogHeader>
                
                {data.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground font-medium">No hay eventos registrados.</p>
                ) : (
                    <div className="h-[400px] w-full">
                        <List
                            height={400}
                            itemCount={data.length}
                            itemSize={62}
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
