'use client';

import { useState } from 'react';
import { Copy, Phone, Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { EspacioV2 } from '@/types/espacios';

interface QuickActionsProps {
    espacio: EspacioV2;
}

export function QuickActions({ espacio }: QuickActionsProps) {
    const [showPhotos, setShowPhotos] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopyAddress = async () => {
        const address = `${espacio.calle || ''}, ${espacio.ciudad}, ${espacio.provincia}${espacio.codigoPostal ? ` - ${espacio.codigoPostal}` : ''}`.trim();

        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            toast({
                title: 'Dirección copiada',
                description: address,
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo copiar la dirección',
            });
        }
    };

    const handleCall = () => {
        const principal = espacio.contactos?.find(c => c.esPrincipal);
        const contacto = principal || espacio.contactos?.[0];

        if (contacto?.telefono) {
            window.location.href = `tel:${contacto.telefono}`;
        } else {
            toast({
                variant: 'destructive',
                title: 'Sin teléfono',
                description: 'Este espacio no tiene contacto con teléfono',
            });
        }
    };

    const hasPhotos = espacio.imagenes && espacio.imagenes.length > 0;
    const hasContact = espacio.contactos && espacio.contactos.length > 0;
    const hasPhone = espacio.contactos?.some(c => c.telefono);

    return (
        <>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAddress();
                    }}
                    title="Copiar dirección"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>

                {hasPhotos && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPhotos(true);
                        }}
                        title="Ver fotos"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </Button>
                )}

                {hasContact && hasPhone && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCall();
                        }}
                        title="Llamar"
                    >
                        <Phone className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Modal de Fotos Rápido */}
            <Dialog open={showPhotos} onOpenChange={setShowPhotos}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{espacio.nombre} - Galería</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                        {espacio.imagenes?.map((imagen, idx) => (
                            <div key={imagen.id || idx} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                                <img
                                    src={imagen.url}
                                    alt={imagen.descripcion || `Foto ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                {imagen.esPrincipal && (
                                    <div className="absolute top-2 right-2">
                                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                                            Principal
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
